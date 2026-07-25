"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, ShieldAlert } from 'lucide-react'
import anime from 'animejs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  ride_id: string
  sender_id: string
  text: string
  created_at: string
  sender?: { full_name: string }
}

export function ChatModal({
  isOpen,
  onClose,
  rideId,
  currentUserId,
  otherUserId,
  otherUserName
}: {
  isOpen: boolean
  onClose: () => void
  rideId: string
  currentUserId: string
  otherUserId: string
  otherUserName: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:users(full_name)')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase.channel(`room_${rideId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `ride_id=eq.${rideId}`
      }, async (payload) => {
        const newMsg = payload.new as Message
        if (newMsg.sender_id !== currentUserId) {
          const { data: senderData } = await supabase.from('users').select('full_name').eq('id', newMsg.sender_id).single()
          if (senderData) {
            newMsg.sender = senderData
          }
        }
        setMessages(prev => [...prev, newMsg])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, rideId, supabase])

  // Scroll to bottom and animate new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    
    // Animate the last message if it's new
    if (messages.length > 0 && chatContainerRef.current) {
      const lastMsg = chatContainerRef.current.lastElementChild as HTMLElement
      if (lastMsg) {
        anime({
          targets: lastMsg,
          scale: [0.8, 1],
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 600,
          easing: 'easeOutElastic(1, .5)'
        })
      }
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg = inputText
    setInputText('')

    const res = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId, text: newMsg })
    })

    if (!res.ok) {
      toast.error("Failed to send message")
      setInputText(newMsg)
    } else {
      // Notify other participants
      const { data: rideData } = await supabase
        .from('rides')
        .select('driver_id, bookings(passenger_id, status)')
        .eq('id', rideId)
        .single();

      if (rideData) {
        const participants = new Set<string>();
        participants.add(rideData.driver_id);
        rideData.bookings?.forEach((b: any) => {
          if (b.status === 'approved') participants.add(b.passenger_id);
        });
        participants.delete(currentUserId); // Don't notify self

        const notificationsToInsert = Array.from(participants).map(userId => ({
          user_id: userId,
          title: 'New Message 💬',
          message: `${newMsg} |ride:${rideId}`
        }));

        if (notificationsToInsert.length > 0) {
          await supabase.from('notifications').insert(notificationsToInsert);
        }
      }
    }
  }

  const handleBlockUser = async () => {
    const confirmBlock = window.confirm(`Are you sure you want to block ${otherUserName}? They will not be able to interact with you again.`)
    if (!confirmBlock) return

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: currentUserId,
        blocked_id: otherUserId
      })

    if (error) {
      toast.error("Failed to block user.")
    } else {
      toast.success(`${otherUserName} has been blocked.`)
      onClose()
      // Note: Ideally, this triggers a re-fetch of the dashboard to exclude blocked users.
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-white">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
          <DialogTitle>Chat with {otherUserName}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleBlockUser} title="Block User" className="text-red-400 hover:text-red-300 hover:bg-red-950/30">
            <ShieldAlert className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <div 
          className="flex flex-col h-[400px] overflow-y-auto p-4 space-y-4"
          ref={chatContainerRef}
        >
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div 
                key={msg.id}
                className={cn(
                  "px-4 py-2 rounded-2xl max-w-[80%] break-words flex flex-col",
                  isMe 
                    ? "bg-blue-600 self-end rounded-br-sm" 
                    : "bg-neutral-800 self-start rounded-bl-sm"
                )}
              >
                {!isMe && msg.sender?.full_name && (
                  <span className="text-[10px] font-bold text-blue-400 mb-0.5">{msg.sender.full_name}</span>
                )}
                <span>{msg.text}</span>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-white/10">
          <Input 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-neutral-800 border-none focus-visible:ring-blue-500"
          />
          <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
