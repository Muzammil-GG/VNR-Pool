import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FEATHERLESS_API_KEY;
    if (!apiKey || apiKey.includes('your_featherless_api_key_here')) {
      return NextResponse.json({ error: 'Featherless API key is missing or invalid' }, { status: 401 });
    }

    const { origin, destination, vehicle_type, passengers, ride_category } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const isCommercialSplit = ride_category === 'auto_split';
    
    const prompt = `Calculate a highly accurate trip fare for a trip in Hyderabad, India.
Details:
Origin: ${origin}
Destination: ${destination}
Vehicle Type: ${vehicle_type || 'car'}
Number of Passengers: ${passengers || 1}

Pricing Logic Rules (MANDATORY):
1. First, estimate the real-world driving distance in kilometers between the Origin and Destination in Hyderabad.
2. Calculate the standard commercial meter fare (Rapido/Uber/Ola) using these strict rates:
   - Car/Cab: Base ₹50 + ₹18 per km
   - Auto Rickshaw: Base ₹30 + ₹12 per km
   - Bike Taxi: Base ₹20 + ₹7 per km
3. ${isCommercialSplit 
  ? 'Since this is a commercial ride split (Auto Split), your final suggested_total_fare MUST be the FULL commercial meter fare.' 
  : 'Since this is a personal vehicle student pool, calculate the total commercial meter fare, and simply divide it by the number of passengers to get the per-seat price. Your final suggested_total_fare MUST be this exact per-seat commercial price. DO NOT apply any further discounts.'}
4. Ensure the final fare is a realistic, rounded integer.
5. In your reasoning, briefly state the estimated distance, the standard commercial rate, and how you derived the final suggested fare.
6. Output MUST be strictly valid JSON containing "reasoning" (string) and "suggested_total_fare" (number). Do not wrap in markdown blocks.`;

    const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a hyper-local Hyderabad transport pricing expert. Output ONLY valid JSON in this format: {"reasoning": "string", "suggested_total_fare": number}'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Featherless API error:', response.statusText);
      return NextResponse.json({ error: 'Failed to fetch from AI provider' }, { status: response.status });
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

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
