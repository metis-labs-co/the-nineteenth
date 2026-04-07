/**
 * useBiometricLock Hook
 *
 * Core orchestration hook for biometric lock screen behavior.
 * Used only in RootNavigator to gate app access.
 *
 * Behavior:
 * - Cold start: locks immediately if biometric is enabled and available
 * - Warm resume: locks after 5 minutes of inactivity (background/inactive)
 * - Auto-triggers biometric prompt when locked
 * - Fails open if biometrics become unavailable (user removed from device)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { biometricService } from '@/services/biometric';
import type { BiometricType } from '@/services/biometric';

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface UseBiometricLockReturn {
  isLocked: boolean;
  isAuthenticating: boolean;
  unlock: () => Promise<void>;
  error: string | null;
  biometricType: BiometricType;
}

export function useBiometricLock(isAuthenticated: boolean): UseBiometricLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');

  const biometricEnabled = useSettingsStore((state) => state.biometricEnabled);
  const backgroundTimestampRef = useRef<number | null>(null);
  const hasCheckedInitialLock = useRef(false);

  // Cold start lock check — runs once on mount
  useEffect(() => {
    if (hasCheckedInitialLock.current) return;
    if (!biometricEnabled || !isAuthenticated) return;

    hasCheckedInitialLock.current = true;

    biometricService.checkAvailability().then((availability) => {
      setBiometricType(availability.biometricType);
      if (availability.isAvailable) {
        setIsLocked(true);
      }
    });
  }, [biometricEnabled, isAuthenticated]);

  // AppState listener for warm resume lock
  useEffect(() => {
    if (!biometricEnabled || !isAuthenticated) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundTimestampRef.current) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          if (elapsed > LOCK_TIMEOUT_MS) {
            setIsLocked(true);
            setError(null);
          }
          backgroundTimestampRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [biometricEnabled, isAuthenticated]);

  // Unlock function
  const unlock = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await biometricService.authenticate('Unlock The Nineteenth');

      if (result.success) {
        setIsLocked(false);
      } else if (result.cancelled) {
        // User tapped cancel — stay locked, no error shown
        setError(null);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  // Auto-trigger biometric prompt when locked
  useEffect(() => {
    if (!isLocked) return;

    // Verify biometrics are still available before prompting (fail open)
    biometricService.checkAvailability().then((availability) => {
      setBiometricType(availability.biometricType);
      if (availability.isAvailable) {
        unlock();
      } else {
        // Biometrics no longer available — fail open, don't lock user out
        setIsLocked(false);
      }
    });
  }, [isLocked, unlock]);

  return { isLocked, isAuthenticating, unlock, error, biometricType };
}
