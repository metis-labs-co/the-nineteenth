/**
 * Hook for fetching competition data
 *
 * Also fetches related data for prize pool configuration:
 * - Prize pool (if exists)
 * - Player count
 * - Round count
 * - Lock status (whether any round has started)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Competition } from '@/types/database.types';
import type { CompetitionPrizePool } from '@/types';

/**
 * Competition with related counts for prize pool configuration
 */
interface CompetitionWithCounts extends Competition {
  _meta: {
    playerCount: number;
    roundCount: number;
    hasStartedRound: boolean;
  };
}

/**
 * Fetch competition by ID with related counts
 */
async function fetchCompetition(competitionId: string): Promise<CompetitionWithCounts> {
  // Fetch competition
  const { data: competition, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch competition: ${error.message}`);
  }

  // Fetch player count (accepted players only)
  const { count: playerCount, error: playerError } = await supabase
    .from('competition_players')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  if (playerError) {
    console.warn('Failed to fetch player count:', playerError);
  }

  // Fetch round count and check for started rounds
  const { data: rounds, error: roundError } = await supabase
    .from('rounds')
    .select('id, status')
    .eq('competition_id', competitionId)
    .is('deleted_at', null);

  if (roundError) {
    console.warn('Failed to fetch rounds:', roundError);
  }

  const roundsList = rounds as { id: string; status: string }[] | null;
  const roundCount = roundsList?.length ?? 0;
  const hasStartedRound = roundsList?.some((r) => r.status !== 'upcoming') ?? false;

  return {
    ...(competition as Competition),
    _meta: {
      playerCount: playerCount ?? 0,
      roundCount,
      hasStartedRound,
    },
  };
}

/**
 * Fetch prize pool for a competition
 */
async function fetchPrizePool(competitionId: string): Promise<CompetitionPrizePool | null> {
  const { data: pool, error } = await supabase
    .from('competition_prize_pools' as never)
    .select('*')
    .eq('competition_id', competitionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.warn('Failed to fetch prize pool:', error);
    return null;
  }

  return pool as unknown as CompetitionPrizePool;
}

interface UseCompetitionDataOptions {
  competitionId: string;
}

interface UseCompetitionDataReturn {
  competition: CompetitionWithCounts | undefined;
  prizePool: CompetitionPrizePool | null | undefined;
  playerCount: number;
  roundCount: number;
  hasStartedRound: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches competition data for editing, including prize pool and counts
 */
export function useCompetitionData({
  competitionId,
}: UseCompetitionDataOptions): UseCompetitionDataReturn {
  // Fetch competition with counts
  const {
    data: competition,
    isLoading: compLoading,
    error: compError,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: !!competitionId,
  });

  // Fetch prize pool separately (may not exist)
  const {
    data: prizePool,
    isLoading: poolLoading,
  } = useQuery({
    queryKey: ['prizePool', 'pool', competitionId],
    queryFn: () => fetchPrizePool(competitionId),
    enabled: !!competitionId,
  });

  return {
    competition,
    prizePool,
    playerCount: competition?._meta.playerCount ?? 0,
    roundCount: competition?._meta.roundCount ?? 0,
    hasStartedRound: competition?._meta.hasStartedRound ?? false,
    isLoading: compLoading || poolLoading,
    error: compError as Error | null,
  };
}
