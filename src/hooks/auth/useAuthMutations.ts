/**
 * useAuthMutations - Authentication Action Hook
 *
 * Handles login, signup, and logout mutations:
 * - Email/password login
 * - OTP (one-time password) flow
 * - Magic link
 * - Signup with profile creation
 * - Logout with push token cleanup
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { pushService } from '@/services/notifications';
import { authKeys } from '../queryKeys';
import { ensurePlayerProfile } from './utils';
import type { AuthError } from '@supabase/supabase-js';
import type { Player } from '@/types/database.types';
import type {
  LoginCredentials,
  SignupCredentials,
  MagicLinkCredentials,
  OtpCredentials,
  OtpVerifyCredentials,
  LoginResponse,
  SignupResponse,
  MagicLinkResponse,
  OtpResponse,
  OtpVerifyResponse,
} from '@/types/auth';

/**
 * Hook for authentication mutations
 *
 * @returns Authentication mutation functions and state
 */
export function useAuthMutations() {
  const queryClient = useQueryClient();

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

      // Fetch or create player profile
      let playerData: Player | null = null;
      try {
        playerData = await ensurePlayerProfile(
          data.user.id,
          data.user.email,
          data.user.user_metadata as { name?: string; handicap?: number; phone?: string }
        );
      } catch (profileError) {
        console.warn('Player profile fetch/create failed:', profileError);
      }

      return {
        user: data.user,
        session: data.session,
        player: playerData!,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      if (data.player) {
        queryClient.setQueryData(authKeys.player(data.user.id), data.player);
      }
    },
  });

  /**
   * Mutation: Signup with email + password + player details
   */
  const signupMutation = useMutation({
    mutationFn: async (credentials: SignupCredentials): Promise<SignupResponse> => {
      const { email, password, name, phone, handicap } = credentials;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone, handicap },
          emailRedirectTo: 'https://thenineteenth.golf/app/auth/confirm',
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Signup failed: No user returned');
      }

      const emailConfirmationRequired = !data.session;

      // Wait for database trigger to create player profile
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // playerError is expected during signup race condition - trigger may not have fired yet

      return {
        user: data.user,
        session: data.session,
        player: (playerData as Player | null)!,
        emailConfirmationRequired,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      queryClient.setQueryData(authKeys.player(data.user.id), data.player);
    },
  });

  /**
   * Mutation: Login with magic link (passwordless)
   */
  const magicLinkMutation = useMutation({
    mutationFn: async (credentials: MagicLinkCredentials): Promise<MagicLinkResponse> => {
      const { email, redirectTo } = credentials;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo ?? 'https://thenineteenth.golf/app/auth/magic-link',
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
  });

  /**
   * Mutation: Send OTP code to email
   */
  const sendOtpMutation = useMutation({
    mutationFn: async (credentials: OtpCredentials): Promise<OtpResponse> => {
      const { email } = credentials;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: `Verification code sent to ${email}. Please check your inbox.`,
      };
    },
  });

  /**
   * Mutation: Verify OTP code
   */
  const verifyOtpMutation = useMutation({
    mutationFn: async (credentials: OtpVerifyCredentials): Promise<OtpVerifyResponse> => {
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

      let playerData: Player | null = null;
      try {
        playerData = await ensurePlayerProfile(
          data.user.id,
          data.user.email,
          data.user.user_metadata as { name?: string; handicap?: number; phone?: string }
        );
      } catch (profileError) {
        console.warn('Player profile fetch/create failed:', profileError);
      }

      return {
        user: data.user,
        session: data.session,
        player: playerData,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      if (data.player) {
        queryClient.setQueryData(authKeys.player(data.user.id), data.player);
      }
    },
  });

  /**
   * Mutation: Logout
   * Unregisters push token before signing out
   */
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Attempt to unregister push token before signing out
      try {
        const tokenResult = await pushService.getExpoPushToken();
        if (tokenResult.success && tokenResult.data) {
          const unregisterResult = await pushService.unregisterPushToken(tokenResult.data);
          if (!unregisterResult.success) {
            console.warn('[useAuthMutations] Failed to unregister push token:', unregisterResult.error);
          }
        }
      } catch (pushError) {
        console.warn('[useAuthMutations] Error during push token unregistration:', pushError);
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.removeQueries({ queryKey: authKeys.player('') });
    },
  });

  return {
    // Mutations
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    loginWithMagicLink: magicLinkMutation.mutateAsync,
    sendOtp: sendOtpMutation.mutateAsync,
    verifyOtp: verifyOtpMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isSendingMagicLink: magicLinkMutation.isPending,
    isSendingOtp: sendOtpMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isAuthenticating:
      loginMutation.isPending ||
      signupMutation.isPending ||
      magicLinkMutation.isPending ||
      sendOtpMutation.isPending ||
      verifyOtpMutation.isPending,

    // Errors
    loginError: loginMutation.error,
    signupError: signupMutation.error,
    logoutError: logoutMutation.error,
  };
}
