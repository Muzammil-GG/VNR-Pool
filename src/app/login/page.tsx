import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InteractiveLanding } from '@/components/landing/InteractiveLanding'

export default async function LoginPage(props: {
  searchParams?: Promise<{ mode?: 'login' | 'signup'; auth?: 'login' | 'signup' }>
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (e) {
    // Graceful fallback if supabase is unreachable
  }

  // If user is logged in, redirect to home
  if (user) {
    redirect('/')
  }

  const isSignup = searchParams?.mode === 'signup' || searchParams?.auth === 'signup'

  return (
    <main id="landing-container" className="min-h-screen">
      <InteractiveLanding
        defaultAuthOpen={true}
        defaultAuthMode={isSignup ? 'signup' : 'login'}
      />
    </main>
  )
}
