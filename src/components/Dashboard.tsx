"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import anime from 'animejs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRideReminders } from '@/hooks/useRideReminders'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmBoardingDialog } from '@/components/ConfirmBoardingDialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RideCardSkeleton } from '@/components/ui/RideCardSkeleton'
import { toast } from 'sonner'
import { User as UserIcon, LogOut, CheckCircle2, Navigation, Clock, Search, MapPin, Loader2, ArrowRight, X, AlertTriangle, ShieldCheck, ShieldAlert, Check, Car, Bike, Filter, Users, Navigation2, MessageCircle, Star, Share2, Shield, Phone, XCircle, Zap, Plus, List , Sparkles } from 'lucide-react'
import { playPop, playSuccess, playError, triggerHaptic, triggerHeavyHaptic } from '@/lib/audio'

import { ChatModal } from '@/components/ChatModal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Notifications } from '@/components/Notifications'
import { ProfileEditor } from '@/components/ProfileEditor'
import { MyRides } from '@/components/MyRides'
import { PullToRefresh } from '@/components/PullToRefresh'
import { Righteous } from 'next/font/google'
const righteous = Righteous({ weight: '400', subsets: ['latin'] })
import Image from 'next/image'
import { cn, isValidIndianVehicleNumber } from '@/lib/utils'
import { LocationAutocomplete } from '@/components/LocationAutocomplete'
import { findBestMatchLocation } from '@/lib/locations'
import { EcoLeaderboard } from '@/components/EcoLeaderboard'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { PublicProfileDialog } from '@/components/PublicProfileDialog'
import { COLLEGE_ROUTES, getRouteById, checkFractionalMatch, getSlicedWaypoints } from '@/lib/routes'
import { calculateFractionalPrice, calculateDynamicSplitPricing, PassengerTrip } from '@/lib/pricing'

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false, loading: () => <div className="h-48 w-full bg-secondary animate-pulse rounded-xl" /> })
const LiveDashboardMap = dynamic(() => import('@/components/LiveDashboardMap'), { ssr: false, loading: () => <div className="h-full w-full bg-secondary/20 animate-pulse rounded-2xl" /> })


type Ride = {
  id: string
  driver_id: string
  ride_category: 'auto_split' | 'personal_vehicle'
  origin: string
  destination: string
  departure_time: string
  vehicle_type: 'bike' | 'auto' | 'car'
  vehicle_number: string | null
  total_seats: number
  available_seats: number
  price_per_seat: number
  is_women_only: boolean
  status: 'active' | 'in_progress' | 'completed' | 'cancelled'
  route_id?: string | null
  driver?: { id: string, full_name: string, gender: string, mobile_number: string, total_rating_score: number, rating_count: number, avatar_url?: string }
  bookings?: {
    id: string
    status: string
    passenger: { id: string, full_name: string, gender: string, total_rating_score: number, rating_count: number, avatar_url?: string }
  }[]
}

const TABS = ['Find a Ride', 'Offer a Seat', 'My Rides']

export function Dashboard({ currentUserId }: { currentUserId: string }) {
  useRideReminders(currentUserId)
  
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [rideCategory, setRideCategory] = useState<'auto_split' | 'personal_vehicle'>('personal_vehicle')
  const [selectedRideForBooking, setSelectedRideForBooking] = useState<any>(null)
  const [expandedMaps, setExpandedMaps] = useState<string[]>([])
  
  // Filters
  const [originFilter, setOriginFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false)
  
  const [chatRide, setChatRide] = useState<Ride | null>(null)
  const [selectedMapRide, setSelectedMapRide] = useState<any>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }
  const queryClient = useQueryClient()
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ridesChannel = supabase.channel('public:rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rides'] })
        queryClient.invalidateQueries({ queryKey: ['has_active_booking'] })
      })
      .subscribe()

    const bookingsChannel = supabase.channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['my_rides'] })
        queryClient.invalidateQueries({ queryKey: ['rides'] })
        queryClient.invalidateQueries({ queryKey: ['has_active_booking'] })
      })
      .subscribe()

    // Listen for custom openChat event from notifications
    const handleOpenChat = async (e: any) => {
      const rideId = e.detail?.rideId;
      if (!rideId) return;
      const { data } = await supabase.from('rides').select('*, driver:users!rides_driver_id_fkey(id, full_name, gender, mobile_number, total_rating_score, rating_count, avatar_url)').eq('id', rideId).single();
      if (data) {
        setChatRide(data as any);
      }
    }
    window.addEventListener('openChat', handleOpenChat);

    return () => {
      supabase.removeChannel(ridesChannel)
      supabase.removeChannel(bookingsChannel)
      window.removeEventListener('openChat', handleOpenChat)
    }
  }, [queryClient, supabase])

  const { data: currentUserProfile } = useQuery({
    queryKey: ['currentUser', currentUserId],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('full_name, gender, car_number, bike_number, avatar_url, total_rating_score, rating_count, is_verified_driver').eq('id', currentUserId).single()
      return data as any
    }
  })

  const { data: rides, isLoading } = useQuery({
    queryKey: ['rides', rideCategory, originFilter, destinationFilter, dateFilter, womenOnlyFilter, currentUserProfile?.gender],
    queryFn: async () => {
      let q = supabase
        .from('rides')
        .select(`
          *,
          driver:users!rides_driver_id_fkey(id, full_name, gender, mobile_number, total_rating_score, rating_count, avatar_url),
          bookings(
            id,
            status,
            passenger_id,
            pickup_location,
            dropoff_location,
            passenger:users!bookings_passenger_id_fkey(id, full_name, gender, avatar_url)
          )
        `)
        .eq('status', 'active')
        .eq('ride_category', rideCategory)

      // Enforce women-only visibility rules
      if (currentUserProfile?.gender !== 'female') {
        q = q.eq('is_women_only', false)
      } else if (womenOnlyFilter) {
        q = q.eq('is_women_only', true)
      }


      // Filter by Date or just show upcoming rides
      if (dateFilter) {
        // Find rides on the specific date (from 00:00 to 23:59 local time)
        const startOfDay = new Date(`${dateFilter}T00:00:00`).toISOString()
        const endOfDay = new Date(`${dateFilter}T23:59:59.999`).toISOString()
        q = q.gte('departure_time', startOfDay).lte('departure_time', endOfDay)
      } else {
        // Default: Hide rides that have already departed
        q = q.gte('departure_time', new Date().toISOString())
      }

      const { data, error } = await q.order('departure_time', { ascending: true })
      if (error) throw error

      let fetchedRides = data as Ride[]

      let effectiveOrigin = originFilter
      let effectiveDest = destinationFilter
      
      if (originFilter) {
        const match = findBestMatchLocation(originFilter)
        if (match) effectiveOrigin = match.name
      }
      if (destinationFilter) {
        const match = findBestMatchLocation(destinationFilter)
        if (match) effectiveDest = match.name
      }

      // Pre-calculate prices for all rides assuming full route by default,
      // or fractional route if the user searched.
      fetchedRides = fetchedRides.map(ride => {
        const route = ride.route_id ? getRouteById(ride.route_id) : null;
        const checkOrigin = effectiveOrigin || ride.origin;
        const checkDest = effectiveDest || ride.destination;

        if (ride.ride_category === 'auto_split') {
          const passengers: PassengerTrip[] = [];
          passengers.push({ id: ride.driver_id, startLoc: ride.origin, endLoc: ride.destination });
          
          let isAlreadyInRide = ride.driver_id === currentUserId;

          ride.bookings?.forEach((b: any) => {
            if (b.status === 'approved' && b.passenger) {
              if (b.passenger.id === currentUserId) isAlreadyInRide = true;
              passengers.push({ 
                id: b.passenger.id, 
                startLoc: b.pickup_location || ride.origin, 
                endLoc: b.dropoff_location || ride.destination 
              });
            }
          });
          
          const searcherId = isAlreadyInRide ? 'simulated-new-passenger' : currentUserId;
          passengers.push({ id: searcherId, startLoc: checkOrigin, endLoc: checkDest });
          
          const dynamicPrices = calculateDynamicSplitPricing(ride.route_id, ride.price_per_seat, passengers);
          (ride as any).dynamic_price = dynamicPrices[searcherId];
        } else {
          // Default to full price. If they searched and it's a fractional match, the filter below will overwrite this.
          (ride as any).fractional_price = ride.price_per_seat;
        }

        return ride;
      });

      if (effectiveOrigin || effectiveDest) {
        const cleanStr = (s: string) => s.toLowerCase().trim()
        const oMatch = effectiveOrigin ? cleanStr(effectiveOrigin) : ''
        const dMatch = effectiveDest ? cleanStr(effectiveDest) : ''
        
        fetchedRides = fetchedRides.filter(ride => {
          const route = ride.route_id ? getRouteById(ride.route_id) : null;
          const checkOrigin = effectiveOrigin || ride.origin;
          const checkDest = effectiveDest || ride.destination;

          // Exact match
          const exactOrigin = !oMatch || cleanStr(ride.origin).includes(oMatch)
          const exactDest = !dMatch || cleanStr(ride.destination).includes(dMatch)
          if (exactOrigin && exactDest) {
            (ride as any).matchType = 'exact'
            return true
          }

          // Fractional (en-route) match
          // If the ride has a predefined route, try to match the passenger's search against the route waypoints.
          if (ride.route_id && (oMatch || dMatch)) {
            const isFractional = checkFractionalMatch(ride.route_id, checkOrigin, checkDest, ride.origin, ride.destination);
            if (isFractional) {
              (ride as any).matchType = 'fractional';
              if (ride.ride_category !== 'auto_split') {
                (ride as any).fractional_price = calculateFractionalPrice(ride.route_id, checkOrigin, checkDest, ride.price_per_seat, ride.origin, ride.destination);
              }
              return true;
            }
          }
          return false
        })
      }
      
      // SMART FEED SORTING
      // Calculate a penalty score for each ride (lower score = higher in feed)
      const nowMs = Date.now();
      fetchedRides.sort((a, b) => {
        // 1. Time Penalty (Hours until departure)
        const timeA = Math.max(0, (new Date(a.departure_time).getTime() - nowMs) / (1000 * 60 * 60));
        const timeB = Math.max(0, (new Date(b.departure_time).getTime() - nowMs) / (1000 * 60 * 60));
        
        // 2. Price Penalty (Normalized price)
        const priceA = (a as any).dynamic_price || (a as any).fractional_price || a.price_per_seat || 0;
        const priceB = (b as any).dynamic_price || (b as any).fractional_price || b.price_per_seat || 0;
        
        // 3. Match Quality Penalty (Exact match = 0, Fractional = 5, No Search = 2)
        const matchScoreA = (a as any).matchType === 'exact' ? 0 : ((a as any).matchType === 'fractional' ? 5 : 2);
        const matchScoreB = (b as any).matchType === 'exact' ? 0 : ((b as any).matchType === 'fractional' ? 5 : 2);

        // Weights: Time matters a lot, Price matters slightly less (₹10 = 1 penalty point)
        const scoreA = (timeA * 2) + (priceA * 0.1) + matchScoreA;
        const scoreB = (timeB * 2) + (priceB * 0.1) + matchScoreB;
        
        return scoreA - scoreB;
      });

      return fetchedRides
    },
    enabled: !!currentUserProfile,
    refetchInterval: 5000
  })

  const isWithinOneHour = (dateString?: string) => {
    if (!dateString) return false
    const now = new Date()
    const target = new Date(dateString)
    const diffInHours = (now.getTime() - target.getTime()) / (1000 * 60 * 60)
    return diffInHours <= 1
  }

  const { data: hasActiveBooking } = useQuery({
    queryKey: ['has_active_booking', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status, ride:rides(status, completed_at)')
        .eq('passenger_id', currentUserId)
        .in('status', ['pending', 'approved'])
      
      if (error) throw error
      // Check if they are currently tied to an active, in-progress, or recently completed ride
      return data?.some((b: any) => {
        if (!b.ride) return false
        if (['active', 'in_progress'].includes(b.ride.status)) return true
        return false
      }) || false
    },
    refetchInterval: 5000
  })

  // Stagger animation when feed changes
  
  // Calculate stars helper
  const renderStars = (score: number, count: number) => {
    if (!count || count === 0) return <span className="text-[10px] font-normal text-muted-foreground ml-1">New</span>
    const avg = (score / count).toFixed(1)
    return (
      <span className="flex items-center text-[10px] font-bold text-yellow-500 ml-1 bg-yellow-500/10 px-1 rounded">
        <Star className="w-2.5 h-2.5 mr-0.5 fill-current" /> {avg} <span className="text-muted-foreground font-normal ml-0.5">({count})</span>
      </span>
    )
  }

  const hasAnimatedFeed = useRef(false)
  useEffect(() => {
    if (rides && rides.length > 0 && feedRef.current && !hasAnimatedFeed.current) {
      hasAnimatedFeed.current = true
      anime({
        targets: '.ride-card',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        easing: 'easeOutExpo',
        duration: 800
      })
    }
  }, [rides])

  const [isAIFareLoading, setIsAIFareLoading] = useState(false)
  const [aiFareReasoning, setAiFareReasoning] = useState<string | null>(null)

  // Reset animation flag if tab changes
  useEffect(() => {
    hasAnimatedFeed.current = false
    setAiFareReasoning(null)
  }, [activeTab])

  // Offer Ride Form State
  const [offerData, setOfferData] = useState({
    origin: '',
    destination: 'VNR VJIET Campus Gate 1',
    departure_time: '',
    vehicle_type: 'bike',
    vehicle_number: '',
    total_seats: 1,
    price_per_seat: 0,
    is_women_only: false,
    route_id: ''
  })

  const handleCategoryChange = (key: 'auto_split' | 'personal_vehicle') => {
    setRideCategory(key)
    setOfferData(prev => ({
      ...prev,
      vehicle_type: key === 'auto_split' && prev.vehicle_type === 'bike' ? 'auto' 
                    : key === 'personal_vehicle' && prev.vehicle_type === 'auto' ? 'bike' 
                    : prev.vehicle_type
    }))
  }

  const handleRefresh = async () => {
    triggerHaptic(50)
    await queryClient.invalidateQueries({ queryKey: ['rides'] })
    playPop()
  }

  useEffect(() => {
    setAiFareReasoning(null)
  }, [offerData.origin, offerData.destination, offerData.vehicle_type])

  // Pre-fill vehicle number from profile on load
  useEffect(() => {
    if (currentUserProfile && !offerData.vehicle_number) {
      setOfferData(prev => ({
        ...prev,
        vehicle_number: prev.vehicle_type === 'bike' 
          ? currentUserProfile.bike_number || '' 
          : currentUserProfile.car_number || ''
      }))
    }
  }, [currentUserProfile])

  const handleAIFareSuggestion = async () => {
    if (!offerData.origin || !offerData.destination) {
      toast.error("Please enter origin and destination first.")
      return
    }
    setIsAIFareLoading(true)
    setAiFareReasoning(null)
    try {
      const res = await fetch('/api/ai-fare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: offerData.origin,
          destination: offerData.destination,
          vehicle_type: offerData.vehicle_type,
          passengers: offerData.total_seats,
          ride_category: rideCategory,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOfferData(prev => ({ ...prev, price_per_seat: data.suggested_total_fare }))
      setAiFareReasoning(data.reasoning)
      toast.success("AI calculated a fair fare!")
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI suggestion")
    } finally {
      setIsAIFareLoading(false)
    }
  }

  const offerMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const selectedDate = new Date(offerData.departure_time);
      
      if (selectedDate < now) {
        throw new Error('Departure time cannot be in the past.')
      }

      if (rideCategory === 'personal_vehicle' && !offerData.vehicle_number) {
        throw new Error('Vehicle number is required for Student Pool rides.')
      }

      if (rideCategory === 'personal_vehicle' && offerData.vehicle_number && !isValidIndianVehicleNumber(offerData.vehicle_number)) {
        throw new Error('Please enter a valid Indian vehicle number (e.g., TS09XX1234).')
      }

      const originLower = offerData.origin.toLowerCase();
      const destLower = offerData.destination.toLowerCase();
      if (!originLower.includes('vnr') && !destLower.includes('vnr')) {
        throw new Error('Either the pickup or drop location must be VNR VJIET.')
      }
      
      // Convert the local datetime-local string to a proper UTC ISO string for Supabase
      const isoDepartureTime = new Date(offerData.departure_time).toISOString();
      const targetDateStr = isoDepartureTime.split('T')[0];

      // Check if user already has an active or in_progress ride on this date
      const { data: existingRides } = await supabase
        .from('rides')
        .select('id, departure_time')
        .eq('driver_id', currentUserId)
        .in('status', ['active', 'in_progress']);

      if (existingRides) {
        const hasRideOnSameDay = existingRides.some(r => {
          if (!r.departure_time) return false;
          return r.departure_time.split('T')[0] === targetDateStr;
        });

        if (hasRideOnSameDay) {
          throw new Error('You can only offer one ride per day. Please complete or cancel your existing active ride for this date first.');
        }
      }
      
      const { error } = await supabase.from('rides').insert({
        ...offerData,
        route_id: offerData.route_id === 'none' ? null : offerData.route_id,
        departure_time: isoDepartureTime,
        driver_id: currentUserId,
        ride_category: rideCategory,
        available_seats: offerData.total_seats
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Ride offered successfully!')
      queryClient.invalidateQueries({ queryKey: ['rides'] })
      queryClient.invalidateQueries({ queryKey: ['myRides'] })
      setActiveTab('My Rides')
      setOfferData({
        origin: '',
        destination: 'VNR VJIET Campus Gate 1',
        departure_time: '',
        vehicle_type: rideCategory === 'auto_split' ? 'auto' : 'bike',
        vehicle_number: currentUserProfile?.vehicle_number || '',
        total_seats: 1,
        price_per_seat: 0,
        is_women_only: false,
        route_id: ''
      })
    },
    onError: (e) => toast.error(e.message)
  })

  const handleBook = async (ride: any) => {
    if (ride.is_women_only && currentUserProfile?.gender !== 'female') {
      toast.error('This is a women-only ride.')
      return
    }
    
    // Open the confirmation dialog instead of booking immediately
    setSelectedRideForBooking(ride)
  }

  const executeBooking = async (pickupLocation: string, dropoffLocation: string, fractionalPrice: number) => {
    if (!selectedRideForBooking) return;
    const ride = selectedRideForBooking;

    let bookingData: any = {
      ride_id: ride.id,
      passenger_id: currentUserId,
      status: 'pending'
    }

    // Save customized locations and price
    bookingData.pickup_location = pickupLocation
    bookingData.dropoff_location = dropoffLocation
    bookingData.fractional_price = fractionalPrice

    const { error } = await supabase.from('bookings').insert(bookingData)
    
    if (error) {
      playError()
      triggerHeavyHaptic()
      toast.error(error.message)
    } else {
      playSuccess()
      triggerHaptic([100, 50, 100])
      toast.success('Booking requested! Wait for approval.')
      await supabase.from('notifications').insert({
        user_id: ride.driver_id,
        title: 'New Ride Request! 👤',
        message: `${currentUserProfile?.full_name || 'Someone'} requested a seat on your ride from ${ride.origin} to ${ride.destination}.`
      })
      queryClient.invalidateQueries({ queryKey: ['rides'] })
      queryClient.invalidateQueries({ queryKey: ['has_active_booking'] })
    }
  }

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, rideId, wasApproved, currentSeats }: { bookingId: string, rideId: string, wasApproved: boolean, currentSeats: number }) => {
      // Call server-side API route to bypass RLS restrictions on bookings table
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, rideId, wasApproved, currentSeats })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to cancel booking')
    },
    onSuccess: () => {
      playPop()
      triggerHaptic(50)
      toast.success('Booking cancelled successfully.')
      queryClient.invalidateQueries({ queryKey: ['rides'] })
      queryClient.invalidateQueries({ queryKey: ['my_rides'] })
      queryClient.invalidateQueries({ queryKey: ['has_active_booking'] })
    },
    onError: (e) => {
      playError()
      triggerHeavyHaptic()
      toast.error(`Failed to cancel: ${e.message}`)
    }
  })

  // Obfuscator helper
  const obfuscatePhone = (phone: string) => {
    if (!phone || phone.length < 10) return phone
    // Mask most digits except last 4
    return phone.substring(0, 3) + ' XXXX ' + phone.substring(phone.length - 4)
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-24 sm:pb-12 space-y-4 sm:space-y-6 text-foreground relative z-10">
      
      {/* ── Executive Campus App Bar ────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-2xl bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border shadow-xs px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-3 sticky top-3 z-40"
      >
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 border border-blue-500/30 flex items-center justify-center overflow-hidden p-1 shadow-xs shrink-0">
            <Image src="/vnr-logo.png" alt="VNR VJIET" width={24} height={24} className="object-contain" priority />
          </div>
          <span className={`text-base sm:text-lg font-bold tracking-tight text-foreground leading-none ${righteous.className}`}>
            VNR <span className="text-blue-600 dark:text-blue-400">Pool</span>
          </span>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center p-1 bg-secondary/60 dark:bg-slate-900/60 rounded-xl border border-border/80 shadow-xs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 z-10 text-center whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeTab === tab
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="active-header-tab"
                  className="absolute inset-0 rounded-lg bg-blue-600 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab === 'Find a Ride' && <Search className="w-3.5 h-3.5" />}
                {tab === 'Offer a Seat' && <Plus className="w-3.5 h-3.5" />}
                {tab === 'My Rides' && <List className="w-3.5 h-3.5" />}
                <span>{tab}</span>
                {tab === 'Find a Ride' && rides && rides.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-md text-[9px] font-bold",
                    activeTab === tab ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {rides.length}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Notifications & User Profile (Theme & Logout are inside Profile) */}
        <div className="flex items-center gap-2">
          <Notifications currentUserId={currentUserId} />

          {/* Profile Menu Sheet */}
          <Sheet>
            <SheetTrigger 
              render={
                <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/70 transition-colors cursor-pointer group">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-border shadow-xs relative shrink-0">
                    {currentUserProfile?.avatar_url ? (
                      <img src={currentUserProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                        {currentUserProfile?.full_name ? currentUserProfile.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[80px]">
                      {currentUserProfile?.full_name ? currentUserProfile.full_name.split(' ')[0] : 'Profile'}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      <span>
                        {currentUserProfile?.rating_count > 0 
                          ? (currentUserProfile.total_rating_score / currentUserProfile.rating_count).toFixed(1)
                          : "New"}
                      </span>
                    </div>
                  </div>
                </button>
              }
            />
            <SheetContent side="right" className="w-[300px] sm:w-[380px] flex flex-col gap-6">
              <SheetHeader className="text-left mt-6">
                <SheetTitle className="text-2xl font-black">Account & Profile</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-border shrink-0">
                    {currentUserProfile?.avatar_url ? (
                      <img src={currentUserProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-2xl">
                        {currentUserProfile?.full_name ? currentUserProfile.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">{currentUserProfile?.full_name || 'User'}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      {currentUserProfile?.rating_count > 0 
                        ? (currentUserProfile.total_rating_score / currentUserProfile.rating_count).toFixed(1)
                        : "New"}
                    </p>
                    {currentUserProfile?.is_verified_driver && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        Verified Student Driver
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                      <Zap className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-medium text-sm">Theme</span>
                  </div>
                  <ThemeToggle />
                </div>

                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <ProfileEditor currentUserId={currentUserId} />
                </div>

                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-3 h-12 mt-auto font-bold"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" /> Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.header>

      {/* ── Mobile/Tablet Secondary Tabs ────────────────────────── */}
      <div className="md:hidden flex p-1 bg-secondary/70 dark:bg-slate-900/70 rounded-xl border border-border shadow-xs w-full">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === tab
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === 'Find a Ride' && <Search className="w-3.5 h-3.5" />}
            {tab === 'Offer a Seat' && <Plus className="w-3.5 h-3.5" />}
            {tab === 'My Rides' && <List className="w-3.5 h-3.5" />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* ── Primary Content Area ─────────────────────────────────── */}
      {activeTab === 'Find a Ride' ? (
        <div className="space-y-4 sm:space-y-5">
          {/* ── Transit Command & Search Bar ────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-card border border-border shadow-xs p-3.5 sm:p-4 space-y-3 transition-colors"
          >
            {/* Top Row: Mode Switcher + Quick Dialogs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Category Segmented Control */}
              <div className="inline-flex p-1 bg-secondary/80 dark:bg-slate-900/80 rounded-xl border border-border/70 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('personal_vehicle')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                    rideCategory === 'personal_vehicle'
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Pool (Car/Bike)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('auto_split')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                    rideCategory === 'auto_split'
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Auto / Cab Split</span>
                </button>
              </div>

              {/* Utility Triggers: Map & Leaderboard */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-xl border-border bg-background hover:bg-secondary text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>Map View</span>
                      {(rides?.length || 0) > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                          {rides?.length}
                        </span>
                      )}
                    </Button>
                  } />
                  <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-slate-900 border-slate-700/50 rounded-3xl shadow-2xl">
                    <LiveDashboardMap 
                      rides={rides || []} 
                      selectedRide={selectedMapRide} 
                      onRideSelect={setSelectedMapRide} 
                      searchOrigin={originFilter}
                      searchDestination={destinationFilter}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-xl border-border bg-background hover:bg-secondary text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Leaderboard</span>
                    </Button>
                  } />
                  <DialogContent className="max-w-lg w-[95vw] p-0 overflow-hidden bg-transparent border-none shadow-none">
                    <EcoLeaderboard currentUserId={currentUserId} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-5">
                <LocationAutocomplete
                  placeholder="Pickup location..."
                  value={originFilter}
                  onChange={setOriginFilter}
                  className="h-10 bg-secondary/40 dark:bg-slate-950/60 border-border/80 rounded-xl text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="md:col-span-5">
                <LocationAutocomplete
                  placeholder="Dropoff destination..."
                  value={destinationFilter}
                  onChange={setDestinationFilter}
                  className="h-10 bg-secondary/40 dark:bg-slate-950/60 border-border/80 rounded-xl text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-1.5">
                <Input
                  type="date"
                  value={dateFilter}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDateFilter(e.target.value)}
                  className="h-10 bg-secondary/40 dark:bg-slate-950/60 border-border/80 rounded-xl text-xs font-medium"
                />
                {(originFilter || destinationFilter || dateFilter) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setOriginFilter('')
                      setDestinationFilter('')
                      setDateFilter('')
                    }}
                    title="Reset filters"
                    className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Corridor Filter Pills + Women-only toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                {["JNTU Metro", "Miyapur Metro", "Pragathi Nagar", "Secunderabad", "Gandi Maisamma"].map((corridor) => (
                  <button
                    key={corridor}
                    onClick={() => setOriginFilter(originFilter === corridor ? '' : corridor)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border",
                      originFilter === corridor
                        ? "bg-blue-600 text-white border-blue-600 font-semibold"
                        : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60"
                    )}
                  >
                    {corridor}
                  </button>
                ))}
              </div>

              {currentUserProfile?.gender === 'female' && (
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <Switch
                    id="women-only"
                    checked={womenOnlyFilter}
                    onCheckedChange={setWomenOnlyFilter}
                  />
                  <Label htmlFor="women-only" className="text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1 cursor-pointer">
                    <Shield className="w-3.5 h-3.5" /> Women Only
                  </Label>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Live Departures Section Header ──────────────────── */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Available Rides</h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <span className="text-xs font-semibold text-muted-foreground">
              {rides?.length || 0} active ride{(rides?.length || 0) === 1 ? '' : 's'}
            </span>
          </div>

          {/* ── Ride Feed ────────────────────────────────────────── */}
          <PullToRefresh onRefresh={handleRefresh}>
            <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pb-10">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <RideCardSkeleton key={i} index={i} />
                ))
            ) : rides?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="col-span-full flex flex-col items-center justify-center py-16 sm:py-24 text-muted-foreground gap-5"
              >
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping opacity-50" />
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center border border-border shadow-inner">
                    <Car className="w-10 h-10 text-blue-500/50" />
                  </div>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <p className="font-bold text-xl text-foreground">No rides right now</p>
                  <p className="text-sm text-muted-foreground">It's a little quiet on this route. Why not be the first to offer a seat and help others out?</p>
                </div>
                <Button 
                  onClick={() => setActiveTab('Offer a Seat')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 px-6 py-6"
                >
                  <Car className="w-5 h-5 mr-2" />
                  Be the first to offer a seat!
                </Button>
              </motion.div>
            ) : (
              rides?.map((ride, i) => {
                const myBooking = ride.bookings?.find(b => b.passenger.id === currentUserId && (b.status === 'pending' || b.status === 'approved'))
                const isPending = myBooking?.status === 'pending'
                const isApproved = myBooking?.status === 'approved'
                const isFull = ride.available_seats === 0
                const isMyRide = ride.driver_id === currentUserId

                const displayPrice = ride.ride_category === 'auto_split'
                  ? (ride as any).dynamic_price
                  : (ride as any).fractional_price

                const timeStr = new Date(ride.departure_time).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                const dateStr = new Date(ride.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric' })

                return (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="rounded-2xl bg-card border border-border/80 hover:border-blue-500/40 shadow-xs hover:shadow-sm transition-all p-4 sm:p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Row: Departure Time & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-foreground font-bold">{timeStr}</span>
                        <span>•</span>
                        <span>{dateStr}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ride.is_women_only && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Women Only
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide bg-secondary text-muted-foreground border border-border/60">
                          {ride.vehicle_type === 'bike' ? '🏍️ Bike' : 
                           ride.vehicle_type === 'auto' ? '🛺 Auto Split' : 
                           (ride.ride_category === 'auto_split' ? '🚕 Cab Split' : '🚗 Car')}
                        </span>
                      </div>
                    </div>

                    {/* Route Visualizer */}
                    <div className="space-y-2 relative pl-4 py-0.5">
                      <div className="absolute left-1.5 top-2.5 bottom-2.5 w-[1.5px] bg-border" />
                      
                      {/* Origin */}
                      <div className="relative">
                        <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                        <span className="text-sm font-semibold text-foreground block truncate">
                          {ride.origin}
                        </span>
                      </div>

                      {/* Destination */}
                      <div className="relative">
                        <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-background" />
                        <span className="text-sm font-bold text-foreground block truncate">
                          {ride.destination}
                        </span>
                      </div>
                    </div>

                    {/* Driver, Available Seats & Price */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
                      {/* Driver */}
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedProfileId(ride.driver?.id || null)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-border shadow-xs shrink-0 flex items-center justify-center font-bold text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {ride.driver?.avatar_url ? (
                            <img src={ride.driver.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            ride.driver?.full_name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground flex items-center gap-1 leading-tight">
                            <span>{ride.driver?.full_name}</span>
                            <span className="text-[10px] text-amber-500 font-semibold flex items-center">
                              ★ {ride.driver?.rating_count && ride.driver.rating_count > 0 
                                ? ((ride.driver.total_rating_score || 0) / ride.driver.rating_count).toFixed(1) 
                                : 'New'}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {isFull ? (
                              <span className="text-rose-500 font-semibold">Fully booked</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {ride.available_seats} seat{ride.available_seats > 1 ? 's' : ''} left
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="text-xl sm:text-2xl font-black text-foreground leading-none">
                          ₹{displayPrice}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
                          {ride.ride_category === 'auto_split' ? 'your share' : 'per seat'}
                        </span>
                      </div>
                    </div>

                    {/* Fractional match or route map button */}
                    {(ride.route_id || (ride as any).matchType === 'fractional') && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <button
                            onClick={() => setExpandedMaps(prev => prev.includes(ride.id) ? prev.filter(id => id !== ride.id) : [...prev, ride.id])}
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{expandedMaps.includes(ride.id) ? 'Hide Map' : 'View Route'}</span>
                          </button>

                          <a 
                            href={`https://wa.me/?text=${encodeURIComponent(`🚗 Ride offered on VNR Pool!\n📍 ${ride.origin} ➡️ ${ride.destination}\n⏰ ${timeStr}\n💰 ₹${displayPrice}\n\nBook my seat here: https://vnr-pool-psi.vercel.app/?ride=${ride.id}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Share</span>
                          </a>
                        </div>

                        {(ride as any).matchType === 'fractional' && (
                          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] px-2.5 py-1 rounded-lg font-medium">
                            ✨ En-Route Match (Discounted rate)
                          </div>
                        )}

                        {expandedMaps.includes(ride.id) && ride.route_id && (
                          <div className="mt-2">
                            <RouteMap waypoints={
                              (ride as any).matchType === 'fractional'
                                ? getSlicedWaypoints(ride.route_id, originFilter || ride.origin, destinationFilter || ride.destination)
                                : getRouteById(ride.route_id)?.waypoints || []
                            } />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Co-passengers */}
                    {ride.bookings && ride.bookings.filter(b => b.status === 'approved').length > 0 && (
                      <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-semibold">Riders:</span>
                        {ride.bookings.filter(b => b.status === 'approved').map((b, idx) => (
                          <div 
                            key={`${b.passenger.id}-${idx}`} 
                            className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-[11px] font-semibold text-foreground cursor-pointer hover:bg-secondary/80"
                            onClick={() => setSelectedProfileId(b.passenger.id)}
                          >
                            <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-blue-600 text-[8px] text-white flex items-center justify-center font-bold">
                              {b.passenger.avatar_url ? (
                                <img src={b.passenger.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                b.passenger.full_name?.charAt(0) || 'U'
                              )}
                            </div>
                            <span>{b.passenger.full_name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 pt-1 mt-auto">
                      {myBooking ? (
                        <Button
                          onClick={() => {
                            toast('Cancel Seat Request?', {
                              description: 'Are you sure you want to cancel your seat request?',
                              action: {
                                label: 'Yes, Cancel',
                                onClick: () => cancelBookingMutation.mutate({
                                  bookingId: myBooking.id,
                                  rideId: ride.id,
                                  wasApproved: isApproved,
                                  currentSeats: ride.available_seats
                                })
                              },
                              cancel: { label: 'Keep Seat', onClick: () => {} }
                            })
                          }}
                          disabled={cancelBookingMutation.isPending || ride.status === 'in_progress'}
                          className={cn(
                            "flex-1 h-10 font-bold text-xs rounded-xl transition-all cursor-pointer",
                            ride.status === 'in_progress'
                              ? "bg-blue-500 text-white opacity-100"
                              : isApproved
                                ? "bg-primary hover:bg-red-500 text-primary-foreground hover:text-white"
                                : "bg-secondary text-secondary-foreground hover:bg-red-500 hover:text-white"
                          )}
                        >
                          {ride.status === 'in_progress' ? '🚗 In Progress' : cancelBookingMutation.isPending ? 'Cancelling…' : isApproved ? '✓ Approved — Cancel' : '⏳ Pending — Cancel'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleBook(ride)}
                          disabled={isMyRide || isFull || hasActiveBooking}
                          className={cn(
                            "flex-1 h-10 font-bold text-xs rounded-xl transition-all cursor-pointer",
                            isMyRide
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : isFull
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : hasActiveBooking
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          )}
                        >
                          {isMyRide 
                            ? 'Your Ride' 
                            : isFull 
                              ? 'Fully Booked' 
                              : hasActiveBooking 
                                ? 'Active Ride Booked' 
                                : 'Request Seat'}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-border hover:bg-secondary shrink-0 cursor-pointer"
                        onClick={() => setChatRide(ride)}
                        title="Chat"
                      >
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </Button>

                      {ride.driver?.mobile_number && (
                        <a href={`tel:${ride.driver.mobile_number}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl border-border hover:bg-secondary shrink-0 cursor-pointer"
                            title="Call"
                          >
                            <Phone className="w-4 h-4 text-primary" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
            </div>
          </PullToRefresh>
        </div>
      ) : activeTab === 'Offer a Seat' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card dark:bg-[#0e1320] text-foreground rounded-3xl border border-border dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-6 md:p-8 border-b border-border/40">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1">Offer a Campus Ride</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Register your journey along Hyderabad corridors for verified peer carpool.</p>
            </div>
            
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Row 1: Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground">Origin (Pickup Hub)</Label>
                    <LocationAutocomplete 
                      value={offerData.origin}
                      onChange={(v) => setOfferData({...offerData, origin: v})}
                      placeholder="e.g. Kukatpally JNTU Metro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground">Destination (Campus Drop)</Label>
                    <LocationAutocomplete 
                      value={offerData.destination}
                      onChange={(v) => setOfferData({...offerData, destination: v})}
                      placeholder="e.g. VNR VJIET Campus Gate 1"
                    />
                  </div>
                </div>
                
                {/* Row 2: Route & Vehicle Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={cn("grid gap-4", rideCategory === 'personal_vehicle' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-2 flex flex-col justify-end">
                      <Label className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                        Vehicle Type
                        {offerData.vehicle_type && (
                          <span className="text-lg">
                            {offerData.vehicle_type === 'bike' ? '🏍️' : 
                             offerData.vehicle_type === 'auto' ? '🛺' : 
                             (rideCategory === 'auto_split' ? '🚕' : '🚗')}
                          </span>
                        )}
                      </Label>
                      <Select onValueChange={(v) => { 
                        if (v) {
                          const maxSeats = v === 'bike' ? 1 : v === 'auto' ? 2 : 4;
                          let defaultNum = offerData.vehicle_number;
                          if (v === 'car' && currentUserProfile?.car_number) defaultNum = currentUserProfile.car_number;
                          if (v === 'bike' && currentUserProfile?.bike_number) defaultNum = currentUserProfile.bike_number;
                          
                          setOfferData({
                            ...offerData, 
                            vehicle_type: v as 'bike' | 'auto' | 'car',
                            vehicle_number: defaultNum,
                            total_seats: offerData.total_seats > maxSeats ? maxSeats : offerData.total_seats
                          })
                        }
                      }} value={offerData.vehicle_type}>
                        <SelectTrigger className="bg-secondary/50 dark:bg-slate-950 border-border dark:border-slate-800 h-12 rounded-xl focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover dark:bg-[#0e1320] border-border dark:border-slate-800 shadow-xl">
                          {rideCategory === 'personal_vehicle' ? (
                            <>
                              <SelectItem value="bike">Bike (2-Wheeler)</SelectItem>
                              <SelectItem value="car">Car (4-Wheeler)</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="auto">Auto Pool Group</SelectItem>
                              <SelectItem value="car">Cab Split</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {rideCategory === 'personal_vehicle' && (
                      <div className="space-y-2 flex flex-col justify-end">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-semibold text-sm text-foreground">Vehicle Reg. No.</Label>
                        </div>
                        <div className="relative">
                          <Input 
                            required
                            value={offerData.vehicle_number}
                            onChange={e => setOfferData({...offerData, vehicle_number: e.target.value})}
                            className={cn(
                              "bg-secondary/50 dark:bg-slate-950 border-border dark:border-slate-800 h-12 rounded-xl focus-visible:ring-blue-500 uppercase pr-10",
                              offerData.vehicle_number.length > 0 && !isValidIndianVehicleNumber(offerData.vehicle_number) ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                            placeholder="TS09XX1234"
                          />
                          {offerData.vehicle_number.length > 0 && (
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                              {isValidIndianVehicleNumber(offerData.vehicle_number) ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-500" />
                              )}
                            </div>
                          )}
                        </div>
                        {offerData.vehicle_number.length > 0 && !isValidIndianVehicleNumber(offerData.vehicle_number) && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                            <XCircle className="w-3 h-3" />
                            Please enter a valid Indian plate (e.g., TS09XX1234)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground">Predefined Transit Route</Label>
                    <div className="relative">
                      <Select value={offerData.route_id || 'none'} onValueChange={v => setOfferData({...offerData, route_id: (!v || v === 'none') ? '' : v})}>
                        <SelectTrigger className="bg-secondary/50 dark:bg-slate-950 border-border dark:border-slate-800 min-h-[72px] py-2 rounded-xl focus:ring-blue-500 flex flex-col items-start justify-center px-4 text-left">
                          <SelectValue placeholder="Select a predefined route to enable En-Route Matching" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover dark:bg-[#0e1320] border-border dark:border-slate-800 shadow-xl max-h-[300px]">
                          <SelectItem value="none">
                            <div className="font-bold">Custom Route</div>
                            <div className="text-xs text-muted-foreground">Direct trip without intermediate waypoint pickups</div>
                          </SelectItem>
                          {COLLEGE_ROUTES.filter(route => {
                            if (!offerData.origin && !offerData.destination) return true;
                            const clean = (s: string) => s.toLowerCase().trim();
                            const o = offerData.origin ? clean(offerData.origin) : '';
                            const d = offerData.destination ? clean(offerData.destination) : '';
                            
                            const oIdx = o ? route.waypoints.findIndex(w => clean(w).includes(o) || o.includes(clean(w))) : -1;
                            const dIdx = d ? route.waypoints.findIndex(w => clean(w).includes(d) || d.includes(clean(w))) : -1;
                            
                             if (o && !d) return oIdx !== -1;
                             if (!o && d) return dIdx !== -1;
                             return oIdx !== -1 && dIdx !== -1 && oIdx !== dIdx;
                          }).map((route, idx) => (
                            <SelectItem key={route.id} value={route.id}>
                              <div className="font-bold">Corridor {idx + 1}</div>
                              <div className="text-xs text-muted-foreground">Via {route.waypoints.join(' → ')}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Row 4: Date, Time, Seats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground">Departure Date & Time</Label>
                    <div className="relative">
                      <Input 
                        type="datetime-local"
                        value={offerData.departure_time}
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        onChange={e => setOfferData({...offerData, departure_time: e.target.value})}
                        className={cn(
                          "bg-secondary/50 dark:bg-slate-950 border-border dark:border-slate-800 h-12 rounded-xl focus-visible:ring-blue-500",
                          offerData.departure_time && new Date(offerData.departure_time).getTime() < Date.now() ? "border-rose-500 focus-visible:ring-rose-500" : ""
                        )}
                      />
                    </div>
                    {offerData.departure_time && new Date(offerData.departure_time).getTime() < Date.now() && (
                      <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                        <XCircle className="w-3 h-3" />
                        Departure time must be in the future
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground">
                      Seats Offered (Max: {offerData.vehicle_type === 'bike' ? 1 : offerData.vehicle_type === 'auto' ? 2 : 4})
                    </Label>
                    <Input 
                      type="number" min="1" max={offerData.vehicle_type === 'bike' ? 1 : offerData.vehicle_type === 'auto' ? 2 : 4}
                      value={offerData.total_seats || ''}
                      onChange={e => {
                        const max = offerData.vehicle_type === 'bike' ? 1 : offerData.vehicle_type === 'auto' ? 2 : 4;
                        let val = parseInt(e.target.value) || 0;
                        if (val > max) val = max;
                        setOfferData({...offerData, total_seats: val});
                      }}
                      className="bg-secondary/50 dark:bg-slate-950 border-border dark:border-slate-800 h-12 rounded-xl focus-visible:ring-blue-500 font-bold"
                    />
                  </div>
                </div>
                
                {/* Row 5: Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {rideCategory === 'auto_split' ? 'Total Trip Cost (₹)' : 'Price per Seat (₹)'}
                        {rideCategory === 'personal_vehicle' && (
                          <span className="hidden sm:flex text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 items-center gap-1 font-semibold">
                            <Sparkles className="w-3 h-3" />
                            VNR Smart Fare
                          </span>
                        )}
                      </Label>
                      {rideCategory === 'personal_vehicle' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAIFareSuggestion}
                          disabled={isAIFareLoading || !offerData.origin || !offerData.destination}
                          className="h-7 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          {isAIFareLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          AI Suggestion
                        </Button>
                      )}
                    </div>
                    <Input 
                      type="number" min="0"
                      value={offerData.price_per_seat || ''}
                      onChange={e => setOfferData({...offerData, price_per_seat: parseInt(e.target.value) || 0})}
                      className="bg-secondary/50 dark:bg-slate-950 border-border dark:border-slate-800 h-12 rounded-xl focus-visible:ring-blue-500 font-black text-xl"
                    />
                    {aiFareReasoning && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-in slide-in-from-top-1 fade-in">
                        <Sparkles className="w-3 h-3 inline mr-1" /> {aiFareReasoning}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Label className="font-semibold text-sm text-foreground">Pricing Protocol</Label>
                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center px-4 min-h-[48px] py-2">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm tracking-wide">
                        {rideCategory === 'auto_split' ? 'Dynamic meter split computed proportionally' : 'Fixed non-profit fuel contribution per seat'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {currentUserProfile?.gender === 'female' && (
                  <div className="flex items-center justify-between p-4 bg-pink-50/80 dark:bg-pink-950/30 rounded-xl border border-pink-200 dark:border-pink-900/40">
                    <div className="space-y-1">
                      <Label className="text-pink-700 dark:text-pink-400 flex items-center gap-2 font-bold">
                        <Shield className="w-5 h-5" /> Women Only Ride
                      </Label>
                      <p className="text-xs text-pink-600/90 dark:text-pink-400/80 font-medium">Only verified female students can view and book seats.</p>
                    </div>
                    <Switch 
                      checked={offerData.is_women_only}
                      onCheckedChange={v => setOfferData({...offerData, is_women_only: v})}
                    />
                  </div>
                )}

                <Button
                  onClick={() => offerMutation.mutate()}
                  disabled={offerMutation.isPending || !offerData.origin || !offerData.departure_time || (rideCategory === 'personal_vehicle' && !offerData.vehicle_number)}
                  className="w-full h-13 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {offerMutation.isPending ? 'Publishing Ride to Campus Feed…' : 'Publish Campus Ride'}
                </Button>
              </div>

          </div>
        </motion.div>
      ) : activeTab === 'My Rides' ? (
        <MyRides currentUserId={currentUserId} />
      ) : null}

      {chatRide && (
        <ChatModal 
          isOpen={!!chatRide}
          onClose={() => setChatRide(null)}
          rideId={chatRide.id}
          currentUserId={currentUserId}
          otherUserId={chatRide.driver_id}
          otherUserName={chatRide.driver?.full_name || 'Driver'}
        />
      )}

      <PublicProfileDialog 
        userId={selectedProfileId}
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />

      <ConfirmBoardingDialog 
        isOpen={!!selectedRideForBooking}
        onClose={() => setSelectedRideForBooking(null)}
        ride={selectedRideForBooking}
        onConfirm={executeBooking}
        defaultPickup={originFilter || undefined}
        defaultDropoff={destinationFilter || undefined}
      />

      {/* ── Mobile Bottom Navigation ────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 flex items-center justify-around px-2 pb-safe">
        <button
          onClick={() => setActiveTab('Find a Ride')}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
            activeTab === 'Find a Ride' ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
          )}
        >
          <Search className={cn("w-5 h-5 transition-transform", activeTab === 'Find a Ride' && "scale-110")} />
          <span className="text-[10px] font-medium tracking-wide">Search</span>
        </button>

        <button
          onClick={() => setActiveTab('Offer a Seat')}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative",
            activeTab === 'Offer a Seat' ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
          )}
        >
          <div className={cn(
            "absolute -top-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform",
            activeTab === 'Offer a Seat' 
              ? "bg-blue-600 text-white scale-110" 
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          )}>
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium tracking-wide mt-6">Offer</span>
        </button>

        <button
          onClick={() => setActiveTab('My Rides')}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
            activeTab === 'My Rides' ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
          )}
        >
          <List className={cn("w-5 h-5 transition-transform", activeTab === 'My Rides' && "scale-110")} />
          <span className="text-[10px] font-medium tracking-wide">Rides</span>
        </button>
      </div>

    </div>
  )
}
