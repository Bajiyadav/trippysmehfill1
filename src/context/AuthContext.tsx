import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initialStaffAndDrivers } from '../lib/initialData';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (data: { full_name: string; phone: string; hostel_address: string; email: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('trippys_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    // Default demo user is Admin to show full ERP capabilities immediately
    return initialStaffAndDrivers[0];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('trippys_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('trippys_user');
    }
  }, [user]);

  // Sync with Supabase Auth state if Supabase is connected
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch or create profile from public.profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser(profile as UserProfile);
        } else {
          // Auto create profile for Google / OAuth user
          const newProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            phone: session.user.user_metadata?.phone || '',
            role: 'customer',
            is_approved: true, // Auto approve Google users or keep pending
            is_active: true
          };
          await supabase.from('profiles').insert([newProfile]);
          setUser(newProfile);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        // First attempt standard Supabase email login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier.includes('@') ? identifier : `${identifier}@trippys.com`,
          password
        });

        if (error) {
          // Fallback check demo database
          const found = initialStaffAndDrivers.find(
            u => u.email.toLowerCase() === identifier.toLowerCase() || u.username === identifier || u.phone === identifier
          );
          if (found) {
            setUser(found);
            setLoading(false);
            return { success: true };
          }
          setLoading(false);
          return { success: false, message: error.message };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            if (!profile.is_approved && profile.role === 'customer') {
              setLoading(false);
              return { success: false, message: 'Your registration is pending admin approval. Please try again later.' };
            }
            setUser(profile as UserProfile);
          }
        }
        setLoading(false);
        return { success: true };
      } else {
        // Local demo auth check
        const staffOrAdmin = initialStaffAndDrivers.find(
          u => u.email.toLowerCase() === identifier.toLowerCase() || u.username === identifier || u.phone === identifier
        );
        
        if (staffOrAdmin) {
          setUser(staffOrAdmin);
          setLoading(false);
          return { success: true };
        }

        // Generic user login fallback
        const demoUser: UserProfile = {
          id: 'u-' + Date.now(),
          email: identifier.includes('@') ? identifier : `${identifier}@gmail.com`,
          full_name: identifier.split('@')[0] || 'Customer',
          phone: '9876543210',
          hostel_address: 'Main Campus Hostel, Room 102',
          role: 'customer',
          is_approved: true,
          is_active: true
        };
        setUser(demoUser);
        setLoading(false);
        return { success: true };
      }
    } catch (e) {
      setLoading(false);
      return { success: false, message: (e as Error).message };
    }
  };

  const signUp = async (data: { full_name: string; phone: string; hostel_address: string; email: string; password: string }) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              phone: data.phone,
              hostel_address: data.hostel_address
            }
          }
        });

        if (error) {
          setLoading(false);
          return { success: false, message: error.message };
        }

        if (authData.user) {
          const newProfile: UserProfile = {
            id: authData.user.id,
            email: data.email,
            full_name: data.full_name,
            phone: data.phone,
            hostel_address: data.hostel_address,
            role: 'customer',
            is_approved: false, // New customer registrations go to Admin approval queue!
            is_active: true
          };

          await supabase.from('profiles').insert([newProfile]);
          
          setLoading(false);
          return {
            success: true,
            message: 'Account created! Your registration is sent for Admin approval before ordering.'
          };
        }
      }

      // Local state fallback
      const newCustomer: UserProfile = {
        id: 'c-' + Date.now(),
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        hostel_address: data.hostel_address,
        role: 'customer',
        is_approved: true,
        is_active: true
      };
      setUser(newCustomer);
      setLoading(false);
      return { success: true, message: 'Account created successfully!' };
    } catch (e) {
      setLoading(false);
      return { success: false, message: (e as Error).message };
    }
  };

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } else {
      // Demo Google login
      const googleUser: UserProfile = {
        id: 'g-user-' + Date.now(),
        email: 'nagapavankumarjavisetty@gmail.com',
        full_name: 'Javisetty Naga Pavan Kumar',
        phone: '6301196547',
        hostel_address: 'Goenka University Gate 5',
        role: 'admin',
        is_approved: true,
        is_active: true
      };
      setUser(googleUser);
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update(data).eq('id', user.id);
    }
  };

  const switchDemoRole = (role: UserRole) => {
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
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
        switchDemoRole
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
