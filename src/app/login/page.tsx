import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CinematicAuth } from '@/components/auth/CinematicAuth'

export default async function LoginPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (e) {
    // Graceful fallback if supabase is unreachable
  }

  if (user) {
    redirect('/')
  }

  // Render CinematicAuth on /login so the scroll-driven 3D car animation appears here as well
  return <CinematicAuth />
}
