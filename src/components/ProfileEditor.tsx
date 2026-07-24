"use client"

import { useState } from 'react'
import { User as UserIcon, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ProfileEditor({ currentUserId }: { currentUserId: string }) {
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
    bike_number: ''
  })

  // Sync state when editing starts
  const startEditing = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        mobile_number: profile.mobile_number || '',
        car_number: profile.car_number || '',
        bike_number: profile.bike_number || ''
      })
    }
    setIsEditing(true)
  }

  const updateProfile = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: newData.full_name,
          mobile_number: newData.mobile_number,
          car_number: newData.car_number,
          bike_number: newData.bike_number
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

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) setIsEditing(false)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative p-2 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center w-10 h-10 transition-colors">
          <UserIcon className="w-5 h-5 text-blue-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-border overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">My Profile</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : profile ? (
          <div className="space-y-5 mt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
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
              
              <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
                <Label className="text-right text-muted-foreground font-semibold">Email</Label>
                <div className="font-medium text-muted-foreground">{profile.email}</div>
              </div>
              
              <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
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

              <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
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

              <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateProfile.mutate(formData)}
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={startEditing}>
                  Edit Profile
                </Button>
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
