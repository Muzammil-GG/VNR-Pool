"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'

export default function DigiLockerMock() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [aadhaar, setAadhaar] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep(2)
      toast.info("TESTING MODE: Use OTP '123456' to simulate success. Use any other OTP to simulate a failure.")
    }, 1500)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (otp !== '123456') {
      setLoading(false)
      toast.error("DigiLocker Error: No Driving License found linked to this Aadhaar/Mobile number.")
      setStep(4 as any)
      return
    }

    // Get current user email
    const { data: { user } } = await supabase.auth.getUser()
    
    setStep(3)
    
    // Redirect to callback after success animation
    setTimeout(() => {
      window.location.href = `/api/digilocker/callback?code=mock_success_code&email=${user?.email}`
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* DigiLocker Official Header Simulation */}
        <div className="bg-white p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* National Emblem Mock Icon */}
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border">
              <ShieldCheck className="text-slate-600 w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">DigiLocker</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Government of India</p>
            </div>
          </div>
          <div className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
            Secure Auth
          </div>
        </div>

        <CardHeader className="bg-slate-50 pb-4">
          <CardTitle className="text-xl text-center">Verify Driving License</CardTitle>
          <CardDescription className="text-center">
            VNR Pool is requesting access to your official Driving License document.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 bg-white">
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Aadhaar / Mobile Number</label>
                <Input 
                  required
                  placeholder="Enter 12 digit Aadhaar or Mobile"
                  value={aadhaar}
                  onChange={e => setAadhaar(e.target.value)}
                  className="h-12 border-slate-300 focus-visible:ring-blue-500"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || aadhaar.length < 10}
                className="w-full h-12 bg-[#2653a1] hover:bg-[#1a3b75] text-white font-semibold text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In with OTP'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-100 mb-4">
                OTP sent to registered mobile ending in <b>*{(aadhaar.length >= 4 ? aadhaar.slice(-4) : 'XXXX')}</b>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Enter 6-digit OTP</label>
                <Input 
                  required
                  type="text"
                  placeholder="------"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="h-12 border-slate-300 focus-visible:ring-blue-500 text-center tracking-[1em] font-bold text-lg"
                  maxLength={6}
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full h-12 bg-[#2653a1] hover:bg-[#1a3b75] text-white font-semibold text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Consent'}
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Verified!</h3>
              <p className="text-slate-500 text-center">
                Driving License successfully fetched.<br/>Redirecting to VNR Pool...
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Verification Failed</h3>
              <p className="text-slate-500 text-center mb-4">
                No Driving License found for this number.<br/>Only users with a valid license can offer rides.
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-lg"
              >
                Return to VNR Pool
              </Button>
            </div>
          )}
        </CardContent>
        <div className="bg-slate-100 p-3 text-center text-xs text-slate-500 border-t">
          This is a simulated Government OAuth page for VNR Pool testing.
        </div>
      </Card>
    </div>
  )
}
