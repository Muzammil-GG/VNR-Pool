import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { rideId } = await req.json()

    if (!rideId) {
      return NextResponse.json({ error: 'Missing rideId' }, { status: 400 })
    }

    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    if (!serviceRoleKey) {
      // Try with user client
      await userClient.from('messages').delete().eq('ride_id', rideId)
      return NextResponse.json({ success: true })
    }

    // Admin client — bypasses RLS
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
    await adminClient.from('messages').delete().eq('ride_id', rideId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
