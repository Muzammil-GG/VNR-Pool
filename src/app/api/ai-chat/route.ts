import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';

const featherless = createOpenAI({
  name: 'featherless',
  apiKey: process.env.FEATHERLESS_API_KEY,
  baseURL: 'https://api.featherless.ai/v1',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    if (!process.env.FEATHERLESS_API_KEY || process.env.FEATHERLESS_API_KEY.includes('your_featherless_api_key_here')) {
      return NextResponse.json({ error: 'Featherless API key is missing or invalid' }, { status: 401 });
    }

    const { messages } = await req.json();

    const result = await streamText({
      model: featherless('meta-llama/Meta-Llama-3-8B-Instruct'),
      system: `You are a helpful, friendly, and concise support assistant for VNR Pool, a carpooling platform exclusively for students and staff of VNR VJIET (Vignana Jyothi Institute of Engineering and Technology) in Hyderabad. 

Key details about VNR Pool:
- Helps VNR students/staff find rides or offer empty seats to commute to campus.
- Reduces traffic, pollution, and travel costs.
- Two ride types: "Personal Vehicle" (car/bike sharing) and "Auto Split" (splitting an auto rickshaw fare from JNTU/Miyapur/Kukatpally).
- Only verified college emails can register.

Tone: Helpful, polite, Gen-Z friendly but professional, concise. Limit responses to 2-4 sentences max. Do NOT use markdown headers.`,
      messages,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
