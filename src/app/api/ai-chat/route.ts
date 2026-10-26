import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Hyperlocal VNR VJIET & VNR Pool Campus Knowledge Base & Response Engine
function generateCampusAssistantResponse(userPrompt: string): string {
  const query = userPrompt.toLowerCase().trim();

  // 1. Greetings
  if (/^(hi|hello|hey|sup|yo|good\s*(morning|afternoon|evening))\b/i.test(query)) {
    return "Hey there! 👋 I'm your VNR Pool campus assistant. I can help you find rides, offer seats, explain fare splitting, or track your Eco Points. What's on your mind?";
  }

  // 2. Booking a ride
  if (query.includes('book') || query.includes('find ride') || query.includes('search ride') || query.includes('request seat') || query.includes('join')) {
    return "To book a ride:\n1. Go to the **Find a Ride** tab on your Dashboard.\n2. Filter by your commute corridor (e.g., Miyapur, Kukatpally, Bachupally) or departure time.\n3. Click **Request Seat** on your preferred ride.\n4. Once the driver approves, you'll unlock their direct contact and private in-app chat!";
  }

  // 3. Offering a ride
  if (query.includes('offer') || query.includes('driver') || query.includes('post ride') || query.includes('create ride') || query.includes('my car') || query.includes('my bike')) {
    return "To offer a ride:\n1. Switch to the **Offer a Seat** tab.\n2. Choose **Car** or **Bike** and enter your TS vehicle number (e.g. `TS 08 XY 1234`).\n3. Select your Origin, Destination, Departure Time, and available seats.\n4. Click **AI Suggestion** for a fair meter-based price or set your own.\n5. Post your ride to help fellow VNRites commute!";
  }

  // 4. Dynamic Fractional Fare Splitting
  if (query.includes('split') || query.includes('fractional') || query.includes('mid-route') || query.includes('fair') || query.includes('fare calculation') || query.includes('formula')) {
    return "Our **Dynamic Fractional Fare Splitter** uses Turf.js and Haversine geospatial math! If you get picked up mid-route (e.g. at Miyapur instead of the driver's start point), the system calculates the exact percentage of the distance you travel and charges only that fraction of the fare. Totally fair for everyone!";
  }

  // 5. Auto / Cab Split Mode
  if (query.includes('auto') || query.includes('cab split') || query.includes('rickshaw') || query.includes('metro split')) {
    return "**Auto/Cab Split Mode** is built for students sharing commercial cabs or autos from the campus gate to transit hubs like Miyapur Metro or JNTU. As students join your pool, the total meter fare is split evenly in real time to show your exact per-head cost!";
  }

  // 6. Eco Points & Gamification
  if (query.includes('eco') || query.includes('point') || query.includes('tier') || query.includes('badge') || query.includes('platinum') || query.includes('gold') || query.includes('silver')) {
    return "Every shared ride saves carbon and earns you **Eco Points**! 🌱\n- **Bronze Tier**: 0 - 50 pts\n- **Silver Tier**: 51 - 150 pts\n- **Gold Tier**: 151 - 300 pts\n- **Platinum Tier**: 300+ pts\nHitting milestones unlocks badge levels on your 3D rider profile and celebratory confetti!";
  }

  // 7. Trust Score, Ratings & Safety
  if (query.includes('safe') || query.includes('trust') || query.includes('rating') || query.includes('security') || query.includes('verify') || query.includes('sos')) {
    return "Safety is built into every layer:\n- **Institutional Email Verification**: Only verified `@vnrvjiet.in` students and faculty can access the network.\n- **Trust Scores**: Riders rate each other 1 to 5 stars after every trip.\n- **Women-Only Filter**: Women drivers and passengers can toggle female-only pools.\n- **Safety SOS**: Quick-access emergency broadcast to campus contacts.";
  }

  // 8. Vehicle Number Rules
  if (query.includes('vehicle number') || query.includes('plate') || query.includes('ts0') || query.includes('registration')) {
    return "For campus safety, vehicle numbers must follow standard Indian registration format (e.g., `TS 08 EA 1234` or `TS 07 HK 5678`). Our smart regex validates your plate as you type!";
  }

  // 9. In-app Chat & Messaging
  if (query.includes('chat') || query.includes('message') || query.includes('whatsapp') || query.includes('contact')) {
    return "Once a driver approves your seat request:\n- Private real-time chat unlocks with live typing indicators.\n- You can also use **1-Click WhatsApp Share** to send ride details and direct deep-links (`?ride=...`) to your friends!";
  }

  // 10. Cancellation & Deletion
  if (query.includes('cancel') || query.includes('delete') || query.includes('refund') || query.includes('drop')) {
    return "Need to cancel? Go to the **My Rides** tab on your dashboard. You can cancel active seat requests or cancel an offered ride anytime. Please cancel early so your fellow peers have time to find alternative rides!";
  }

  // 11. Hyderabad Campus Routes & Locations
  if (query.includes('route') || query.includes('location') || query.includes('miyapur') || query.includes('kukatpally') || query.includes('bachupally') || query.includes('jntu') || query.includes('nizampet')) {
    return "Popular campus commute corridors include:\n- **Bachupally ⇄ Miyapur Metro** (via Pragathi Nagar or Bollaram Road)\n- **VNR VJIET ⇄ JNTU / KPHB**\n- **Campus ⇄ Nizampet / Kukatpally**\n- **Campus ⇄ Gachibowli / Hitec City**\nYou can select predefined routes for automatic waypoint matching!";
  }

  // 12. Contextual Default Help
  return `VNR Pool is exclusively for VNR VJIET students and staff. You can find rides, offer seats in personal vehicles, or split auto fares to Miyapur Metro. How can I help you with your commute today?`;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    // Step 1: Check if our local LLM / OmniRoute / Ollama is running on this machine
    const localEndpoints = [
      { url: 'http://127.0.0.1:20128/v1/chat/completions', model: 'auto' }, // OmniRoute local gateway
      { url: 'http://127.0.0.1:11434/v1/chat/completions', model: 'llama3:latest' } // Ollama local
    ];

    for (const ep of localEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300); // 300ms fast probe

        const localResp = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: ep.model,
            messages: [
              {
                role: 'system',
                content: 'You are the official VNR Pool AI assistant for VNR VJIET (Hyderabad). Help students with campus ride-sharing, carpooling, auto splitting, and Eco Points. Keep answers concise, friendly, and helpful (max 3-4 sentences).'
              },
              ...messages
            ],
            stream: true,
            temperature: 0.6
          })
        });

        clearTimeout(timeoutId);

        if (localResp.ok && localResp.body) {
          // Stream directly from our local machine LLM
          const stream = new TransformStream({
            transform(chunk, ctrl) {
              const text = new TextDecoder().decode(chunk);
              const lines = text.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    const content = data.choices[0]?.delta?.content;
                    if (content) {
                      ctrl.enqueue(new TextEncoder().encode(content));
                    }
                  } catch (e) {}
                }
              }
            }
          });

          return new Response(localResp.body.pipeThrough(stream), {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            }
          });
        }
      } catch (err) {
        // Local LLM endpoint not reachable or timed out; continue to our built-in campus intelligence
      }
    }

    // Step 2: Built-in Campus Intelligence (Zero External Dependencies, 100% Reliable)
    const replyText = generateCampusAssistantResponse(lastMessage);

    // Stream the generated response in natural typewriter chunks
    const words = replyText.split(' ');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          controller.enqueue(encoder.encode(chunk));
          // Micro-delay between tokens for smooth streaming feel
          await new Promise(r => setTimeout(r, 18));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Campus AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
