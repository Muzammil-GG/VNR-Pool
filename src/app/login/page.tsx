import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/15 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <Link 
        href="/"
        className="absolute top-6 left-6 z-30 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-all bg-background/80 hover:bg-background backdrop-blur-md px-3.5 py-2 rounded-xl border border-border shadow-sm hover:scale-[1.02] active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to 3D Showcase
      </Link>
      <AuthForm isCinematic={false} />
    </main>
  )
}
