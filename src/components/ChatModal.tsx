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
        .select('*')
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
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
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

    const { error } = await supabase
      .from('messages')
      .insert({
        ride_id: rideId,
        sender_id: currentUserId,
        text: newMsg
      })

    if (error) {
      toast.error("Failed to send message")
      setInputText(newMsg)
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
                  "px-4 py-2 rounded-2xl max-w-[80%] break-words",
                  isMe 
                    ? "bg-blue-600 self-end rounded-br-sm" 
                    : "bg-neutral-800 self-start rounded-bl-sm"
                )}
              >
                {msg.text}
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
