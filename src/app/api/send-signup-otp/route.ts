import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { authRateLimit } from '@/lib/rate-limit'

const signupSchema = z.object({
  email: z.string().email("Invalid email format").endsWith("@vnrvjiet.in", "Must be a VNRVJIET email address"),
})

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting (Using IP or a generic 'auth' token if IP is unavailable)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    try {
      await authRateLimit.check(5, `signup_${ip}`)
    } catch {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    // 2. Input Validation & Sanitization
    const body = await req.json()
    const parseResult = signupSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
    }
    const { email } = parseResult.data
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const userExists = users.find(u => u.email === email)
    if (userExists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // Delete any old signups for this email
    await supabaseAdmin.from('signup_verifications').delete().eq('email', email)

    // Store the new OTP
    const { error: dbError } = await supabaseAdmin.from('signup_verifications').insert({
      email,
      otp,
      expires_at: expiresAt
    })
    
    if (dbError) throw dbError

    // Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
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
      subject: 'VNR Pool - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #059669; margin-top: 0;">Welcome to VNR Pool!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <p>Your secure 6-digit verification code is:</p>
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
    console.error('Send signup OTP error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 })
  }
}
