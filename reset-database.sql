-- WARNING: THIS SCRIPT WILL PERMANENTLY DELETE ALL USERS AND THEIR DATA

-- 1. Clear all public tables (Cascade will handle foreign key dependencies)
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.rides CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- 2. Clear verification tables
TRUNCATE TABLE public.signup_verifications CASCADE;
TRUNCATE TABLE public.phone_verifications CASCADE;

-- 3. Delete all authentication records (This logs everyone out and removes their login accounts)
DELETE FROM auth.users;
