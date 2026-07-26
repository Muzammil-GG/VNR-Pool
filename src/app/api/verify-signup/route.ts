import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { authRateLimit } from '@/lib/rate-limit'

const verifySchema = z.object({
  email: z.string().email("Invalid email").endsWith("@vnrvjiet.in", "Must be a VNRVJIET email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    try {
      await authRateLimit.check(5, `verify_${ip}`)
    } catch {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    const body = await req.json()
    const parseResult = verifySchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
    }
    const { email, password, otp } = parseResult.data

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
