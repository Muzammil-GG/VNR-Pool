"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Car } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { VehicleBackground } from '@/components/VehicleBackground'

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'reset_password' | 'signup_verify'>('login')
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
        const res = await fetch('/api/send-signup-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
        
        toast.success("OTP sent! Please check your email to verify.")
        setMode('signup_verify')
      } else if (mode === 'signup_verify') {
        const res = await fetch('/api/verify-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, otp })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to verify OTP')

        // Now that the account is created, log the user in directly
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError

        toast.success("Email verified and account created!")
      } else if (mode === 'forgot_password') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
        
        toast.success("OTP sent to your email! Please check your inbox.")
        setMode('reset_password')
      } else if (mode === 'reset_password') {
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword: password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to reset password')

        toast.success("Password reset successfully! Please log in.")
        setMode('login')
        setPassword('')
        setOtp('')
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      <VehicleBackground />
      
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <Card className="w-full bg-[#f8fafc] dark:bg-[#0f172a]/80 backdrop-blur-3xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden relative">
          
          <CardHeader className="relative z-10 text-center pb-4 pt-8">
            <div className="w-16 h-16 mx-auto bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 hover:scale-105 transition-transform">
              <Car className="w-8 h-8 text-white dark:text-slate-900" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              VNR Pool
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {mode === 'login' ? "Sign in to continue" :
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
                className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-400 h-11"
                required
              />
            </div>
            
            {(mode === 'reset_password' || mode === 'signup_verify') && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-foreground font-semibold">6-Digit OTP</Label>
                <Input 
                  id="otp" 
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-400 h-11 tracking-widest text-center"
                  required
                />
              </div>
            )}

            {(mode !== 'forgot_password' && mode !== 'signup_verify') && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-foreground font-semibold">
                    {mode === 'reset_password' ? 'New Password' : 'Password'}
                  </Label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot_password')}
                      className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
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
                  className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-400 h-11"
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 transition-all text-base font-bold rounded-lg shadow-md"
            >
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
              {mode === 'login' ? "Sign In" : 
               mode === 'signup' ? "Sign Up" : 
               mode === 'signup_verify' ? "Verify & Create Account" :
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
                className="text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 font-bold transition-colors"
              >
                {mode === 'login' ? "Sign up now" : "Sign in instead"}
              </button>
            </div>
            {(mode === 'forgot_password' || mode === 'reset_password' || mode === 'signup_verify') && (
              <div>
                <button 
                  type="button"
                  onClick={() => setMode('login')} 
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                >
                  Back to Sign in
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  )
}
