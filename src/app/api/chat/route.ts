import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 30; // Max execution time for serverless functions

const SYSTEM_PROMPT = `
You are the VNR Pool AI Assistant, a helpful and friendly chatbot integrated directly into the VNR Pool app. 
VNR Pool is an exclusive, closed-ecosystem carpooling and bike-pooling platform strictly for students of VNRVJIET.

Here is your essential knowledge base:
1. **App Purpose:** To reduce commute costs, minimize carbon footprint (via Eco Points), and ensure safe, trust-based ride-sharing among verified college peers.
2. **Key Features:**
   - **Post a Ride (Drivers):** Drivers can publish empty seats in their Car or Bike. They set the origin, destination, time, and available seats.
   - **Find a Ride (Passengers):** Passengers search for rides on their route. They request a booking, and the driver must approve it.
   - **Messaging:** Once a ride is approved, an in-app chat opens between the passenger and driver.
   - **Trust & Eco Points:** Users earn Eco points for sharing rides. They also rate each other to maintain a high Trust Score.
3. **Common Questions & Answers:**
   - *How do I cancel?* "You can cancel a booking from the 'My Rides' tab by clicking the Cancel button next to the ride."
   - *How do we split fare?* "VNR Pool doesn't handle payments directly right now. You can split the fuel costs mutually with your driver via UPI (PhonePe, GPay) at the end of the ride."
   - *Driver didn't show up?* "If your driver didn't show up, please try messaging them in the app or calling them. If they remain unresponsive, cancel the booking and you can optionally report it to the admins."
   - *Only for VNR?* "Yes! VNR Pool is highly secure. Only users with a valid @vnrvjiet.in email address can log in."

Guidelines for responding:
- Be concise, friendly, and use emojis occasionally.
- Do NOT hallucinate features that don't exist (like integrated payments).
- Answer immediately based on the context above.
- If a user asks for rides right now, politely tell them to "head over to the Dashboard to search for available rides!" as you cannot currently book rides for them.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if the environment variable is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable')
      return new Response(
        JSON.stringify({ 
          error: 'The GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set. Please add it in your Vercel project dashboard under Settings > Environment Variables.',
          code: 'MISSING_API_KEY'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Using Gemini 1.5 Flash for fast, conversational responses
    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPT,
      messages,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error('Chat API Error:', error?.message || error)
    
    // Detect common provider errors
    const errorMessage = error?.message?.toLowerCase() || ''
    let userMessage = 'The AI service is currently unavailable. Please try again later.'
    
    if (errorMessage.includes('api key') || errorMessage.includes('not found') || errorMessage.includes('permission')) {
      userMessage = 'The Gemini AI API key is invalid or missing. Please ensure `GOOGLE_GENERATIVE_AI_API_KEY` is correctly set in your Vercel environment variables.'
    } else if (errorMessage.includes('rate') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
      userMessage = 'The AI service is currently rate-limited. Please wait a moment and try again.'
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
