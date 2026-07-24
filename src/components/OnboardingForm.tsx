"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const branches = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL", "AIML", "DS", "CSBS"]

export function OnboardingForm({ userEmail, userId }: { userEmail: string, userId: string }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    roll_no: '',
    branch: '',
    mobile_number: '',
    gender: ''
  })
  const router = useRouter()
  const supabase = createClient()

  // Domain lock validation happens before they even see this form normally,
  // but we enforce it just in case.
  const isVnrEmail = userEmail.toLowerCase().endsWith('@vnrvjiet.in')

  if (!isVnrEmail) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <Card className="w-full max-w-md border-red-500/50 bg-black/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-red-500">Access Restricted</CardTitle>
            <CardDescription>You must use a valid @vnrvjiet.in college email ID.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleNext = () => {
    if (step === 1 && (!formData.full_name || !formData.roll_no)) {
      toast.error("Please fill all fields")
      return
    }
    if (step === 2 && (!formData.branch || !formData.gender)) {
      toast.error("Please select branch and gender")
      return
    }
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    if (!formData.mobile_number || formData.mobile_number.length < 10) {
      toast.error("Please enter a valid mobile number")
      return
    }

    setLoading(true)
    try {
      // Use upsert because the user row might not exist in public.users yet
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
          ...formData,
          profile_completed: true
        })

      if (error) {
        console.error("Supabase error during profile complete:", error)
        toast.error(error.message)
      } else {
        toast.success("Profile completed!")
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      console.error("Unexpected error during profile complete:", err)
      toast.error("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 p-4">
      <Card className="w-full max-w-md border-white/10 bg-black/50 backdrop-blur-xl text-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Step {step} of 3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden min-h-[250px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      placeholder="John Doe"
                      className="bg-white/5 border-white/10 focus-visible:ring-emerald-500"
                      value={formData.full_name}
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roll_no">Roll Number</Label>
                    <Input
                      id="roll_no"
                      placeholder="21071A05XX"
                      className="bg-white/5 border-white/10 focus-visible:ring-emerald-500 uppercase"
                      value={formData.roll_no}
                      onChange={e => setFormData({ ...formData, roll_no: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4" onClick={handleNext}>
                    Next
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select onValueChange={(v) => { if (v) setFormData({ ...formData, branch: v }) }} value={formData.branch}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-white/10 text-white">
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select onValueChange={(v) => { if (v) setFormData({ ...formData, gender: v }) }} value={formData.gender}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-white/10 text-white">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between gap-4 mt-6">
                    <Button variant="outline" className="w-1/2 bg-transparent border-white/10" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNext}>
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="9876543210"
                      className="bg-white/5 border-white/10 focus-visible:ring-emerald-500"
                      value={formData.mobile_number}
                      onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
                    />
                    <p className="text-xs text-neutral-500">Your number is obfuscated and only shared on approved bookings.</p>
                  </div>
                  <div className="flex justify-between gap-4 mt-6">
                    <Button variant="outline" className="w-1/2 bg-transparent border-white/10" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button 
                      className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                      Complete
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
