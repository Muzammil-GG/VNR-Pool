"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import anime from 'animejs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRideReminders } from '@/hooks/useRideReminders'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { MapPin, Users, Clock, Shield, MessageCircle, ShieldAlert, Car, Bike, Navigation, Phone, Zap, Star, LogOut, CheckCircle2 } from 'lucide-react'
import { VehicleBackground } from '@/components/VehicleBackground'
import { ChatModal } from '@/components/ChatModal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Notifications } from '@/components/Notifications'
import { ProfileEditor } from '@/components/ProfileEditor'
import { MyRides } from '@/components/MyRides'
import { cn } from '@/lib/utils'
import { LocationAutocomplete } from '@/components/LocationAutocomplete'
import { findBestMatchLocation } from '@/lib/locations'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { PublicProfileDialog } from '@/components/PublicProfileDialog'
import { COLLEGE_ROUTES, getRouteById, checkFractionalMatch, getSlicedWaypoints } from '@/lib/routes'
import { calculateFractionalPrice } from '@/lib/pricing'

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false, loading: () => <div className="h-48 w-full bg-secondary animate-pulse rounded-xl" /> })


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
  const [expandedMaps, setExpandedMaps] = useState<string[]>([])
  
  // Filters
  const [originFilter, setOriginFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false)
  
  const [chatRide, setChatRide] = useState<Ride | null>(null)
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
        queryClient.invalidateQueries({ queryKey: ['rides'] })
        queryClient.invalidateQueries({ queryKey: ['has_active_booking'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ridesChannel)
      supabase.removeChannel(bookingsChannel)
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
      // Fetch blocked relations
      const { data: blockedByMe } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', currentUserId)
      const { data: blockedMe } = await supabase.from('blocked_users').select('blocker_id').eq('blocked_id', currentUserId)
      
      const blockedIds = [
        ...(blockedByMe?.map(b => b.blocked_id) || []),
        ...(blockedMe?.map(b => b.blocker_id) || [])
      ]

      let q = supabase
        .from('rides')
        .select(`
          *,
          driver:users!rides_driver_id_fkey(id, full_name, gender, mobile_number, total_rating_score, rating_count, avatar_url),
          bookings(
            id,
            status,
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

      // Exclude blocked users
      if (blockedIds.length > 0) {
        q = q.not('driver_id', 'in', `(${blockedIds.join(',')})`)
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

      if (effectiveOrigin || effectiveDest) {
        const cleanStr = (s: string) => s.toLowerCase().trim()
        const oMatch = effectiveOrigin ? cleanStr(effectiveOrigin) : ''
        const dMatch = effectiveDest ? cleanStr(effectiveDest) : ''

        fetchedRides = fetchedRides.filter(ride => {
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
            const route = getRouteById(ride.route_id);
            const checkOrigin = effectiveOrigin || (route ? route.waypoints[0] : ride.origin);
            const checkDest = effectiveDest || (route ? route.waypoints[route.waypoints.length - 1] : ride.destination);
            
            const isFractional = checkFractionalMatch(ride.route_id, checkOrigin, checkDest);
            if (isFractional) {
              (ride as any).matchType = 'fractional';
              (ride as any).fractional_price = calculateFractionalPrice(ride.route_id, checkOrigin, checkDest, ride.price_per_seat);
              return true;
            }
          }
          return false
        })
      }
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
        if (b.ride.status === 'completed' && isWithinOneHour(b.ride.completed_at)) return true
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

  // Reset animation flag if tab changes
  useEffect(() => {
    hasAnimatedFeed.current = false
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

  const offerMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const selectedDate = new Date(offerData.departure_time);
      
      if (selectedDate < now) {
        throw new Error('Departure time cannot be in the past.')
      }

      if (rideCategory === 'personal_vehicle' && !currentUserProfile?.is_verified_driver) {
        throw new Error('You must verify your Driving License to offer Student Pool rides.')
      }

      if (rideCategory === 'personal_vehicle' && !offerData.vehicle_number) {
        throw new Error('Vehicle number is required for Student Pool rides.')
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
      setActiveTab('Find a Ride')
    },
    onError: (e) => toast.error(e.message)
  })

  const handleBook = async (ride: any) => {
    if (ride.is_women_only && currentUserProfile?.gender !== 'female') {
      toast.error('This is a women-only ride.')
      return
    }
    
    let bookingData: any = {
      ride_id: ride.id,
      passenger_id: currentUserId,
      status: 'pending'
    }

    if (ride.matchType === 'fractional') {
      bookingData.pickup_location = originFilter || ride.origin
      bookingData.dropoff_location = destinationFilter || ride.destination
      bookingData.fractional_price = ride.fractional_price
    }

    const { error } = await supabase.from('bookings').insert(bookingData)
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Booking requested! Wait for approval.')
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
      toast.success('Booking cancelled successfully.')
      queryClient.invalidateQueries({ queryKey: ['rides'] })
      queryClient.invalidateQueries({ queryKey: ['my_rides'] })
      queryClient.invalidateQueries({ queryKey: ['has_active_booking'] })
    },
    onError: (e) => toast.error(`Failed to cancel: ${e.message}`)
  })

  // Obfuscator helper
  const obfuscatePhone = (phone: string) => {
    if (!phone || phone.length < 10) return phone
    // Mask most digits except last 4
    return phone.substring(0, 3) + ' XXXX ' + phone.substring(phone.length - 4)
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10 text-foreground relative z-10">
      <VehicleBackground />
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

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                      <ShieldAlert className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-medium">Notifications</span>
                  </div>
                  <Notifications currentUserId={currentUserId} />
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

          <h1 className="hero-title gradient-text">
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
          className="flex p-1 bg-muted/60 rounded-full border border-border w-full backdrop-blur-md shadow-sm"
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
                  style={{ background: 'linear-gradient(135deg, oklch(0.58 0.22 160), oklch(0.65 0.2 200))' }}
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
            spotlightColor={color === 'yellow' ? 'oklch(0.70 0.18 80 / 0.18)' : 'oklch(0.58 0.22 160 / 0.18)'}
            className={cn(
              "flex flex-col items-center py-4 px-3 sm:p-5 rounded-2xl border transition-all duration-300 w-36 sm:w-44 group cursor-pointer press-scale select-none",
              rideCategory === key
                ? color === 'yellow'
                  ? "border-yellow-500/50 bg-card shadow-md scale-[1.04]"
                  : "border-blue-500/50 bg-card shadow-md scale-[1.04]"
                : "border-border bg-card/40 hover:bg-card/70 opacity-60 hover:opacity-100 hover:scale-[1.02] backdrop-blur-sm glass-card"
            )}
            onClick={() => setRideCategory(key as 'auto_split' | 'personal_vehicle')}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setRideCategory(key as 'auto_split' | 'personal_vehicle')}
          >
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110",
              rideCategory === key
                ? color === 'yellow' ? 'bg-yellow-400/20' : 'bg-blue-400/20'
                : 'bg-muted/60'
            )}>
              <Icon className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300",
                rideCategory === key
                  ? color === 'yellow' ? 'text-yellow-500' : 'text-blue-500'
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
          {/* ── Search bar ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative z-50 glass-card retro-noise rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end border-blue-400/10"
          >
            <div className="space-y-1.5 w-full sm:flex-1 min-w-[140px]">
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> From
              </Label>
              <LocationAutocomplete
                placeholder="e.g. JNTU Metro"
                value={originFilter}
                onChange={setOriginFilter}
                className="bg-background/70 border-border text-foreground focus-visible:ring-blue-500 rounded-xl font-medium w-full"
              />
            </div>
            <div className="space-y-1.5 w-full sm:flex-1 min-w-[140px]">
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-muted-foreground" /> To
              </Label>
              <LocationAutocomplete
                placeholder="e.g. VNR VJIET"
                value={destinationFilter}
                onChange={setDestinationFilter}
                className="bg-background/70 border-border text-foreground focus-visible:ring-blue-500 rounded-xl font-medium w-full"
              />
            </div>
            <div className="space-y-1.5 w-full sm:flex-[0.5] min-w-[120px]">
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
                  className="h-[42px] bg-background/70 border-border text-foreground focus-visible:ring-blue-500 rounded-xl font-medium px-3 w-full"
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
          <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer rounded-2xl h-52 border border-border" style={{ animationDelay: `${i * 0.1}s` }} />
              ))
            ) : rides?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="col-span-full flex flex-col items-center justify-center py-16 sm:py-24 text-muted-foreground gap-4"
              >
                <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center border border-border">
                  <Car className="w-9 h-9 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg text-foreground/70">No rides found</p>
                  <p className="text-sm mt-1">Try adjusting your search filters</p>
                </div>
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
                        : 'oklch(0.58 0.22 160 / 0.15)'
                    }
                    className={cn(
                      "glass-card rounded-2xl overflow-hidden relative group float-hover border transition-colors duration-300 hover:border-blue-500/50",
                      ride.is_women_only ? "border-pink-400/40 hover:border-pink-500/60" : "border-border"
                    )}
                  >
                    {/* Subtle top gradient stripe */}
                    <div className={cn(
                      "absolute top-0 inset-x-0 h-1 rounded-t-2xl",
                      ride.is_women_only
                        ? "bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500"
                        : ride.ride_category === 'auto_split'
                          ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400"
                          : "bg-gradient-to-r from-blue-400 via-teal-400 to-cyan-400"
                    )} />

                    {ride.is_women_only && (
                      <div className="absolute top-1 right-0 bg-pink-500 text-white text-[10px] px-3 py-1 font-bold rounded-bl-xl flex items-center gap-1 shadow-md">
                        <Shield className="w-3 h-3" /> Women Only
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-5 space-y-4">
                      {/* Top row: driver + price */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          {/* Driver avatar + name */}
                          <div 
                            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedProfileId(ride.driver.id)}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md flex-shrink-0 overflow-hidden",
                              !ride.driver.avatar_url && (ride.driver.gender === 'female'
                                ? "bg-gradient-to-br from-pink-400 to-rose-500"
                                : "bg-gradient-to-br from-blue-400 to-teal-600")
                            )}>
                              {ride.driver.avatar_url ? (
                                <img src={ride.driver.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                ride.driver.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="text-base font-extrabold text-foreground leading-tight flex items-center">{ride.driver.full_name} {renderStars(ride.driver.total_rating_score, ride.driver.rating_count)}</p>
                              <p className="text-[11px] text-muted-foreground font-medium">{obfuscatePhone(ride.driver.mobile_number)}</p>
                            </div>
                          </div>
                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border",
                              ride.ride_category === 'auto_split'
                                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-muted/30 border-amber-200 dark:border-amber-800/40"
                                : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40"
                            )}>
                              {ride.ride_category === 'auto_split' ? 'Auto Split' : 'Student Pool'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize border text-foreground/70 bg-secondary/50 border-border flex items-center gap-1">
                              <img src={`/${ride.vehicle_type}.png`} alt={ride.vehicle_type} className="w-3.5 h-3.5 object-contain" />
                              {ride.vehicle_type}
                              {ride.vehicle_number && (
                                <>
                                  <span className="mx-1 h-3 border-l border-border/60" />
                                  <span className="uppercase text-muted-foreground">{ride.vehicle_number}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {ride.ride_category === 'auto_split' ? (
                            <>
                              <div className="text-3xl font-black text-muted-foreground price-glow flex items-end justify-end gap-1">
                                {(ride as any).matchType === 'fractional' && (
                                  <span className="text-[10px] text-blue-500 line-through mb-1">₹{Math.round(ride.price_per_seat / (1 + (ride.total_seats - ride.available_seats)))}</span>
                                )}
                                ₹{(ride as any).matchType === 'fractional' 
                                  ? Math.round((ride as any).fractional_price / (1 + (ride.total_seats - ride.available_seats))) 
                                  : Math.round(ride.price_per_seat / (1 + (ride.total_seats - ride.available_seats)))}
                              </div>
                              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest flex flex-col items-end gap-1 mt-1">
                                <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 fill-current" /> Current Split</span>
                                {ride.available_seats > 0 && (
                                  <span className="text-blue-600 dark:text-blue-400 normal-case tracking-normal">
                                    Drops to <strong className="text-blue-700 dark:text-blue-300">₹{Math.round(ride.price_per_seat / (1 + (ride.total_seats - ride.available_seats) + 1))}</strong> if 1 more joins
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-3xl font-black text-primary price-glow flex items-end justify-end gap-1">
                                {(ride as any).matchType === 'fractional' && (
                                  <span className="text-[10px] text-blue-500 line-through mb-1">₹{ride.price_per_seat}</span>
                                )}
                                ₹{(ride as any).matchType === 'fractional' ? (ride as any).fractional_price : ride.price_per_seat}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-semibold">
                                {(ride as any).matchType === 'fractional' ? 'your fraction' : 'per seat'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Route */}
                      <div className="route-line pl-5 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{ride.origin}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                          <Navigation className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>{ride.destination}</span>
                        </div>
                      </div>

                      {/* Time + Seats */}
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <div className="flex items-center gap-1.5 text-secondary-foreground bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(ride.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
                          ride.available_seats === 0
                            ? "text-red-500 bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/40"
                            : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40"
                        )}>
                          <Users className="w-3.5 h-3.5" />
                          {ride.available_seats === 0 ? 'Full' : `${ride.available_seats} left`}
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
                          <button 
                            onClick={() => setExpandedMaps(prev => prev.includes(ride.id) ? prev.filter(id => id !== ride.id) : [...prev, ride.id])}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            {expandedMaps.includes(ride.id) ? 'Hide Route Map' : 'View Route Map'}
                          </button>
                          
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
                                    if (window.confirm('Are you sure you want to cancel your seat request?')) {
                                      cancelBookingMutation.mutate({
                                        bookingId: myBooking.id,
                                        rideId: ride.id,
                                        wasApproved: isApproved,
                                        currentSeats: ride.available_seats
                                      })
                                    }
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
                                        : "shiny-btn bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-none"
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
                          className="bg-transparent border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 flex-shrink-0 transition-colors"
                          onClick={() => setChatRide(ride)}
                          title="Chat with Rider"
                        >
                          <MessageCircle className="w-4 h-4 text-primary" />
                        </Button>
                        <a href={`tel:${ride.driver.mobile_number}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-transparent border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 flex-shrink-0 transition-colors"
                            title="Call Rider"
                          >
                            <Phone className="w-4 h-4 text-secondary-foreground" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'Offer a Seat' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="glass-card rounded-2xl">
            <div className="p-6 border-b border-border/40">
              <h2 className="text-2xl font-black ">Offer a Ride 🚗</h2>
              <p className="text-muted-foreground text-sm mt-1">Share your journey and split costs with fellow VNRians.</p>
            </div>
            
            {!currentUserProfile?.is_verified_driver && rideCategory === 'personal_vehicle' ? (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Driver Verification Required</h3>
                <p className="text-muted-foreground text-sm">
                  To ensure the safety of our student pool, you must verify your Driving License via DigiLocker before you can offer rides in your personal vehicle.
                </p>
                <Button 
                  onClick={() => window.location.href = '/api/digilocker/login'}
                  className="w-full mt-4 bg-[#2653a1] hover:bg-[#1a3b75] text-white font-semibold h-11"
                >
                  <Shield className="w-4 h-4 mr-2" /> Verify with DigiLocker
                </Button>
              </div>
            ) : (
              <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Pick-up Location</Label>
                  <LocationAutocomplete 
                    value={offerData.origin}
                    onChange={(v) => setOfferData({...offerData, origin: v})}
                    placeholder="e.g. Miyapur Metro"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Drop-off Location</Label>
                  <LocationAutocomplete 
                    value={offerData.destination}
                    onChange={(v) => setOfferData({...offerData, destination: v})}
                    placeholder="e.g. VNR VJIET"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-semibold text-foreground flex items-center gap-2">
                  College Bus Route (Optional)
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">Recommended</span>
                </Label>
                <Select value={offerData.route_id || 'none'} onValueChange={v => setOfferData({...offerData, route_id: v})}>
                  <SelectTrigger className="bg-background border-border focus-visible:ring-blue-500">
                    <SelectValue placeholder="Select a predefined route to enable En-Route Matching" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl max-h-[300px]">
                    <SelectItem value="none">Custom Route (No En-Route Matches)</SelectItem>
                    {COLLEGE_ROUTES.filter(route => {
                      if (!offerData.origin || !offerData.destination) return true;
                      const clean = (s: string) => s.toLowerCase().trim();
                      const o = clean(offerData.origin);
                      const d = clean(offerData.destination);
                      const oIdx = route.waypoints.findIndex(w => clean(w).includes(o) || o.includes(clean(w)));
                      const dIdx = route.waypoints.findIndex(w => clean(w).includes(d) || d.includes(clean(w)));
                      return oIdx !== -1 && dIdx !== -1 && oIdx < dIdx;
                    }).map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {offerData.route_id && offerData.route_id !== 'none' && (
                  <div className="mt-2 p-3 bg-secondary/50 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Route Waypoints:</p>
                    <p className="text-xs font-semibold leading-relaxed">
                      {getRouteById(offerData.route_id)?.waypoints.join(' ➔ ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-foreground">Departure Time</Label>
                <Input 
                  type="datetime-local"
                  value={offerData.departure_time}
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={e => setOfferData({...offerData, departure_time: e.target.value})}
                  className="bg-background border-border focus-visible:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    Vehicle Type
                    {offerData.vehicle_type && (
                      <img src={`/${offerData.vehicle_type}.png`} alt="vehicle" className="w-6 h-6 object-contain drop-shadow-sm" />
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
                    <SelectTrigger className="bg-background border-border focus-visible:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-xl">
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
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">Vehicle No. <span className="text-red-500">*</span></Label>
                    <Input 
                      value={offerData.vehicle_number}
                      onChange={e => setOfferData({...offerData, vehicle_number: e.target.value})}
                      className="bg-background border-border focus-visible:ring-blue-500"
                      placeholder="TS09XX1234"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    Total Seats
                    <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded uppercase">
                      Max {offerData.vehicle_type === 'bike' ? 1 : offerData.vehicle_type === 'auto' ? 2 : 4}
                    </span>
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
                    className="bg-background border-border focus-visible:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    {rideCategory === 'auto_split' ? 'Total Trip Cost (₹)' : 'Price per Seat (₹)'}
                  </Label>
                  <Input 
                    type="number" min="0"
                    value={offerData.price_per_seat || ''}
                    onChange={e => setOfferData({...offerData, price_per_seat: parseInt(e.target.value) || 0})}
                    className="bg-background border-border focus-visible:ring-blue-500"
                  />
                </div>
              </div>
              
              {currentUserProfile?.gender === 'female' && (
                <div className="flex items-center justify-between p-4 bg-pink-100/50 dark:bg-pink-950/30 rounded-xl border border-pink-200 dark:border-pink-900/50 mt-4">
                  <div className="space-y-1">
                    <Label className="text-pink-600 dark:text-pink-400 flex items-center gap-2 font-bold">
                      <Shield className="w-5 h-5" /> Women Only Ride
                    </Label>
                    <p className="text-xs text-pink-700/70 dark:text-pink-500/70 font-medium">Only female users can request seats.</p>
                  </div>
                  <Switch 
                    checked={offerData.is_women_only}
                    onCheckedChange={v => setOfferData({...offerData, is_women_only: v})}
                    className="data-[state=checked]:bg-foreground"
                  />
                </div>
              )}

              <Button
                onClick={() => offerMutation.mutate()}
                disabled={offerMutation.isPending || !offerData.origin || !offerData.departure_time || (rideCategory === 'personal_vehicle' && !offerData.vehicle_number)}
                className="w-full h-12 shiny-btn bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 mt-6 text-white font-black text-base rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all"
              >
                {offerMutation.isPending ? 'Publishing…' : '🚀 Publish Ride'}
                </Button>
              </div>
            )}
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
          otherUserName={chatRide.driver.full_name}
        />
      )}

      <PublicProfileDialog 
        userId={selectedProfileId}
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  )
}

