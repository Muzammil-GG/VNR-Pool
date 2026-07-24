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
import { MapPin, Users, Clock, Shield, MessageCircle, ShieldAlert, Car, Bike, Navigation } from 'lucide-react'
import { ChatModal } from '@/components/ChatModal'
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
}

const TABS = ['Find a Ride', 'Offer a Seat']

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
      let q = supabase
        .from('rides')
        .select(`
          *,
          driver:users!rides_driver_id_fkey(full_name, gender, mobile_number)
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
      const { error } = await supabase.from('rides').insert({
        ...offerData,
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
    }
  }

  // Obfuscator helper
  const obfuscatePhone = (phone: string) => {
    if (!phone || phone.length < 10) return phone
    // Mask most digits except last 4
    return phone.substring(0, 3) + ' XXXX ' + phone.substring(phone.length - 4)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 py-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
          VNR Pool
        </h1>
        
        <div className="flex p-1 bg-white/5 rounded-full border border-white/10 w-fit backdrop-blur-md">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10",
                activeTab === tab ? "text-black" : "text-neutral-400 hover:text-white"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-emerald-400 rounded-full -z-10"
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
            "flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 w-40",
            rideCategory === 'auto_split' 
              ? "border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.2)]" 
              : "border-white/5 bg-white/5 opacity-50 hover:opacity-100"
          )}
        >
          <Navigation className="w-8 h-8 text-yellow-400 mb-2" />
          <span className="text-sm font-semibold text-yellow-100">Auto / Cab Split</span>
        </button>
        <button
          onClick={() => setRideCategory('personal_vehicle')}
          className={cn(
            "flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 w-40",
            rideCategory === 'personal_vehicle' 
              ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
              : "border-white/5 bg-white/5 opacity-50 hover:opacity-100"
          )}
        >
          <Car className="w-8 h-8 text-emerald-400 mb-2" />
          <span className="text-sm font-semibold text-emerald-100">Student Pool</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'Find a Ride' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Origin / Location</Label>
              <Input 
                placeholder="e.g. JNTU Metro" 
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="bg-black/50 border-white/10"
              />
            </div>
            {currentUserProfile?.gender === 'female' && (
              <div className="flex items-center gap-2 pb-2">
                <Switch 
                  id="women-only" 
                  checked={womenOnlyFilter}
                  onCheckedChange={setWomenOnlyFilter}
                  className="data-[state=checked]:bg-pink-600"
                />
                <Label htmlFor="women-only" className="text-pink-400 flex items-center gap-1 cursor-pointer">
                  <Shield className="w-4 h-4" /> Women Only
                </Label>
              </div>
            )}
          </div>

          {/* Feed */}
          <div ref={feedRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl bg-white/5 border border-white/10" />
              ))
            ) : rides?.length === 0 ? (
              <div className="col-span-full text-center py-12 text-neutral-500">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
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
                    "bg-black/60 backdrop-blur-xl border-white/10 overflow-hidden relative group",
                    ride.is_women_only ? "border-pink-500/30" : "hover:border-emerald-500/50"
                  )}>
                    {ride.is_women_only && (
                      <div className="absolute top-0 right-0 bg-pink-600 text-white text-xs px-3 py-1 font-semibold rounded-bl-xl flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Women Only
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            {ride.driver.full_name}
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-emerald-300 font-normal border border-white/5">
                              {rideCategory === 'auto_split' ? 'Auto Split' : 'Student Pool'}
                            </span>
                          </CardTitle>
                          <CardDescription className="text-neutral-400 mt-1">
                            Contact: {obfuscatePhone(ride.driver.mobile_number)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-400">₹{ride.price_per_seat}</div>
                          <div className="text-xs text-neutral-500">per seat</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-neutral-300">
                        <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500"/> {ride.origin}</div>
                        <span className="text-neutral-600">→</span>
                        <div className="flex items-center gap-1.5 text-emerald-100/70">{ride.destination}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-blue-300">
                          <Clock className="w-4 h-4"/>
                          {new Date(ride.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Users className="w-4 h-4"/>
                          {ride.available_seats} seats left
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex gap-2">
                      <Button 
                        onClick={() => handleBook(ride.id, ride.is_women_only)}
                        className="flex-1 bg-white/10 hover:bg-emerald-600 text-white transition-colors"
                      >
                        Request Seat
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="bg-transparent border-white/10 hover:bg-white/10"
                        onClick={() => setChatRide(ride)}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <Card className="bg-black/60 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-emerald-400">Offer a Ride</CardTitle>
              <CardDescription>Share your journey and split costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input 
                  value={offerData.origin}
                  onChange={e => setOfferData({...offerData, origin: e.target.value})}
                  className="bg-white/5 border-white/10"
                  placeholder="e.g. Miyapur Metro"
                />
              </div>
              <div className="space-y-2">
                <Label>Departure Time</Label>
                <Input 
                  type="datetime-local"
                  value={offerData.departure_time}
                  onChange={e => setOfferData({...offerData, departure_time: e.target.value})}
                  className="bg-white/5 border-white/10"
                />
              </div>
              {rideCategory === 'personal_vehicle' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Select onValueChange={(v) => { if (v) setOfferData({...offerData, vehicle_type: v}) }} value={offerData.vehicle_type}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-white/10">
                        <SelectItem value="bike">Bike</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle No.</Label>
                    <Input 
                      value={offerData.vehicle_number}
                      onChange={e => setOfferData({...offerData, vehicle_number: e.target.value})}
                      className="bg-white/5 border-white/10"
                      placeholder="TS09XX1234"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Seats</Label>
                  <Input 
                    type="number" min="1" max="10"
                    value={offerData.total_seats}
                    onChange={e => setOfferData({...offerData, total_seats: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price per Seat (₹)</Label>
                  <Input 
                    type="number" min="0"
                    value={offerData.price_per_seat}
                    onChange={e => setOfferData({...offerData, price_per_seat: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              {currentUserProfile?.gender === 'female' && (
                <div className="flex items-center justify-between p-3 bg-pink-950/30 rounded-xl border border-pink-900/50 mt-4">
                  <div className="space-y-0.5">
                    <Label className="text-pink-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Women Only Ride
                    </Label>
                    <p className="text-xs text-pink-500/70">Only female users can request seats.</p>
                  </div>
                  <Switch 
                    checked={offerData.is_women_only}
                    onCheckedChange={v => setOfferData({...offerData, is_women_only: v})}
                    className="data-[state=checked]:bg-pink-600"
                  />
                </div>
              )}

              <Button 
                onClick={() => offerMutation.mutate()}
                disabled={offerMutation.isPending || !offerData.origin || !offerData.departure_time}
                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-6"
              >
                Publish Ride
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
