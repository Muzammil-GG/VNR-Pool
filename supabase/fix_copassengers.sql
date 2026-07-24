-- Allow anyone to view approved bookings so co-passengers can see each other
DROP POLICY IF EXISTS "Anyone can view approved bookings" ON public.bookings;
CREATE POLICY "Anyone can view approved bookings" ON public.bookings
FOR SELECT USING (status = 'approved');
