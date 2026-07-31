"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSlicedWaypoints } from '@/lib/routes'
import { calculateFractionalPrice } from '@/lib/pricing'
import { AlertCircle, MapPin, Car, Users } from 'lucide-react'

interface ConfirmBoardingDialogProps {
  isOpen: boolean
  onClose: () => void
  ride: any
  onConfirm: (pickupLocation: string, dropoffLocation: string, fractionalPrice: number) => void
  defaultPickup?: string
  defaultDropoff?: string
}

export function ConfirmBoardingDialog({
  isOpen,
  onClose,
  ride,
  onConfirm,
  defaultPickup,
  defaultDropoff
}: ConfirmBoardingDialogProps) {
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [dynamicPrice, setDynamicPrice] = useState(0)
  const [waypoints, setWaypoints] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && ride) {
      const initialPickup = defaultPickup || ride.origin
      const initialDropoff = defaultDropoff || ride.destination

      setPickup(initialPickup)
      setDropoff(initialDropoff)
      
      // Calculate initial price
      const price = calculateFractionalPrice(
        ride.route_id || '',
        initialPickup,
        initialDropoff,
        ride.price_per_seat,
        ride.origin,
        ride.destination
      )
      setDynamicPrice(price)

      // Fetch optional pickup locations (waypoints)
      if (ride.route_id) {
        const routeWaypoints = getSlicedWaypoints(ride.route_id, ride.origin, ride.destination)
        // Ensure the initial pickup is in the list, if not we add it.
        // We exclude the final destination from pickup options to prevent 0 distance rides.
        const pickupOptions = routeWaypoints.filter(wp => wp.toLowerCase() !== ride.destination.toLowerCase())
        if (pickupOptions.length === 0) pickupOptions.push(ride.origin)
        setWaypoints(pickupOptions)
      } else {
        // If no route is defined, they can only pick up from the driver's origin
        setWaypoints([ride.origin])
      }
    }
  }, [isOpen, ride, defaultPickup, defaultDropoff])

  // Recalculate price when pickup changes
  const handlePickupChange = (newPickup: string) => {
    setPickup(newPickup)
    if (ride) {
      const price = calculateFractionalPrice(
        ride.route_id || '',
        newPickup,
        dropoff,
        ride.price_per_seat,
        ride.origin,
        ride.destination
      )
      setDynamicPrice(price)
    }
  }

  if (!ride) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full rounded-[2rem] p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="mb-2 sm:mb-4 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Confirm Boarding</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto min-w-0 hide-scrollbar pb-2">
          {/* Driver & Ride Info Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-3 shadow-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider block mb-1">Driver</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block text-sm sm:text-base">{ride.driver_profiles?.full_name || 'Unknown'}</span>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-3 shadow-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider block mb-1">Departure</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block text-sm sm:text-base">
                {new Date(ride.departure_time).toLocaleString('en-US', { hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-3 shadow-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1 truncate">
                <Car className="w-3 h-3 shrink-0" /> Vehicle
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block capitalize text-sm sm:text-base">
                {ride.vehicle_type} • {ride.vehicle_number || 'N/A'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-3 shadow-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1 truncate">
                <Users className="w-3 h-3 shrink-0" /> Seats
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block text-sm sm:text-base">
                {ride.available_seats} Available
              </span>
            </div>
          </div>

          {/* Location Selection */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3 sm:p-4 space-y-4 min-w-0">
            
            {/* Pickup Location */}
            <div className="space-y-1.5 min-w-0">
              <label className="text-[9px] sm:text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase block truncate">
                Pickup Location
              </label>
              <Select value={pickup} onValueChange={handlePickupChange}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/50 h-12 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-blue-500 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 w-full pr-2">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate flex-1 text-left text-sm sm:text-base">{pickup} {pickup === ride.origin ? "(Driver's Start)" : ""}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl z-[1000] w-[calc(100vw-4rem)] sm:w-full">
                  {waypoints.map((wp, idx) => (
                    <SelectItem key={idx} value={wp} className="rounded-lg py-3 text-sm sm:text-base">
                      {wp} {wp === ride.origin ? "(Driver's Start)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dropoff Location (Read-only) */}
            <div className="space-y-1.5 min-w-0">
              <label className="text-[9px] sm:text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase block truncate">
                Dropoff Location
              </label>
              <div className="w-full bg-white/60 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/50 h-12 rounded-xl flex items-center px-3 gap-2 opacity-80 cursor-not-allowed overflow-hidden">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-slate-900 dark:text-white font-medium truncate flex-1 text-left text-sm sm:text-base">{dropoff}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-blue-500 font-medium pt-1 truncate">
                * Dropoff is locked to {dropoff} for this route.
              </p>
            </div>
          </div>

          {/* Dynamic Split Price */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm min-w-0">
            <div className="min-w-0 flex-1 pr-2">
              <div className="font-bold text-slate-900 dark:text-white truncate text-sm sm:text-base">Dynamic Split Price</div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">Based on your route segment</div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 shrink-0">
              ₹{dynamicPrice}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl p-3 sm:p-4 flex gap-3 shadow-sm min-w-0">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-400 leading-relaxed flex-1 min-w-0 break-words">
              By confirming, you commit to paying your share of the fuel cost directly to the driver.
            </p>
          </div>
        </div>

        <div className="mt-4 shrink-0 w-full min-w-0">
          <button
            onClick={() => {
              onConfirm(pickup, dropoff, dynamicPrice)
              onClose()
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base truncate"
          >
            Request Seat
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
