/**
 * useSocialAuth - Social Authentication Hook
 *
 * Handles Apple and Google social login mutations.
 * - Apple: Uses native iOS flow (expo-apple-authentication) → signInWithIdToken
 * - Google: Uses Supabase server-side OAuth flow (signInWithOAuth) → deep link callback
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/services/supabase/client';
import { authKeys } from '../queryKeys';
import { ensurePlayerProfile } from './utils';
import {
  signInWithAppleNative,
  isAppleSignInAvailable,
} from '@/services/auth/socialAuth';
import type { Player } from '@/types/database.types';
import type { SocialLoginResponse } from '@/types/auth';

// Ensure any in-progress auth session completes on web
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook for social authentication (Apple + Google)
 */
export function useSocialAuth() {
  const queryClient = useQueryClient();
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');

  // Check Apple Sign In availability
  useEffect(() => {
    if (Platform.OS === 'ios') {
      isAppleSignInAvailable().then(setAppleAvailable);
    }
  }, []);

  /**
   * Shared success handler for social login mutations
   */
  const onSocialLoginSuccess = useCallback(
    (data: SocialLoginResponse) => {
      queryClient.setQueryData(authKeys.session(), data.session);
      queryClient.setQueryData(authKeys.user(), data.user);
      if (data.player) {
        queryClient.setQueryData(authKeys.player(data.user.id), data.player);
      }
    },
    [queryClient]
  );

  /**
   * Mutation: Apple Sign In
   */
  const appleLoginMutation = useMutation({
    mutationFn: async (): Promise<SocialLoginResponse> => {
      // Get Apple ID token via native flow
      const appleResult = await signInWithAppleNative();

      // Sign in with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: appleResult.idToken,
        nonce: appleResult.nonce,
      });

      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error('Apple Sign In failed: No user or session returned');
      }

      // If Apple provided a name (first sign-in only), update user metadata
      const appleFirstName = appleResult.fullName?.firstName;
      const appleLastName = appleResult.fullName?.lastName;
      let fullName: string | undefined;

      if (appleFirstName || appleLastName) {
        fullName = [appleFirstName, appleLastName].filter(Boolean).join(' ');
        await supabase.auth.updateUser({
          data: { name: fullName },
        });
      }

      // Check if this is a new user (no existing player profile)
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('id', data.user.id)
        .single();

      const isNewUser = !existingPlayer;

      // Ensure player profile exists
      let playerData: Player | null = null;
      try {
        playerData = await ensurePlayerProfile(
          data.user.id,
          data.user.email,
          {
            name: fullName || data.user.user_metadata?.name,
          }
        );
      } catch (profileError) {
        console.warn('Player profile fetch/create failed:', profileError);
      }

      return {
        user: data.user,
        session: data.session,
        player: playerData!,
        isNewUser,
      };
    },
    onSuccess: onSocialLoginSuccess,
    onError: (err: Error) => {
      // Don't log cancellation errors
      if (err.message?.includes('ERR_CANCELED') || err.message?.includes('canceled')) {
        return;
      }
      console.error('Apple login error:', err);
    },
  });

  /**
   * Mutation: Google Sign In
   *
   * Uses Supabase's server-side OAuth flow:
   * 1. Supabase generates a Google OAuth URL with its own https:// callback
   * 2. User signs in via in-app browser
   * 3. Google redirects to Supabase callback
   * 4. Supabase redirects to app via deep link with session tokens
   */
  const googleLoginMutation = useMutation({
    mutationFn: async (): Promise<SocialLoginResponse> => {
      // The deep link URL that Supabase will redirect to after OAuth completes
      const redirectTo = makeRedirectUri({ scheme: 'thenineteenth', path: 'google-auth' });
      console.log('[Google Auth] redirectTo:', redirectTo);

      // Start Supabase OAuth flow - this gives us a URL to open
      const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // We'll handle the browser ourselves
        },
      });

      if (oauthError) throw oauthError;
      if (!oauthData.url) throw new Error('Google Sign In failed: No OAuth URL returned');

      // Open the OAuth URL in an in-app browser
      // preferEphemeralSession skips the iOS "wants to use" consent dialog
      const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectTo, {
        preferEphemeralSession: true,
      });

      if (result.type !== 'success') {
        throw new Error('ERR_CANCELED');
      }

      // Extract tokens from the redirect URL
      // Supabase appends #access_token=...&refresh_token=... to the redirect
      const url = result.url;
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        throw new Error('Google Sign In failed: No tokens in redirect URL');
      }

      // Set the session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error('Google Sign In failed: No user or session returned');
      }

      // Check if this is a new user
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('id', data.user.id)
        .single();

      const isNewUser = !existingPlayer;

      // Ensure player profile exists
      let playerData: Player | null = null;
      try {
        playerData = await ensurePlayerProfile(
          data.user.id,
          data.user.email,
          {
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          }
        );
      } catch (profileError) {
        console.warn('Player profile fetch/create failed:', profileError);
      }

      return {
        user: data.user,
        session: data.session,
        player: playerData!,
        isNewUser,
      };
    },
    onSuccess: onSocialLoginSuccess,
    onError: (err: Error) => {
      if (err.message?.includes('ERR_CANCELED') || err.message?.includes('canceled')) {
        return;
      }
      console.error('Google login error:', err);
    },
  });

  return {
    // Mutations
    loginWithApple: appleLoginMutation.mutateAsync,
    loginWithGoogle: googleLoginMutation.mutateAsync,

    // Loading states
    isAppleLoggingIn: appleLoginMutation.isPending,
    isGoogleLoggingIn: googleLoginMutation.isPending,
    isSocialLoggingIn: appleLoginMutation.isPending || googleLoginMutation.isPending,

    // Availability
    isAppleAvailable: appleAvailable,
    isGoogleAvailable: true,

    // Errors
    appleError: appleLoginMutation.error,
    googleError: googleLoginMutation.error,
  };
}
