import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, rideId, wasApproved, currentSeats } = await req.json()

    if (!bookingId || !rideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify identity via session cookie
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify booking belongs to this user (SELECT is allowed for own bookings)
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

    // Verify ride is not in progress or completed
    const { data: ride, error: rideError } = await userClient
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .single()

    if (rideError || !ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    if (ride.status === 'in_progress' || ride.status === 'completed') {
      return NextResponse.json({ error: 'Cannot cancel an active or completed ride' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    if (!serviceRoleKey) {
      // No admin key — try with user client but check if anything was actually deleted
      const { data: deleted, error: deleteError } = await userClient
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .eq('passenger_id', user.id)
        .select()

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // If 0 rows deleted, RLS silently blocked it — tell the user clearly
      if (!deleted || deleted.length === 0) {
        return NextResponse.json({
          error: 'ACTION_REQUIRED: Your database security policy is blocking cancellations. Please add your SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables, or run this SQL in your Supabase SQL Editor:\n\nCREATE POLICY "Passengers can delete their own bookings" ON public.bookings FOR DELETE USING (auth.uid() = passenger_id);'
        }, { status: 403 })
      }

      return NextResponse.json({ success: true })
    }

    // Admin client — completely bypasses RLS
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    const { data: deleted, error: deleteError } = await adminClient
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('passenger_id', user.id)
      .select()

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Booking could not be deleted' }, { status: 500 })
    }

    // Restore seat count if booking was approved
    if (wasApproved && currentSeats !== undefined) {
      await adminClient
        .from('rides')
        .update({ available_seats: currentSeats + 1 })
        .eq('id', rideId)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
