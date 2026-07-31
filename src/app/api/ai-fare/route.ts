import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
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

    const { origin, destination, vehicle_type, passengers } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const prompt = `Calculate a fair carpool fare for a trip in Hyderabad, India.
Details:
Origin: ${origin}
Destination: ${destination}
Vehicle Type: ${vehicle_type || 'Car'}
Number of Passengers: ${passengers || 1}

Rules:
- The reasoning MUST state that you compared prices across Rapido, Uber, and Ola.
- If the vehicle is an auto, base it on standard auto prices. If it's a bike, base it on bike taxi prices. If it's a car, base it on cab prices.
- In the reasoning, mention the standard commercial fare (from Uber/Ola/Rapido) and then state the highly discounted student pool price per seat.
- Keep the reasoning brief (1-2 sentences).
- Suggest a TOTAL fair pool fare (for all passengers combined) in Indian Rupees (₹) as a number.
- Output MUST be strictly valid JSON containing "reasoning" (string) and "suggested_total_fare" (number). Do not wrap in markdown blocks. Just the raw JSON.`;

    const { text } = await generateText({
      model: featherless('meta-llama/Meta-Llama-3-8B-Instruct'),
      system: `You are a hyper-local Hyderabad transport pricing expert. Output ONLY valid JSON in this format: {"reasoning": "string", "suggested_total_fare": number}`,
      prompt,
      temperature: 0.1,
    });

    try {
      // Sometimes LLMs wrap JSON in markdown blocks even when told not to. Clean it up.
      const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const result = JSON.parse(cleanedText);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', text);
      return NextResponse.json({ error: 'Invalid response from AI' }, { status: 500 });
    }

  } catch (error) {
    console.error('AI Fare Error:', error);
    return NextResponse.json({ error: 'Failed to calculate fare' }, { status: 500 });
  }
}
