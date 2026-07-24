-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. `users` Table
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text unique not null,
  roll_no text unique not null,
  branch text not null,
  mobile_number text not null,
  gender text check (gender in ('male', 'female', 'other')),
  verified_status boolean default false,
  profile_completed boolean default false,
  created_at timestamp with time zone default now()
);

-- Trigger to auto-set verified_status if email ends with @vnrvjiet.in
create or replace function public.set_verified_status()
returns trigger as $$
begin
  if new.email ilike '%@vnrvjiet.in' then
    new.verified_status := true;
  else
    new.verified_status := false;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_set_verified_status
before insert or update on public.users
for each row execute function public.set_verified_status();

-- 2. `blocked_users` Table
create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references public.users(id) on delete cascade not null,
  blocked_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (blocker_id, blocked_id)
);

-- 3. `rides` Table
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.users(id) on delete cascade not null,
  ride_category text check (ride_category in ('auto_split', 'personal_vehicle')) not null,
  origin text not null,
  destination text not null default 'VNR VJIET Campus Gate 1',
  departure_time timestamp with time zone not null,
  vehicle_type text check (vehicle_type in ('bike', 'auto', 'car')),
  vehicle_number text,
  total_seats int not null,
  available_seats int not null,
  price_per_seat int default 0,
  is_women_only boolean default false,
  status text check (status in ('active', 'in_progress', 'completed', 'cancelled')) default 'active',
  created_at timestamp with time zone default now()
);

-- 4. `bookings` Table
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade not null,
  passenger_id uuid references public.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected', 'cancelled')) default 'pending',
  created_at timestamp with time zone default now()
);

-- 5. `messages` Table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default now()
);


-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
alter table public.users enable row level security;
alter table public.blocked_users enable row level security;
alter table public.rides enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;

-- USERS
-- Anyone can read user profiles (necessary for showing full_name, branch, etc.)
create policy "Users are viewable by everyone" on public.users for select using (true);
-- Users can insert their own profile on signup
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);
-- Users can update their own profile
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- BLOCKED USERS
-- Users can see who they blocked, and who blocked them (to filter out rides in app logic or DB)
create policy "Users can view their block relationships" on public.blocked_users for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);
-- Users can insert block records
create policy "Users can block others" on public.blocked_users for insert with check (auth.uid() = blocker_id);
-- Users can unblock
create policy "Users can unblock others" on public.blocked_users for delete using (auth.uid() = blocker_id);

-- RIDES
-- Anyone can view active rides as long as the driver isn't blocked and hasn't blocked the user
create policy "Active rides are viewable by everyone not blocked" on public.rides for select using (
  status = 'active'
  and not exists (
    select 1 from public.blocked_users
    where (blocker_id = auth.uid() and blocked_id = driver_id)
       or (blocker_id = driver_id and blocked_id = auth.uid())
  )
);
-- Drivers can view their own rides (any status)
create policy "Drivers can view their own rides" on public.rides for select using (auth.uid() = driver_id);
-- Drivers can insert rides
create policy "Drivers can create rides" on public.rides for insert with check (auth.uid() = driver_id);
-- Drivers can update their own rides
create policy "Drivers can update their own rides" on public.rides for update using (auth.uid() = driver_id);

-- BOOKINGS
-- Users can view their own bookings or bookings for their rides
create policy "Users view own bookings or driver views their ride bookings" on public.bookings for select using (
  auth.uid() = passenger_id
  or
  auth.uid() = (select driver_id from public.rides where id = ride_id)
);
-- Passengers can request a booking
create policy "Passengers can create a booking" on public.bookings for insert with check (
  auth.uid() = passenger_id
  and not exists (
    select 1 from public.rides 
    where id = ride_id and is_women_only = true 
    and (select gender from public.users where id = auth.uid()) != 'female'
  )
);
-- Driver can update booking status
create policy "Drivers can update bookings for their ride" on public.bookings for update using (
  auth.uid() = (select driver_id from public.rides where id = ride_id)
);

-- MESSAGES
-- Users can view and send messages if they are part of an approved booking or they are the driver
create policy "Participants can view messages" on public.messages for select using (
  auth.uid() = (select driver_id from public.rides where id = ride_id)
  or
  exists (select 1 from public.bookings where ride_id = messages.ride_id and passenger_id = auth.uid() and status = 'approved')
);

create policy "Participants can send messages" on public.messages for insert with check (
  auth.uid() = sender_id
  and (
    auth.uid() = (select driver_id from public.rides where id = ride_id)
    or
    exists (select 1 from public.bookings where ride_id = messages.ride_id and passenger_id = auth.uid() and status = 'approved')
  )
);

-- Realtime Setup
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.bookings;
