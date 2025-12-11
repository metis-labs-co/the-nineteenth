/**
 * useAuth - Authentication Hook
 *
 * Provides comprehensive authentication functionality using Supabase Auth:
 * - Login (email + password, magic link)
 * - Signup with player profile creation
 * - Logout
 * - Session management with auto-refresh
 * - Player profile management
 * - Token retrieval for API calls
 *
 * Features:
 * - Automatic session persistence via AsyncStorage
 * - Real-time auth state updates
 * - Token refresh before expiry
 * - Type-safe with full TypeScript support
 * - Integrated with TanStack Query for caching
 *
 * @example
 * ```tsx
 * function LoginScreen() {
 *   const { login, isAuthenticating, error } = useAuth();
 *
 *   const handleLogin = async () => {
 *     try {
 *       await login({ email: 'user@example.com', password: 'password123' });
 *       // Navigate to home screen
 *     } catch (err) {
 *       // Error handling (already in hook state)
 *     }
 *   };
 *
 *   return <Button onPress={handleLogin} loading={isAuthenticating} />;
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { authKeys } from './queryKeys';
import { useAuthContext } from '@/context/AuthContext';
import type {
  UseAuthReturn,
  LoginCredentials,
  SignupCredentials,
  MagicLinkCredentials,
  OtpCredentials,
  OtpVerifyCredentials,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ProfileUpdateInput,
  LoginResponse,
  SignupResponse,
  MagicLinkResponse,
  OtpResponse,
  OtpVerifyResponse,
  PasswordResetResponse,
} from '@/types/auth';
import type { Session, AuthError } from '@supabase/supabase-js';
import type { Player } from '@/types/database.types';

/**
 * Main authentication hook
 *
 * Returns current auth state and authentication actions
 */
export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();

  // Get isInitializing from context (managed by AuthProvider)
  const { isInitializing } = useAuthContext();

  // Local state for errors only
  const [error, setError] = useState<AuthError | null>(null);

  // =====================================================
  // SESSION & USER QUERIES
  // =====================================================

  /**
   * Query: Current session
   * Note: Initial session is populated by onAuthStateChange listener.
   * This query handles refetches on focus/reconnect only.
   */
  const {
    data: session = null,
    isLoading: isLoadingSession,
  } = useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      if (__DEV__) {
        console.log('[useAuth] Session query executing...');
      }
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[useAuth] Error fetching session:', error);
        setError(error);
        return null;
      }

      if (__DEV__) {
        console.log('[useAuth] Session query result:', { hasSession: !!data.session, userId: data.session?.user?.id });
      }
      return data.session;
    },
    // Initialize with undefined to let onAuthStateChange populate
    initialData: undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Fetch once on mount to ensure we have session data
    refetchOnMount: 'always',
  });

  /**
   * Query: Current user
   * Only fetches if session exists
   */
  const {
    data: user = null,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      if (__DEV__) {
        console.log('[useAuth] User query executing...');
      }
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error('[useAuth] Error fetching user:', error);
        setError(error);
        return null;
      }

      if (__DEV__) {
        console.log('[useAuth] User query result:', { hasUser: !!data.user, userId: data.user?.id });
      }
      return data.user;
    },
    enabled: !!session, // Only fetch if session exists
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  /**
   * Query: Player profile
   * Fetches extended player data from players table
   * Only fetches if user exists
   */
  const {
    data: player = null,
    isLoading: isLoadingPlayer,
  } = useQuery({
    queryKey: authKeys.player(user?.id ?? ''),
    queryFn: async () => {
      if (__DEV__) {
        console.log('[useAuth] Player query executing for userId:', user?.id);
      }
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[useAuth] Error fetching player profile:', error);
        return null;
      }

      if (__DEV__) {
        console.log('[useAuth] Player query result:', { playerId: data?.id, handicap: data?.handicap });
      }
      return data as Player;
    },
    enabled: !!user?.id, // Only fetch if user exists
    staleTime: 5 * 60 * 1000,
  });

  // NOTE: Auth state listener is now managed by AuthProvider (singleton)
  // See src/context/AuthContext.tsx

  // =====================================================
  // MUTATIONS
  // =====================================================

  /**
   * Mutation: Login with email + password
   */
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const { email, password } = credentials;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed: No user or session returned');
      }

      // Fetch player profile (non-blocking - don't fail login if this fails)
      let playerData: Player | null = null;
      try {
        const { data: profile, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (playerError) {
          console.warn('Could not fetch player profile:', playerError.message);
        } else {
          playerData = profile as Player;
        }
      } catch (profileError) {
        console.warn('Player profile fetch failed:', profileError);
      }

      return {
        user: data.user,
        session: data.session,
        player: playerData!,
      };
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      if (data.player) {
        queryClient.setQueryData(authKeys.player(data.user.id), data.player);
      }
      setError(null);
    },
    onError: (err: AuthError) => {
      console.error('Login error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Signup with email + password + player details
   *
   * Note: When email confirmation is enabled in Supabase, signup returns a user
   * but no session until the email is confirmed. We handle both cases:
   * - Email confirmation disabled: User gets session immediately
   * - Email confirmation enabled: User must confirm email first
   */
  const signupMutation = useMutation({
    mutationFn: async (credentials: SignupCredentials): Promise<SignupResponse> => {
      const { email, password, name, phone, handicap } = credentials;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            handicap,
          },
          // Configure email redirect for confirmation link
          emailRedirectTo: 'thenineteenth://auth/confirm',
        },
      });

      if (error) {
        throw error;
      }

      // When email confirmation is enabled, we get a user but no session
      // The user must confirm their email before they can log in
      if (!data.user) {
        throw new Error('Signup failed: No user returned');
      }

      // Check if email confirmation is required (no session returned)
      const emailConfirmationRequired = !data.session;

      // Player profile is automatically created by a database trigger on auth.users insert
      // See: supabase/migrations/20250112000000_auto_create_player_profile.sql
      // Wait a moment for the trigger to complete, then fetch the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the player profile created by the trigger
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (playerError) {
        console.warn('Could not fetch player profile (may be created shortly):', playerError.message);
      }

      return {
        user: data.user,
        session: data.session, // Will be null if email confirmation is required
        player: (playerData as Player | null)!,
        emailConfirmationRequired,
      };
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      queryClient.setQueryData(authKeys.player(data.user.id), data.player);
      setError(null);
    },
    onError: (err: AuthError) => {
      console.error('Signup error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Login with magic link (passwordless)
   */
  const magicLinkMutation = useMutation({
    mutationFn: async (
      credentials: MagicLinkCredentials
    ): Promise<MagicLinkResponse> => {
      const { email, redirectTo } = credentials;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo ?? 'thenineteenth://auth/magic-link',
        },
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: `Magic link sent to ${email}. Please check your inbox.`,
      };
    },
    onError: (err: AuthError) => {
      console.error('Magic link error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Send OTP code to email
   */
  const sendOtpMutation = useMutation({
    mutationFn: async (credentials: OtpCredentials): Promise<OtpResponse> => {
      const { email } = credentials;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Create user if doesn't exist
        },
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: `Verification code sent to ${email}. Please check your inbox.`,
      };
    },
    onError: (err: AuthError) => {
      console.error('Send OTP error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Verify OTP code
   */
  const verifyOtpMutation = useMutation({
    mutationFn: async (
      credentials: OtpVerifyCredentials
    ): Promise<OtpVerifyResponse> => {
      const { email, token } = credentials;

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('Verification failed: No user or session returned');
      }

      // Fetch player profile (non-blocking)
      let playerData: Player | null = null;
      try {
        const { data: profile, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (playerError) {
          console.warn('Could not fetch player profile:', playerError.message);
        } else {
          playerData = profile as Player;
        }
      } catch (profileError) {
        console.warn('Player profile fetch failed:', profileError);
      }

      return {
        user: data.user,
        session: data.session,
        player: playerData,
      };
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      if (data.player) {
        queryClient.setQueryData(authKeys.player(data.user.id), data.player);
      }
      setError(null);
    },
    onError: (err: AuthError) => {
      console.error('Verify OTP error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Logout
   */
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Clear all auth-related cache
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.removeQueries({ queryKey: authKeys.player('') });
      setError(null);

      // Note: For complete cleanup, you could clear all user-specific queries:
      // queryClient.invalidateQueries({ queryKey: competitionKeys.all });
      // queryClient.invalidateQueries({ queryKey: scorecardKeys.all });
      // Or use queryClient.clear() to clear everything (nuclear option)
    },
    onError: (err: AuthError) => {
      console.error('Logout error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Reset password
   */
  const resetPasswordMutation = useMutation({
    mutationFn: async (
      request: PasswordResetRequest
    ): Promise<PasswordResetResponse> => {
      const { email, redirectTo } = request;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo ?? 'thenineteenth://auth/reset-password',
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: `Password reset link sent to ${email}. Please check your inbox.`,
      };
    },
    onError: (err: AuthError) => {
      console.error('Password reset error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Update password (when logged in)
   */
  const updatePasswordMutation = useMutation({
    mutationFn: async (request: PasswordUpdateRequest) => {
      const { newPassword } = request;

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setError(null);
    },
    onError: (err: AuthError) => {
      console.error('Password update error:', err);
      setError(err);
    },
  });

  /**
   * Mutation: Update player profile
   */
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: ProfileUpdateInput): Promise<Player> => {
      if (!user?.id) {
        throw new Error('No user logged in');
      }

      // Build update object with only provided fields
      // This prevents overwriting fields with undefined/null when not intended
      const updateData: Record<string, string | number | null> = {};

      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.phone !== undefined) {
        // Allow setting phone to null by passing empty string
        updateData.phone = updates.phone || null;
      }
      if (updates.handicap !== undefined) {
        updateData.handicap = updates.handicap;
        // Automatically update handicap_updated_at when handicap is changed
        updateData.handicap_updated_at = new Date().toISOString();
      }
      if (updates.photoUrl !== undefined) {
        updateData.photo_url = updates.photoUrl || null;
      }

      // Ensure we have something to update
      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      // Update players table
      const { data, error } = await supabase
        .from('players')
        .update(updateData as unknown as never)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Player;
    },
    onSuccess: (updatedPlayer) => {
      // Update player cache
      if (user?.id) {
        queryClient.setQueryData(authKeys.player(user.id), updatedPlayer);
      }
      setError(null);
    },
    onError: (err) => {
      console.error('Profile update error:', err);
      setError(err as AuthError);
    },
  });

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  /**
   * Get auth token for API calls
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    return data.session.access_token;
  }, []);

  /**
   * Manually refresh session
   */
  const refreshSession = useCallback(async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Error refreshing session:', error);
      return null;
    }

    // Update cache
    if (data.session) {
      queryClient.setQueryData(authKeys.session(), data.session);
    }

    return data.session;
  }, [queryClient]);

  /**
   * Manually refresh player profile
   */
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    await queryClient.invalidateQueries({
      queryKey: authKeys.player(user.id),
    });
  }, [user?.id, queryClient]);

  // =====================================================
  // COMPUTED STATE
  // =====================================================

  const isLoading =
    isLoadingSession || isLoadingUser || isLoadingPlayer;

  const isAuthenticating =
    loginMutation.isPending ||
    signupMutation.isPending ||
    magicLinkMutation.isPending ||
    sendOtpMutation.isPending ||
    verifyOtpMutation.isPending;

  const isAuthenticated = !!session && !!user;

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // State
    user,
    session,
    player,
    isLoading,
    isInitializing,
    isAuthenticating,
    error,
    isAuthenticated,

    // Actions
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    loginWithMagicLink: magicLinkMutation.mutateAsync,
    sendOtp: sendOtpMutation.mutateAsync,
    verifyOtp: verifyOtpMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,

    // Password Management
    resetPassword: resetPasswordMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutateAsync,

    // Profile Management
    updateProfile: updateProfileMutation.mutateAsync,
    refreshProfile,

    // Token Management
    getToken,
    refreshSession,
  };
}

/**
 * Hook: useSession
 * Lightweight hook for accessing only session data
 */
export function useSession() {
  const { data: session = null } = useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session;
    },
    staleTime: 5 * 60 * 1000,
  });

  return session;
}

/**
 * Hook: useUser
 * Lightweight hook for accessing only user data
 */
export function useUser() {
  const session = useSession();

  const { data: user = null } = useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });

  return user;
}
