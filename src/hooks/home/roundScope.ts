/**
 * Shared query helpers for the Home round hooks (useInProgressRounds,
 * useUpcomingRounds). Both hooks scope "the user's rounds" the same way:
 *   - standalone rounds the user owns, plus
 *   - competition rounds in competitions the user has accepted.
 * These helpers centralise that scoping so the two hooks can't drift.
 */

import { supabase } from '@/services/supabase/client';

/**
 * Competition IDs the user is an accepted player in. Errors are logged (tagged
 * with the calling hook) and treated as "no accepted competitions" so the
 * caller still returns the user's standalone rounds.
 */
export async function fetchAcceptedCompetitionIds(
  userId: string,
  logTag: string
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
  const { data, error } = await (supabase.from('competition_players') as any)
    .select('competition_id')
    .eq('player_id', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error(`[${logTag}] Error fetching competition players:`, error);
  }

  return ((data ?? []) as { competition_id: string }[])
    .map((cp) => cp.competition_id)
    .filter(Boolean);
}

/**
 * Restrict a `rounds` query to the signed-in user's scope: standalone rounds
 * they own OR competition rounds in accepted competitions. With no accepted
 * competitions the OR branch is skipped and only owned standalone rounds match.
 *
 * The query is the loosely-typed Supabase builder (the hooks already cast
 * `supabase.from('rounds')` to `any`), so this mirrors that and returns it for
 * chaining.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder is untyped here
export function applyUserRoundScope<T>(
  query: T,
  userId: string,
  competitionIds: string[]
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder is untyped here
  const q = query as any;
  if (competitionIds.length > 0) {
    return q.or(
      `user_id.eq.${userId},competition_id.in.(${competitionIds.join(',')})`
    );
  }
  return q.eq('user_id', userId).is('competition_id', null);
}
