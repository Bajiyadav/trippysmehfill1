-- 0005_signup_trigger_telemetry.sql
--
-- `useAntiFraudRegistration` used to write the GPS/IP/device telemetry to
-- `profiles` itself, straight after `auth.signUp`. With email confirmation on
-- there is no session at that moment, so row-level security refuses the write
-- and the data was lost. The browser now sends the telemetry as auth metadata
-- instead, and the signup trigger persists it here.

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, phone, hostel_address,
    role, account_status, is_whatsapp_verified, is_approved, is_active,
    auth_provider, ip_address, latitude, longitude,
    gps_accuracy, gps_allowed, city, state, country, pin_code, location_city,
    distance_km, device_type, os_name, browser_name, timezone,
    google_maps_url, fraud_risk_level, fraud_risk_reasons,
    created_at, updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(nullif(meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(meta->>'phone', ''),
    coalesce(meta->>'hostel_address', ''),
    'customer',
    'active',
    false,
    false,
    true,
    coalesce(meta->>'auth_provider', 'Email'),
    meta->>'ip_address',
    nullif(meta->>'latitude', '')::double precision,
    nullif(meta->>'longitude', '')::double precision,
    nullif(meta->>'gps_accuracy', '')::double precision,
    coalesce((meta->>'gps_allowed')::boolean, false),
    meta->>'city',
    meta->>'state',
    meta->>'country',
    meta->>'pin_code',
    meta->>'city',
    nullif(meta->>'distance_km', '')::double precision,
    meta->>'device_type',
    meta->>'os_name',
    meta->>'browser_name',
    meta->>'timezone',
    meta->>'google_maps_url',
    meta->>'fraud_risk_level',
    CASE
      WHEN jsonb_typeof(meta->'fraud_risk_reasons') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(meta->'fraud_risk_reasons'))
      ELSE NULL
    END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name       = coalesce(nullif(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone           = coalesce(nullif(EXCLUDED.phone, ''), public.profiles.phone),
    hostel_address  = coalesce(nullif(EXCLUDED.hostel_address, ''), public.profiles.hostel_address),
    ip_address      = coalesce(EXCLUDED.ip_address, public.profiles.ip_address),
    latitude        = coalesce(EXCLUDED.latitude, public.profiles.latitude),
    longitude       = coalesce(EXCLUDED.longitude, public.profiles.longitude),
    updated_at      = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- This runs inside the `auth.users` insert: raising here would abort signup
  -- with an HTTP 500, so a profile problem must never propagate.
  RAISE WARNING 'handle_new_user_signup failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;
