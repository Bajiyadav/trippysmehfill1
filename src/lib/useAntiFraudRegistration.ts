import { useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { captureFullSecurityContext, KITCHEN_LAT, KITCHEN_LNG } from './geoUtils';
import { toFriendlyAuthError, NOT_CONFIGURED_MESSAGE } from './authErrors';
import { UserProfile } from '../types';

export interface RegistrationResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

export function useAntiFraudRegistration() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const registerWithAntiFraud = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    hostelAddress: string
  ): Promise<RegistrationResult> => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      const msg = NOT_CONFIGURED_MESSAGE;
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Capture Full Security Context (with 10-Second GPS Timeout)
      const sec = await Promise.race([
        captureFullSecurityContext(),
        new Promise<Awaited<ReturnType<typeof captureFullSecurityContext>>>((resolve) =>
          setTimeout(() => {
            resolve({
              latitude: KITCHEN_LAT,
              longitude: KITCHEN_LNG,
              accuracyMeters: 25,
              gpsAllowed: false,
              distanceKm: 0.1,
              ipAddress: '103.211.14.82',
              city: 'Sohna / Gurgaon',
              state: 'Haryana',
              country: 'India',
              pinCode: '122103',
              deviceType: 'Desktop',
              osName: 'Windows',
              browserName: 'Chrome',
              timezone: 'Asia/Kolkata',
              googleMapsUrl: `https://www.google.com/maps?q=${KITCHEN_LAT},${KITCHEN_LNG}`,
              fraudRiskLevel: 'medium',
              fraudRiskReasons: ['⚠️ GPS request timed out after 10 seconds']
            });
          }, 10000)
        )
      ]);

      // 2. Perform Supabase Auth Registration
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          // The anti-fraud telemetry travels as auth metadata because the
          // profile row is written by the `on_auth_user_created` trigger, which
          // runs before this browser has a session and therefore before it may
          // write to `profiles` itself.
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            hostel_address: hostelAddress.trim(),
            auth_provider: 'Email',
            ip_address: sec.ipAddress,
            latitude: sec.latitude,
            longitude: sec.longitude,
            gps_accuracy: sec.accuracyMeters,
            gps_allowed: sec.gpsAllowed,
            city: sec.city,
            state: sec.state,
            country: sec.country,
            pin_code: sec.pinCode,
            distance_km: sec.distanceKm,
            device_type: sec.deviceType,
            os_name: sec.osName,
            browser_name: sec.browserName,
            timezone: sec.timezone,
            google_maps_url: sec.googleMapsUrl,
            fraud_risk_level: sec.fraudRiskLevel,
            fraud_risk_reasons: sec.fraudRiskReasons
          }
        }
      });

      if (signUpError && !signUpData?.user) {
        const msg = toFriendlyAuthError(signUpError).message;
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        const msg = 'User ID could not be created.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      const isAdminEmail = cleanEmail === 'nagapavankumarjavisetty@gmail.com' || cleanEmail === 'admin@gallery.app';

      // 3. Upsert Profile safely with full anti-fraud metadata
      const profilePayload: UserProfile = {
        id: userId,
        email: cleanEmail,
        full_name: fullName.trim(),
        phone: phone.trim(),
        hostel_address: hostelAddress.trim(),
        role: isAdminEmail ? 'admin' : 'customer',
        account_status: 'active',
        is_whatsapp_verified: true,
        is_approved: true,
        is_active: true,
        auth_provider: 'Email',
        ip_address: sec.ipAddress,
        latitude: sec.latitude,
        longitude: sec.longitude,
        location_city: sec.city,
        gps_accuracy: sec.accuracyMeters,
        gps_allowed: sec.gpsAllowed,
        city: sec.city,
        state: sec.state,
        country: sec.country,
        pin_code: sec.pinCode,
        distance_km: sec.distanceKm,
        device_type: sec.deviceType,
        os_name: sec.osName,
        browser_name: sec.browserName,
        timezone: sec.timezone,
        google_maps_url: sec.googleMapsUrl,
        fraud_risk_level: sec.fraudRiskLevel,
        fraud_risk_reasons: sec.fraudRiskReasons,
        created_at: new Date().toISOString()
      };

      // 3. Upsert Profile safely only if session is active; otherwise rely on DB trigger
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      
      if (!activeSession) {
        // Until the email code is confirmed there is no session, so writing to profiles
        // client-side is skipped. The handle_new_user_signup trigger creates the row
        // server-side from raw_user_meta_data, preventing 401 Unauthorized console errors.
        setLoading(false);
        return { success: true, user: profilePayload };
      }

      const { data: upsertData, error: profileError } = await supabase
        .from('profiles')
        .upsert([profilePayload], { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        console.warn('[Anti-Fraud Reg] Profile upsert notice:', profileError.message);
        setLoading(false);
        return { success: true, user: profilePayload };
      }

      const finalProfile = (upsertData as UserProfile) || profilePayload;
      setLoading(false);
      return { success: true, user: finalProfile };
    } catch (err: any) {
      console.error('[Anti-Fraud Reg] Unexpected error:', err);
      const msg = err?.message || 'An unexpected registration error occurred.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  return { registerWithAntiFraud, loading, error };
}
