"use client"

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Leaf, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function EcoLeaderboard({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()

  // Fetch top 5 eco-warriors
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['eco_leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, eco_points, avatar_url')
        .order('eco_points', { ascending: false })
        .limit(5)
      return data || []
    }
  })

  // Fetch current user's stats
  const { data: userStats } = useQuery({
    queryKey: ['eco_stats', currentUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('eco_points, total_rides_completed')
        .eq('id', currentUserId)
        .single()
      return data || { eco_points: 0, total_rides_completed: 0 }
    },
    enabled: !!currentUserId
  })

  // Roughly 0.19 kg of CO2 saved per km driven in a carpool (assuming average 15km route = 2.85kg)
  // 1 eco_point = 1 successful ride.
  const co2Saved = ((userStats?.eco_points || 0) * 2.85).toFixed(1)

  return (
    <Card className="bg-slate-900/40 backdrop-blur-xl border-emerald-500/20 overflow-hidden relative h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-emerald-400">
          <Leaf className="w-5 h-5" />
          Eco Impact
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-32 bg-slate-800" />
        ) : (
          <div className="space-y-6">
            {/* User Impact Stat */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Your CO₂ Saved</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-white">{co2Saved}</span>
                  <span className="text-sm text-slate-400">kg</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            {/* Leaderboard */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Campus Leaderboard
              </h4>
              <div className="space-y-3">
                {leaderboard?.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-amber-950' :
                        index === 1 ? 'bg-slate-300 text-slate-800' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {user.id === currentUserId ? 'You' : user.full_name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{user.eco_points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
