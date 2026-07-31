"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { WavyBackground } from '@/components/ui/wavy-background'

import { SpotlightCard } from '@/components/ui/spotlight-card'
import Image from 'next/image'
import { Righteous } from 'next/font/google'

const righteous = Righteous({ weight: '400', subsets: ['latin'] })

const FloatingInput = ({ icon: Icon, label, id, type, value, onChange, placeholder, required = false }: any) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isFilled = value.length > 0 || isFocused
  const isPasswordField = type === 'password'
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="relative group">
      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${isFocused ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        placeholder={isFocused ? placeholder : ""}
        className={`block w-full rounded-2xl border-0 py-3.5 pl-12 ${isPasswordField ? 'pr-12' : 'pr-4'} bg-black/5 dark:bg-white/5 text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-200/50 dark:ring-slate-800/50 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all sm:text-sm sm:leading-6 backdrop-blur-md outline-none`}
      />
      {isPasswordField && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
      <label
        htmlFor={id}
        className={`absolute left-12 transition-all duration-300 pointer-events-none ${
          isFilled 
            ? '-top-2.5 bg-white dark:bg-[#040914] px-1 text-xs font-semibold text-blue-600 rounded-md' 
            : 'top-3.5 text-sm text-slate-500 dark:text-slate-400 font-medium'
        }`}
      >
        {label}
      </label>
      {/* Background glow on focus */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500 pointer-events-none -z-10`} />
    </div>
  )
}

export function AuthForm({ isCinematic = false }: { isCinematic?: boolean }) {
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
    <div className={`flex items-center justify-center min-h-screen p-4 relative overflow-hidden ${isCinematic ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      {!isCinematic && (
        <>
          <div className="absolute inset-0 z-0">
            <WavyBackground 
              colors={['#1d4ed8', '#2563eb', '#3b82f6', '#eab308', '#f59e0b']} 
              waveOpacity={0.8} 
              blur={2}
              speed="fast"
              waveWidth={2}
            />
          </div>
          <div className="absolute inset-0 z-[1] pointer-events-none">
            
          </div>
          
          <div className="absolute top-6 right-6 z-20">
            <ThemeToggle />
          </div>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <SpotlightCard className="w-full p-[1px] shadow-2xl rounded-[2.2rem] overflow-hidden relative bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-800 dark:to-transparent">
          <Card className="w-full bg-white/60 dark:bg-[#020617]/80 backdrop-blur-3xl border-0 shadow-none rounded-[2.1rem] overflow-hidden relative">
            
            {/* Ambient inner glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
            
            {/* Noise texture overlay for premium frosted glass feel */}
            <div 
              className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
            />

            <CardHeader className="relative z-10 text-center pb-4 pt-8">
              <div className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(29,78,216,0.3)] mb-4 hover:scale-105 transition-transform duration-300 overflow-hidden relative border-2 border-blue-500/20 bg-[#1e3a8a]">
                <Image src="/vnr-logo.png" alt="VNR VJIET" fill className="object-contain p-1.5" />
              </div>
              <CardTitle className={`hero-title text-4xl gradient-text mb-2 ${righteous.className}`}>
                VNR Pool
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2 font-medium">
                {mode === 'login' ? "Sign in to continue" :
               mode === 'signup' ? "Create a new student account" :
               mode === 'forgot_password' ? "Reset your password" :
               "Enter OTP and New Password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 pb-8 px-6">
          <form onSubmit={handleAuth} className="space-y-6">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="space-y-5"
              >
                
                <FloatingInput
                  icon={Mail}
                  label="College Email ID"
                  id="email"
                  type="email"
                  placeholder="21071A05XX@vnrvjiet.in"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  required
                />
                
                {(mode === 'reset_password' || mode === 'signup_verify') && (
                  <FloatingInput
                    icon={KeyRound}
                    label="6-Digit OTP"
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e: any) => setOtp(e.target.value)}
                    required
                  />
                )}

                {(mode !== 'forgot_password' && mode !== 'signup_verify') && (
                  <div className="space-y-2">
                    <FloatingInput
                      icon={Lock}
                      label={mode === 'reset_password' ? 'New Password' : 'Password'}
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                    />
                    {mode === 'login' && (
                      <div className="flex justify-end pt-1">
                        <button 
                          type="button" 
                          onClick={() => setMode('forgot_password')}
                          className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 shiny-btn bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white transition-all text-base font-bold rounded-2xl shadow-[0_8px_20px_rgba(29,78,216,0.25)] hover:shadow-[0_8px_25px_rgba(29,78,216,0.4)] press-scale mt-4 relative overflow-hidden group border border-blue-500/30"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center justify-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 
                 mode === 'login' ? 'Sign In' : 
                 mode === 'signup' ? 'Send OTP' : 
                 mode === 'signup_verify' ? 'Verify & Complete' :
                 mode === 'forgot_password' ? 'Send Reset OTP' : 
                 'Reset & Sign In'}
              </span>
            </Button>
          </form>
          <div className="mt-8 text-center text-sm font-medium">
            <span className="text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
              className="text-blue-600 hover:text-blue-500 font-bold ml-1 transition-colors hover:underline decoration-blue-600/30 underline-offset-4"
            >
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </button>
            {(mode === 'forgot_password' || mode === 'reset_password' || mode === 'signup_verify') && (
              <div className="mt-4">
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
      </SpotlightCard>
      </motion.div>
    </div>
  )
}
