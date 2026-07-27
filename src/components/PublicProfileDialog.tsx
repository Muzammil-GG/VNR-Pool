"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Star, User, Hash, BookOpen, Car, Bike, Phone, ShieldCheck, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

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
        .select('full_name, gender, roll_no, branch, mobile_number, car_number, bike_number, avatar_url, total_rating_score, rating_count, is_verified, eco_points')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId && isOpen
  })

  // 3D Tilt Effect Setup
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x)
  const mouseYSpring = useSpring(y)

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-visible bg-transparent border-none shadow-none">
        {isLoading || !profile ? (
          <div className="flex items-center justify-center p-12 bg-background rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full bg-slate-900 border border-slate-700/50 shadow-2xl rounded-3xl overflow-hidden relative group"
          >
            {/* Holographic reflection effect */}
            <div className="absolute inset-0 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

            {/* Header / Cover */}
            <div className={cn(
              "h-32 w-full relative",
              profile.gender === 'female' 
                ? "bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600"
                : "bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800"
            )}>
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div>
              {profile.is_verified && (
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/50 flex items-center gap-1.5 shadow-[0_0_15px_#10b981]">
                  <ShieldCheck className="w-3.5 h-3.5" /> VNR Verified
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-0 relative transform-gpu" style={{ transform: "translateZ(30px)" }}>
              {/* Avatar overlapping cover */}
              <div className="flex justify-center -mt-16 mb-4 relative z-10">
                <div className={cn(
                  "w-32 h-32 rounded-full border-4 border-slate-900 flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.3)] overflow-hidden relative",
                  !profile.avatar_url && (profile.gender === 'female' ? "bg-gradient-to-br from-pink-400 to-pink-600" : "bg-gradient-to-br from-indigo-500 to-indigo-700")
                )}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile.full_name.charAt(0).toUpperCase()
                  )}
                  {/* Trust Score Badge on Avatar */}
                  <div className="absolute -bottom-1 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                    {renderStars(profile.total_rating_score, profile.rating_count)}
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="text-center space-y-1.5 mb-6">
                <DialogTitle className="text-2xl font-black text-white flex items-center justify-center gap-1">
                  {profile.full_name}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium flex items-center justify-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {profile.branch || 'N/A'}</span>
                  <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {profile.roll_no || 'N/A'}</span>
                </DialogDescription>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-center shadow-inner relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Trust Score</div>
                  <div className="text-2xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                    {profile.rating_count === 0 ? 'New' : (profile.total_rating_score / profile.rating_count).toFixed(1)}
                  </div>
                </div>
                <div className="flex-1 bg-slate-800/80 border border-emerald-500/20 rounded-2xl p-4 text-center shadow-inner relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
                    <Leaf className="w-3 h-3 text-emerald-400" /> Eco Points
                  </div>
                  <div className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{profile.eco_points || 0}</div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-0.5 bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
                <a 
                  href={`tel:${profile.mobile_number}`}
                  className="flex items-center justify-between text-sm p-4 hover:bg-indigo-600/10 transition-colors cursor-pointer group active:bg-indigo-600/20"
                >
                  <span className="text-slate-400 flex items-center gap-2.5 font-bold uppercase tracking-wider text-[11px] group-hover:text-indigo-400 transition-colors">
                    <Phone className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" /> Call Driver
                  </span>
                  <span className="font-bold text-slate-200 tracking-widest flex items-center gap-2">
                    {profile.mobile_number} 
                  </span>
                </a>
                
                {profile.car_number && (
                  <div className="flex items-center justify-between text-sm p-4 border-t border-slate-700/50 bg-slate-800/20">
                    <span className="text-slate-400 flex items-center gap-2.5 font-bold uppercase tracking-wider text-[11px]">
                      <Car className="w-4 h-4 text-indigo-400" /> Car
                    </span>
                    <span className="font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-500/30 px-2.5 py-1 rounded-md tracking-wider">{profile.car_number}</span>
                  </div>
                )}
                
                {profile.bike_number && (
                  <div className="flex items-center justify-between text-sm p-4 border-t border-slate-700/50 bg-slate-800/20">
                    <span className="text-slate-400 flex items-center gap-2.5 font-bold uppercase tracking-wider text-[11px]">
                      <Bike className="w-4 h-4 text-indigo-400" /> Bike
                    </span>
                    <span className="font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-500/30 px-2.5 py-1 rounded-md tracking-wider">{profile.bike_number}</span>
                  </div>
                )}
              </div>
              
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}
