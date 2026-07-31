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
   - Car/Cab: Base ₹60 + ₹20 per km
   - Auto Rickshaw: Base ₹40 + ₹15 per km
   - Bike Taxi: Base ₹30 + ₹10 per km
3. CRITICAL OUTPUT RULE:
${isCommercialSplit 
  ? '   - You are calculating for an AUTO SPLIT / CAB SPLIT. You MUST return the FULL TOTAL TRIP FARE in `suggested_total_fare`. Do not divide it by passengers.' 
  : `   - You are calculating for a STUDENT POOL. You MUST return the PRICE PER SEAT in \`suggested_total_fare\`. To find the price per seat, divide the full commercial fare by the number of passengers (${passengers}).`}
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
