-- Add fractional details to bookings table
ALTER TABLE bookings ADD COLUMN pickup_location text;
ALTER TABLE bookings ADD COLUMN dropoff_location text;
ALTER TABLE bookings ADD COLUMN fractional_price numeric;
