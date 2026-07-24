"use client"

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { cn } from '@/lib/utils'

export function Notifications({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: notifications } = useQuery({
    queryKey: ['notifications', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    },
    // Poll every 10 seconds for new notifications
    refetchInterval: 10000 
  })

  const markAsRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (val && unreadCount > 0) {
        markAsRead.mutate()
      }
    }}>
      <DialogTrigger className="relative p-2 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center w-10 h-10 transition-colors">
        <Bell className="w-5 h-5 text-emerald-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-card/80 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Notifications</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4 custom-scrollbar">
          {!notifications || notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  notif.is_read 
                    ? "bg-background/50 border-border opacity-70" 
                    : "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                )}
              >
                <h4 className="text-sm font-bold text-foreground mb-1 flex items-center justify-between">
                  {notif.title}
                  {!notif.is_read && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  {new Date(notif.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
