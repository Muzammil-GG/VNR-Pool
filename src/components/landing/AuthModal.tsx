"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, Lock, KeyRound, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, ShieldAlert, School } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Image from "next/image"
import { Righteous } from "next/font/google"
import { ThemeToggle } from "@/components/ThemeToggle"

const righteous = Righteous({ weight: "400", subsets: ["latin"] })

export type AuthMode = "login" | "signup" | "signup_verify" | "forgot_password" | "reset_password"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: "login" | "signup"
  contextMessage?: string
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  contextMessage,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          queryParams: {
            hd: "vnrvjiet.in",
          },
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      console.error("Google auth error:", error)
      const msg = error.message || ""
      if (msg.includes("fetch failed") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        toast.error("Database connection issue. Please check your network or try again.", { duration: 6000 })
      } else {
        toast.error(error.message || "Failed to sign in with Google")
      }
      setLoading(false)
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail.endsWith("@vnrvjiet.in")) {
      toast.error("Access Restricted: Only official @vnrvjiet.in institutional emails are authorized.")
      return
    }

    setLoading(true)

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (error) throw error
        toast.success("Identity verified! Loading campus dashboard...")
        window.location.href = "/"
      } else if (mode === "signup") {
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters long.")
          setLoading(false)
          return
        }

        const res = await fetch("/api/send-signup-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to send OTP")

        toast.success("Verification OTP dispatched to your institutional inbox.")
        setMode("signup_verify")
      } else if (mode === "signup_verify") {
        const res = await fetch("/api/verify-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password, otp: otp.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to verify OTP")

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (signInErr) throw signInErr

        toast.success("Institutional identity confirmed! Welcome to VNR Pool.")
        window.location.href = "/"
      } else if (mode === "forgot_password") {
        const res = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to send reset OTP")

        toast.success("Security reset token sent to your college email.")
        setMode("reset_password")
      } else if (mode === "reset_password") {
        const res = await fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, otp: otp.trim(), newPassword: password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to reset password")

        toast.success("Security credentials updated! Please authenticate with your new password.")
        setMode("login")
        setPassword("")
        setOtp("")
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      toast.error(err.message || "Authentication failed. Please verify institutional credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window: Official Institutional Design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-[420px] rounded-2xl bg-white dark:bg-[#0e1320] text-slate-900 dark:text-slate-100 p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 transition-colors"
        >
          {/* Top Controls: Theme Toggle & Close */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <ThemeToggle />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Official College Header */}
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
            <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 relative overflow-hidden border border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-900 shadow-xs p-1.5">
              <Image src="/vnr-logo.png" alt="VNR VJIET" width={34} height={34} className="object-contain" priority />
            </div>

            <h2 className={`text-xl font-bold tracking-tight text-slate-900 dark:text-white ${righteous.className}`}>
              VNR <span className="text-blue-600 dark:text-blue-500">Pool</span>
            </h2>

            {contextMessage ? (
              <p className="mt-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full inline-block">
                {contextMessage.replace(/^Sign in with @vnrvjiet\.in to book the /, 'Booking: ')}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Campus Carpool & Split Network
              </p>
            )}
          </div>

          {/* Segmented Control Tabs */}
          {(mode === "login" || mode === "signup") && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-3.5">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  mode === "login"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  mode === "signup"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Google SSO Button */}
          {(mode === "login" || mode === "signup") && (
            <div className="space-y-3 mb-3.5">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with VNR Google ID</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold text-slate-400">
                  <span className="bg-white dark:bg-[#0e1320] px-3">or</span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                College Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vnrvjiet.in"
                  required
                  className="w-full py-2.5 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* OTP Field */}
            {(mode === "signup_verify" || mode === "reset_password") && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">6-Digit Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full py-2.5 pl-10 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors tracking-widest font-mono text-center"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            {mode !== "forgot_password" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {mode === "reset_password" ? "New Password" : "Password"}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot_password")}
                      className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-medium cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === "signup" ? (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === "signup_verify" ? (
                <>
                  <span>Verify & Join</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              ) : mode === "forgot_password" ? (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Link */}
          {(mode === "forgot_password" || mode === "reset_password" || mode === "signup_verify") && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium transition-colors cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          {/* Minimal College Notice */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Only for verified @vnrvjiet.in students & staff
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
