-- ====================================================================
-- TRIPPY'S MEHFILL ERP: ANTI-FRAUD & SECURITY DATABASE SCHEMA
-- ====================================================================
-- Copy and execute this entire SQL script inside the Supabase SQL Editor.

-- 1. Create Enums for Role & Account Status
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'blocked_fraud', 'pending_verification');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create public.profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'customer'::user_role,
  account_status account_status DEFAULT 'active'::account_status,
  registration_ip text,
  signup_latitude numeric,
  signup_longitude numeric,
  is_whatsapp_verified boolean DEFAULT false,
  hostel_address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view and manage all profiles
CREATE POLICY "Admins full control over profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- 5. Postgres Trigger Function for Automatic Signup Handling
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
DECLARE
  user_phone text;
  user_name text;
  user_ip text;
  user_lat numeric;
  user_lng text;
  assigned_role user_role;
BEGIN
  -- Extract user_metadata passed during OTP / OAuth signup
  user_phone := COALESCE(new.raw_user_meta_data->>'phone', '9876543210');
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  user_ip := COALESCE(new.raw_user_meta_data->>'ip', '103.211.14.82');
  user_lat := NULLIF(new.raw_user_meta_data->>'latitude', '')::numeric;
  user_lng := NULLIF(new.raw_user_meta_data->>'longitude', '')::numeric;

  -- Assign 'admin' role if admin email, else 'customer'
  IF new.email = 'admin@gallery.app' OR new.email = 'nagapavankumarjavisetty@gmail.com' THEN
    assigned_role := 'admin'::user_role;
  ELSE
    assigned_role := 'customer'::user_role;
  END IF;

  -- Insert profile row
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    email,
    role,
    account_status,
    registration_ip,
    signup_latitude,
    signup_longitude,
    is_whatsapp_verified,
    created_at
  )
  VALUES (
    new.id,
    user_name,
    user_phone,
    new.email,
    assigned_role,
    'active'::account_status,
    user_ip,
    COALESCE(user_lat, 17.3850),
    COALESCE(user_lng::numeric, 78.4867),
    (assigned_role = 'admin'::user_role), -- Admin auto-verified
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    registration_ip = EXCLUDED.registration_ip,
    signup_latitude = EXCLUDED.signup_latitude,
    signup_longitude = EXCLUDED.signup_longitude;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to auth.users Table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
