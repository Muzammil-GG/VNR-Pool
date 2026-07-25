import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { rideId, text } = await req.json()

    if (!rideId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
