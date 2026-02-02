/**
 * Competition Details Data Hook
 *
 * Fetches comprehensive competition data including rounds and players.
 * Extracted from CompetitionDetailScreen for reusability.
 *
 * @example
 * ```tsx
 * function CompetitionPage({ competitionId }: { competitionId: string }) {
 *   const { data, isLoading, error, refetch } = useCompetitionDetailsData(competitionId);
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *
 *   const { competition, rounds, players } = data;
 *   return <CompetitionView competition={competition} rounds={rounds} players={players} />;
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Competition } from '@/types/database.types';
import type {
  RoundWithCourse,
  CompetitionPlayer,
  CompetitionData,
} from '@/components/competitions/detail';
import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

/**
 * Query key factory for competition details
 */
export const competitionDetailsKeys = {
  all: ['competition'] as const,
  detail: (id: string) => ['competition', id, 'details'] as const,
};

/**
 * Options for useCompetitionDetailsData hook
 */
export interface UseCompetitionDetailsDataOptions {
  /**
   * Whether the query is enabled (default: true when id is provided)
   */
  enabled?: boolean;

  /**
   * How long the data is considered fresh (default: 2 minutes)
   */
  staleTime?: number;

  /**
   * How long to cache data after component unmounts (default: 10 minutes)
   */
  gcTime?: number;
}

/**
 * Default stale time for competition details (2 minutes)
 */
const DEFAULT_STALE_TIME = 2 * 60 * 1000;

/**
 * Default garbage collection time (10 minutes)
 */
const DEFAULT_GC_TIME = 10 * 60 * 1000;

/**
 * Fetch competition details including rounds and players from Supabase
 *
 * @param competitionId - The competition UUID
 * @returns Competition data with rounds and players
 */
export async function fetchCompetitionDetails(competitionId: string): Promise<CompetitionData> {
  // Fetch competition
  const { data: competition, error: competitionError } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (competitionError) {
    throw new Error(`Failed to fetch competition: ${competitionError.message}`);
  }

  // Fetch rounds with course and club details
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select(`
      *,
      courses (
        *,
        clubs (
          name,
          city,
          state
        )
      )
    `)
    .eq('competition_id', competitionId)
    .order('round_number', { ascending: true });

  if (roundsError) {
    throw new Error(`Failed to fetch rounds: ${roundsError.message}`);
  }

  // Fetch players
  const { data: players, error: playersError } = await supabase
    .from('competition_players')
    .select(`
      player_id,
      status,
      players!player_id (
        id,
        name,
        email,
        handicap,
        photo_url
      )
    `)
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  // Define types for the joined data
  interface RoundRowWithCourses {
    id: string;
    courses: {
      id: string;
      name: string;
      club_id: string | null;
      clubs: { name: string; city: string | null; state: string | null } | null;
    } | null;
    [key: string]: unknown;
  }

  interface CompetitionPlayerRow {
    player_id: string;
    status: string;
    players: {
      id: string;
      name: string;
      email: string | null;
      handicap: number | null;
      photo_url: string | null;
    } | null;
  }

  // Transform rounds data - rename courses to course for RoundWithCourse interface
  const transformedRounds: RoundWithCourse[] = (rounds || []).map((round: RoundRowWithCourses) => {
    const { courses, ...rest } = round;
    return {
      ...rest,
      course: courses || null,
    } as RoundWithCourse;
  });

  // Transform players data
  const transformedPlayers: CompetitionPlayer[] = (players || []).map((cp: CompetitionPlayerRow) => ({
    player_id: cp.player_id,
    status: cp.status,
    player: cp.players || null,
  }));

  return {
    competition: competition as Competition,
    rounds: transformedRounds,
    players: transformedPlayers,
  };
}

/**
 * Get current player's position and points from leaderboard
 *
 * @param leaderboard - Array of leaderboard entries
 * @param currentPlayerId - Current user's player ID
 * @returns Player's position and points, or null if not found
 */
export function getCurrentPlayerStanding(
  leaderboard: CompetitionLeaderboardEntry[] | undefined,
  currentPlayerId: string | undefined
): { position: number; points: number } | null {
  if (!leaderboard || !currentPlayerId) return null;

  // Find the entry for the current player (check individual entries, not team entries)
  const playerEntry = leaderboard.find(
    (entry) => !entry.isTeam && entry.participantId === currentPlayerId
  );

  if (!playerEntry) return null;

  return {
    position: playerEntry.position,
    points: playerEntry.totalPoints,
  };
}

/**
 * Hook to fetch competition details including rounds and players
 *
 * @param competitionId - The competition UUID
 * @param options - Query options (enabled, staleTime, gcTime)
 * @returns React Query result with competition data
 *
 * @example
 * ```tsx
 * const {
 *   data: competitionData,
 *   isLoading,
 *   error,
 *   refetch,
 *   isRefetching,
 * } = useCompetitionDetailsData(competitionId);
 *
 * if (competitionData) {
 *   const { competition, rounds, players } = competitionData;
 *   // Use the data...
 * }
 * ```
 */
export function useCompetitionDetailsData(
  competitionId: string | undefined | null,
  options?: UseCompetitionDetailsDataOptions
) {
  const {
    staleTime = DEFAULT_STALE_TIME,
    gcTime = DEFAULT_GC_TIME,
    enabled,
  } = options ?? {};

  return useQuery({
    queryKey: competitionDetailsKeys.detail(competitionId ?? ''),
    queryFn: () => fetchCompetitionDetails(competitionId!),
    enabled: enabled ?? !!competitionId,
    staleTime,
    gcTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
