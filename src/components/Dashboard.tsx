"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
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
import * as THREE from 'three'
// @ts-ignore
import NET from 'vanta/dist/vanta.net.min'
import { ChatModal } from '@/components/ChatModal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Notifications } from '@/components/Notifications'
import { ProfileEditor } from '@/components/ProfileEditor'
import { MyRides } from '@/components/MyRides'
import { cn } from '@/lib/utils'
import { LocationAutocomplete } from '@/components/LocationAutocomplete'
import { findBestMatchLocation } from '@/lib/locations'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { PublicProfileDialog } from '@/components/PublicProfileDialog'


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
  status: string
  driver: { id: string, full_name: string, gender: string, mobile_number: string, total_rating_score: number, rating_count: number, avatar_url?: string }
  bookings?: {
    id: string
    status: string
    passenger: { id: string, full_name: string, gender: string, total_rating_score: number, rating_count: number, avatar_url?: string }
  }[]
}

const TABS = ['Find a Ride', 'Offer a Seat', 'My Rides']

const VantaBackground = () => {
  const [vantaEffect, setVantaEffect] = useState<any>(null)
  const myRef = useRef(null)

  useEffect(() => {
    if (!vantaEffect && myRef.current) {
      try {
        setVantaEffect(NET({
          el: myRef.current,
          THREE: THREE,
          color: 0x475569, // Classic slate gray lines
          backgroundColor: 0x020617, // Deep dark slate/navy background
          points: 12.00,
          maxDistance: 22.00,
          spacing: 16.00,
          showDots: true
        }))
      } catch (e) {
        console.error("Vanta failed to load:", e)
      }
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  return (
    <div ref={myRef} className="fixed inset-0 z-0 pointer-events-none opacity-20" />
  )
}

export function Dashboard({ currentUserId }: { currentUserId: string }) {
  useRideReminders(currentUserId)
  
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [rideCategory, setRideCategory] = useState<'auto_split' | 'personal_vehicle'>('personal_vehicle')
  
  // Filters
  const [originFilter, setOriginFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
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
    queryKey: ['rides', rideCategory, originFilter, destinationFilter, womenOnlyFilter, currentUserProfile?.gender],
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

      if (effectiveOrigin) q = q.ilike('origin', `%${effectiveOrigin}%`)
      if (effectiveDest) q = q.ilike('destination', `%${effectiveDest}%`)
      
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

      // Hide rides that have already departed
      q = q.gte('departure_time', new Date().toISOString())

      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return data as Ride[]
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
    is_women_only: false
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
      
      const { error } = await supabase.from('rides').insert({
        ...offerData,
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

  const handleBook = async (rideId: string, isWomenOnly: boolean) => {
    if (isWomenOnly && currentUserProfile?.gender !== 'female') {
      toast.error('This is a women-only ride.')
      return
    }
    const { error } = await supabase.from('bookings').insert({
      ride_id: rideId,
      passenger_id: currentUserId,
      status: 'pending'
    })
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 text-foreground">
      <VantaBackground />
      {/* ── Header ────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 relative pt-2">
        <div className="absolute left-0 top-0 flex items-center gap-2 z-50">
          <Sheet>
            <SheetTrigger 
              render={
                <button className="inline-flex items-center justify-center whitespace-nowrap bg-transparent w-12 h-12 rounded-full p-0 overflow-hidden border-2 border-border shadow-sm hover:ring-2 hover:ring-emerald-500 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
                  {currentUserProfile?.avatar_url ? (
                    <img src={currentUserProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-lg">
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
                      <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-2xl">
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
                      <Zap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="font-medium">Theme</span>
                  </div>
                  <ThemeToggle />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                      <ShieldAlert className="w-4 h-4 text-emerald-500" />
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
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
          className="text-center space-y-2 mt-4"
        >
          {/* Live pulse */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Live Rides</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black tracking-tight ">
            VNR Pool
          </h1>
          <p className="text-base md:text-lg text-muted-foreground font-medium max-w-xl mx-auto">
            Share rides · Split costs · Commute smarter 🚗
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22,1,0.36,1] }}
          className="flex p-1 bg-muted/60 rounded-full border border-border w-full sm:w-fit backdrop-blur-md shadow-sm overflow-x-auto hide-scrollbar"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 z-10",
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
        className="flex justify-center gap-4"
      >
        {[
          { key: 'auto_split',       label: 'Auto / Cab Split', icon: Navigation, color: 'yellow' },
          { key: 'personal_vehicle', label: 'Student Pool',     icon: Car,        color: 'emerald' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setRideCategory(key as 'auto_split' | 'personal_vehicle')}
            className={cn(
              "flex flex-col items-center p-5 rounded-2xl border transition-all duration-300 w-44 group",
              rideCategory === key
                ? color === 'yellow'
                  ? "border-yellow-400/60 bg-yellow-400/10 shadow-[0_0_28px_rgba(234,179,8,0.2)] scale-105"
                  : "border-emerald-400/60 bg-primary/10 shadow-[0_0_28px_rgba(16,185,129,0.2)] scale-105"
                : "border-border bg-card/50 hover:bg-card/80 opacity-60 hover:opacity-100 hover:scale-102"
            )}
          >
            <Icon className={cn(
              "w-9 h-9 mb-2 transition-transform group-hover:scale-110 duration-300",
              color === 'yellow' ? 'text-yellow-500' : 'text-primary'
            )} />
            <span className="text-sm font-bold text-foreground">{label}</span>
          </button>
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
            className="glass-card rounded-2xl p-5 flex flex-wrap gap-4 items-end"
          >
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> From
              </Label>
              <LocationAutocomplete
                placeholder="e.g. JNTU Metro"
                value={originFilter}
                onChange={setOriginFilter}
                className="bg-background/70 border-border text-foreground focus-visible:ring-emerald-500 rounded-xl font-medium"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-muted-foreground" /> To
              </Label>
              <LocationAutocomplete
                placeholder="e.g. VNR VJIET"
                value={destinationFilter}
                onChange={setDestinationFilter}
                className="bg-background/70 border-border text-foreground focus-visible:ring-emerald-500 rounded-xl font-medium"
              />
            </div>
            {currentUserProfile?.gender === 'female' && (
              <div className="flex items-center gap-2 pb-2">
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
          <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer rounded-2xl h-52 border border-border" style={{ animationDelay: `${i * 0.1}s` }} />
              ))
            ) : rides?.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center">
                  <Car className="w-10 h-10 opacity-30" />
                </div>
                <p className="font-semibold text-lg">No rides found</p>
                <p className="text-sm">Try adjusting your search filters</p>
              </motion.div>
            ) : (
              rides?.map((ride, i) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22,1,0.36,1] }}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                >
                  <div className={cn(
                    "glass-card rounded-2xl overflow-hidden relative group",
                    ride.is_women_only ? "border-pink-400/50" : ""
                  )}>
                    {/* Subtle top gradient stripe */}
                    <div className={cn(
                      "absolute top-0 inset-x-0 h-1 rounded-t-2xl",
                      ride.is_women_only
                        ? "bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500"
                        : ride.ride_category === 'auto_split'
                          ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400"
                          : "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                    )} />

                    {ride.is_women_only && (
                      <div className="absolute top-1 right-0 bg-foreground text-background text-white text-[10px] px-3 py-1 font-bold rounded-bl-xl flex items-center gap-1 shadow">
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
                                : "bg-gradient-to-br from-emerald-400 to-teal-600")
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
                                : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/40"
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
                              <div className="text-3xl font-black text-muted-foreground price-glow">
                                ₹{Math.round(ride.price_per_seat / (1 + (ride.total_seats - ride.available_seats)))}
                              </div>
                              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest flex flex-col items-end gap-1 mt-1">
                                <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 fill-current" /> Current Split</span>
                                {ride.available_seats > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 normal-case tracking-normal">
                                    Drops to <strong className="text-emerald-700 dark:text-emerald-300">₹{Math.round(ride.price_per_seat / (1 + (ride.total_seats - ride.available_seats) + 1))}</strong> if 1 more joins
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-3xl font-black text-primary price-glow">₹{ride.price_per_seat}</div>
                              <div className="text-[10px] text-muted-foreground font-semibold">per seat</div>
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
                                onClick={() => handleBook(ride.id, ride.is_women_only)}
                                disabled={ride.driver_id === currentUserId || isFull || hasActiveBooking}
                                className={cn(
                                  "w-full font-bold  transition-all duration-300",
                                  ride.driver_id === currentUserId
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : isFull
                                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                                      : hasActiveBooking
                                        ? "bg-muted text-muted-foreground cursor-not-allowed border border-border/50 shadow-inner"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-none"
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
                          className="bg-transparent border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 flex-shrink-0 transition-colors"
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
                  </div>
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
                <Label className="font-semibold text-foreground">Departure Time</Label>
                <Input 
                  type="datetime-local"
                  value={offerData.departure_time}
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={e => setOfferData({...offerData, departure_time: e.target.value})}
                  className="bg-background border-border focus-visible:ring-emerald-500"
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
                    <SelectTrigger className="bg-background border-border focus-visible:ring-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
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
                      className="bg-background border-border focus-visible:ring-emerald-500"
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
                    className="bg-background border-border focus-visible:ring-emerald-500"
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
                    className="bg-background border-border focus-visible:ring-emerald-500"
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
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 mt-6 text-white font-black text-base rounded-xl shadow-lg hover:shadow-none transition-all "
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

