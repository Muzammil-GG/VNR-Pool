"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
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
import { MapPin, Users, Clock, Shield, MessageCircle, ShieldAlert, Car, Bike, Navigation, Phone, Zap } from 'lucide-react'
import { ChatModal } from '@/components/ChatModal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MyRides } from '@/components/MyRides'
import { cn } from '@/lib/utils'

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
  driver: { full_name: string, gender: string, mobile_number: string }
  bookings?: {
    status: string
    passenger: { id: string, full_name: string, gender: string }
  }[]
}

const TABS = ['Find a Ride', 'Offer a Seat', 'My Rides']

export function Dashboard({ currentUserId }: { currentUserId: string }) {
  useRideReminders(currentUserId)
  
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [rideCategory, setRideCategory] = useState<'auto_split' | 'personal_vehicle'>('personal_vehicle')
  
  // Filters
  const [originFilter, setOriginFilter] = useState('')
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false)
  
  const [chatRide, setChatRide] = useState<Ride | null>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const feedRef = useRef<HTMLDivElement>(null)

  const { data: currentUserProfile } = useQuery({
    queryKey: ['currentUser', currentUserId],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('gender').eq('id', currentUserId).single()
      return data
    }
  })

  const { data: rides, isLoading } = useQuery({
    queryKey: ['rides', rideCategory, originFilter, womenOnlyFilter, currentUserProfile?.gender],
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
          driver:users!rides_driver_id_fkey(full_name, gender, mobile_number),
          bookings(
            status,
            passenger:users!bookings_passenger_id_fkey(id, full_name, gender)
          )
        `)
        .eq('status', 'active')
        .eq('ride_category', rideCategory)

      if (originFilter) q = q.ilike('origin', `%${originFilter}%`)
      
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

      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return data as Ride[]
    },
    enabled: !!currentUserProfile
  })

  // Stagger animation when feed changes
  useEffect(() => {
    if (rides && rides.length > 0 && feedRef.current) {
      anime({
        targets: '.ride-card',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        easing: 'easeOutExpo',
        duration: 800
      })
    }
  }, [rides, activeTab])

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
    }
  }

  // Obfuscator helper
  const obfuscatePhone = (phone: string) => {
    if (!phone || phone.length < 10) return phone
    // Mask most digits except last 4
    return phone.substring(0, 3) + ' XXXX ' + phone.substring(phone.length - 4)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 py-8 space-y-8 text-foreground">
      {/* Header & Tabs */}
      <div className="flex flex-col items-center gap-6 relative">
        <div className="absolute right-0 top-0">
          <ThemeToggle />
        </div>
        <div className="text-center space-y-3 mt-4 mb-2">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 drop-shadow-sm">
            VNR Pool
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto px-4">
            Share rides. Split costs. Make campus commutes smarter, greener, and more fun!
          </p>
        </div>
        <div className="flex p-1 bg-muted/50 rounded-full border border-border w-fit backdrop-blur-md shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-6 py-2.5 rounded-full text-sm font-bold transition-colors z-10",
                activeTab === tab ? "text-emerald-950 dark:text-black" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-emerald-400 rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Ride Category Toggle */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setRideCategory('auto_split')}
          className={cn(
            "flex flex-col items-center p-5 rounded-2xl border transition-all duration-300 w-40",
            rideCategory === 'auto_split' 
              ? "border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.15)]" 
              : "border-border bg-card/50 hover:bg-card/80 opacity-60 hover:opacity-100"
          )}
        >
          <Navigation className="w-8 h-8 text-yellow-500 mb-2" />
          <span className="text-sm font-bold text-foreground">Auto / Cab Split</span>
        </button>
        <button
          onClick={() => setRideCategory('personal_vehicle')}
          className={cn(
            "flex flex-col items-center p-5 rounded-2xl border transition-all duration-300 w-40",
            rideCategory === 'personal_vehicle' 
              ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
              : "border-border bg-card/50 hover:bg-card/80 opacity-60 hover:opacity-100"
          )}
        >
          <Car className="w-8 h-8 text-emerald-500 mb-2" />
          <span className="text-sm font-bold text-foreground">Student Pool</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'Find a Ride' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end bg-card/50 p-5 rounded-2xl border border-border backdrop-blur-md shadow-sm">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label className="text-foreground font-medium">Origin / Location</Label>
              <Input 
                placeholder="e.g. JNTU Metro" 
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="bg-background border-border text-foreground focus-visible:ring-emerald-500 rounded-xl h-11"
              />
            </div>
            {currentUserProfile?.gender === 'female' && (
              <div className="flex items-center gap-2 pb-2">
                <Switch 
                  id="women-only" 
                  checked={womenOnlyFilter}
                  onCheckedChange={setWomenOnlyFilter}
                  className="data-[state=checked]:bg-pink-500"
                />
                <Label htmlFor="women-only" className="text-pink-500 dark:text-pink-400 flex items-center gap-1 cursor-pointer font-medium">
                  <Shield className="w-4 h-4" /> Women Only
                </Label>
              </div>
            )}
          </div>

          {/* Feed */}
          <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl bg-card border border-border" />
              ))
            ) : rides?.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-30" />
                No rides found matching your criteria.
              </div>
            ) : (
              rides?.map((ride) => (
                <motion.div
                  key={ride.id}
                  whileHover={{ y: -5 }}
                  className="ride-card opacity-0 translate-y-[50px]"
                >
                  <Card className={cn(
                    "bg-card/70 backdrop-blur-xl border-border overflow-hidden relative group shadow-sm hover:shadow-md transition-shadow",
                    ride.is_women_only ? "border-pink-500/50" : "hover:border-emerald-500/50"
                  )}>
                    {ride.is_women_only && (
                      <div className="absolute top-0 right-0 bg-pink-500 text-white text-xs px-3 py-1 font-semibold rounded-bl-xl flex items-center gap-1 shadow-sm">
                        <Shield className="w-3 h-3" /> Women Only
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                            {ride.driver.full_name}
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 font-medium border border-border">
                              {rideCategory === 'auto_split' ? 'Auto Split' : 'Student Pool'}
                            </span>
                            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-900/50 capitalize flex items-center gap-1 shadow-sm">
                              <img src={`/${ride.vehicle_type}.png`} alt={ride.vehicle_type} className="w-4 h-4 object-contain drop-shadow-sm" />
                              {ride.vehicle_type}
                            </span>
                          </CardTitle>
                          <CardDescription className="text-muted-foreground font-medium text-sm">
                            Contact: {obfuscatePhone(ride.driver.mobile_number)}
                          </CardDescription>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          {ride.ride_category === 'auto_split' ? (
                            <>
                              <div className="text-2xl font-black text-amber-500">
                                ₹{Math.round(ride.price_per_seat / (1 + (ride.total_seats - ride.available_seats)))}
                              </div>
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded flex items-center gap-1 mt-1 shadow-sm">
                                <Zap className="w-3 h-3 fill-current" /> Dynamic Split
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-black text-emerald-500">₹{ride.price_per_seat}</div>
                              <div className="text-xs text-muted-foreground font-medium">per seat</div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Passenger Display */}
                      {ride.bookings && ride.bookings.filter(b => b.status === 'approved').length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Co-Passengers ({ride.bookings.filter(b => b.status === 'approved').length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ride.bookings.filter(b => b.status === 'approved').map(b => (
                              <div key={b.passenger.id} className="bg-secondary/50 border border-border px-2 py-1 rounded-full text-xs font-medium text-foreground flex items-center gap-1.5 shadow-sm">
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white",
                                  b.passenger.gender === 'female' ? "bg-pink-500" : "bg-blue-500"
                                )}>
                                  {b.passenger.full_name.charAt(0).toUpperCase()}
                                </div>
                                {b.passenger.full_name.split(' ')[0]}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-2 text-sm text-foreground/80 font-medium">
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> {ride.origin}</div>
                        <div className="pl-2 border-l-2 border-border ml-2 h-3" />
                        <div className="flex items-center gap-2 text-foreground/90"><Navigation className="w-4 h-4 text-cyan-500"/> {ride.destination}</div>
                      </div>
                      <div className="flex items-center gap-5 text-sm font-semibold">
                        <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-md">
                          <Clock className="w-4 h-4"/>
                          {new Date(ride.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md">
                          <Users className="w-4 h-4"/>
                          {ride.available_seats} seats left
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 pb-4 flex gap-2">
                      {(() => {
                        const myBooking = ride.bookings?.find(b => b.passenger.id === currentUserId)
                        const isPending = myBooking?.status === 'pending'
                        const isApproved = myBooking?.status === 'approved'

                        return (
                          <Button 
                            onClick={() => handleBook(ride.id, ride.is_women_only)}
                            disabled={isPending || isApproved || ride.driver_id === currentUserId}
                            className="flex-1 bg-secondary hover:bg-emerald-600 text-secondary-foreground hover:text-white transition-colors font-semibold disabled:opacity-70 disabled:hover:bg-secondary disabled:hover:text-secondary-foreground"
                          >
                            {isApproved ? 'Seat Approved!' : isPending ? 'Requested (Pending)' : ride.driver_id === currentUserId ? 'Your Ride' : 'Request Seat'}
                          </Button>
                        )
                      })()}
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="bg-transparent border-border hover:bg-secondary flex-shrink-0"
                        onClick={() => setChatRide(ride)}
                        title="Chat with Rider"
                      >
                        <MessageCircle className="w-5 h-5 text-emerald-500" />
                      </Button>
                      <a href={`tel:${ride.driver.mobile_number}`}>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="bg-transparent border-border hover:bg-secondary flex-shrink-0"
                          title="Call Rider"
                        >
                          <Phone className="w-5 h-5 text-blue-500" />
                        </Button>
                      </a>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <Card className="bg-card/70 backdrop-blur-xl border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl text-emerald-500 font-bold">Offer a Ride</CardTitle>
              <CardDescription className="text-muted-foreground">Share your journey and split costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Departure Location</Label>
                  <Input 
                    value={offerData.origin}
                    onChange={e => setOfferData({...offerData, origin: e.target.value})}
                    className="bg-background border-border focus-visible:ring-emerald-500"
                    placeholder="e.g. Miyapur Metro"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Drop-off Location</Label>
                  <Input 
                    value={offerData.destination}
                    onChange={e => setOfferData({...offerData, destination: e.target.value})}
                    className="bg-background border-border focus-visible:ring-emerald-500"
                    placeholder="e.g. VNR VJIET"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-foreground">Departure Time</Label>
                <Input 
                  type="datetime-local"
                  value={offerData.departure_time}
                  onChange={e => setOfferData({...offerData, departure_time: e.target.value})}
                  className="bg-background border-border focus-visible:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      setOfferData({
                        ...offerData, 
                        vehicle_type: v,
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
                    <Label className="font-semibold text-foreground">Vehicle No.</Label>
                    <Input 
                      value={offerData.vehicle_number}
                      onChange={e => setOfferData({...offerData, vehicle_number: e.target.value})}
                      className="bg-background border-border focus-visible:ring-emerald-500"
                      placeholder="TS09XX1234"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    className="data-[state=checked]:bg-pink-500"
                  />
                </div>
              )}

              <Button 
                onClick={() => offerMutation.mutate()}
                disabled={offerMutation.isPending || !offerData.origin || !offerData.departure_time}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 mt-6 text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                Publish Ride
              </Button>
            </CardContent>
          </Card>
        </div>
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
    </div>
  )
}
