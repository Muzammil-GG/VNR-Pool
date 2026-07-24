-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 3. Fix passenger cancellation policy (Crucial for cancel button to work without service key)
DROP POLICY IF EXISTS "Passengers can delete their own bookings" ON public.bookings;
CREATE POLICY "Passengers can delete their own bookings" 
ON public.bookings FOR DELETE 
USING (auth.uid() = passenger_id);

-- 4. Function to handle booking cancellation (Passenger deletes booking)
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id uuid;
  v_passenger_name text;
BEGIN
  -- We only care if the booking was approved and is being deleted
  IF OLD.status = 'approved' THEN
    -- Increment seats
    UPDATE public.rides SET available_seats = available_seats + 1 WHERE id = OLD.ride_id RETURNING driver_id INTO v_driver_id;
    
    -- Get passenger name
    SELECT full_name INTO v_passenger_name FROM public.users WHERE id = OLD.passenger_id;

    -- Create notification for driver
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (v_driver_id, 'Seat Cancelled', v_passenger_name || ' has cancelled their approved seat request.');
  ELSIF OLD.status = 'pending' THEN
    SELECT driver_id INTO v_driver_id FROM public.rides WHERE id = OLD.ride_id;
    SELECT full_name INTO v_passenger_name FROM public.users WHERE id = OLD.passenger_id;

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (v_driver_id, 'Request Cancelled', v_passenger_name || ' cancelled their pending seat request.');
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on DELETE of bookings
DROP TRIGGER IF EXISTS tr_booking_cancelled ON public.bookings;
CREATE TRIGGER tr_booking_cancelled
AFTER DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_cancellation();


-- 6. Function to handle Ride Cancellation (Driver cancels ride)
CREATE OR REPLACE FUNCTION public.handle_ride_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Notify all approved passengers
    FOR r IN SELECT passenger_id FROM public.bookings WHERE ride_id = NEW.id AND status = 'approved'
    LOOP
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (r.passenger_id, 'Ride Cancelled', 'The driver has cancelled the ride from ' || NEW.origin || ' to ' || NEW.destination || '.');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger on UPDATE of rides
DROP TRIGGER IF EXISTS tr_ride_cancelled ON public.rides;
CREATE TRIGGER tr_ride_cancelled
AFTER UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.handle_ride_cancellation();

-- 8. Add real-time publication for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
