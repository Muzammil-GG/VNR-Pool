"use client"

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Sparkles, Loader2, Bot } from 'lucide-react'
import { Button } from './ui/button'

type Message = { id: string, role: 'user' | 'assistant', content: string }

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [localInput, setLocalInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!localInput.trim()) return
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: localInput }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLocalInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      if (!res.ok) throw new Error('API Error')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      let assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
      setMessages([...newMessages, assistantMsg])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          assistantMsg.content += text
          setMessages([...newMessages, { ...assistantMsg }])
        }
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: "Oops! I couldn't process that. If you're the admin, please ensure the `GOOGLE_GENERATIVE_AI_API_KEY` is added to Vercel Environment Variables!" 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
                    <p className="text-[10px] text-emerald-500 font-medium">Powered by Gemini AI</p>
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
                      Hi! I'm the VNR Pool AI. Ask me how to book a ride, split fares, or navigate the app!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            m.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-sm shadow-md' 
                              : 'bg-secondary text-foreground rounded-bl-sm border border-border/50'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
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
                    disabled={!localInput.trim() || isLoading}
                    className="rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform active:scale-95"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
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
