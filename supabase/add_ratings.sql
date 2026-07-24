-- 1. Modify users table to track ratings
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_rating_score INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

-- 2. Modify rides table to track completion time
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 3. Create ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
    rater_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    ratee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    score INT CHECK (score >= 1 AND score <= 5) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- A user can only rate another user once per ride
    UNIQUE(ride_id, rater_id, ratee_id)
);

-- 4. Enable RLS on ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);

-- Only authenticated users who were part of the ride can insert a rating
CREATE POLICY "Users can insert ratings for their rides" ON public.ratings FOR INSERT WITH CHECK (
    auth.uid() = rater_id
    AND (
        -- Rater was the driver
        auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id)
        OR
        -- Rater was an approved passenger
        EXISTS (SELECT 1 FROM public.bookings WHERE ride_id = ratings.ride_id AND passenger_id = auth.uid() AND status = 'approved')
    )
    AND (
        -- Ratee was the driver
        ratee_id = (SELECT driver_id FROM public.rides WHERE id = ride_id)
        OR
        -- Ratee was an approved passenger
        EXISTS (SELECT 1 FROM public.bookings WHERE ride_id = ratings.ride_id AND passenger_id = ratee_id AND status = 'approved')
    )
);

-- 5. Trigger to automatically update total_rating_score and rating_count on users table
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET 
        total_rating_score = total_rating_score + NEW.score,
        rating_count = rating_count + 1
    WHERE id = NEW.ratee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_user_rating ON public.ratings;
CREATE TRIGGER tr_update_user_rating
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_user_rating();

-- Realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
