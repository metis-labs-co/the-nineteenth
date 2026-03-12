/**
 * Social Auth Service - Platform-specific logic for obtaining ID tokens
 *
 * Handles Apple Sign In and Google Sign In native flows.
 * Returns ID tokens that are then passed to Supabase for authentication.
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

// =====================================================
// TYPES
// =====================================================

export interface AppleAuthResult {
  idToken: string;
  nonce: string;
  fullName?: {
    firstName: string | null;
    lastName: string | null;
  };
}

export interface GoogleAuthResult {
  idToken: string;
}

// =====================================================
// APPLE SIGN IN
// =====================================================

/**
 * Perform native Apple Sign In
 *
 * Uses expo-apple-authentication with a SHA256 nonce for security.
 * Apple only provides the user's name on the FIRST sign-in - subsequent
 * sign-ins will have null fullName fields.
 */
export async function signInWithAppleNative(): Promise<AppleAuthResult> {
  // Generate a random nonce for security
  const rawNonce = Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  // Hash the nonce with SHA256 (Apple requires this)
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In failed: No identity token returned');
  }

  return {
    idToken: credential.identityToken,
    nonce: rawNonce, // Pass the raw nonce (not hashed) to Supabase
    fullName: credential.fullName ? {
      firstName: credential.fullName.givenName,
      lastName: credential.fullName.familyName,
    } : undefined,
  };
}

/**
 * Check if Apple Sign In is available on the current device
 * Only available on iOS 13+
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

// =====================================================
// GOOGLE SIGN IN
// =====================================================

/**
 * Google Auth discovery document for expo-auth-session
 */
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

/**
 * Get the appropriate Google client ID for the current platform
 */
export function getGoogleClientId(): string | undefined {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  if (Platform.OS === 'ios') return iosClientId || webClientId;
  if (Platform.OS === 'android') return androidClientId || webClientId;
  return webClientId;
}
