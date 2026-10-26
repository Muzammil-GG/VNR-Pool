import { createClient } from '@/lib/supabase/server'
import { CinematicAuth } from '@/components/auth/CinematicAuth'
import { OnboardingForm } from '@/components/OnboardingForm'
import { Dashboard } from '@/components/Dashboard'

export default async function Home(props: {
  searchParams?: Promise<{ code?: string; error?: string }>
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined
  const supabase = await createClient()

  // If redirected with PKCE auth code, exchange it for a session
  if (searchParams?.code) {
    try {
      await supabase.auth.exchangeCodeForSession(searchParams.code)
    } catch (e) {
      console.error('Failed to exchange code for session:', e)
    }
  }
  
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (err) {
    console.error('Failed to fetch user session:', err)
  }

  if (!user) {
    return <CinematicAuth />
  }

  // Check if profile is completed
  let userProfile = null
  try {
    const { data } = await supabase
      .from('users')
      .select('profile_completed')
      .eq('id', user.id)
      .single()
    userProfile = data
  } catch (err) {
    console.error('Failed to fetch user profile:', err)
  }

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

