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
    if (__DEV__) {
      console.log('[RevenueCat] Skipping login - RevenueCat not configured');
    }
    return;
  }

  try {
    await Purchases.logIn(userId);
    console.log(`[RevenueCat] Logged in user: ${userId}`);
  } catch (err) {
    // Don't log as error if it's just not configured yet
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('no singleton instance') || message.includes('configure')) {
      if (__DEV__) {
        console.log('[RevenueCat] SDK not configured yet, skipping login');
      }
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
    if (__DEV__) {
      console.log('[RevenueCat] Skipping logout - RevenueCat not configured');
    }
    return;
  }

  try {
    await Purchases.logOut();
    console.log('[RevenueCat] Logged out');
  } catch (err) {
    // Don't log as error if it's just not configured yet
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('no singleton instance') || message.includes('configure')) {
      if (__DEV__) {
        console.log('[RevenueCat] SDK not configured yet, skipping logout');
      }
    } else {
      console.error('[RevenueCat] Logout error:', err);
    }
  }
}
