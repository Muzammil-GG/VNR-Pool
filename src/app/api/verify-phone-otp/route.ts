import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { authRateLimit } from '@/lib/rate-limit'

const verifySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    try {
      await authRateLimit.check(5, `verify_phone_${ip}`)
    } catch {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    const body = await req.json()
    const parseResult = verifySchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }
    const { phone, otp } = parseResult.data

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verify the OTP
    const { data: verifyRecord, error: fetchError } = await supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', phone)
      .eq('otp', otp)
      .single()

    if (fetchError || !verifyRecord) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // 2. Check if expired
    if (new Date() > new Date(verifyRecord.expires_at)) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // 3. Cleanup the OTP so it can't be reused
    await supabaseAdmin.from('phone_verifications').delete().eq('id', verifyRecord.id)

    // Note: The actual user's `is_phone_verified` column gets updated on the frontend when they save their profile,
    // or we can just return success here and the frontend will allow them to proceed with saving.
    // For extreme security, we could update the user's `is_phone_verified` here if a userId is provided, 
    // but during Onboarding, the user might not have a profile yet.
    // We'll let the frontend proceed and it will save `is_phone_verified: true` when creating/updating the profile.

    return NextResponse.json({ success: true, message: 'Phone number verified successfully' })

  } catch (error: any) {
    console.error('Verify phone error:', error)
    return NextResponse.json({ error: error.message || 'Failed to verify phone' }, { status: 500 })
  }
}
