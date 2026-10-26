import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InteractiveLanding } from '@/components/landing/InteractiveLanding'

export default async function RegisterPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (e) {
    // Graceful fallback
  }

  if (user) {
    redirect('/')
  }

  return (
    <main id="landing-container" className="min-h-screen">
      <InteractiveLanding
        defaultAuthOpen={true}
        defaultAuthMode="signup"
      />
    </main>
  )
}
