"use client"

import { useState } from 'react'
import { cn, isValidIndianVehicleNumber } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Upload, X, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const branches = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL", "AIML", "DS", "CSBS"]

export function OnboardingForm({ userEmail, userId, userMetadata }: { userEmail: string, userId: string, userMetadata?: any }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const extractedRollNo = userEmail.split('@')[0].toUpperCase()
  const [formData, setFormData] = useState({
    full_name: userMetadata?.full_name || userMetadata?.name || '',
    roll_no: extractedRollNo,
    branch: '',
    mobile_number: '',
    gender: '',
    car_number: '',
    bike_number: '',
    avatar_url: (userMetadata?.avatar_url || userMetadata?.picture || '') as string | null
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Domain lock validation happens before they even see this form normally,
  // but we enforce it just in case.
  const isVnrEmail = userEmail.toLowerCase().endsWith('@vnrvjiet.in')

  if (!isVnrEmail) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md border-red-500/50 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-red-500">Access Restricted</CardTitle>
            <CardDescription>You must use a valid @vnrvjiet.in college email ID.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleNext = () => {
    if (step === 1 && !formData.full_name) {
      toast.error("Please enter your full name")
      return
    }
    if (step === 2 && (!formData.branch || !formData.gender)) {
      toast.error("Please select branch and gender")
      return
    }
    if (step === 3 && (!formData.mobile_number || !/^[6-9]\d{9}$/.test(formData.mobile_number))) {
      toast.error("Please enter a valid 10-digit Indian mobile number")
      return
    }
    setStep(s => s + 1)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    setUploadingAvatar(true)
    try {
      // Compress image if it's too large to respect the 40kb limit
      const compressedBlob = await compressImage(file, 400, 400, 0.7)
      
      if (compressedBlob.size > 40960) {
        toast.error("Image too large. Please select a smaller photo (Max 40KB).")
        setUploadingAvatar(false)
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) {
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      toast.success("Profile picture uploaded!")
    } catch (error: any) {
      toast.error(error.message || "Error uploading image")
      console.error(error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Compression failed"));
            }
          }, 'image/jpeg', quality);
        };
      };
      reader.onerror = error => reject(error);
    });
  }

  const handleSubmit = async () => {
    if (formData.car_number && !isValidIndianVehicleNumber(formData.car_number)) {
      toast.error("Please enter a valid Indian car number (e.g., TS09XX1234)")
      return
    }
    if (formData.bike_number && !isValidIndianVehicleNumber(formData.bike_number)) {
      toast.error("Please enter a valid Indian bike number (e.g., TS09YY5678)")
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
        setLoading(false)
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-xl text-foreground shadow-2xl relative z-10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Step {step} of 4
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
                  <div className="flex flex-col items-center justify-center space-y-3 mb-6">
                    <Label className="font-semibold text-foreground text-center">
                      Profile Picture (Optional) <br/>
                      <span className="text-[10px] opacity-70 font-normal">(Max size: 40KB)</span>
                    </Label>
                    <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary hover:bg-secondary/80 transition-colors">
                      {formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                          {uploadingAvatar ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6 mb-1" />}
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                    </div>
                  </div>
                    {!(userMetadata?.full_name || userMetadata?.name) && (
                      <div className="space-y-2">
                        <Label htmlFor="full_name" className="font-semibold text-foreground">Full Name</Label>
                        <Input
                          id="full_name"
                          placeholder="John Doe"
                          className="bg-background border-border focus-visible:ring-blue-500 h-11"
                          value={formData.full_name}
                          onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                      </div>
                    )}
                    {(userMetadata?.full_name || userMetadata?.name) && (
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-center space-y-1">
                        <p className="text-sm text-muted-foreground">Welcome back,</p>
                        <p className="font-bold text-lg text-foreground">{formData.full_name}</p>
                      </div>
                    )}
                  <Button className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-4 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all" onClick={handleNext}>
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
                    <Label className="font-semibold text-foreground">Branch</Label>
                    <Select onValueChange={(v) => { if (v) setFormData({ ...formData, branch: v }) }} value={formData.branch}>
                      <SelectTrigger className="bg-background border-border text-foreground h-11 focus-visible:ring-blue-500">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">Gender</Label>
                    <Select onValueChange={(v) => { if (v) setFormData({ ...formData, gender: v }) }} value={formData.gender}>
                      <SelectTrigger className="bg-background border-border text-foreground h-11 focus-visible:ring-blue-500">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between gap-4 mt-6">
                    <Button variant="outline" className="w-1/2 h-11 font-semibold bg-transparent border-border text-foreground hover:bg-secondary" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button className="w-1/2 h-11 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all" onClick={handleNext}>
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
                    <Label htmlFor="mobile" className="font-semibold text-foreground">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="9876543210"
                      className="bg-background border-border focus-visible:ring-blue-500 h-11"
                      value={formData.mobile_number}
                      onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground font-medium mt-1">Your number is obfuscated and only shared on approved bookings.</p>
                  </div>
                  <div className="flex justify-between gap-4 mt-6">
                    <Button variant="outline" className="w-1/2 h-11 font-semibold bg-transparent border-border text-foreground hover:bg-secondary" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button type="button" className="w-1/2 h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={handleNext}>
                      Next Step
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-2xl font-bold">Vehicle Details</CardTitle>
                    <CardDescription>Step 4 of 4: Optional Vehicle Info</CardDescription>
                  </CardHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="car_number">Car Number (Optional)</Label>
                      <Input
                        id="car_number"
                        placeholder="e.g. TS09XX1234"
                        value={formData.car_number}
                        onChange={(e) => setFormData({ ...formData, car_number: e.target.value.toUpperCase() })}
                        className="uppercase bg-secondary/50 border-border h-12 text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bike_number">Bike Number (Optional)</Label>
                      <Input
                        id="bike_number"
                        placeholder="e.g. TS09YY5678"
                        value={formData.bike_number}
                        onChange={(e) => setFormData({ ...formData, bike_number: e.target.value.toUpperCase() })}
                        className="uppercase bg-secondary/50 border-border h-12 text-lg"
                      />
                    </div>
                    <div className="flex justify-between gap-4 mt-6">
                      <Button variant="outline" type="button" className="w-1/3 h-12 font-semibold bg-transparent border-border text-foreground hover:bg-secondary" onClick={() => setStep(3)}>
                        Back
                      </Button>
                      <Button 
                        type="button" 
                        className="w-2/3 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {loading ? "Completing..." : "Complete Profile"}
                      </Button>
                    </div>
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
