import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, password, otp } = await req.json()
    if (!email || !password || !otp) {
      return NextResponse.json({ error: 'Email, password, and OTP are required' }, { status: 400 })
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verify the OTP in our custom table
    const { data: verifyRecord, error: fetchError } = await supabaseAdmin
      .from('signup_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .single()

    if (fetchError || !verifyRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // 2. Check if expired
    if (new Date() > new Date(verifyRecord.expires_at)) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // 3. Create the user using the Admin API (skips email verification because we manually say email_confirm: true)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

    if (createError) throw createError

    // 4. Cleanup the OTP so it can't be reused
    await supabaseAdmin.from('signup_verifications').delete().eq('id', verifyRecord.id)

    return NextResponse.json({ success: true, user: userData.user })

  } catch (error: any) {
    console.error('Verify signup error:', error)
    return NextResponse.json({ error: error.message || 'Failed to verify signup' }, { status: 500 })
  }
}
