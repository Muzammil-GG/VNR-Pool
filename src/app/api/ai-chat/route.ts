import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FEATHERLESS_API_KEY;
    if (!apiKey || apiKey.includes('your_featherless_api_key_here')) {
      return NextResponse.json({ error: 'Featherless API key is missing or invalid' }, { status: 401 });
    }

    const { messages } = await req.json();

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
            content: 'You are a helpful, friendly, and concise support assistant for VNR Pool, a carpooling platform exclusively for students and staff of VNR VJIET (Vignana Jyothi Institute of Engineering and Technology) in Hyderabad. Key details: Helps find rides or offer seats, reduces traffic. Two ride types: Personal Vehicle and Auto Split. Tone: Helpful, polite, Gen-Z friendly but professional, concise. Limit responses to 2-4 sentences max. Do NOT use markdown headers.'
          },
          ...messages
        ],
        stream: true,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('Featherless API error:', response.statusText);
      return NextResponse.json({ error: 'Failed to fetch from AI provider' }, { status: response.status });
    }

    // Create a TransformStream to parse SSE and extract just the text delta
    let buffer = '';
    const stream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        buffer += text;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the incomplete line in the buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      },
      flush(controller) {
        if (buffer.startsWith('data: ') && !buffer.includes('[DONE]')) {
            try {
              const data = JSON.parse(buffer.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            } catch (e) {}
        }
      }
    });

    return new Response(response.body.pipeThrough(stream), {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
