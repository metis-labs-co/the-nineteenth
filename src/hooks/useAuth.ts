/**
 * useAuth - Unified Authentication Hook
 *
 * Thin wrapper that composes focused auth hooks for backward compatibility.
 * For granular access, use individual hooks from ./auth/ directory.
 *
 * @example
 * ```tsx
 * // Full API (backward compatible)
 * const { user, player, login, logout, isAuthenticated } = useAuth();
 *
 * // Or use focused hooks directly
 * import { useAuthSession, useAuthUser } from '@/hooks/auth';
 * const { session } = useAuthSession();
 * const { user, player } = useAuthUser(session);
 * ```
 */

import { useAuthContext } from '@/context/AuthContext';
import { useAuthSession } from './auth/useAuthSession';
import { useAuthUser } from './auth/useAuthUser';
import { useAuthMutations } from './auth/useAuthMutations';
import { useSocialAuth } from './auth/useSocialAuth';
import { usePasswordReset } from './auth/usePasswordReset';
import { useProfileMutations } from './auth/useProfileMutations';
import type { UseAuthReturn } from '@/types/auth';

/**
 * Main authentication hook
 *
 * Composes all auth functionality into a single hook.
 * Maintains backward compatibility with existing usage.
 */
export function useAuth(): UseAuthReturn {
  // Get isInitializing from context (managed by AuthProvider)
  const { isInitializing } = useAuthContext();

  // Compose focused hooks
  const sessionHook = useAuthSession();
  const userHook = useAuthUser(sessionHook.session);
  const authMutations = useAuthMutations();
  const socialAuth = useSocialAuth();
  const passwordReset = usePasswordReset();
  const profileMutations = useProfileMutations(userHook.user);

  // Compute combined loading state
  const isLoading = sessionHook.isLoading || userHook.isLoading;

  // Compute authentication state
  const isAuthenticated = !!sessionHook.session && !!userHook.user;

  return {
    // State
    user: userHook.user,
    session: sessionHook.session,
    player: userHook.player,
    isLoading,
    isInitializing,
    isAuthenticating: authMutations.isAuthenticating || socialAuth.isSocialLoggingIn,
    error: (sessionHook.error || authMutations.loginError || authMutations.signupError || null) as import('@supabase/supabase-js').AuthError | null,
    isAuthenticated,

    // Auth actions
    login: authMutations.login,
    signup: authMutations.signup,
    loginWithMagicLink: authMutations.loginWithMagicLink,
    sendOtp: authMutations.sendOtp,
    verifyOtp: authMutations.verifyOtp,
    logout: authMutations.logout,

    // Social auth
    loginWithApple: socialAuth.loginWithApple,
    loginWithGoogle: socialAuth.loginWithGoogle,
    isSocialLoggingIn: socialAuth.isSocialLoggingIn,
    isAppleAvailable: socialAuth.isAppleAvailable,

    // Password management
    resetPassword: passwordReset.resetPassword,
    updatePassword: passwordReset.updatePassword,

    // Profile management
    updateProfile: profileMutations.updateProfile,
    refreshProfile: userHook.refreshProfile,

    // Token management
    getToken: sessionHook.getToken,
    refreshSession: sessionHook.refreshSession,
  };
}

/**
 * Hook: useSession
 * Lightweight hook for accessing only session data
 */
export { useAuthSession as useSession } from './auth/useAuthSession';

/**
 * Hook: useUser
 * Lightweight hook for accessing only user data
 */
export function useUser() {
  const { session } = useAuthSession();
  const { user } = useAuthUser(session);
  return user;
}
