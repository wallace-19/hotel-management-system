-- Supabase schema for Zawai Hotel backend
-- Run these statements in the Supabase SQL editor.

-- Table QR check-in
create table if not exists table_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  token text not null unique,
  url text not null,
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null
);

create table if not exists table_checkins (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  token text not null,
  checked_in_at timestamp with time zone default now()
);

-- Booking and payment tables (future backend integration)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique,
  email text unique,
  full_name text,
  role text not null default 'customer',
  created_at timestamp with time zone default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  table_id text,
  party_size integer,
  status text not null default 'pending',
  total_amount numeric,
  notes text,
  booked_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  provider text not null,
  provider_reference text,
  amount numeric not null,
  currency text not null default 'KES',
  status text not null default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  password_hash text,
  role text not null default 'staff',
  phone text,
  created_at timestamp with time zone default now()
);

-- Tables and orders schema for QR table ordering flows
create table if not exists tables (
  id serial primary key,
  section text,
  capacity integer,
  status text not null default 'available',
  qr_code_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists orders (
  id serial primary key,
  table_id integer references tables(id),
  session_id text,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric,
  status text not null default 'pending',
  special_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_orders_table_id on orders(table_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at desc);
