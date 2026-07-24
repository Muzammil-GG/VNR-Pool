import { createClient } from '@/lib/supabase/server'
import { AuthForm } from '@/components/AuthForm'
import { OnboardingForm } from '@/components/OnboardingForm'
import { Dashboard } from '@/components/Dashboard'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return <AuthForm />
  }

  // Check if profile is completed
  const { data: userProfile } = await supabase
    .from('users')
    .select('profile_completed')
    .eq('id', session.user.id)
    .single()

  if (!userProfile?.profile_completed) {
    return <OnboardingForm userEmail={session.user.email!} userId={session.user.id} />
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Dashboard currentUserId={session.user.id} />
    </main>
  )
}
