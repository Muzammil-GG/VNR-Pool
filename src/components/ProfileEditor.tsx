"use client"

import { useState } from 'react'
import { User as UserIcon, Loader2, LogOut, Upload, UserCog, ShieldCheck, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { toast } from 'sonner'
import { cn, isValidIndianVehicleNumber } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function ProfileEditor({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user_profile', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single()

      if (error) throw error
      return data
    }
  })

  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    car_number: '',
    bike_number: '',
    avatar_url: '' as string | null
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Sync state when editing starts
  const startEditing = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        mobile_number: profile.mobile_number || '',
        car_number: profile.car_number || '',
        bike_number: profile.bike_number || '',
        avatar_url: profile.avatar_url || null
      })
    }
    setIsEditing(true)
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    setUploadingAvatar(true)
    try {
      const compressedBlob = await compressImage(file, 400, 400, 0.7)
      
      if (compressedBlob.size > 40960) {
        toast.error("Image too large. Please select a smaller photo (Max 40KB).")
        setUploadingAvatar(false)
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      toast.success("Profile picture uploaded temporarily. Save changes to keep it.")
    } catch (error: any) {
      toast.error(error.message || "Error uploading image")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const updateProfile = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: newData.full_name,
          mobile_number: newData.mobile_number,
          car_number: newData.car_number,
          bike_number: newData.bike_number,
          avatar_url: newData.avatar_url
        })
        .eq('id', currentUserId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['user_profile'] })
      setIsEditing(false)
    },
    onError: (err) => {
      toast.error(`Error updating profile: ${err.message}`)
    }
  })

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      router.push('/auth')
    } catch (e) {
      toast.error('Failed to log out')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) setIsEditing(false)
    }}>
      <DialogTrigger render={
        <button className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer w-full text-left font-medium">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm">
              <UserCog className="w-4 h-4 text-blue-500" />
            </div>
            <span>Edit Profile</span>
          </div>
        </button>
      } />
      <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-border overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">My Profile</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : profile ? (
          <div className="space-y-5 mt-4">
            
            {isEditing && (
              <div className="flex flex-col items-center justify-center space-y-3 mb-6">
                <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary hover:bg-secondary/80 transition-colors">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
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
                <Label className="text-xs text-muted-foreground text-center">
                  Tap to change profile picture <br/>
                  <span className="text-[10px] opacity-70">(Max size: 40KB)</span>
                </Label>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
                <Label className="text-right text-muted-foreground font-semibold">Full Name</Label>
                {isEditing ? (
                  <Input 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})} 
                    className="h-9"
                  />
                ) : (
                  <div className="font-bold">{profile.full_name}</div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
                <Label className="text-right text-muted-foreground font-semibold">Email</Label>
                <div className="font-medium text-muted-foreground">{profile.email}</div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
                <Label className="text-right text-muted-foreground font-semibold">Mobile</Label>
                {isEditing ? (
                  <Input 
                    value={formData.mobile_number} 
                    onChange={e => setFormData({...formData, mobile_number: e.target.value})} 
                    className="h-9"
                  />
                ) : (
                  <div className="font-bold">{profile.mobile_number}</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
                <Label className="text-right text-muted-foreground font-semibold">Car Number</Label>
                {isEditing ? (
                  <Input 
                    value={formData.car_number} 
                    onChange={e => setFormData({...formData, car_number: e.target.value.toUpperCase()})} 
                    placeholder="e.g. TS09XX1234"
                    className="h-9 uppercase"
                  />
                ) : (
                  <div className="font-bold text-muted-foreground">
                    {profile.car_number || 'Not provided'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
                <Label className="text-right text-muted-foreground font-semibold">Bike Number</Label>
                {isEditing ? (
                  <Input 
                    value={formData.bike_number} 
                    onChange={e => setFormData({...formData, bike_number: e.target.value.toUpperCase()})} 
                    placeholder="e.g. TS09YY5678"
                    className="h-9 uppercase"
                  />
                ) : (
                  <div className="font-bold text-muted-foreground">
                    {profile.bike_number || 'Not provided'}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button 
                    className="bg-primary hover:opacity-90 text-primary-foreground"
                    onClick={() => {
                      if (!formData.mobile_number || !/^[6-9]\d{9}$/.test(formData.mobile_number)) {
                        toast.error("Please enter a valid 10-digit Indian mobile number")
                        return
                      }
                      if (formData.car_number && !isValidIndianVehicleNumber(formData.car_number)) {
                        toast.error("Please enter a valid Indian car number (e.g., TS09XX1234)")
                        return
                      }
                      if (formData.bike_number && !isValidIndianVehicleNumber(formData.bike_number)) {
                        toast.error("Please enter a valid Indian bike number (e.g., TS09YY5678)")
                        return
                      }
                      updateProfile.mutate(formData)
                    }}
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                  <Button className="bg-primary hover:opacity-90 text-primary-foreground w-full" onClick={startEditing}>
                    Edit Profile
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-red-500 p-4">Failed to load profile.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
