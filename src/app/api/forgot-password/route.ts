import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { authRateLimit } from '@/lib/rate-limit'

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").endsWith("@vnrvjiet.in", "Must be a VNRVJIET email address"),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    try {
      await authRateLimit.check(5, `forgot_${ip}`)
    } catch {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    const body = await req.json()
    const parseResult = forgotPasswordSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
    }
    const { email } = parseResult.data

    // Initialize Supabase admin client to interact with password_resets table securely
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // Delete any old resets for this email to prevent clutter
    await supabaseAdmin.from('password_resets').delete().eq('email', email)

    // Store the new OTP
    const { error: dbError } = await supabaseAdmin.from('password_resets').insert({
      email,
      otp,
      expires_at: expiresAt
    })
    
    if (dbError) throw dbError

    // Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // Use 465 for secure implicit SSL
      secure: true,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Send the email
    await transporter.sendMail({
      from: `"VNR Pool Support" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: 'VNR Pool - Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #059669; margin-top: 0;">Password Reset</h2>
          <p>We received a request to reset your password for your VNR Pool account.</p>
          <p>Your secure 6-digit reset code is:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${otp}</span>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 })
  }
}
