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
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'reset_password'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
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
    
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.refresh()
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success("Check your email for the confirmation link.")
      } else if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        toast.success("OTP sent to your email! Please check your inbox.")
        setMode('reset_password')
      } else if (mode === 'reset_password') {
        // Verify OTP first
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'recovery'
        })
        if (verifyError) throw verifyError

        // If verified, the user is now logged in. Update password:
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        })
        if (updateError) throw updateError

        toast.success("Password reset successfully! You are now logged in.")
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
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
            {mode === 'login' ? "Sign in to your account" :
             mode === 'signup' ? "Create a new student account" :
             mode === 'forgot_password' ? "Reset your password" :
             "Enter OTP and New Password"}
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
            
            {mode === 'reset_password' && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-foreground font-semibold">6-Digit OTP</Label>
                <Input 
                  id="otp" 
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="bg-background/50 border-border text-foreground focus-visible:ring-emerald-500 h-11 tracking-widest text-center"
                  required
                />
              </div>
            )}

            {mode !== 'forgot_password' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-foreground font-semibold">
                    {mode === 'reset_password' ? 'New Password' : 'Password'}
                  </Label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot_password')}
                      className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-background/50 border-border text-foreground focus-visible:ring-emerald-500 h-11"
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg hover:shadow-emerald-500/30 text-base font-semibold rounded-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
              {mode === 'login' ? "Sign In" : 
               mode === 'signup' ? "Sign Up" : 
               mode === 'forgot_password' ? "Send OTP" : 
               "Reset & Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground flex flex-col gap-2">
            <div>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
                className="text-emerald-500 hover:text-emerald-400 font-semibold underline underline-offset-4 transition-colors"
              >
                {mode === 'login' ? "Sign up" : "Sign in"}
              </button>
            </div>
            {(mode === 'forgot_password' || mode === 'reset_password') && (
              <div>
                <button 
                  type="button"
                  onClick={() => setMode('login')} 
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Back to Sign in
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
