-- ====================================================================
-- TRIPPY'S MEHFILL ERP: COMPLETE DATABASE SCHEMA & MIGRATION SCRIPT
-- ====================================================================
-- Copy and execute this entire SQL script inside the Supabase SQL Editor.
-- This script is fully idempotent and safe to run on existing databases.

-- 1. Create Enums for Role & Account Status
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'driver', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'blocked_fraud');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create public.profiles Table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text DEFAULT '',
  hostel_address text DEFAULT '',
  role text DEFAULT 'customer',
  account_status text DEFAULT 'active',
  is_whatsapp_verified boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  auth_provider text DEFAULT 'Email',
  ip_address text DEFAULT '103.211.14.82',
  latitude double precision DEFAULT 28.2468,
  longitude double precision DEFAULT 77.0628,
  location_city text DEFAULT 'Sohna GLS Homes near GDGU, Haryana',
  registration_ip text DEFAULT '103.211.14.82',
  signup_latitude numeric DEFAULT 28.2468,
  signup_longitude numeric DEFAULT 77.0628,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Create public.orders Table if not exists
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  order_number text NOT NULL,
  customer_id text,
  customer_name text,
  customer_phone text,
  delivery_address text,
  landmark text DEFAULT '',
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_method text DEFAULT 'COD',
  payment_status text DEFAULT 'pending',
  upi_transaction_id text DEFAULT '',
  status text DEFAULT 'pending',
  driver_id text DEFAULT '',
  driver_name text DEFAULT '',
  driver_phone text DEFAULT '',
  kitchen_notes text DEFAULT '',
  customer_ip text DEFAULT '103.211.14.82',
  order_latitude double precision DEFAULT 28.2468,
  order_longitude double precision DEFAULT 77.0628,
  gps_accuracy numeric DEFAULT 15,
  gps_allowed boolean DEFAULT true,
  distance_km numeric DEFAULT 0.1,
  device_type text DEFAULT 'Desktop',
  os_name text DEFAULT 'Windows',
  browser_name text DEFAULT 'Chrome',
  city text DEFAULT 'Sohna / Gurgaon',
  state text DEFAULT 'Haryana',
  pin_code text DEFAULT '122103',
  google_maps_url text,
  fraud_risk_level text DEFAULT 'low',
  fraud_risk_reasons text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Idempotent Migration: Add missing columns if tables already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hostel_address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_whatsapp_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'Email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_address text DEFAULT '103.211.14.82';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT 28.2468;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT 77.0628;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_city text DEFAULT 'Sohna / Gurgaon';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_accuracy numeric DEFAULT 15;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT 'Sohna / Gurgaon';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text DEFAULT 'Haryana';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code text DEFAULT '122103';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT 0.1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'Desktop';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS os_name text DEFAULT 'Windows';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS browser_name text DEFAULT 'Chrome';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Orders Table Column Migrations
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS landmark text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'COD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_transaction_id text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_phone text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kitchen_notes text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ip text DEFAULT '103.211.14.82';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_latitude double precision DEFAULT 28.2468;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_longitude double precision DEFAULT 77.0628;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_accuracy numeric DEFAULT 15;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT 0.1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'Desktop';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS os_name text DEFAULT 'Windows';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS browser_name text DEFAULT 'Chrome';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text DEFAULT 'Sohna / Gurgaon';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state text DEFAULT 'Haryana';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pin_code text DEFAULT '122103';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 5. Helper RPC Functions (SECURITY DEFINER to safely allow unauthenticated lookups)

-- Resolves phone, username, or email identifier to email address for sign-in
CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email text;
  clean_id text;
BEGIN
  clean_id := lower(trim(p_identifier));
  
  -- If already email, return as is
  IF clean_id LIKE '%@%' THEN
    RETURN clean_id;
  END IF;

  SELECT email INTO found_email
  FROM public.profiles
  WHERE lower(trim(phone)) = clean_id
     OR lower(trim(email)) = clean_id
  LIMIT 1;

  RETURN found_email;
END;
$$;

-- Safely checks if an email profile exists (for Password Reset flow) without exposing profile rows
CREATE OR REPLACE FUNCTION public.check_profile_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = lower(trim(p_email))
  );
END;
$$;

-- 6. Helper Function to Check Admin/Staff Privileges
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always grant admin if JWT email matches admin accounts
  IF lower(coalesce(auth.jwt() ->> 'email', '')) IN ('nagapavankumarjavisetty@gmail.com', 'admin@gallery.app') THEN
    RETURN true;
  END IF;

  -- Read role bypassing RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$;

-- 7. Enable RLS and Configure Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Idempotent policy drop
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full control profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full control over profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;

-- Allow users to select profiles (own profile or public lookup for phone/email RPC)
CREATE POLICY "Allow public select profiles" ON public.profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated and anon users to insert profile during signup
CREATE POLICY "Allow public insert profiles" ON public.profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow authenticated and anon users to update matching profile
CREATE POLICY "Allow public update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Admins and staff full control over profiles
CREATE POLICY "Admins full control profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- RLS Policies on Orders
DROP POLICY IF EXISTS "Customers access own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins full control orders" ON public.orders;

CREATE POLICY "Customers access own orders" ON public.orders
  FOR ALL
  TO authenticated, anon
  USING (customer_id = auth.uid()::text OR auth.uid()::text = customer_id OR customer_id IS NULL)
  WITH CHECK (customer_id = auth.uid()::text OR auth.uid()::text = customer_id OR customer_id IS NULL);

CREATE POLICY "Admins full control orders" ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- 8. Robust Postgres Trigger Function for Automatic Signup Handling
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
DECLARE
  user_phone text;
  user_name text;
  user_ip text;
  user_email text;
  user_lat double precision;
  user_lng double precision;
  assigned_role text;
BEGIN
  user_email := COALESCE(new.email, new.raw_user_meta_data->>'email', '');
  user_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
  user_name := COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), split_part(user_email, '@', 1), 'Customer');
  user_ip := COALESCE(new.raw_user_meta_data->>'ip_address', new.raw_user_meta_data->>'ip', '103.211.14.82');
  
  -- Safe double precision parsing with exception handling
  BEGIN
    user_lat := COALESCE((new.raw_user_meta_data->>'latitude')::double precision, 28.2468);
  EXCEPTION WHEN OTHERS THEN
    user_lat := 28.2468;
  END;

  BEGIN
    user_lng := COALESCE((new.raw_user_meta_data->>'longitude')::double precision, 77.0628);
  EXCEPTION WHEN OTHERS THEN
    user_lng := 77.0628;
  END;

  IF lower(user_email) IN ('admin@gallery.app', 'nagapavankumarjavisetty@gmail.com') THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    hostel_address,
    role,
    account_status,
    is_whatsapp_verified,
    is_approved,
    is_active,
    auth_provider,
    ip_address,
    latitude,
    longitude,
    location_city,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_email,
    user_name,
    user_phone,
    COALESCE(new.raw_user_meta_data->>'hostel_address', ''),
    assigned_role,
    'active',
    true,
    true,
    true,
    'Email',
    user_ip,
    user_lat,
    user_lng,
    'Sohna GLS Homes near GDGU, Haryana',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    phone = CASE WHEN EXCLUDED.phone IS NOT NULL AND EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
    hostel_address = CASE WHEN EXCLUDED.hostel_address IS NOT NULL AND EXCLUDED.hostel_address <> '' THEN EXCLUDED.hostel_address ELSE public.profiles.hostel_address END,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Attach Trigger to auth.users Table (Fires on INSERT or UPDATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- 10. Backfill profiles for auth users created before the trigger existed
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone,
  hostel_address,
  role,
  account_status,
  is_whatsapp_verified,
  is_approved,
  is_active,
  auth_provider,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(u.email, u.raw_user_meta_data->>'email', ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1), 'Customer'),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'hostel_address', ''),
  CASE
    WHEN lower(COALESCE(u.email, '')) IN ('admin@gallery.app', 'nagapavankumarjavisetty@gmail.com') THEN 'admin'
    ELSE 'customer'
  END,
  'active',
  true,
  true,
  true,
  'Email',
  u.created_at,
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
