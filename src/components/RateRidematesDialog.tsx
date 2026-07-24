"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Star, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Ridemate = {
  id: string
  full_name: string
  role: 'Driver' | 'Passenger'
}

export function RateRidematesDialog({ 
  rideId, 
  currentUserId, 
  ridemates 
}: { 
  rideId: string
  currentUserId: string
  ridemates: Ridemate[]
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter out the current user from the list of people to rate
  const peopleToRate = ridemates.filter(p => p.id !== currentUserId)

  const handleRate = (userId: string, score: number) => {
    setRatings(prev => ({ ...prev, [userId]: score }))
  }

  const handleSubmit = async () => {
    if (Object.keys(ratings).length === 0) {
      toast.error('Please rate at least one person.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = Object.entries(ratings).map(([ratee_id, score]) => ({
        ride_id: rideId,
        rater_id: currentUserId,
        ratee_id,
        score
      }))

      const { error } = await supabase.from('ratings').insert(payload)
      if (error) {
        if (error.code === '23505') {
          toast.error('You have already rated some of these users for this ride.')
        } else {
          throw error
        }
      } else {
        toast.success('Thank you for your ratings!')
        setOpen(false)
      }
    } catch (err: any) {
      toast.error(`Failed to submit ratings: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-md animate-pulse inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2">
        <Star className="w-4 h-4 mr-2 fill-current" /> Rate Ridemates
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Rate your Ridemates</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {peopleToRate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No one to rate on this ride.</p>
          ) : (
            peopleToRate.map(person => (
              <div key={person.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">{person.full_name}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full">
                    {person.role}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRate(person.id, star)}
                      className={cn(
                        "p-1 transition-transform hover:scale-110",
                        (ratings[person.id] || 0) >= star ? "text-yellow-500" : "text-muted-foreground/30"
                      )}
                    >
                      <Star className="w-8 h-8" fill={(ratings[person.id] || 0) >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || Object.keys(ratings).length === 0}
            className="bg-primary text-primary-foreground"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Ratings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
