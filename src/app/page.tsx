import { createClient } from '@/lib/supabase/server'
import { CinematicAuth } from '@/components/auth/CinematicAuth'
import { InteractiveLanding } from '@/components/landing/InteractiveLanding'
import { OnboardingForm } from '@/components/OnboardingForm'
import { Dashboard } from '@/components/Dashboard'

export default async function Home(props: {
  searchParams?: Promise<{
    code?: string
    error?: string
    preview?: string
    auth?: 'login' | 'signup'
    mode?: 'login' | 'signup'
  }>
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

  // Explicit 3D preview fallback if desired
  if (searchParams?.preview === '3d') {
    return <CinematicAuth />
  }

  // If not logged in, render the interactive landing experience
  if (!user) {
    const defaultAuthOpen = searchParams?.auth === 'login' || searchParams?.auth === 'signup' || searchParams?.mode === 'login' || searchParams?.mode === 'signup'
    const defaultAuthMode = (searchParams?.auth === 'signup' || searchParams?.mode === 'signup') ? 'signup' : 'login'
    return (
      <main id="landing-container" className="min-h-screen">
        <InteractiveLanding
          defaultAuthOpen={defaultAuthOpen}
          defaultAuthMode={defaultAuthMode}
        />
      </main>
    )
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
