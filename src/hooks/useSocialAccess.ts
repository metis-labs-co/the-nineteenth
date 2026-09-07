import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { AgeStatus } from '@/services/age';

/**
 * Whether the current user may use social features.
 *
 * Returns three distinguishable states. `socialEnabled` and `isRestricted` are
 * BOTH false while the profile loads, so callers can tell "not yet known" from
 * "no".
 *
 * ⚠️ Consumers that hide routes or content must key off `isRestricted`, never
 * off `!socialEnabled`. The latter is true during every cold start, which would
 * unregister the Activity routes exactly when a tapped push notification is
 * trying to navigate to one, and would flash lock UI at eligible users.
 */
export function useSocialAccess(): {
  status: AgeStatus;
  socialEnabled: boolean;
  isRestricted: boolean;
  isLoading: boolean;
} {
  const { player, isLoading } = useAuth();

  return useMemo(() => {
    const status: AgeStatus = player?.age_status ?? 'unknown';
    return {
      status,
      // Positively eligible.
      socialEnabled: !isLoading && status === 'eligible',
      // Positively restricted. False while loading - "we don't know yet" is its own state.
      isRestricted: !isLoading && status !== 'eligible',
      isLoading,
    };
  }, [player?.age_status, isLoading]);
}
