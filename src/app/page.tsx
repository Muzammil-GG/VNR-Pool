import { createClient } from '@/lib/supabase/server'
import { CinematicAuth } from '@/components/auth/CinematicAuth'
import { OnboardingForm } from '@/components/OnboardingForm'
import { Dashboard } from '@/components/Dashboard'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <CinematicAuth />
  }

  // Check if profile is completed
  const { data: userProfile } = await supabase
    .from('users')
    .select('profile_completed')
    .eq('id', user.id)
    .single()

  if (!userProfile?.profile_completed) {
    return <OnboardingForm userEmail={user.email!} userId={user.id} userMetadata={user.user_metadata} />
  }

  return (
    <main className="min-h-[100dvh] relative overflow-x-hidden">
      <div className="relative z-10">
        <Dashboard currentUserId={user.id} />
      </div>
    </main>
  )
}

