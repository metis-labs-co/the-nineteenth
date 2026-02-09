/**
 * Biometric Authentication Service
 *
 * Handles Face ID / fingerprint authentication and SecureStore token management.
 *
 * Features:
 * - Check biometric hardware availability and enrollment
 * - Authenticate with Face ID or fingerprint
 * - Store/retrieve refresh tokens in SecureStore
 *
 * @see docs/plans/biometric-authentication.md
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// =====================================================
// TYPES
// =====================================================

export type BiometricType = 'facial' | 'fingerprint' | 'none';

export interface BiometricAvailability {
  isAvailable: boolean;
  biometricType: BiometricType;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const SECURE_STORE_KEY = 'biometric_refresh_token';

// =====================================================
// AVAILABILITY
// =====================================================

/**
 * Check if biometric authentication is available on this device
 *
 * Checks both hardware presence and biometric enrollment.
 * Maps Expo's AuthenticationType to our simplified BiometricType.
 *
 * @returns Availability status and biometric type
 */
async function checkAvailability(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return { isAvailable: false, biometricType: 'none' };
    }

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricType = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    }

    return { isAvailable: true, biometricType };
  } catch (error) {
    console.warn('[BiometricService] Error checking availability:', error);
    return { isAvailable: false, biometricType: 'none' };
  }
}

// =====================================================
// AUTHENTICATION
// =====================================================

/**
 * Prompt the user for biometric authentication
 *
 * Shows Face ID or fingerprint prompt. Falls back to device passcode
 * if biometric fails (disableDeviceFallback: false).
 *
 * @param promptMessage - Custom message for the biometric prompt
 * @returns Authentication result with success/error/cancelled status
 */
async function authenticate(promptMessage?: string): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Unlock The Nineteenth',
      cancelLabel: 'Use Password',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error,
      cancelled: result.error === 'user_cancel',
    };
  } catch (error) {
    console.warn('[BiometricService] Authentication error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return { success: false, error: message };
  }
}

// =====================================================
// SECURE STORE TOKEN MANAGEMENT
// =====================================================

/**
 * Store a refresh token in SecureStore for session recovery
 *
 * @param refreshToken - The Supabase refresh token to store
 * @returns true on success, false on failure
 */
async function storeRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, refreshToken);
    return true;
  } catch (error) {
    console.warn('[BiometricService] Failed to store refresh token:', error);
    return false;
  }
}

/**
 * Retrieve the stored refresh token from SecureStore
 *
 * @returns The stored refresh token, or null if not found or on error
 */
async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_STORE_KEY);
  } catch (error) {
    console.warn('[BiometricService] Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Clear the stored refresh token from SecureStore
 *
 * Silently catches errors — used during sign-out cleanup.
 */
async function clearStoredRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
  } catch (error) {
    console.warn('[BiometricService] Failed to clear refresh token:', error);
  }
}

// =====================================================
// BIOMETRIC SERVICE SINGLETON
// =====================================================

/**
 * Biometric authentication service singleton
 *
 * Provides all biometric authentication functionality for the app.
 *
 * Usage:
 * ```typescript
 * import { biometricService } from '@/services/biometric';
 *
 * // Check if device supports biometrics
 * const availability = await biometricService.checkAvailability();
 *
 * // Authenticate user
 * const result = await biometricService.authenticate('Unlock The Nineteenth');
 *
 * // Store refresh token for session recovery
 * await biometricService.storeRefreshToken(refreshToken);
 * ```
 */
export const biometricService = {
  checkAvailability,
  authenticate,
  storeRefreshToken,
  getStoredRefreshToken,
  clearStoredRefreshToken,
};

export default biometricService;
