-- FIX: Allow passengers to delete their own bookings (so they can cancel)
-- Run this in your Supabase SQL Editor

CREATE POLICY "Passengers can delete their own bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = passenger_id);
