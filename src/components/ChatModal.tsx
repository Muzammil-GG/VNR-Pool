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
      try {
        const res = await fetch(`/api/get-messages?rideId=${rideId}`)
        if (res.ok) {
          const { data } = await res.json()
          if (data) setMessages(data)
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err)
      }
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
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-white">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
          <DialogTitle>Chat with {otherUserName}</DialogTitle>
        </DialogHeader>

        <div 
          className="flex flex-col h-[400px] overflow-y-auto p-4 space-y-4"
          ref={chatContainerRef}
        >
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const isDriver = msg.sender_id === otherUserId
            
            return (
              <div 
                key={msg.id}
                className={cn(
                  "px-4 py-2 rounded-2xl max-w-[80%] break-words flex flex-col",
                  isMe 
                    ? "bg-blue-600 self-end rounded-br-sm" 
                    : isDriver
                      ? "bg-indigo-600/40 border border-indigo-500/50 self-start rounded-bl-sm"
                      : "bg-neutral-800 self-start rounded-bl-sm"
                )}
              >
                {!isMe && msg.sender?.full_name && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("text-[10px] font-bold", isDriver ? "text-indigo-300" : "text-blue-400")}>
                      {msg.sender.full_name}
                    </span>
                    {isDriver && (
                      <span className="text-[8px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Driver
                      </span>
                    )}
                  </div>
                )}
                <span className={isDriver && !isMe ? "text-indigo-50" : ""}>{msg.text}</span>
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
