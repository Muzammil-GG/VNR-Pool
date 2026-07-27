-- Create phone_verifications table for OTPs
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_phone_verified to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false;

-- Add RLS policies for phone_verifications
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
-- No public policies needed; accessed via SUPABASE_SERVICE_ROLE_KEY securely.
