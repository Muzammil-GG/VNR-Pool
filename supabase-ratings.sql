-- Supabase SQL Editor Command
-- Run this to create the ratings table

CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE,
  rater_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ratee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(ride_id, rater_id, ratee_id)
);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Allow users to read all ratings
CREATE POLICY "Anyone can read ratings" 
ON ratings FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to insert their own ratings
CREATE POLICY "Users can create ratings" 
ON ratings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = rater_id);
