import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (val: any): string => {
  if (!val) return '';
  let s = String(val).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
};

const rawUrl = cleanEnvVar((import.meta as any).env?.VITE_SUPABASE_URL);
const rawAnonKey = cleanEnvVar((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

const PLACEHOLDER_HINTS = ['your-supabase-project', 'placeholder', 'example.supabase.co'];

const looksLikePlaceholder = (value: string) =>
  PLACEHOLDER_HINTS.some(hint => value.toLowerCase().includes(hint));

/**
 * Explains exactly what is missing, so a misconfigured deployment surfaces a
 * useful message instead of an opaque runtime crash. Null when config is valid.
 */
export const supabaseConfigError: string | null = (() => {
  const missing: string[] = [];
  if (!rawUrl) missing.push('VITE_SUPABASE_URL');
  if (!rawAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length) {
    return `Missing environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`;
  }

  if (looksLikePlaceholder(rawUrl) || looksLikePlaceholder(rawAnonKey)) {
    return 'Supabase credentials are still set to placeholder values.';
  }

  if (!/^https?:\/\/[a-z0-9-.]+/i.test(rawUrl)) {
    return `VITE_SUPABASE_URL does not look like a valid URL: "${rawUrl}".`;
  }

  return null;
})();

export const isSupabaseConfigured = supabaseConfigError === null;

// These VITE_* values are inlined at BUILD time, so changing them in the hosting
// dashboard requires a redeploy before the running app picks them up.
const dummyUrl = 'https://placeholder.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

/**
 * A client is always constructed -- even when unconfigured -- so that importing
 * modules never throw at load time. Guard real calls with `isSupabaseConfigured`.
 */
export const supabase = createClient(
  isSupabaseConfigured ? rawUrl : dummyUrl,
  isSupabaseConfigured ? rawAnonKey : dummyKey,
  {
    auth: {
      // Keep the user signed in across reloads and refresh the access token
      // before it expires, so long sessions do not silently break.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'trippys-auth',
      flowType: 'pkce'
    }
  }
);

if (!isSupabaseConfigured && typeof console !== 'undefined') {
  console.error(
    `[Supabase] Authentication is disabled. ${supabaseConfigError}\n` +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting environment and redeploy.'
  );
}
