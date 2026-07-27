import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { authRateLimit } from '@/lib/rate-limit'

const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    try {
      await authRateLimit.check(3, `send_phone_otp_${ip}`)
    } catch {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    const body = await req.json()
    const parseResult = phoneSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
    }
    
    const { phone } = parseResult.data

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes expiry

    // Delete any old OTPs for this phone number
    await supabaseAdmin.from('phone_verifications').delete().eq('phone_number', phone)

    // Store the new OTP
    const { error: dbError } = await supabaseAdmin.from('phone_verifications').insert({
      phone_number: phone,
      otp,
      expires_at: expiresAt
    })
    
    if (dbError) throw dbError

    // MOCK SMS GATEWAY
    // In production, you would call Twilio, Fast2SMS, MSG91, etc. here.
    console.log(`\n========================================`)
    console.log(`📱 MOCK SMS TO: +91 ${phone}`)
    console.log(`Your VNR Pool verification code is: ${otp}`)
    console.log(`========================================\n`)

    return NextResponse.json({ success: true, mock: true, mockOtp: otp })

  } catch (error: any) {
    console.error('Send phone OTP error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 })
  }
}
