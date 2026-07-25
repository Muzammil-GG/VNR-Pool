import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rideId = searchParams.get('rideId')

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
      // Try with user client (may be blocked by RLS if not approved passenger)
      const { data, error } = await userClient
        .from('messages')
        .select('*, sender:users(full_name)')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    // Admin client — bypasses RLS
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient
      .from('messages')
      .select('*, sender:users(full_name)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
