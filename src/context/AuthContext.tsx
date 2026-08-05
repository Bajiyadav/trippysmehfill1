import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
import { initialStaffAndDrivers } from '../lib/initialData';
import { validateRegistration } from '../lib/validation';
import { toFriendlyAuthError, NOT_CONFIGURED_MESSAGE } from '../lib/authErrors';

export interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  /** True until the initial session restore completes. Gate route guards on this. */
  initializing: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (identifier: string, password: string) => Promise<AuthResult>;
  signUp: (data: {
    full_name: string;
    phone: string;
    hostel_address: string;
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  signInWithGoogle: (
    email: string,
    fullName?: string,
    phone?: string,
    address?: string,
    ip?: string,
    lat?: number,
    lng?: number
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Role switching bypasses authentication entirely, so it is a development aid
 * only and is compiled out of production builds.
 */
const DEMO_ROLE_SWITCH_ENABLED = Boolean((import.meta as any).env?.DEV);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  /**
   * Loads the profile row for an authenticated session. The Supabase session is
   * the single source of truth for identity -- notably the `role` used for
   * admin gating, which previously came from localStorage and could simply be
   * edited by the user.
   */
  const loadProfile = useCallback(async (activeSession: Session): Promise<UserProfile | null> => {
    const authUser = activeSession.user;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      if ((profile as UserProfile).account_status === 'blocked_fraud') {
        await supabase.auth.signOut();
        return null;
      }
      return profile as UserProfile;
    }

    // First sign-in for this auth user: create a minimal profile from metadata.
    const meta = (authUser.user_metadata || {}) as Record<string, any>;
    const newProfile: UserProfile = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: meta.full_name || authUser.email?.split('@')[0] || 'Customer',
      phone: meta.phone || '',
      hostel_address: meta.hostel_address || '',
      role: 'customer',
      is_whatsapp_verified: true,
      is_approved: true,
      is_active: true,
      auth_provider: 'Email',
      created_at: new Date().toISOString()
    };

    const { data: inserted } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .maybeSingle();

    return (inserted as UserProfile) || newProfile;
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession) {
        setUser(null);
        return;
      }

      try {
        setUser(await loadProfile(nextSession));
      } catch (err) {
        console.error('[Auth] Failed to load profile:', err);
        setUser(null);
      }
    },
    [loadProfile]
  );

  // Restore any persisted session on load, then track auth state changes.
  // supabase-js refreshes the access token automatically (autoRefreshToken).
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        await applySession(data.session ?? null);
      })
      .catch(err => console.error('[Auth] Session restore failed:', err))
      .finally(() => {
        if (active) setInitializing(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      void applySession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = async (identifier: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      return { success: false, message: NOT_CONFIGURED_MESSAGE };
    }

    const email = identifier.trim().toLowerCase();
    if (!email || !password) {
      return { success: false, message: 'Please enter your email address and password.' };
    }
    if (!email.includes('@')) {
      return { success: false, message: 'Please sign in with your email address.' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, message: toFriendlyAuthError(error).message };
      }

      if (data.session) {
        const profile = await loadProfile(data.session);

        if (!profile) {
          return {
            success: false,
            message: 'Account Suspended: Suspicious anti-fraud activity detected.'
          };
        }
        if (!profile.is_approved && profile.role === 'customer') {
          await supabase.auth.signOut();
          return {
            success: false,
            message: 'Your registration is pending admin approval. Please try again later.'
          };
        }

        setSession(data.session);
        setUser(profile);
      }

      return { success: true };
    } catch (e) {
      return { success: false, message: toFriendlyAuthError(e).message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Completes registration AFTER the email OTP has been verified.
   *
   * Verifying the code establishes a Supabase session for a passwordless user;
   * this sets the password they chose and writes their profile row, so they can
   * subsequently sign in with a password.
   */
  const signUp = async (data: {
    full_name: string;
    phone: string;
    hostel_address: string;
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      return { success: false, message: NOT_CONFIGURED_MESSAGE };
    }

    const validation = validateRegistration({
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      address: data.hostel_address,
      password: data.password
    });

    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    setLoading(true);
    try {
      const {
        data: { session: activeSession }
      } = await supabase.auth.getSession();

      if (!activeSession) {
        return {
          success: false,
          message: 'Your verification session has expired. Please request a new code.'
        };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
        data: {
          full_name: data.full_name.trim(),
          phone: data.phone.trim(),
          hostel_address: data.hostel_address.trim()
        }
      });

      if (updateError) {
        return { success: false, message: toFriendlyAuthError(updateError).message };
      }

      const profile: UserProfile = {
        id: activeSession.user.id,
        email: data.email.trim().toLowerCase(),
        full_name: data.full_name.trim(),
        phone: data.phone.trim(),
        hostel_address: data.hostel_address.trim(),
        role: 'customer',
        account_status: 'active',
        is_whatsapp_verified: true,
        is_approved: true,
        is_active: true,
        auth_provider: 'Email',
        created_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase.from('profiles').upsert([profile]);
      if (profileError) {
        console.error('[Auth] Profile upsert failed:', profileError);
      }

      setUser(profile);
      setSession(activeSession);

      return {
        success: true,
        message: 'Account created! Your registration is sent for Admin approval before ordering.'
      };
    } catch (e) {
      return { success: false, message: toFriendlyAuthError(e).message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Completes the "continue with Google" flow, which is an email OTP flow under
   * the hood. It runs only after verifyOtp has established a real session --
   * it no longer fabricates a signed-in user from form input.
   */
  const signInWithGoogle = async (
    email: string,
    fullName?: string,
    phone?: string,
    address?: string,
    ip?: string,
    lat?: number,
    lng?: number
  ) => {
    if (!isSupabaseConfigured) {
      throw new Error(NOT_CONFIGURED_MESSAGE);
    }

    const cleanEmail = email.trim().toLowerCase();

    const {
      data: { session: activeSession }
    } = await supabase.auth.getSession();

    if (!activeSession) {
      throw new Error('Your verification session has expired. Please request a new code.');
    }

    const derivedName = fullName?.trim() || cleanEmail.split('@')[0];

    const profile: UserProfile = {
      id: activeSession.user.id,
      email: cleanEmail,
      full_name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
      phone: phone?.trim() || '',
      hostel_address: address?.trim() || '',
      role: 'customer',
      account_status: 'active',
      is_whatsapp_verified: false,
      is_approved: false,
      is_active: true,
      auth_provider: 'Google',
      ip_address: ip,
      latitude: lat,
      longitude: lng,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert([profile]);
    if (error) console.error('[Auth] Profile upsert failed:', error);

    setSession(activeSession);
    setUser(profile);
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        // 'local' clears this browser's session; supabase-js also drops the
        // persisted tokens from storage.
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('[Auth] Sign out error:', e);
    } finally {
      setUser(null);
      setSession(null);
      try {
        sessionStorage.clear();
      } catch {
        // Storage can be unavailable in private browsing modes.
      }
    }
  };

  const refreshProfile = async () => {
    if (!session) return;
    try {
      setUser(await loadProfile(session));
    } catch (e) {
      console.error('[Auth] Profile refresh failed:', e);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
      if (error) console.error('[Auth] Profile update failed:', error);
    }
  };

  const switchDemoRole = (role: UserRole) => {
    if (!DEMO_ROLE_SWITCH_ENABLED) {
      console.warn('[Auth] Demo role switching is disabled outside development.');
      return;
    }
    const roleUser = initialStaffAndDrivers.find(u => u.role === role) || {
      id: 'demo-' + role,
      email: `${role}@trippys.com`,
      full_name: `Demo ${role.toUpperCase()}`,
      phone: '9999999999',
      role,
      is_approved: true,
      is_active: true
    };
    setUser(roleUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        initializing,
        isConfigured: isSupabaseConfigured,
        configError: supabaseConfigError,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
        switchDemoRole,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
