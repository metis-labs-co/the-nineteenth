/**
 * useLeagueStats - React Query hook for league statistics
 *
 * Fetches aggregate stats via get_league_stats RPC.
 * Processes score_data client-side for score distribution.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { leagueKeys } from './queryKeys';
import { getLeagueStats } from '@/services/api/leagueStats';
import { useAuth } from '@/hooks/useAuth';
import { countScoreDistribution } from '@/hooks/playerStatistics/helpers';
import type { LeagueStatsResponse, Hole } from '@/types/database';
import type { ScoreDistribution } from '@/hooks/playerStatistics/types';

export interface LeagueStats extends LeagueStatsResponse {
  scoreDistribution: ScoreDistribution | null;
}

export function useLeagueStats(leagueId: string, enabled = true) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: leagueKeys.stats(leagueId),
    queryFn: () => getLeagueStats(leagueId, user!.id),
    enabled: !!leagueId && !!user?.id && enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Process score distribution client-side
  const stats: LeagueStats | undefined = useMemo(() => {
    if (!query.data) return undefined;

    const raw = query.data;
    let scoreDistribution: ScoreDistribution | null = null;

    if (raw.score_data && raw.score_data.length > 0) {
      // Aggregate score distribution across all league rounds
      const totals: ScoreDistribution = {
        eagles: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 0,
        triplePlus: 0,
      };

      for (const entry of raw.score_data) {
        if (!entry.scores || !entry.holes) continue;

        // scores is an array of hole score objects from the scorecard
        // Convert to Record<string, HoleScore> keyed by hole number
        const scoresMap: Record<string, { strokes: number }> = {};
        if (Array.isArray(entry.scores)) {
          for (const s of entry.scores) {
            if (s && s.strokes != null && s.strokes > 0) {
              const holeNum = s.hole_number ?? s.holeNumber;
              if (holeNum) {
                scoresMap[String(holeNum)] = { strokes: s.strokes };
              }
            }
          }
        }

        const holes = entry.holes.map((h) => ({
          number: h.number as Hole['number'],
          par: h.par as Hole['par'],
          strokeIndex: 0,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dist = countScoreDistribution(scoresMap as Record<string, any>, holes);

        totals.eagles += dist.eagles;
        totals.birdies += dist.birdies;
        totals.pars += dist.pars;
        totals.bogeys += dist.bogeys;
        totals.doubleBogeys += dist.doubleBogeys;
        totals.triplePlus += dist.triplePlus;
      }

      const totalHoles = Object.values(totals).reduce((a, b) => a + b, 0);
      if (totalHoles > 0) {
        scoreDistribution = totals;
      }
    }

    return {
      ...raw,
      scoreDistribution,
    };
  }, [query.data]);

  return {
    ...query,
    data: stats,
  };
}
