-- Supabase SQL Editor Command
-- Run this to add Gamification and Trust systems to the users/profiles

-- 1. Add eco_points and total_rides to the users table
-- We assume the 'users' table exists. If you have a separate 'profiles' table, change 'users' to 'profiles'.
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS eco_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rides_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- 2. Create a function to calculate dynamic trust score based on ratings
-- This creates a view that joins users with their average rating
CREATE OR REPLACE VIEW user_trust_scores AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.eco_points,
    u.total_rides_completed,
    u.is_verified,
    COALESCE(AVG(r.rating), 5.0) as trust_score,
    COUNT(r.id) as total_reviews
FROM users u
LEFT JOIN ratings r ON u.id = r.ratee_id
GROUP BY u.id;

-- 3. Policy to allow reading user_trust_scores
-- Views inherit the security of underlying tables, so as long as users can read 'users' and 'ratings', this works.
