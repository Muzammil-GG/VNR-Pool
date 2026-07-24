import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, rideId, wasApproved, currentSeats } = await req.json()

    if (!bookingId || !rideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the authenticated user from the session cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify this booking belongs to the current user before deleting
    const { data: booking, error: fetchError } = await supabase
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

    // Delete the booking using the server-side client (bypasses strict client RLS)
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('passenger_id', user.id) // double safety check

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // If it was an approved booking, increment the available_seats back
    if (wasApproved && currentSeats !== undefined) {
      await supabase
        .from('rides')
        .update({ available_seats: currentSeats + 1 })
        .eq('id', rideId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
