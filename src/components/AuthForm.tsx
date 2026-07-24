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
import { ThemeToggle } from '@/components/ThemeToggle'

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
    <div 
      className="flex items-center justify-center min-h-screen p-4 relative bg-background overflow-hidden"
    >
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-20"
        style={{ backgroundImage: 'url(/vehicles-bg.png)' }}
      />
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md bg-background/60 backdrop-blur-3xl border-border shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent pointer-events-none" />
        <CardHeader className="relative z-10 text-center">
          <CardTitle className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500 tracking-tight">
            VNR Pool
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2 text-base">
            {isLogin ? "Sign in to your account" : "Create a new student account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold">College Email ID</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="21071A05XX@vnrvjiet.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-background/50 border-border text-foreground focus-visible:ring-emerald-500 placeholder:text-muted-foreground/50 h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-background/50 border-border text-foreground focus-visible:ring-emerald-500 h-11"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg hover:shadow-emerald-500/30 text-base font-semibold rounded-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)} 
              className="text-emerald-500 hover:text-emerald-400 font-semibold underline underline-offset-4 transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
