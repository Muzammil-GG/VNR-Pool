"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Users, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MyRides({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: myRides, isLoading } = useQuery({
    queryKey: ['my_rides', currentUserId],
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
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  const updateBookingStatus = useMutation({
    mutationFn: async ({ bookingId, status, rideId, currentSeats }: { bookingId: string, status: 'approved' | 'rejected', rideId: string, currentSeats: number }) => {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
      if (error) throw error

      // Decrement available seats if approved
      if (status === 'approved' && currentSeats > 0) {
        await supabase.from('rides').update({ available_seats: currentSeats - 1 }).eq('id', rideId)
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Booking ${variables.status}!`)
      queryClient.invalidateQueries({ queryKey: ['my_rides'] })
      queryClient.invalidateQueries({ queryKey: ['rides'] })
    },
    onError: (err) => toast.error(`Error: ${err.message}`)
  })

  const deleteRide = useMutation({
    mutationFn: async (rideId: string) => {
      // Use soft-delete to bypass strict RLS delete policies
      const { error } = await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Ride deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['my_rides'] })
      queryClient.invalidateQueries({ queryKey: ['rides'] })
    },
    onError: (err) => toast.error(`Failed to delete ride: ${err.message}`)
  })

  if (isLoading) return <div className="text-center py-10">Loading your rides...</div>
  if (!myRides || myRides.length === 0) return <div className="text-center py-10 text-muted-foreground">You haven't offered any rides yet.</div>

  return (
    <div className="space-y-6">
      {myRides.map(ride => (
        <Card key={ride.id} className="bg-card/70 backdrop-blur-xl border-emerald-500/20 shadow-md">
          <CardHeader className="bg-secondary/30 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg text-emerald-600 dark:text-emerald-400">
                  {ride.origin} → {ride.destination}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Departing: {new Date(ride.departure_time).toLocaleString()} • Seats: {ride.available_seats}/{ride.total_seats}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded text-emerald-700 dark:text-emerald-400 font-bold">
                  {ride.status.toUpperCase()}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this ride?')) {
                      deleteRide.mutate(ride.id)
                    }
                  }}
                  className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30"
                  disabled={deleteRide.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
              <Users className="w-4 h-4" /> Passenger Requests
            </h4>
            
            {!ride.bookings || ride.bookings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No seat requests yet.</p>
            ) : (
              <div className="space-y-3">
                {ride.bookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between bg-background border border-border p-3 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {booking.passenger.full_name} 
                        <span className="text-[10px] bg-secondary px-1.5 rounded text-muted-foreground uppercase">{booking.passenger.gender}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Status: <span className={cn(
                          "font-bold",
                          booking.status === 'pending' ? "text-yellow-500" : booking.status === 'approved' ? "text-emerald-500" : "text-red-500"
                        )}>{booking.status.toUpperCase()}</span>
                      </p>
                      {booking.status === 'approved' && (
                        <p className="text-xs font-mono text-blue-500 mt-1">📞 {booking.passenger.mobile_number}</p>
                      )}
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateBookingStatus.mutate({ bookingId: booking.id, status: 'rejected', rideId: ride.id, currentSeats: ride.available_seats })}
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => updateBookingStatus.mutate({ bookingId: booking.id, status: 'approved', rideId: ride.id, currentSeats: ride.available_seats })}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
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
}
