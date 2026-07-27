-- Supabase SQL Editor Command
-- Run this to add Gamification and Trust systems to the users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS eco_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rides_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
