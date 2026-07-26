import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { authRateLimit } from '@/lib/rate-limit'

const resetSchema = z.object({
  email: z.string().email("Invalid email").endsWith("@vnrvjiet.in", "Must be a VNRVJIET email"),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    try {
      await authRateLimit.check(5, `reset_${ip}`)
    } catch {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    const body = await req.json()
    const parseResult = resetSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
    }
    const { email, otp, newPassword } = parseResult.data

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verify the OTP in our custom table
    const { data: resetRecord, error: fetchError } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .single()

    if (fetchError || !resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // 2. Check if expired
    if (new Date() > new Date(resetRecord.expires_at)) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // 3. Find the user in Supabase Auth to get their ID
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email === email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 4. Overwrite their password using the Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true // Just in case it wasn't confirmed
    })

    if (updateError) throw updateError

    // 5. Cleanup the OTP so it can't be reused
    await supabaseAdmin.from('password_resets').delete().eq('id', resetRecord.id)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: error.message || 'Failed to reset password' }, { status: 500 })
  }
}
