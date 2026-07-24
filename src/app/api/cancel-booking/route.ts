import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, rideId, wasApproved, currentSeats } = await req.json()

    if (!bookingId || !rideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use the user's session client to verify identity
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify this booking belongs to the current user
    const { data: booking, error: fetchError } = await userClient
      .from('bookings')
      .select('id, passenger_id')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.passenger_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not your booking' }, { status: 403 })
    }

    // Use service role admin client to bypass RLS for deletion
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    if (!serviceRoleKey) {
      // Fallback: update status to cancelled using user client (driver update policy might allow it via a workaround)
      // Actually just try deletion with user client anyway - it may work
      const { error: deleteError } = await userClient
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .eq('passenger_id', user.id)

      if (deleteError) {
        return NextResponse.json({ error: `No service key configured. DB error: ${deleteError.message}` }, { status: 500 })
      }
    } else {
      // Admin client — completely bypasses RLS
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

      const { error: deleteError } = await adminClient
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .eq('passenger_id', user.id) // still enforce ownership even with admin key

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Restore available seat count if booking was approved
      if (wasApproved && currentSeats !== undefined) {
        await adminClient
          .from('rides')
          .update({ available_seats: currentSeats + 1 })
          .eq('id', rideId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
