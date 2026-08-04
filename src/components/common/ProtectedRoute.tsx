import React from 'react';
import { ShieldAlert, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

/**
 * Auth gates for this app's section-based navigation.
 *
 * These are a usability layer, not a security boundary. The real enforcement for
 * anything sensitive must live in Supabase Row Level Security, because a
 * determined user controls everything running in their own browser.
 */

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-[50vh] w-full items-center justify-center px-4">
    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
      {children}
    </div>
  </div>
);

/** Shown while the persisted session is being restored, to avoid a flash of "signed out". */
export const AuthLoading: React.FC<{ label?: string }> = ({ label = 'Checking your session…' }) => (
  <Centered>
    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-orange-500" />
    <p className="text-sm text-neutral-400">{label}</p>
  </Centered>
);

/** Rendered when Supabase credentials are missing or still placeholders. */
export const ConfigErrorScreen: React.FC<{ error: string | null }> = ({ error }) => (
  <Centered>
    <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-orange-500" />
    <h2 className="mb-2 text-lg font-semibold text-white">Authentication is not configured</h2>
    <p className="mb-4 text-sm text-neutral-400">
      {error || 'Supabase credentials are missing.'}
    </p>
    <p className="text-xs leading-relaxed text-neutral-500">
      Set <code className="text-orange-400">VITE_SUPABASE_URL</code> and{' '}
      <code className="text-orange-400">VITE_SUPABASE_ANON_KEY</code> in your hosting
      environment, then redeploy. These values are inlined at build time, so a
      redeploy is required for changes to take effect.
    </p>
  </Centered>
);

interface RequireAuthProps {
  children: React.ReactNode;
  /** Rendered instead of the default prompt when the visitor is signed out. */
  fallback?: React.ReactNode;
  onRequestSignIn?: () => void;
}

/** Renders children only for a signed-in user. */
export const RequireAuth: React.FC<RequireAuthProps> = ({ children, fallback, onRequestSignIn }) => {
  const { user, initializing, isConfigured, configError } = useAuth();

  if (!isConfigured) return <ConfigErrorScreen error={configError} />;
  if (initializing) return <AuthLoading />;

  if (!user) {
    if (fallback) return <>{fallback}</>;
    return (
      <Centered>
        <Lock className="mx-auto mb-4 h-9 w-9 text-orange-500" />
        <h2 className="mb-2 text-lg font-semibold text-white">Please sign in</h2>
        <p className="mb-5 text-sm text-neutral-400">
          You need an account to view this section.
        </p>
        {onRequestSignIn && (
          <button
            onClick={onRequestSignIn}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Sign In
          </button>
        )}
      </Centered>
    );
  }

  return <>{children}</>;
};

interface RequireRoleProps extends RequireAuthProps {
  roles: UserRole | UserRole[];
}

/** Renders children only for a signed-in user holding one of `roles`. */
export const RequireRole: React.FC<RequireRoleProps> = ({
  roles,
  children,
  fallback,
  onRequestSignIn
}) => {
  const { user, initializing, isConfigured, configError } = useAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!isConfigured) return <ConfigErrorScreen error={configError} />;
  if (initializing) return <AuthLoading />;

  if (!user) {
    return (
      <RequireAuth fallback={fallback} onRequestSignIn={onRequestSignIn}>
        {children}
      </RequireAuth>
    );
  }

  if (!allowed.includes(user.role)) {
    return (
      <Centered>
        <ShieldAlert className="mx-auto mb-4 h-9 w-9 text-red-500" />
        <h2 className="mb-2 text-lg font-semibold text-white">Access denied</h2>
        <p className="text-sm text-neutral-400">
          This section requires {allowed.join(' or ')} access.
        </p>
      </Centered>
    );
  }

  return <>{children}</>;
};
