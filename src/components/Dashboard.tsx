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
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-10 space-y-6 sm:space-y-10 text-foreground relative z-10">
      
      {/* ── Header ────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 sm:gap-6 relative pt-1 sm:pt-2">
        <div className="absolute left-0 top-0 flex items-center gap-2 z-50">
          <Sheet>
            <SheetTrigger 
              render={
                <button className="inline-flex items-center justify-center whitespace-nowrap bg-transparent w-12 h-12 rounded-full p-0 overflow-hidden border-2 border-border shadow-sm hover:ring-2 hover:ring-blue-500 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
                  {currentUserProfile?.avatar_url ? (
                    <img src={currentUserProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-lg">
                      {currentUserProfile?.full_name ? currentUserProfile.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </button>
              }
            />
            <SheetContent side="left" className="w-[300px] sm:w-[400px] flex flex-col gap-6">
              <SheetHeader className="text-left mt-6">
                <SheetTitle className="text-2xl font-black">Menu</SheetTitle>
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
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                      <Zap className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-medium">Theme</span>
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
        <div className="absolute right-0 top-0 flex items-center gap-2 z-50">
          <Notifications currentUserId={currentUserId} />
        </div>
        {/* Logo + tagline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
          className="text-center space-y-2 mt-3 sm:mt-4"
        >
          {/* Live pulse */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="retro-badge text-blue-500 border-blue-500/30 px-2 py-0.5">Live Rides</span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(29,78,216,0.2)] hover:scale-105 transition-transform duration-300 overflow-hidden relative border-2 border-blue-500/20 bg-[#1e3a8a]">
              <Image src="/vnr-logo.png" alt="VNR VJIET" fill className="object-contain p-1.5" />
            </div>
          </div>

          <h1 className={`hero-title gradient-text ${righteous.className}`}>
            VNR Pool
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-xs sm:max-w-md mx-auto leading-relaxed mt-3">
            Share rides &middot; Split costs &middot; Commute smarter 🚗
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22,1,0.36,1] }}
          className="hidden sm:flex p-1 bg-muted/60 rounded-full border border-border w-full backdrop-blur-md shadow-sm"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative flex-1 px-2 py-2.5 rounded-full text-sm font-bold transition-all duration-300 z-10 text-center whitespace-nowrap",
                activeTab === tab
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-full -z-10 tab-active-glow"
                  style={{ background: 'linear-gradient(135deg, oklch(0.58 0.22 250), oklch(0.65 0.2 260))' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.55 }}
                />
              )}
              {tab}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── Category Toggle ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="flex justify-center gap-3 sm:gap-5"
      >
        {[
          { key: 'auto_split',       label: 'Auto / Cab Split', icon: Navigation, color: 'yellow' },
          { key: 'personal_vehicle', label: 'Student Pool',     icon: Car,        color: 'blue' },
        ].map(({ key, label, icon: Icon, color }) => (
          <SpotlightCard
            key={key}
            spotlightColor='oklch(0.58 0.22 255 / 0.10)'
            className={cn(
              "flex flex-col items-center py-4 px-3 sm:p-5 rounded-2xl border transition-all duration-300 w-36 sm:w-44 group cursor-pointer press-scale select-none",
              rideCategory === key
                ? "border-blue-500/50 bg-card shadow-md scale-[1.04]"
                : "border-border bg-card/40 hover:bg-card/70 opacity-60 hover:opacity-100 hover:scale-[1.02] backdrop-blur-sm"
            )}
            onClick={() => handleCategoryChange(key as 'auto_split' | 'personal_vehicle')}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleCategoryChange(key as 'auto_split' | 'personal_vehicle')}
          >
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110",
              rideCategory === key
                ? 'bg-blue-500/10'
                : 'bg-muted'
            )}>
              <Icon className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300",
                rideCategory === key
                  ? 'text-blue-500'
                  : 'text-muted-foreground'
              )} />
            </div>
            <span className={cn(
              "text-xs sm:text-sm font-bold transition-colors duration-300",
              rideCategory === key ? 'text-foreground' : 'text-muted-foreground'
            )}>{label}</span>
          </SpotlightCard>
        ))}
      </motion.div>

      {/* Content Area */}
      {activeTab === 'Find a Ride' ? (
        <div className="space-y-6">
          {/* Feature Buttons (Map & Leaderboard) */}
          <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-6 relative z-30">
            <div className="flex-1 flex">
              <Dialog>
                <DialogTrigger render={
                  <Button className="w-full glass-card retro-noise border border-blue-500/20 hover:border-blue-500/40 text-foreground rounded-2xl h-14 sm:h-16 relative group overflow-hidden shadow-md hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all flex items-center justify-center gap-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" />
                    <span className="font-bold text-sm sm:text-base tracking-wide">Route Maps</span>
                    
                    {/* Notification Badge */}
                    {(rides?.length || 0) > 0 && (
                      <div className="flex h-5 sm:h-6 min-w-[20px] sm:min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1.5 sm:px-2 text-[10px] sm:text-xs font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] shrink-0">
                        {rides?.length}
                      </div>
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
            </div>

            <div className="flex-1 flex">
              <Dialog>
                <DialogTrigger render={
                  <Button className="w-full glass-card retro-noise border border-emerald-500/20 hover:border-emerald-500/40 text-foreground rounded-2xl h-14 sm:h-16 relative group overflow-hidden shadow-md hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center gap-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 shrink-0" />
                    <span className="font-bold text-sm sm:text-base tracking-wide">Eco Impacts Leaderboard</span>
                  </Button>
                } />
                <DialogContent className="max-w-lg w-[95vw] p-0 overflow-hidden bg-transparent border-none shadow-none">
                  <EcoLeaderboard currentUserId={currentUserId} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Search bar ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative z-50 bg-background/60 dark:bg-slate-900/40 backdrop-blur-3xl rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row flex-wrap gap-5 items-start sm:items-end border border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(59,130,246,0.1)]"
          >
            <div className="space-y-2 w-full sm:flex-1 min-w-[140px]">
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> From
              </Label>
              <LocationAutocomplete
                placeholder="e.g. JNTU Metro"
                value={originFilter}
                onChange={setOriginFilter}
                className="bg-background/90 dark:bg-background/50 border-border/50 text-foreground focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl font-medium w-full h-[46px] shadow-sm"
              />
            </div>
            <div className="space-y-2 w-full sm:flex-1 min-w-[140px]">
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-muted-foreground" /> To
              </Label>
              <LocationAutocomplete
                placeholder="e.g. VNR VJIET"
                value={destinationFilter}
                onChange={setDestinationFilter}
                className="bg-background/90 dark:bg-background/50 border-border/50 text-foreground focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl font-medium w-full h-[46px] shadow-sm"
              />
            </div>
            <div className="space-y-2 w-full sm:flex-[0.5] min-w-[120px]">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Date
                </Label>
                {dateFilter && (
                  <button 
                    onClick={() => setDateFilter('')}
                    className="text-xs text-rose-500 hover:text-rose-400 font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type="date"
                  value={dateFilter}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDateFilter(e.target.value)}
                  className="h-[46px] bg-background/90 dark:bg-background/50 border-border/50 text-foreground focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl font-medium px-3 w-full shadow-sm"
                />
              </div>
            </div>
            {currentUserProfile?.gender === 'female' && (
              <div className="flex items-center gap-2 pb-2 w-full sm:w-auto">
                <Switch
                  id="women-only"
                  checked={womenOnlyFilter}
                  onCheckedChange={setWomenOnlyFilter}
                  className="data-[state=checked]:bg-foreground"
                />
                <Label htmlFor="women-only" className="text-foreground flex items-center gap-1.5 cursor-pointer font-semibold text-sm">
                  <Shield className="w-4 h-4" /> Women Only
                </Label>
              </div>
            )}
          </motion.div>

          {/* ── Ride Feed ──────────────────────── */}
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
              rides?.map((ride, i) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 22, scale: 0.975 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.42, ease: [0.22,1,0.36,1] }}
                >
                  <SpotlightCard
                    spotlightColor={
                      ride.is_women_only
                        ? 'oklch(0.65 0.20 340 / 0.15)'
                        : ride.ride_category === 'auto_split'
                        ? 'oklch(0.70 0.18 80 / 0.15)'
                        : 'oklch(0.58 0.22 255 / 0.15)' /* Indigo */
                    }
                    className={cn(
                      "bg-card text-card-foreground rounded-none overflow-hidden relative group float-hover shadow-xl border-none",
                      ride.is_women_only ? "ring-2 ring-pink-500/20 hover:ring-pink-500/50" : "ring-1 ring-border/50 hover:ring-blue-500/30 transition-all duration-300"
                    )}
                  >
                    {/* Subtle top stripe removed for cleaner UI */}

                    {ride.is_women_only && (
                      <div className="absolute top-1 right-0 bg-pink-500 text-white text-[10px] px-3 py-1 font-bold rounded-bl-xl flex items-center gap-1 shadow-md z-10">
                        <Shield className="w-3 h-3" /> Women Only
                      </div>
                    )}

                    {/* TOP SECTION: ROUTE & TIME (Boarding Pass Style) */}
                    <div className="p-5 pb-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> Route
                          </p>
                          <div className="text-xl sm:text-2xl font-black text-foreground leading-tight tracking-tight">
                            {ride.origin} <br />
                            <span className="text-blue-500">→</span> {ride.destination}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" /> Departure
                          </p>
                          <div className="text-base sm:text-lg font-black text-foreground">
                            {new Date(ride.departure_time).toLocaleString('en-US', { hour: '2-digit', minute:'2-digit' })}
                          </div>
                          <div className="text-xs font-semibold text-muted-foreground">
                            {new Date(ride.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Vehicle & Category Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide",
                          ride.ride_category === 'auto_split'
                            ? "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40"
                            : "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40"
                        )}>
                          {ride.ride_category === 'auto_split' ? 'Auto Split' : 'Student Pool'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize text-foreground/80 bg-secondary/80 flex items-center gap-1">
                        <span className="text-sm mr-1">
                          {ride.vehicle_type === 'bike' ? '🏍️' : 
                           ride.vehicle_type === 'auto' ? '🛺' : 
                           (ride.ride_category === 'auto_split' ? '🚕' : '🚗')}
                        </span>
                          {ride.vehicle_type}
                          {ride.vehicle_number && (
                            <>
                              <span className="mx-1 h-3 border-l border-foreground/20" />
                              <span className="uppercase text-muted-foreground">{ride.vehicle_number}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* PERFORATED DIVIDER */}
                    <div className="relative w-full h-4 flex items-center justify-center my-1 overflow-hidden">
                      <div className="absolute inset-x-0 h-[2px] border-t-2 border-dashed border-border/80"></div>
                      <div className="absolute -left-2 w-4 h-4 rounded-full bg-background shadow-inner"></div>
                      <div className="absolute -right-2 w-4 h-4 rounded-full bg-background shadow-inner"></div>
                    </div>

                    {/* BOTTOM SECTION: DRIVER & PRICE */}
                    <div className="p-5 pt-3 space-y-4">
                      <div className="flex justify-between items-end">
                        {/* Driver */}
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedProfileId(ride.driver?.id || null)}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md flex-shrink-0 overflow-hidden",
                            !ride.driver?.avatar_url && (ride.driver?.gender === 'female'
                              ? "bg-gradient-to-br from-pink-400 to-rose-500"
                              : "bg-gradient-to-br from-blue-500 to-blue-700")
                          )}>
                            {ride.driver?.avatar_url ? (
                              <img src={ride.driver?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              ride.driver?.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-0.5">Driver</p>
                            <p className="text-sm font-extrabold text-foreground leading-none flex items-center">
                              {ride.driver?.full_name} 
                              <span className="ml-1 scale-90">{renderStars(ride.driver?.total_rating_score || 0, ride.driver?.rating_count || 0)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          {ride.ride_category === 'auto_split' ? (
                            <>
                              <div className="text-[10px] text-muted-foreground font-bold mb-0.5 uppercase tracking-wide">
                                Total Trip: ₹{ride.price_per_seat}
                              </div>
                              <div className="text-3xl font-black text-amber-600 dark:text-amber-500 leading-none">
                                ₹{(ride as any).dynamic_price}
                              </div>
                              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest mt-1">
                                Your Share
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 flex items-end justify-end gap-1 leading-none">
                                {(ride as any).matchType === 'fractional' && (
                                  <span className="text-[12px] text-blue-300 dark:text-blue-700 line-through mb-1">₹{ride.price_per_seat}</span>
                                )}
                                ₹{(ride as any).fractional_price}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mt-1">
                                {(ride as any).matchType === 'fractional' ? 'your fraction' : 'per seat'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Time + Seats (Moved below driver info) */}
                      <div className="flex items-center gap-3 text-xs font-bold pt-2">
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                          ride.available_seats === 0
                            ? "text-red-600 bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-900/40"
                            : "text-emerald-700 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40"
                        )}>
                          <Users className="w-3.5 h-3.5" />
                          {ride.available_seats === 0 ? 'Full' : (
                            <span className="flex items-center">
                              <AnimatePresence mode="popLayout">
                                <motion.span
                                  key={ride.available_seats}
                                  initial={{ y: -10, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: 10, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="inline-block mr-1 text-center"
                                >
                                  {ride.available_seats}
                                </motion.span>
                              </AnimatePresence>
                              Seats Left
                            </span>
                          )}
                        </div>

                        {/* Seat dots */}
                        <div className="flex gap-1 ml-auto">
                          {Array.from({ length: ride.total_seats }).map((_, si) => (
                            <span key={si} className={cn('seat-dot', si < (ride.total_seats - ride.available_seats) ? 'filled' : 'empty')} />
                          ))}
                        </div>
                      </div>

                      {/* Map Toggle & Rendering */}
                      {(ride.route_id || (ride as any).matchType === 'fractional') && (
                        <div className="pt-2">
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/20 p-2.5 rounded-xl border border-border/40 mb-2">
                            <button 
                              onClick={() => setExpandedMaps(prev => prev.includes(ride.id) ? prev.filter(id => id !== ride.id) : [...prev, ride.id])}
                              className="text-[11px] sm:text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              {expandedMaps.includes(ride.id) ? 'Hide Route Map' : 'View Route Map'}
                            </button>
                            
                            <a 
                              href={`https://wa.me/?text=${encodeURIComponent(`🚗 Ride offered on VNR Pool!\n📍 ${ride.origin} ➡️ ${ride.destination}\n⏰ ${new Date(ride.departure_time).toLocaleString('en-US', { hour: '2-digit', minute:'2-digit' })}\n💰 ₹${ride.ride_category === 'auto_split' ? 'Auto Split' : ride.price_per_seat}\n\nBook my seat here: https://vnr-pool-psi.vercel.app/?ride=${ride.id}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] sm:text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 transition-colors bg-emerald-500/10 px-2.5 py-1 rounded-md"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Share on WhatsApp
                            </a>
                          </div>
                          
                          {(ride as any).matchType === 'fractional' && (
                            <div className="mt-1 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs px-2.5 py-1.5 rounded-md font-medium">
                              <span className="font-bold">✨ En-Route Match!</span> You are boarding halfway through the route, so you only pay a fraction of the cost.
                            </div>
                          )}

                          {expandedMaps.includes(ride.id) && ride.route_id && (
                            <div className="mt-3">
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
                        <div className="pt-2 border-t border-border/40">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Co-Passengers
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {ride.bookings.filter(b => b.status === 'approved').map((b, idx) => (
                              <div 
                                key={`${b.passenger.id}-${idx}`} 
                                className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary border border-border/60 px-2.5 py-1 rounded-full text-xs font-semibold text-foreground cursor-pointer transition-colors"
                                onClick={() => setSelectedProfileId(b.passenger.id)}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-black overflow-hidden",
                                  !b.passenger.avatar_url && (b.passenger.gender === 'female' ? "bg-foreground" : "bg-blue-500")
                                )}>
                                  {b.passenger.avatar_url ? (
                                    <img src={b.passenger.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                    b.passenger.full_name.charAt(0)
                                  )}
                                </div>
                                {b.passenger.full_name.split(' ')[0]}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        {(() => {
                          const myBooking = ride.bookings?.find(b => b.passenger.id === currentUserId && (b.status === 'pending' || b.status === 'approved'))
                          const isPending = myBooking?.status === 'pending'
                          const isApproved = myBooking?.status === 'approved'

                          if (myBooking) {
                            return (
                              <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
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
                                    "w-full font-bold transition-all duration-300",
                                    ride.status === 'in_progress'
                                      ? "bg-blue-500 text-white opacity-100"
                                      : isApproved
                                        ? "bg-primary hover:bg-red-500 text-primary-foreground hover:text-white shadow-md hover:shadow-red-500/30"
                                        : "bg-secondary text-secondary-foreground hover:bg-red-500 hover:text-white"
                                  )}
                                >
                                  {ride.status === 'in_progress' ? '🚗 Ride in Progress (Cannot Cancel)' : cancelBookingMutation.isPending ? 'Cancelling…' : isApproved ? '✓ Approved — Click to Cancel' : '⏳ Pending — Click to Cancel'}
                                </Button>
                              </motion.div>
                            )
                          }

                          const isFull = ride.available_seats === 0
                          return (
                            <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                              <Button
                                onClick={() => handleBook(ride)}
                                disabled={ride.driver_id === currentUserId || isFull || hasActiveBooking}
                                className={cn(
                                  "w-full font-bold  transition-all duration-300",
                                  ride.driver_id === currentUserId
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : isFull
                                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                                      : hasActiveBooking
                                        ? "bg-muted text-muted-foreground cursor-not-allowed border border-border/50 shadow-inner"
                                        : "shiny-btn bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] border-none"
                                )}
                              >
                                {ride.driver_id === currentUserId 
                                  ? 'Your Ride' 
                                  : isFull 
                                    ? '🔒 Fully Booked' 
                                    : hasActiveBooking 
                                      ? 'Already Booked a Ride' 
                                      : '🚗 Request Seat'}
                              </Button>
                            </motion.div>
                          )
                        })()}

                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-transparent border-border hover:bg-blue-100 dark:hover:bg-blue-950/30 hover:border-blue-300 flex-shrink-0 transition-colors"
                          onClick={() => setChatRide(ride)}
                          title="Chat with Rider"
                        >
                          <MessageCircle className="w-4 h-4 text-primary" />
                        </Button>
                        <a href={`tel:${ride.driver?.mobile_number}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-border hover:bg-secondary flex-shrink-0"
                            title="Call Rider"
                          >
                            <Phone className="w-4 h-4 text-primary" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))
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
          <div className="bg-white dark:bg-[#1f2937] text-slate-900 dark:text-slate-100 rounded-3xl border border-border/50 shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-border/10">
              <h2 className="text-3xl font-black text-foreground dark:text-white mb-1">Offer a Ride</h2>
              <p className="text-muted-foreground dark:text-slate-400 text-sm">Fill in the details to share your journey with campus peers.</p>
            </div>
            
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Row 1: Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground dark:text-slate-300">Origin</Label>
                    <LocationAutocomplete 
                      value={offerData.origin}
                      onChange={(v) => setOfferData({...offerData, origin: v})}
                      placeholder="Enter pickup point"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground dark:text-slate-300">Destination</Label>
                    <LocationAutocomplete 
                      value={offerData.destination}
                      onChange={(v) => setOfferData({...offerData, destination: v})}
                      placeholder="e.g. VNR VJIET Campus"
                    />
                  </div>
                </div>
                
                {/* Row 2: Route & Vehicle Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground dark:text-slate-300">Select Your Exact Route</Label>
                    <div className="relative">
                      <Select value={offerData.route_id || 'none'} onValueChange={v => setOfferData({...offerData, route_id: v === 'none' ? '' : v})}>
                        <SelectTrigger className="bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-700/50 min-h-[72px] py-2 rounded-xl focus:ring-blue-500 flex flex-col items-start justify-center px-4 text-left">
                          <SelectValue placeholder="Select a predefined route to enable En-Route Matching" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#1f2937] border-slate-200 dark:border-slate-700 shadow-xl max-h-[300px]">
                          <SelectItem value="none">
                            <div className="font-bold">Custom Route</div>
                            <div className="text-xs text-muted-foreground">No intermediate pickups</div>
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
                            return oIdx !== -1 && dIdx !== -1 && oIdx < dIdx;
                          }).map((route, idx) => (
                            <SelectItem key={route.id} value={route.id}>
                              <div className="font-bold">Option {idx + 1}</div>
                              <div className="text-xs text-slate-500">Via {route.waypoints.join(' → ')}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className={cn("grid gap-4", rideCategory === 'personal_vehicle' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-2 flex flex-col justify-end">
                      <Label className="font-semibold text-sm text-foreground dark:text-slate-300 flex items-center gap-2 mb-2">
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
                        <SelectTrigger className="bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-700/50 h-12 rounded-xl focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#1f2937] border-slate-200 dark:border-slate-700">
                          {rideCategory === 'personal_vehicle' ? (
                            <>
                              <SelectItem value="bike">Bike</SelectItem>
                              <SelectItem value="car">Car</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="car">Cab</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {rideCategory === 'personal_vehicle' && (
                      <div className="space-y-2 flex flex-col justify-end">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-semibold text-sm text-foreground dark:text-slate-300">Vehicle No.</Label>
                        </div>
                        <div className="relative">
                          <Input 
                            required
                            value={offerData.vehicle_number}
                            onChange={e => setOfferData({...offerData, vehicle_number: e.target.value})}
                            className={cn(
                              "bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-700/50 h-12 rounded-xl focus-visible:ring-blue-500 uppercase pr-10",
                              offerData.vehicle_number.length > 0 && !isValidIndianVehicleNumber(offerData.vehicle_number) ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                            placeholder="TS09XX1234"
                          />
                          {offerData.vehicle_number.length > 0 && (
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                              {isValidIndianVehicleNumber(offerData.vehicle_number) ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        {offerData.vehicle_number.length > 0 && !isValidIndianVehicleNumber(offerData.vehicle_number) && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Please enter a valid Indian vehicle number (e.g., TS09XX1234)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Date, Time, Seats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground dark:text-slate-300">Departure Date & Time</Label>
                    <div className="relative">
                      <Input 
                        type="datetime-local"
                        value={offerData.departure_time}
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        onChange={e => setOfferData({...offerData, departure_time: e.target.value})}
                        className={cn(
                          "bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-700/50 h-12 rounded-xl focus-visible:ring-blue-500",
                          offerData.departure_time && new Date(offerData.departure_time).getTime() < Date.now() ? "border-red-500 focus-visible:ring-red-500" : ""
                        )}
                      />
                    </div>
                    {offerData.departure_time && new Date(offerData.departure_time).getTime() < Date.now() && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Departure time must be in the future
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm text-foreground dark:text-slate-300">
                      Total Seats (Max: {offerData.vehicle_type === 'bike' ? 1 : offerData.vehicle_type === 'auto' ? 2 : 4})
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
                      className="bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-700/50 h-12 rounded-xl focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Row 5: Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold text-sm text-foreground dark:text-slate-300 flex items-center gap-2">
                        {rideCategory === 'auto_split' ? 'Total Trip Cost (₹)' : 'Price per Seat (₹)'}
                        {rideCategory === 'personal_vehicle' && (
                          <span className="hidden sm:flex text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Powered by Featherless AI
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
                      className="bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-700/50 h-12 rounded-xl focus-visible:ring-blue-500 font-black text-xl"
                    />
                    {aiFareReasoning && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-in slide-in-from-top-1 fade-in">
                        <Sparkles className="w-3 h-3 inline mr-1" /> {aiFareReasoning}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Label className="font-semibold text-sm text-foreground dark:text-slate-300">Pricing Method</Label>
                    <div className="flex-1 bg-[#0f3d32] dark:bg-[#064e3b]/30 border border-[#059669]/30 rounded-xl flex items-center px-4 min-h-[48px] py-2">
                      <span className="text-[#10b981] dark:text-[#34d399] font-bold text-sm tracking-wide">
                        {rideCategory === 'auto_split' ? 'Dynamic split based on active passengers' : 'Fixed price per passenger'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {currentUserProfile?.gender === 'female' && (
                  <div className="flex items-center justify-between p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-100 dark:border-pink-900/40">
                    <div className="space-y-1">
                      <Label className="text-pink-600 dark:text-pink-400 flex items-center gap-2 font-bold">
                        <Shield className="w-5 h-5" /> Women Only Ride
                      </Label>
                      <p className="text-xs text-pink-700/80 dark:text-pink-500/80 font-medium">Only female users can request seats.</p>
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
                  className="w-full h-14 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-lg rounded-xl shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  {offerMutation.isPending ? 'Publishing…' : 'Post Ride'}
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
