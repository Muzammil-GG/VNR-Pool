-- Enable passengers to view rides they have booked, regardless of the ride's status.
-- This ensures 'in_progress' and 'completed' rides are still visible to passengers in their Joined Rides,
-- and correctly blocks them from booking new rides while in progress.
CREATE POLICY "Passengers can view rides they are booked on" 
ON public.rides 
FOR SELECT 
USING (
  exists (
    select 1 from public.bookings 
    where ride_id = id 
    and passenger_id = auth.uid()
  )
);
