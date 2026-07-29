"use client"

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Sparkles, Loader2, Bot } from 'lucide-react'
import { Button } from './ui/button'
import { generateResponse, type ChatMessage } from '@/lib/chatbot-engine'

type Message = { id: string, role: 'user' | 'assistant', content: string }

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [localInput, setLocalInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = localInput.trim()
    if (!trimmed || isTyping) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMsg]
    setLocalInput('')
    setMessages(updatedMessages)
    setIsTyping(true)

    // Build conversation history for context-awareness
    const history: ChatMessage[] = updatedMessages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Generate response from local engine (instant, no API needed)
    const response = generateResponse(trimmed, history)

    // Small typing delay (300-600ms) to feel natural, not robotic
    const delay = 300 + Math.min(response.length * 2, 300)
    await new Promise(resolve => setTimeout(resolve, delay))

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
    }])
    setIsTyping(false)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Simple markdown-lite renderer for bold text
  const renderContent = (text: string) => {
    // Split by **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
      }
      // Handle newlines
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ))
    })
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">VNR Pool Assistant</h3>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[10px] text-emerald-500 font-medium">Always Online • Instant Replies</p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-70 mt-20">
                    <Bot className="w-12 h-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium px-4">
                      Hi! I&apos;m the VNR Pool Assistant. Ask me how to book a ride, split fares, or navigate the app!
                    </p>
                    {/* Quick action chips */}
                    <div className="flex flex-wrap gap-2 justify-center mt-3 px-2">
                      {['How do I book a ride?', 'How does fare splitting work?', 'What are Eco Points?'].map(q => (
                        <button
                          key={q}
                          onClick={() => { setLocalInput(q); }}
                          className="px-3 py-1.5 text-xs bg-secondary/80 hover:bg-secondary border border-border/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {m.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center mr-2 mt-1 shrink-0">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div 
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                            m.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-sm shadow-md' 
                              : 'bg-secondary text-foreground rounded-bl-sm border border-border/50'
                          }`}
                        >
                          {m.role === 'assistant' ? renderContent(m.content) : m.content}
                        </div>
                      </motion.div>
                    ))}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center mr-2 mt-1 shrink-0">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-border bg-background/50">
                <form onSubmit={onSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-secondary/50 border border-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-full h-10 px-4 text-sm transition-all"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!localInput.trim() || isTyping}
                    className="rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform active:scale-95"
                  >
                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors duration-300 ${
            isOpen ? 'bg-secondary text-foreground border border-border' : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </motion.button>
      </div>
    </>
  )
}
