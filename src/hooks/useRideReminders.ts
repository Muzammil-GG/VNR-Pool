"use client"

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

export function useRideReminders(userId: string | undefined) {
  const supabase = createClient()
  const notifiedRides = useRef<Set<string>>(new Set())

  // Fetch upcoming approved bookings for the user
  const { data: bookings } = useQuery({
    queryKey: ['upcoming_bookings', userId],
    queryFn: async () => {
      if (!userId) return []
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          rides (
            id,
            origin,
            destination,
            departure_time,
            status
          )
        `)
        .eq('passenger_id', userId)
        .eq('status', 'approved')
        .neq('rides.status', 'completed')
        .neq('rides.status', 'cancelled')

      if (error) {
        console.error('Error fetching bookings for reminders:', error)
        return []
      }
      return data || []
    },
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  })

  useEffect(() => {
    if (!bookings || bookings.length === 0) return

    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    const interval = setInterval(() => {
      const now = new Date().getTime()

      bookings.forEach((booking) => {
        // @ts-ignore
        const ride = booking.rides as any;
        if (!ride || !ride.departure_time) return;

        const departureTime = new Date(ride.departure_time).getTime()
        const timeDiff = departureTime - now
        const minutesDiff = Math.floor(timeDiff / (1000 * 60))

        const rideId = ride.id
        const t30Key = `${rideId}-30`
        const t15Key = `${rideId}-15`

        const triggerNotification = (title: string, body: string, key: string) => {
          if (!notifiedRides.current.has(key)) {
            // Sonner Toast
            toast(title, {
              description: body,
              action: {
                label: 'View',
                onClick: () => console.log(`Navigating to ride ${rideId}`),
              },
            })

            // Browser Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, { body, icon: '/vnr-logo.png' })
                }).catch(() => {
                  new Notification(title, { body, icon: '/vnr-logo.png' })
                })
              } else {
                new Notification(title, { body, icon: '/vnr-logo.png' })
              }
            }

            notifiedRides.current.add(key)
          }
        }

        if (minutesDiff <= 30 && minutesDiff > 15) {
          triggerNotification(
            'Ride in 30 minutes!',
            `Your ride from ${ride.origin} to ${ride.destination} is leaving soon.`,
            t30Key
          )
        } else if (minutesDiff <= 15 && minutesDiff > 0) {
          triggerNotification(
            'Ride in 15 minutes!',
            `Get ready! Your ride from ${ride.origin} to ${ride.destination} is departing in 15 mins.`,
            t15Key
          )
        }
      })
    }, 60 * 1000) // Check every minute

    return () => clearInterval(interval)
  }, [bookings])
}
