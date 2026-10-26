import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CinematicAuth } from '@/components/auth/CinematicAuth'

export default async function LoginPage(props: {
  searchParams?: Promise<{ preview?: string }>
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

  // If user is logged in and not explicitly previewing, redirect to home
  if (user && searchParams?.preview !== '3d' && searchParams?.preview !== 'true') {
    redirect('/')
  }

  // Render CinematicAuth on /login so the scroll-driven 3D car animation appears here as well
  return <CinematicAuth />
}
