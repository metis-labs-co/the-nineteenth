/**
 * useSocialAuth - Social Authentication Hook
 *
 * Handles Apple and Google social login mutations.
 * Follows the same pattern as useAuthMutations.ts.
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '@/services/supabase/client';
import { authKeys } from '../queryKeys';
import { ensurePlayerProfile } from './utils';
import {
  signInWithAppleNative,
  isAppleSignInAvailable,
  GOOGLE_DISCOVERY,
  getGoogleClientId,
} from '@/services/auth/socialAuth';
import type { Player } from '@/types/database.types';
import type { SocialLoginResponse } from '@/types/auth';

// Required for Google auth session on web
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

  // Set up Google auth request
  const googleClientId = getGoogleClientId();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'thenineteenth' });

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId || '',
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    GOOGLE_DISCOVERY
  );

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
   */
  const googleLoginMutation = useMutation({
    mutationFn: async (): Promise<SocialLoginResponse> => {
      // Prompt Google sign-in
      const result = await googlePromptAsync();

      if (result.type === 'dismiss' || result.type === 'cancel') {
        throw new Error('ERR_CANCELED');
      }

      if (result.type !== 'success' || !result.params?.id_token) {
        throw new Error('Google Sign In failed: No ID token returned');
      }

      const idToken = result.params.id_token;

      // Sign in with Supabase using the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
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
    isGoogleAvailable: !!googleRequest,

    // Errors
    appleError: appleLoginMutation.error,
    googleError: googleLoginMutation.error,
  };
}
