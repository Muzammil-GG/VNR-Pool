"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Star, User, Hash, BookOpen, Car, Bike, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

function renderStars(score: number, count: number) {
  if (count === 0) return <span className="text-xs text-muted-foreground ml-1 font-medium">(New)</span>
  const avg = (score / count).toFixed(1)
  return (
    <span className="flex items-center text-amber-500 ml-1.5 text-sm font-bold bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
      {avg} <Star className="w-3.5 h-3.5 fill-current ml-0.5" />
    </span>
  )
}

function obfuscatePhone(phone: string) {
  if (!phone || phone.length < 10) return phone
  return phone.slice(0, 2) + "••••••" + phone.slice(-2)
}

export function PublicProfileDialog({ 
  userId, 
  isOpen, 
  onClose 
}: { 
  userId: string | null
  isOpen: boolean
  onClose: () => void 
}) {
  const supabase = createClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public_profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('users')
        .select('full_name, gender, roll_no, branch, mobile_number, car_number, bike_number, avatar_url, total_rating_score, rating_count')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId && isOpen
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border shadow-2xl rounded-3xl">
        {isLoading || !profile ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div>
            {/* Header / Cover */}
            <div className={cn(
              "h-24 w-full relative",
              profile.gender === 'female' 
                ? "bg-gradient-to-br from-pink-400 via-rose-400 to-pink-500"
                : "bg-gradient-to-br from-blue-400 via-teal-400 to-cyan-500"
            )}>
              <div className="absolute inset-0 bg-black/10"></div>
            </div>

            <div className="px-6 pb-6 pt-0 relative">
              {/* Avatar overlapping cover */}
              <div className="flex justify-center -mt-12 mb-4 relative z-10">
                <div className={cn(
                  "w-24 h-24 rounded-full border-4 border-background flex items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden",
                  !profile.avatar_url && (profile.gender === 'female' ? "bg-pink-500" : "bg-blue-500")
                )}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile.full_name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="text-center space-y-1 mb-6">
                <DialogTitle className="text-2xl font-black text-foreground flex items-center justify-center gap-1">
                  {profile.full_name}
                  {renderStars(profile.total_rating_score, profile.rating_count)}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium flex items-center justify-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {profile.branch || 'N/A'}</span>
                  <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {profile.roll_no || 'N/A'}</span>
                </DialogDescription>
              </div>

              {/* Additional Details */}
              <div className="space-y-3 bg-secondary/30 rounded-2xl p-4 border border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2 font-medium">
                    <Phone className="w-4 h-4 text-primary" /> Contact
                  </span>
                  <span className="font-semibold text-foreground tracking-widest">{obfuscatePhone(profile.mobile_number)}</span>
                </div>
                
                {profile.car_number && (
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <Car className="w-4 h-4 text-blue-500" /> Car
                    </span>
                    <span className="font-semibold text-foreground bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">{profile.car_number}</span>
                  </div>
                )}
                
                {profile.bike_number && (
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <Bike className="w-4 h-4 text-blue-500" /> Bike
                    </span>
                    <span className="font-semibold text-foreground bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">{profile.bike_number}</span>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
