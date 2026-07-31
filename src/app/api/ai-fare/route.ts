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
    
    const prompt = `Calculate a fair trip fare for a trip in Hyderabad, India.
Details:
Origin: ${origin}
Destination: ${destination}
Vehicle Type: ${vehicle_type || 'Car'}

Rules:
- The reasoning MUST state that you compared prices across Rapido, Uber, and Ola.
- If the vehicle is an auto, base it on standard auto prices. If it's a bike, base it on bike taxi prices. If it's a car, base it on cab prices.
${isCommercialSplit 
  ? '- Since this is a commercial ride split (Auto Split/Cab), suggest the FULL estimated commercial meter fare for the entire trip.' 
  : '- Since this is a personal vehicle carpool between students, suggest a highly discounted student pool price PER SEAT.'}
- Keep the reasoning brief (1-2 sentences).
- Suggest the final fare in Indian Rupees (₹) as a number.
- Output MUST be strictly valid JSON containing "reasoning" (string) and "suggested_total_fare" (number). Do not wrap in markdown blocks. Just the raw JSON.`;

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
