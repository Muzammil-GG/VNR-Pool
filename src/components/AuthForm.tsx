"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!/^[a-zA-Z0-9._%+-]+@vnrvjiet\.in$/i.test(email)) {
      toast.error("Access Restricted: You must use a valid @vnrvjiet.in college email ID.")
      return
    }

    setLoading(true)
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message)
      } else {
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Check your email for the confirmation link.")
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] p-4">
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent pointer-events-none" />
        <CardHeader className="relative z-10 text-center">
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            VNR Pool
          </CardTitle>
          <CardDescription className="text-neutral-400">
            {isLogin ? "Sign in to your account" : "Create a new student account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">College Email ID</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="21071A05XX@vnrvjiet.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-neutral-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)} 
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
