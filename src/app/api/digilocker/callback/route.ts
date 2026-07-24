import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const email = url.searchParams.get('email') // Passed from our mock UI for simulation

  if (code !== 'mock_success_code' || !email) {
    return NextResponse.redirect(new URL('/?error=digilocker_failed', req.url))
  }

  try {
    // Initialize Supabase Admin to bypass RLS and forcefully verify the user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // In a real implementation, we would use the `code` to fetch the real DL JSON from DigiLocker API
    // Here we generate a mock DL number
    const mockDlNumber = `TS${Math.floor(10 + Math.random() * 90)} ${Math.floor(2010 + Math.random() * 14)}${Math.floor(1000000 + Math.random() * 9000000)}`

    // Update the user's profile to verified
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_verified_driver: true,
        dl_number: mockDlNumber
      })
      .eq('email', email) // Update based on email

    if (error) throw error

    // Redirect back to dashboard with success message
    return NextResponse.redirect(new URL('/?verified=true', req.url))

  } catch (error) {
    console.error('DigiLocker Callback Error:', error)
    return NextResponse.redirect(new URL('/?error=digilocker_server_error', req.url))
  }
}
