-- 1. Drop the previous recursive policy
DROP POLICY IF EXISTS "Passengers can view rides they are booked on" ON public.rides;

-- 2. Create a security definer function to check booking status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_passenger_of_ride(ride_uuid uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings 
    WHERE ride_id = ride_uuid 
    AND passenger_id = auth.uid()
  );
$$;

-- 3. Re-create the policy using the function
CREATE POLICY "Passengers can view rides they are booked on" 
ON public.rides 
FOR SELECT 
USING (
  public.is_passenger_of_ride(id)
);
