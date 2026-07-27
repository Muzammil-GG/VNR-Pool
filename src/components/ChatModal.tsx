"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, ShieldAlert, X, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Lightweight base64 audio for UI feedback
const POP_SOUND = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAQAAAOIAAQABAAAAAAAAAAAA" 
const CLICK_SOUND = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAQAAAOIAAQABAAAAAAAAAAAA"

const playSound = (type: 'pop' | 'click') => {
  try {
    const audio = new Audio(type === 'pop' ? POP_SOUND : CLICK_SOUND)
    audio.volume = 0.5
    // Catch errors for browser autoplay policies
    audio.play().catch(() => {})
  } catch (e) {}
}

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
          playSound('pop') // Play sound for incoming message
        }
        setMessages(prev => [...prev, newMsg])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, rideId, supabase])

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg = inputText
    setInputText('')
    playSound('click') // Play sound on send

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Sliding Glassmorphic Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full sm:w-[400px] h-[100dvh] z-[101] flex flex-col bg-slate-900/80 backdrop-blur-3xl border-l border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white leading-none">Ride Chat</h2>
                  <p className="text-xs text-blue-300 font-medium mt-1">Coordinating with {otherUserName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border-y border-amber-500/20 p-3 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                For your safety, never share OTPs, passwords, or pay outside the app.
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Say hi to {otherUserName}!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === currentUserId
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isMe ? "items-end ml-auto" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm",
                        isMe 
                          ? "bg-blue-600 text-white rounded-br-sm shadow-blue-900/20" 
                          : "bg-white/10 text-slate-100 rounded-bl-sm border border-white/5"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-white/40 mt-1.5 px-1 font-medium tracking-wide">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/20 border-t border-white/10 backdrop-blur-xl pb-safe">
              <form onSubmit={handleSend} className="relative flex items-center">
                <Input 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-full pl-5 pr-12 focus-visible:ring-1 focus-visible:ring-blue-500"
                  maxLength={500}
                />
                <Button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="absolute right-1.5 h-9 w-9 rounded-full p-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
