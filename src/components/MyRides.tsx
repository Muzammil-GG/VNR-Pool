"use client"

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Users, CheckCircle, XCircle, Trash2, MapPin, Navigation, Clock, Phone, Play, Flag, Star, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { RateRidematesDialog } from './RateRidematesDialog'
import { PublicProfileDialog } from '@/components/PublicProfileDialog'

export function MyRides({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'offered' | 'joined'>('offered')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  // Helper for 1-hour window check
  const isWithinOneHour = (dateString?: string) => {
    if (!dateString) return false
    const oneHour = 60 * 60 * 1000
    return (new Date().getTime() - new Date(dateString).getTime()) < oneHour
  }

  useEffect(() => {
    const ridesChannel = supabase.channel('public:rides:myrides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        queryClient.invalidateQueries({ queryKey: ['my_offered_rides'] })
        queryClient.invalidateQueries({ queryKey: ['my_joined_rides'] })
      })
      .subscribe()

    const bookingsChannel = supabase.channel('public:bookings:myrides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['my_offered_rides'] })
        queryClient.invalidateQueries({ queryKey: ['my_joined_rides'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ridesChannel)
      supabase.removeChannel(bookingsChannel)
    }
  }, [queryClient, supabase])

  // 1. Offered Rides
  const { data: offeredRides, isLoading: offeredLoading } = useQuery({
    queryKey: ['my_offered_rides', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          bookings(
            id,
            status,
            pickup_location,
            dropoff_location,
            fractional_price,
            passenger:users!bookings_passenger_id_fkey(id, full_name, mobile_number, gender, total_rating_score, rating_count, avatar_url)
          )
        `)
        .eq('driver_id', currentUserId)
        .in('status', ['active', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })

      if (error) throw error
      // Filter out completed rides older than 1 hour
      return data?.filter((r: any) => r.status !== 'completed' || isWithinOneHour(r.completed_at)) || []
    },
    refetchInterval: 5000
  })

  // 2. Joined Rides (Bookings)
  const { data: joinedBookings, isLoading: joinedLoading } = useQuery({
    queryKey: ['my_joined_rides', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          ride:rides (
            *,
            driver:users!rides_driver_id_fkey(id, full_name, mobile_number, gender, total_rating_score, rating_count, avatar_url),
            bookings(
              id,
              status,
              passenger:users!bookings_passenger_id_fkey(id, full_name, gender, total_rating_score, rating_count, avatar_url)
            )
          )
        `)
        .eq('passenger_id', currentUserId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })

      if (error) throw error
      // Filter out cancelled rides, and completed rides older than 1 hour
      return data?.filter((b: any) => {
        if (!b.ride) return false
        if (b.ride.status === 'cancelled') return false
        if (b.ride.status === 'completed' && !isWithinOneHour(b.ride.completed_at)) return false
        return true
      }) || []
    },
    refetchInterval: 5000
  })

  // Mutations
  const updateBookingStatus = useMutation({
    mutationFn: async ({ bookingId, status, rideId, currentSeats, passengerId }: { bookingId: string, status: 'approved' | 'rejected', rideId: string, currentSeats: number, passengerId: string }) => {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
      if (error) throw error
      if (status === 'approved' && currentSeats > 0) {
        await supabase.from('rides').update({ available_seats: currentSeats - 1 }).eq('id', rideId)
      }
      
      // Notify the passenger
      const title = status === 'approved' ? 'Ride Request Approved! 🎉' : 'Ride Request Declined';
      const message = status === 'approved' 
        ? 'The driver has accepted your request. Have a safe journey!' 
        : 'The driver could not accept your request at this time.';
        
      await supabase.from('notifications').insert({
        user_id: passengerId,
        title,
        message
      })
    },
    onSuccess: (_, variables) => {
      toast.success(`Booking ${variables.status}!`)
      queryClient.invalidateQueries({ queryKey: ['my_offered_rides'] })
      queryClient.invalidateQueries({ queryKey: ['rides'] })
    },
    onError: (err) => toast.error(`Error: ${err.message}`)
  })

  const deleteRide = useMutation({
    mutationFn: async (rideId: string) => {
      // First delete messages
      await fetch('/api/delete-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId })
      }).catch(console.error);

      const { error } = await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Ride deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['my_offered_rides'] })
      queryClient.invalidateQueries({ queryKey: ['rides'] })
    },
    onError: (err) => toast.error(`Failed to delete ride: ${err.message}`)
  })

  const startRideMutation = useMutation({
    mutationFn: async (ride: any) => {
      const { error } = await supabase.from('rides').update({ status: 'in_progress' }).eq('id', ride.id);
      if (error) throw error;
      const approved = ride.bookings?.filter((b: any) => b.status === 'approved') || [];
      if (approved.length > 0) {
        await supabase.from('notifications').insert(
          approved.map((b: any) => ({
            user_id: b.passenger.id,
            title: 'Ride Started! 🚗',
            message: `${ride.origin} to ${ride.destination} has started. Have a safe journey!`
          }))
        )
      }
    },
    onSuccess: () => {
      toast.success('Ride started! Passengers notified.');
      queryClient.invalidateQueries({ queryKey: ['my_offered_rides'] });
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`)
  })

  const completeRideMutation = useMutation({
    mutationFn: async (ride: any) => {
      const { error } = await supabase.from('rides').update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', ride.id);
      if (error) throw error;
      const approved = ride.bookings?.filter((b: any) => b.status === 'approved') || [];
      if (approved.length > 0) {
        await supabase.from('notifications').insert(
          approved.map((b: any) => ({
            user_id: b.passenger.id,
            title: 'Ride Completed ✅',
            message: `Your ride to ${ride.destination} has finished. Hope you had a great trip!`
          }))
        )
      }

      // Delete chats
      await fetch('/api/delete-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: ride.id })
      }).catch(console.error);
    },
    onSuccess: () => {
      toast.success('Ride completed! Passengers notified.');
      queryClient.invalidateQueries({ queryKey: ['my_offered_rides'] });
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`)
  })

  const cancelMyBooking = useMutation({
    mutationFn: async ({ bookingId, rideId, wasApproved, currentSeats }: any) => {
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, rideId, wasApproved, currentSeats })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      return data
    },
    onSuccess: () => {
      toast.success('Seat request cancelled!')
      queryClient.invalidateQueries({ queryKey: ['my_joined_rides'] })
      queryClient.invalidateQueries({ queryKey: ['rides'] })
    },
    onError: (e) => toast.error(e.message)
  })

  const isLoading = activeTab === 'offered' ? offeredLoading : joinedLoading

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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex p-1 bg-muted/60 rounded-full border border-border w-fit backdrop-blur-md shadow-sm">
          {(['offered', 'joined'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 z-10 capitalize",
                activeTab === tab ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="myrides-tab"
                  className="absolute inset-0 rounded-full -z-10 tab-active-glow"
                  style={{ background: 'linear-gradient(135deg, oklch(0.58 0.22 250), oklch(0.65 0.2 260))' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.55 }}
                />
              )}
              {tab} Rides
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground animate-pulse">Loading rides...</div>
      ) : activeTab === 'offered' ? (
        // --- OFFERED RIDES ---
        !offeredRides || offeredRides.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">You haven't offered any active rides recently.</div>
        ) : (
          <div className="space-y-6">
            {offeredRides.map(ride => (
              <Card key={ride.id} className="glass-card overflow-hidden">
                <CardHeader className="bg-secondary/30 pb-4 border-b border-border/40">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> {ride.origin}
                      </CardTitle>
                      <CardTitle className="text-lg font-bold text-foreground/80 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-muted-foreground" /> {ride.destination}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-2">
                        <Clock className="w-4 h-4 text-secondary-foreground" /> {new Date(ride.departure_time).toLocaleString()}
                        <span className="mx-2 opacity-30">|</span>
                        Seats: {ride.available_seats}/{ride.total_seats}
                      </p>
                    </div>
                    <div className="flex flex-col sm:items-end items-start gap-3 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 border-border pt-4 sm:pt-0">
                      <span className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5",
                        ride.status === 'completed'
                          ? "bg-muted text-muted-foreground"
                          : ride.status === 'in_progress' 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse border border-blue-200" 
                          : "bg-primary/20 text-primary"
                      )}>
                        {ride.status === 'in_progress' && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span></span>}
                        {ride.status.replace('_', ' ')}
                      </span>
                      {ride.status === 'active' && (
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const timeToDeparture = new Date(ride.departure_time).getTime() - Date.now();
                              const thirtyMins = 30 * 60 * 1000;
                              if (timeToDeparture > thirtyMins) {
                                toast.error('You can only start the ride 30 minutes before the departure time.');
                                return;
                              }
                              if (window.confirm('Start this ride and notify passengers?')) {
                                startRideMutation.mutate(ride)
                              }
                            }}
                            className="h-8 text-primary hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                            disabled={startRideMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1.5" /> Start Ride
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('openChat', { detail: { rideId: ride.id } }));
                            }}
                            className="h-8 text-primary hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" /> Chat
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this ride? This will notify all approved passengers.')) {
                                deleteRide.mutate(ride.id)
                              }
                            }}
                            className="h-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                            disabled={deleteRide.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" /> Cancel Ride
                          </Button>
                        </div>
                      )}

                      {ride.status === 'in_progress' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (window.confirm('Complete this ride?')) {
                              completeRideMutation.mutate(ride)
                            }
                          }}
                          className="h-8 text-secondary-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                          disabled={completeRideMutation.isPending}
                        >
                          <Flag className="w-4 h-4 mr-1.5" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <h4 className="text-sm font-black flex items-center gap-2 mb-4 text-foreground uppercase tracking-wider">
                    <Users className="w-4 h-4" /> Passenger Requests
                  </h4>
                  
                  {!ride.bookings || ride.bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/50 text-center">No seat requests yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ride.bookings.map((booking: any) => (
                        <div key={booking.id} className="flex flex-col gap-3 bg-card border border-border p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-foreground flex items-center">
                                {booking.passenger.full_name} 
                                <span className={cn(
                                  "w-2 h-2 rounded-full ml-2",
                                  booking.passenger.gender === 'female' ? 'bg-foreground' : 'bg-blue-500'
                                )} />
                                {renderStars(booking.passenger.total_rating_score, booking.passenger.rating_count)}
                              </p>
                              
                              {booking.pickup_location && booking.dropoff_location && (
                                <div className="mt-1.5 p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1 uppercase tracking-wider mb-0.5">
                                    <MapPin className="w-3 h-3" /> En-Route Match
                                  </p>
                                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                                    <span className="font-semibold">{booking.pickup_location}</span> to <span className="font-semibold">{booking.dropoff_location}</span>
                                  </p>
                                  {booking.fractional_price && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-500 font-bold mt-0.5">
                                      Pays fractional fare: ₹{booking.fractional_price}
                                    </p>
                                  )}
                                </div>
                              )}

                              <p className="text-xs text-muted-foreground font-medium mt-1">
                                Status: <span className={cn(
                                  "font-bold uppercase tracking-wider",
                                  booking.status === 'pending' ? "text-muted-foreground" : booking.status === 'approved' ? "text-primary" : "text-red-500"
                                )}>{booking.status}</span>
                              </p>
                            </div>
                            {booking.status === 'approved' && ride.status !== 'completed' && (
                              <a href={`tel:${booking.passenger.mobile_number}`}>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-blue-200 text-secondary-foreground hover:bg-blue-50 dark:hover:bg-blue-950">
                                  <Phone className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            )}
                          </div>

                          {booking.status === 'pending' && ride.status !== 'completed' && (
                            <div className="flex gap-2 mt-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateBookingStatus.mutate({ bookingId: booking.id, status: 'rejected', rideId: ride.id, currentSeats: ride.available_seats, passengerId: booking.passenger.id })}
                                className="flex-1 border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 h-8"
                              >
                                <XCircle className="w-4 h-4 mr-1.5" /> Reject
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => updateBookingStatus.mutate({ bookingId: booking.id, status: 'approved', rideId: ride.id, currentSeats: ride.available_seats, passengerId: booking.passenger.id })}
                                className="flex-1 bg-primary hover:opacity-90 text-primary-foreground h-8"
                                disabled={ride.available_seats === 0}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {ride.status === 'completed' && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <RateRidematesDialog 
                        rideId={ride.id} 
                        currentUserId={currentUserId}
                        ridemates={
                          ride.bookings
                            .filter((b: any) => b.status === 'approved')
                            .map((b: any) => ({
                              id: b.passenger.id,
                              full_name: b.passenger.full_name,
                              role: 'Passenger' as const
                            }))
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        // --- JOINED RIDES ---
        !joinedBookings || joinedBookings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">You haven't requested any seats recently.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {joinedBookings.map((b: any) => {
              const ride = b.ride
              const isApproved = b.status === 'approved'
              
              return (
                <Card key={b.id} className="glass-card overflow-hidden">
                  <div className={cn(
                    "h-1 w-full",
                    ride.status === 'completed' ? "bg-muted-foreground" :
                    isApproved ? "bg-primary" : "bg-secondary"
                  )} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                          <div 
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-sm flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity",
                              !ride.driver.avatar_url && (ride.driver.gender === 'female' ? "bg-gradient-to-br from-pink-400 to-rose-500" : "bg-gradient-to-br from-blue-400 to-teal-600")
                            )}
                            onClick={() => setSelectedProfileId(ride.driver.id)}
                          >
                            {ride.driver.avatar_url ? (
                              <img src={ride.driver.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              ride.driver.full_name.charAt(0)
                            )}
                          </div>
                          <span>
                            {ride.driver.full_name}
                            {renderStars(ride.driver.total_rating_score, ride.driver.rating_count)}
                          </span>
                        </CardTitle>
                        <div className="flex gap-1.5 mt-1">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1",
                            ride.status === 'completed' ? "bg-muted text-muted-foreground border-border" :
                            ride.status === 'in_progress' && isApproved
                              ? "bg-blue-50 text-blue-600 border-blue-200 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              : isApproved ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200"
                          )}>
                            {ride.status === 'in_progress' && isApproved && <span className="relative flex h-1.5 w-1.5 mr-0.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span></span>}
                            {b.status === 'approved' && ride.status !== 'active' 
                              ? ride.status.replace('_', ' ') 
                              : b.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-primary">₹{ride.price_per_seat}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="route-line pl-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" /> {ride.origin}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                        <Navigation className="w-4 h-4 text-muted-foreground flex-shrink-0" /> {ride.destination}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <div className="flex items-center gap-1.5 text-secondary-foreground bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(ride.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </div>

                    {/* Co-passengers section */}
                    {ride.bookings && ride.bookings.filter((bk: any) => bk.status === 'approved' && bk.passenger.id !== currentUserId).length > 0 && (
                      <div className="pt-3 border-t border-border/40 mt-3">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Co-Passengers
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ride.bookings.filter((bk: any) => bk.status === 'approved' && bk.passenger.id !== currentUserId).map((bk: any, idx: number) => (
                            <div 
                              key={`${bk.passenger.id}-${idx}`} 
                              className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary border border-border/60 px-2 py-1 rounded-full text-xs font-semibold text-foreground cursor-pointer transition-colors"
                              onClick={() => setSelectedProfileId(bk.passenger.id)}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-black overflow-hidden",
                                !bk.passenger.avatar_url && (bk.passenger.gender === 'female' ? "bg-foreground" : "bg-blue-500")
                              )}>
                                {bk.passenger.avatar_url ? (
                                  <img src={bk.passenger.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  bk.passenger.full_name.charAt(0)
                                )}
                              </div>
                              {bk.passenger.full_name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ride.status === 'completed' && isApproved && (
                      <div className="mt-4 pt-2 border-t border-border">
                        <RateRidematesDialog 
                          rideId={ride.id} 
                          currentUserId={currentUserId}
                          ridemates={[
                            { id: ride.driver.id, full_name: ride.driver.full_name, role: 'Driver' },
                            ...ride.bookings
                              .filter((bk: any) => bk.status === 'approved' && bk.passenger.id !== currentUserId)
                              .map((bk: any) => ({
                                id: bk.passenger.id,
                                full_name: bk.passenger.full_name,
                                role: 'Passenger' as const
                              }))
                          ]}
                        />
                      </div>
                    )}
                  </CardContent>

                  {ride.status !== 'completed' && (
                    <CardFooter className="pt-2 pb-4 flex flex-wrap gap-2">
                      {ride.status === 'active' && (
                        <div className="flex gap-2 w-full">
                          <Button 
                            onClick={() => {
                              if (window.confirm('Cancel this seat request?')) {
                                cancelMyBooking.mutate({ 
                                  bookingId: b.id, 
                                  rideId: ride.id, 
                                  wasApproved: isApproved, 
                                  currentSeats: ride.available_seats 
                                })
                              }
                            }}
                            disabled={cancelMyBooking.isPending}
                            variant={isApproved ? "default" : "secondary"}
                            className={cn(
                              "flex-1 font-bold transition-all",
                              isApproved 
                                ? "bg-primary hover:bg-red-500 text-primary-foreground hover:text-white" 
                                : "bg-secondary text-secondary-foreground hover:bg-red-500 hover:text-white"
                            )}
                          >
                            {cancelMyBooking.isPending ? 'Cancelling...' : 'Cancel Request'}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 transition-colors flex-1 font-bold"
                            onClick={() => window.dispatchEvent(new CustomEvent('openChat', { detail: { rideId: ride.id } }))}
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" /> Chat
                          </Button>
                        </div>
                      )}
                      <a href={`tel:${ride.driver.mobile_number}`}>
                        <Button variant="outline" size="icon" className="border-border">
                          <Phone className="w-4 h-4 text-secondary-foreground" />
                        </Button>
                      </a>
                    </CardFooter>
                  )}
                </Card>
              )
            })}
          </div>
        )
      )}

      <PublicProfileDialog 
        userId={selectedProfileId}
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  )
}
