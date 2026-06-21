/**
 * useCompetitionStatistics
 *
 * Aggregates per-player "best of" stats across all scorecards in a
 * competition. Fetches once; Gross/Net toggle recomputes the Scoring group
 * locally via useMemo (no refetch).
 *
 * See ./helpers.ts for the aggregation logic and ./types.ts for the shape
 * of the returned data.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { supabase } from '@/services/supabase/client';
import { statisticsKeys } from '@/hooks/queryKeys';
import { parseAndTransformHoles } from '@/utils/holeTransformers';
import type { HoleScore } from '@/types/database.types';
import { accumulateScorecard, buildAllGroups, type PlayerAccumulator } from './helpers';
import type { CompetitionStats, ScoringMode } from './types';

/**
 * Hook return shape. Mode is held in the hook itself so the Stats tab only
 * needs to call one hook.
 */
export interface UseCompetitionStatisticsResult {
  data: CompetitionStats | null;
  mode: ScoringMode;
  setMode: (mode: ScoringMode) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Raw shape we expect from the Supabase query. Defined inline because the
 * nested join types can't be inferred without the generated DB types.
 */
interface RawScorecard {
  id: string;
  player_id: string;
  scores: Record<string, HoleScore>;
  total_gross: number | null;
  total_net: number | null;
  rounds: {
    id: string;
    competition_id: string;
    game_type: string;
    courses: {
      id: string;
      holes: unknown;
    } | null;
  } | null;
  players: {
    id: string;
    name: string;
    handicap: number | null;
  } | null;
}

interface RawCompetition {
  handicap_system: string | null;
}

interface AggregationInput {
  rawScorecards: RawScorecard[];
  totalRoundCount: number;
  scrambleRoundIds: Set<string>;
  hasHandicapRound: boolean;
}

async function fetchCompetitionStatisticsData(
  competitionId: string
): Promise<AggregationInput> {
  // Fetch competition to check handicap_system (controls Gross/Net toggle).
  const { data: comp, error: compError } = await supabase
    .from('competitions')
    .select('handicap_system')
    .eq('id', competitionId)
    .maybeSingle();

  if (compError) throw compError;
  const competition = comp as RawCompetition | null;

  // Fetch all rounds for the competition so we can identify scramble rounds
  // even if no scorecards exist yet (needed for the "allRoundsAreScramble"
  // guard and the scramble-excluded footnote).
  const { data: roundsData, error: roundsError } = await supabase
    .from('rounds')
    .select('id, game_type')
    .eq('competition_id', competitionId)
    .is('deleted_at', null);

  if (roundsError) throw roundsError;

  const rounds = (roundsData ?? []) as { id: string; game_type: string }[];
  const totalRoundCount = rounds.length;
  const scrambleRoundIds = new Set<string>(
    rounds.filter((r) => r.game_type === 'scramble' || r.game_type === 'alt-shot').map((r) => r.id)
  );

  // Fetch completed/confirmed scorecards for the competition with joined
  // round (+ course) and player data. Using the same inner-join pattern as
  // usePlayerStatistics so Supabase enforces the filter across rounds.
  const { data: scorecardsData, error: scorecardsError } = await supabase
    .from('scorecards')
    .select(
      `
      id,
      player_id,
      scores,
      total_gross,
      total_net,
      rounds!inner (
        id,
        competition_id,
        game_type,
        courses!inner (
          id,
          holes
        )
      ),
      players!scorecards_player_id_fkey!inner (
        id,
        name,
        handicap
      )
    `
    )
    .eq('rounds.competition_id', competitionId)
    .is('rounds.deleted_at', null)
    .in('status', ['completed', 'confirmed']);

  if (scorecardsError) throw scorecardsError;

  // Supabase can't infer these join types without generated db types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawScorecards = (scorecardsData ?? []) as any as RawScorecard[];

  const hasHandicapRound = (competition?.handicap_system ?? 'honor') !== 'gross-only';

  return {
    rawScorecards,
    totalRoundCount,
    scrambleRoundIds,
    hasHandicapRound,
  };
}

/**
 * Turn the raw fetched payload into PlayerAccumulators (one per player).
 * Filters out scramble rounds because they don't contain meaningful
 * individual hole scores.
 */
function buildAccumulators(input: AggregationInput): {
  players: PlayerAccumulator[];
  excludedScrambleRoundCount: number;
} {
  const { rawScorecards, scrambleRoundIds } = input;

  const byPlayer = new Map<string, PlayerAccumulator>();
  const excludedRoundIds = new Set<string>();

  for (const sc of rawScorecards) {
    if (!sc.rounds || !sc.rounds.courses || !sc.players) continue;
    if (scrambleRoundIds.has(sc.rounds.id)) {
      excludedRoundIds.add(sc.rounds.id);
      continue;
    }

    const holes = parseAndTransformHoles(sc.rounds.courses.holes as unknown[]);
    if (holes.length === 0) continue;

    const playerId = sc.players.id;
    const playerName = sc.players.name ?? 'Unknown';
    const handicap = sc.players.handicap ?? 0;

    let acc = byPlayer.get(playerId);
    if (!acc) {
      acc = {
        playerId,
        playerName,
        handicap,
        grossBirdiesOrBetter: 0,
        grossEaglesOrBetter: 0,
        grossPars: 0,
        grossBogeysOrWorse: 0,
        netBirdiesOrBetter: 0,
        netEaglesOrBetter: 0,
        netPars: 0,
        netBogeysOrWorse: 0,
        bestRoundGross: null,
        bestRoundNet: null,
        totalPutts: 0,
        holesWithPuttsRecorded: 0,
        roundsWithPutts: new Set<string>(),
        onePutts: 0,
        threePuttsOrWorse: 0,
        fairwaysHit: 0,
        fairwayOpportunities: 0,
        girHit: 0,
        girOpportunities: 0,
        bunkerShots: 0,
        hasBunkerData: false,
        hazardCount: 0,
        hasHazardData: false,
      };
      byPlayer.set(playerId, acc);
    }

    accumulateScorecard(acc, {
      id: sc.id,
      player_id: sc.player_id,
      playerName,
      playerHandicap: handicap,
      holes,
      scores: sc.scores ?? {},
    });
  }

  return {
    players: Array.from(byPlayer.values()),
    excludedScrambleRoundCount: excludedRoundIds.size,
  };
}

export function useCompetitionStatistics(
  competitionId: string | undefined
): UseCompetitionStatisticsResult {
  const [mode, setMode] = useState<ScoringMode>('gross');

  const query = useQuery({
    queryKey: statisticsKeys.competition(competitionId ?? ''),
    queryFn: () => fetchCompetitionStatisticsData(competitionId as string),
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });

  const stats = useMemo<CompetitionStats | null>(() => {
    if (!query.data) return null;

    const { players, excludedScrambleRoundCount } = buildAccumulators(query.data);
    const groups = buildAllGroups(players, mode);

    const allRoundsAreScramble =
      query.data.totalRoundCount > 0 &&
      query.data.scrambleRoundIds.size === query.data.totalRoundCount;

    return {
      groups,
      hasHandicapRound: query.data.hasHandicapRound,
      hasAnyData: groups.length > 0,
      excludedScrambleRoundCount,
      allRoundsAreScramble,
      participantCount: players.length,
    };
  }, [query.data, mode]);

  return {
    data: stats,
    mode,
    setMode,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}
