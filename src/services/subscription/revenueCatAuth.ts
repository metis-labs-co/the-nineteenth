/**
 * RevenueCat User ID Management
 *
 * Helper functions to sync user authentication state with RevenueCat.
 * Call these when users sign in/out of your app.
 */

import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

/**
 * Check if RevenueCat is configured and available
 * Returns false if API key is missing or SDK not initialized
 */
export function isRevenueCatAvailable(): boolean {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
        : null;

  return !!apiKey;
}

/**
 * Log in a user to RevenueCat
 * Call this when the user signs in to your app
 *
 * Safe to call even if RevenueCat is not configured - will be a no-op.
 *
 * @param userId - The Supabase user ID
 */
export async function loginToRevenueCat(userId: string): Promise<void> {
  // Skip if RevenueCat is not available (no API key or unsupported platform)
  if (!isRevenueCatAvailable()) {
    return;
  }

  try {
    await Purchases.logIn(userId);
  } catch (err) {
    // Previously this swallowed "no singleton instance" / "configure" errors
    // silently, masking a startup race where AuthContext fires SIGNED_IN
    // before SubscriptionProvider runs Purchases.configure(). The user would
    // remain $RCAnonymousID and any subsequent purchase would be unrecoverable.
    // RevenueCatProvider.purchaseProduct now re-runs logIn defensively right
    // before purchase, so the race is no longer fatal — but we still want
    // visibility into when it happens.
    const message = err instanceof Error ? err.message : String(err);
    const isNotConfigured =
      message.includes('no singleton instance') || message.includes('configure');
    if (isNotConfigured) {
      console.warn(
        '[RevenueCat] logIn called before SDK was configured — user will ' +
          'be linked at purchase time instead. userId:',
        userId
      );
    } else {
      console.error('[RevenueCat] Login error:', err);
    }
  }
}

/**
 * Log out the current user from RevenueCat
 * Call this when the user signs out of your app
 *
 * Safe to call even if RevenueCat is not configured - will be a no-op.
 */
export async function logoutFromRevenueCat(): Promise<void> {
  // Skip if RevenueCat is not available (no API key or unsupported platform)
  if (!isRevenueCatAvailable()) {
    return;
  }

  try {
    await Purchases.logOut();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('no singleton instance') && !message.includes('configure')) {
      console.error('[RevenueCat] Logout error:', err);
    }
  }
}
