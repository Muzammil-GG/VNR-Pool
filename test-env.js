import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config({ path: '.env.local' })

async function testEmail() {
  console.log("Testing Nodemailer with Gmail SMTP...")
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    console.log(`Attempting to send email from ${process.env.GMAIL_EMAIL} to ${process.env.GMAIL_EMAIL}...`)
    
    await transporter.sendMail({
      from: `"VNR Pool Support" <${process.env.GMAIL_EMAIL}>`,
      to: process.env.GMAIL_EMAIL,
      subject: 'VNR Pool - Nodemailer Test',
      text: 'If you see this, Nodemailer is working perfectly!',
    })

    console.log("Email sent successfully!")
  } catch (error) {
    console.error("Nodemailer failed with error:")
    console.error(error)
  }
}

testEmail()
