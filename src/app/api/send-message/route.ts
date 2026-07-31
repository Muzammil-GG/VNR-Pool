import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

const messageSchema = z.object({
  rideId: z.string().uuid("Invalid ride ID"),
  text: z.string().min(1, "Message cannot be empty").max(500, "Message cannot exceed 500 characters"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parseResult = messageSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }
    const { rideId, text } = parseResult.data

    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    if (!serviceRoleKey) {
      // Try with user client (may be blocked by RLS if not approved passenger)
      const { error } = await userClient
        .from('messages')
        .insert({ ride_id: rideId, sender_id: user.id, text })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Admin client — bypasses RLS
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
    const { error } = await adminClient
      .from('messages')
      .insert({ ride_id: rideId, sender_id: user.id, text })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // --- Notification Logic ---
    // Fetch ride details to know who to notify
    const { data: rideData } = await adminClient
      .from('rides')
      .select('driver_id, bookings(passenger_id, status)')
      .eq('id', rideId)
      .single()

    if (rideData) {
      const isDriver = user.id === rideData.driver_id;
      const notifications = [];

      if (isDriver) {
        // Driver sent message -> Notify all approved passengers
        rideData.bookings?.forEach((b: any) => {
          if (b.status === 'approved' && b.passenger_id !== user.id) {
            notifications.push({
              user_id: b.passenger_id,
              title: 'New Message from Driver 🚗💬',
              message: `${text} |ride:${rideId}`
            });
          }
        });
      } else {
        // Passenger sent message -> Notify driver only
        notifications.push({
          user_id: rideData.driver_id,
          title: 'New Message from Passenger 💬',
          message: `${text} |ride:${rideId}`
        });
      }

      if (notifications.length > 0) {
        await adminClient.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
