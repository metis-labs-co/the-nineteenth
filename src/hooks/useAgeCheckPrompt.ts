import { useCallback, useEffect, useRef } from 'react';

import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useSetAgeStatus } from '@/hooks/useSetAgeStatus';
import { useAgeGateStore } from '@/store/ageGateStore';
import { useAuth } from '@/hooks/useAuth';
import { classifyDateOfBirth, resolveAgeStatus } from '@/services/age';

/** Dismissals allowed before the Settings row becomes the only route back. */
const MAX_DISMISSALS = 3;
/** How long a dismissal suppresses the sheet. */
const REPROMPT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** How stale an under13 classification may get before it is re-checked. */
const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Drives the one-time age confirmation sheet for existing users, and re-checks
 * users who have since turned 13.
 *
 * Every path out of 'unknown' or 'under13' has to stay open or users get
 * silently stranded with social features off. Three things keep it open: the
 * sheet returns a week after each dismissal (up to three times), the Settings
 * row is always available while status is not eligible, and an under13
 * classification is re-resolved once it is a month old.
 */
export function useAgeCheckPrompt() {
  const { status, isLoading } = useSocialAccess();
  const { player } = useAuth();
  const { setStatus } = useSetAgeStatus();
  const { dismissCount, lastDismissedAt, recordDismissal } = useAgeGateStore();
  const hasRecheckedRef = useRef(false);

  const dueForReprompt =
    lastDismissedAt === null ||
    Date.now() - new Date(lastDismissedAt).getTime() > REPROMPT_AFTER_MS;

  const shouldShow =
    !isLoading &&
    status === 'unknown' &&
    dismissCount < MAX_DISMISSALS &&
    dueForReprompt;

  // A child turns 13. Without this, an under13 classification is permanent.
  useEffect(() => {
    if (hasRecheckedRef.current || isLoading) return;
    if (status !== 'under13') return;

    const resolvedAt = player?.age_resolved_at
      ? new Date(player.age_resolved_at).getTime()
      : 0;
    if (Date.now() - resolvedAt < RECHECK_AFTER_MS) return;

    hasRecheckedRef.current = true;
    (async () => {
      const fresh = await resolveAgeStatus();
      if (fresh === 'eligible') {
        try {
          await setStatus('eligible', 'declared_age_range');
        } catch {
          // Leave the stale band in place; the Settings row remains available.
        }
      }
    })();
  }, [status, isLoading, player?.age_resolved_at, setStatus]);

  const confirm = useCallback(
    async (dob: Date) => {
      const band = classifyDateOfBirth(dob);
      if (band === 'unknown') return;
      await setStatus(band, 'self_declared');
    },
    [setStatus]
  );

  return { shouldShow, dismiss: recordDismissal, confirm };
}
