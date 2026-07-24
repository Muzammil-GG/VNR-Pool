"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Users, CheckCircle, XCircle, Trash2, MapPin, Navigation, Clock, Phone, MessageCircle, Play, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function MyRides({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'offered' | 'joined'>('offered')

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
            passenger:users!bookings_passenger_id_fkey(id, full_name, mobile_number, gender)
          )
        `)
        .eq('driver_id', currentUserId)
        .in('status', ['active', 'in_progress'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
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
            driver:users!rides_driver_id_fkey(id, full_name, mobile_number, gender),
            bookings(
              id,
              status,
              passenger:users!bookings_passenger_id_fkey(id, full_name, gender)
            )
          )
        `)
        .eq('passenger_id', currentUserId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })

      if (error) throw error
      // Filter out bookings where the ride itself is cancelled or completed
      return data?.filter((b: any) => b.ride && !['cancelled', 'completed'].includes(b.ride.status)) || []
    }
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
      const { error } = await supabase.from('rides').update({ status: 'completed' }).eq('id', ride.id);
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
                  style={{ background: 'linear-gradient(135deg, oklch(0.58 0.22 160), oklch(0.65 0.2 200))' }}
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
          <div className="text-center py-10 text-muted-foreground">You haven't offered any rides yet.</div>
        ) : (
          <div className="space-y-6">
            {offeredRides.map(ride => (
              <Card key={ride.id} className="glass-card overflow-hidden">
                <CardHeader className="bg-secondary/30 pb-4 border-b border-border/40">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" /> {ride.origin}
                      </CardTitle>
                      <CardTitle className="text-lg font-bold text-foreground/80 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-cyan-500" /> {ride.destination}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-2">
                        <Clock className="w-4 h-4 text-blue-500" /> {new Date(ride.departure_time).toLocaleString()}
                        <span className="mx-2 opacity-30">|</span>
                        Seats: {ride.available_seats}/{ride.total_seats}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider shadow-sm">
                        {ride.status}
                      </span>
                      {ride.status === 'active' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              if (window.confirm('Start this ride and notify passengers?')) {
                                startRideMutation.mutate(ride)
                              }
                            }}
                            className="h-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
                            disabled={startRideMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1.5" /> Start Ride
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
                          className="h-8 text-blue-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
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
                              <p className="font-bold text-foreground flex items-center gap-2">
                                {booking.passenger.full_name} 
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  booking.passenger.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'
                                )} />
                              </p>
                              <p className="text-xs text-muted-foreground font-medium mt-1">
                                Status: <span className={cn(
                                  "font-bold uppercase tracking-wider",
                                  booking.status === 'pending' ? "text-amber-500" : booking.status === 'approved' ? "text-emerald-500" : "text-red-500"
                                )}>{booking.status}</span>
                              </p>
                            </div>
                            {booking.status === 'approved' && (
                              <a href={`tel:${booking.passenger.mobile_number}`}>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-blue-200 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950">
                                  <Phone className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            )}
                          </div>

                          {booking.status === 'pending' && (
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
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md h-8"
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
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        // --- JOINED RIDES ---
        !joinedBookings || joinedBookings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">You haven't requested any seats yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {joinedBookings.map((b: any) => {
              const ride = b.ride
              const isApproved = b.status === 'approved'
              
              return (
                <Card key={b.id} className="glass-card overflow-hidden">
                  <div className={cn(
                    "h-1 w-full",
                    isApproved ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-amber-400 to-orange-400"
                  )} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-foreground">
                          {ride.driver.full_name}
                        </CardTitle>
                        <div className="flex gap-1.5 mt-1">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                            isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                          )}>
                            {b.status === 'approved' && ride.status !== 'active' 
                              ? ride.status.replace('_', ' ') 
                              : b.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-500">₹{ride.price_per_seat}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="route-line pl-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {ride.origin}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                        <Navigation className="w-4 h-4 text-cyan-500 flex-shrink-0" /> {ride.destination}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <div className="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
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
                            <div key={`${bk.passenger.id}-${idx}`} className="flex items-center gap-1.5 bg-secondary/60 border border-border/60 px-2 py-1 rounded-full text-xs font-semibold text-foreground">
                              <div className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-black",
                                bk.passenger.gender === 'female' ? "bg-pink-500" : "bg-blue-500"
                              )}>
                                {bk.passenger.full_name.charAt(0)}
                              </div>
                              {bk.passenger.full_name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2 pb-4 flex gap-2">
                    {ride.status === 'active' && (
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
                            ? "bg-emerald-500 hover:bg-red-500 text-white" 
                            : "bg-secondary text-secondary-foreground hover:bg-red-500 hover:text-white"
                        )}
                      >
                        {cancelMyBooking.isPending ? 'Cancelling...' : 'Cancel Request'}
                      </Button>
                    )}
                    <a href={`tel:${ride.driver.mobile_number}`}>
                      <Button variant="outline" size="icon" className="border-border">
                        <Phone className="w-4 h-4 text-blue-500" />
                      </Button>
                    </a>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
