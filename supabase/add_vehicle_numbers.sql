-- Add optional vehicle numbers to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS car_number text,
ADD COLUMN IF NOT EXISTS bike_number text;
