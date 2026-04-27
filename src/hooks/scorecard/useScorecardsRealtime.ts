/**
 * useScorecardsRealtime
 *
 * Subscribes to Supabase Realtime postgres_changes on the `scorecards`
 * table for a given round. On any INSERT/UPDATE/DELETE for that round,
 * invalidates every query that derives from scorecards so consumers
 * re-fetch and leaderboards update without waiting for the 30s poll.
 *
 * Invalidated queries:
 *   - `scorecardKeys.list({ roundId })`        — useRoundScorecards
 *   - `leaderboardKeys.round(roundId)`         — useRoundLeaderboard (drives
 *                                                  the per-round panels in
 *                                                  the Competition Detail
 *                                                  Leaderboard tab)
 *   - `leaderboardKeys.competition(competitionId)` (when provided)
 *                                              — useCompetitionLeaderboard
 *
 * Mirrors the pattern in `src/hooks/notifications/queries.ts`.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { scorecardKeys, leaderboardKeys } from '@/hooks/queryKeys';

export function useScorecardsRealtime(
  roundId: string | undefined,
  competitionId?: string | undefined,
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roundId) return;

    const channelName = `scorecards:round:${roundId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime generics don't infer well from string literals.
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'scorecards',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: scorecardKeys.list({ roundId }),
          });
          queryClient.invalidateQueries({
            queryKey: leaderboardKeys.round(roundId),
          });
          if (competitionId) {
            queryClient.invalidateQueries({
              queryKey: leaderboardKeys.competition(competitionId),
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, competitionId, queryClient]);
}

/**
 * Render-only helper that lets you subscribe to scorecard realtime for one
 * round inside a `.map()` over rounds (where calling the hook directly would
 * violate rules-of-hooks). Renders nothing.
 */
export function ScorecardsRealtimeSubscription({
  roundId,
  competitionId,
}: {
  roundId: string;
  competitionId?: string;
}): null {
  useScorecardsRealtime(roundId, competitionId);
  return null;
}
