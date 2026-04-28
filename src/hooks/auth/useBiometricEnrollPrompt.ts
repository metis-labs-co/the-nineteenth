/**
 * useBiometricEnrollPrompt - One-time post-login prompt to enable biometrics.
 *
 * Triggers the BiometricEnrollSheet the first time a user signs in on the
 * device. The "seen" flag is persisted per-user, so a different user logging
 * in on the same device will still get prompted.
 *
 * Skipped when:
 * - Auth is still initializing or no user is signed in
 * - Biometric is already enabled in settings
 * - Device has no biometric hardware / no enrolled biometrics
 * - This user has already been prompted (regardless of choice)
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometricService } from '@/services/biometric';
import type { BiometricType } from '@/services/biometric';
import { useBiometricSetting } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';

const PROMPT_SEEN_PREFIX = 'biometric_enroll_prompt_seen_v1:';

const promptSeenKey = (userId: string) => `${PROMPT_SEEN_PREFIX}${userId}`;

export interface UseBiometricEnrollPromptReturn {
  shouldShow: boolean;
  biometricType: BiometricType;
  enable: () => Promise<boolean>;
  dismiss: () => Promise<void>;
}

export function useBiometricEnrollPrompt(): UseBiometricEnrollPromptReturn {
  const { isAuthenticated, isInitializing, isLoading, session, user } = useAuth();
  const { biometricEnabled, setBiometricEnabled } = useBiometricSetting();

  const [shouldShow, setShouldShow] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [hasResolved, setHasResolved] = useState(false);

  const userId = user?.id ?? null;

  // Decide whether to show
  useEffect(() => {
    // Wait until auth has fully settled.
    if (isInitializing || isLoading || !isAuthenticated || !userId) return;
    if (hasResolved) return;
    if (biometricEnabled) {
      setHasResolved(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(promptSeenKey(userId));
        if (cancelled) return;
        if (seen === 'true') {
          setHasResolved(true);
          return;
        }
        const availability = await biometricService.checkAvailability();
        if (cancelled) return;
        if (!availability.isAvailable) {
          setHasResolved(true);
          return;
        }
        setBiometricType(availability.biometricType);
        setShouldShow(true);
        setHasResolved(true);
      } catch {
        if (!cancelled) setHasResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isInitializing,
    isLoading,
    biometricEnabled,
    hasResolved,
    userId,
  ]);

  // Reset when the signed-in user changes (sign out / different account).
  useEffect(() => {
    setHasResolved(false);
    setShouldShow(false);
    setBiometricType('none');
  }, [userId]);

  const markSeen = useCallback(async () => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(promptSeenKey(userId), 'true');
    } catch {
      // Worst case the prompt reappears next launch — acceptable.
    }
  }, [userId]);

  const enable = useCallback(async (): Promise<boolean> => {
    const isFaceId = biometricType === 'facial';
    const label = isFaceId ? 'Face ID' : 'Fingerprint';
    const result = await biometricService.authenticate(`Enable ${label}`);
    if (!result.success) return false;

    if (session?.refresh_token) {
      await biometricService.storeRefreshToken(session.refresh_token);
    }
    setBiometricEnabled(true);
    await markSeen();
    return true;
  }, [biometricType, session?.refresh_token, setBiometricEnabled, markSeen]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    await markSeen();
  }, [markSeen]);

  return { shouldShow, biometricType, enable, dismiss };
}
