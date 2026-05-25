/**
 * Competition Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching competition data.
 *
 * Hooks:
 * - useCompetitions: Fetch all competitions for current user
 * - useFilteredCompetitions: Fetch competitions with filters
 * - useCompetitionDetailsData: Fetch comprehensive competition details
 * - useCompetitionInfo: Fetch minimal competition info for headers
 */

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { apiClient } from '@/services/api/client';
import { supabase } from '@/services/supabase/client';
import { competitionKeys, competitionDetailsKeys } from '@/hooks/queryKeys';
import type { Competition } from '@/types';
import type { Competition as CompetitionDB } from '@/types/database.types';
import type {
  RoundWithCourse,
  CompetitionPlayer,
  CompetitionData,
} from '@/components/competitions/detail';
import type { CompetitionLeaderboardEntry } from './leaderboard';

// =====================================================
// useCompetitions
// =====================================================

/**
 * Query hook to fetch all competitions for the current user
 *
 * Returns competitions where the user is either:
 * - The organizer (created the competition)
 * - A player (was invited and accepted)
 *
 * Usage:
 * ```tsx
 * function CompetitionsScreen() {
 *   const { data, isLoading, error, refetch } = useCompetitions();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 *   if (!data?.length) return <EmptyState message="No competitions yet" />;
 *
 *   return (
 *     <FlatList
 *       data={data}
 *       renderItem={({ item }) => <CompetitionCard competition={item} />}
 *       refreshing={isLoading}
 *       onRefresh={refetch}
 *     />
 *   );
 * }
 * ```
 */
export function useCompetitions() {
  return useQuery({
    queryKey: competitionKeys.lists(),
    queryFn: async (): Promise<Competition[]> => {
      // TODO: Replace with actual API call when backend is ready
      // The backend should filter competitions by:
      // 1. User is organizer (competitions.organizer_id = current_user_id)
      // 2. User is player (competition_players.player_id = current_user_id AND status = 'accepted')
      //
      // Example Supabase query:
      // const { data: organized } = await supabase
      //   .from('competitions')
      //   .select('*')
      //   .eq('organizer_id', userId);
      //
      // const { data: participating } = await supabase
      //   .from('competition_players')
      //   .select('competition:competitions(*)')
      //   .eq('player_id', userId)
      //   .eq('status', 'accepted');

      const competitions = await apiClient.getCompetitions();
      return competitions;
    },

    // Cache configuration
    staleTime: CACHE_TIMES.STANDARD, // Consider data fresh for 5 minutes
    gcTime: GC_TIMES.STANDARD, // Keep in cache for 10 minutes (formerly cacheTime)

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false, // Don't refetch when app comes to foreground
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Refetch when component mounts if data is stale
  });
}

// =====================================================
// useFilteredCompetitions
// =====================================================

/**
 * Hook variant with filters for organizing vs participating competitions
 *
 * Usage:
 * ```tsx
 * // Get only competitions user organized
 * const { data: myCompetitions } = useCompetitions({ role: 'organizer' });
 *
 * // Get only competitions user is playing in
 * const { data: participating } = useCompetitions({ role: 'player' });
 * ```
 */
export interface CompetitionsFilter {
  role?: 'organizer' | 'player' | 'all';
  status?: 'upcoming' | 'active' | 'completed';
}

export function useFilteredCompetitions(filters?: CompetitionsFilter) {
  return useQuery({
    queryKey: competitionKeys.list(filters),
    queryFn: async (): Promise<Competition[]> => {
      // TODO: Implement filtered API call when backend is ready
      // Pass filters to backend for server-side filtering
      //
      // Example:
      // const response = await apiClient.get<Competition[]>('/competitions', {
      //   params: filters
      // });
      // return response.data;

      const competitions = await apiClient.getCompetitions();

      // Client-side filtering (temporary until backend supports it)
      // Note: This is inefficient - move to server-side when backend is ready
      if (!filters) return competitions;

      return competitions.filter((comp) => {
        // Filter by status if provided
        if (filters.status) {
          const now = new Date();
          const startDate = new Date(comp.startDate);
          const endDate = comp.endDate ? new Date(comp.endDate) : startDate;

          switch (filters.status) {
            case 'upcoming':
              if (startDate <= now) return false;
              break;
            case 'active':
              if (startDate > now || endDate < now) return false;
              break;
            case 'completed':
              if (endDate >= now) return false;
              break;
          }
        }

        // Role filtering would require user context
        // TODO: Implement when auth context is available

        return true;
      });
    },

    // Same cache configuration as base hook
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

// =====================================================
// useCompetitionDetailsData
// =====================================================

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
const DEFAULT_DETAILS_STALE_TIME = CACHE_TIMES.MODERATE;

/**
 * Default garbage collection time (10 minutes)
 */
const DEFAULT_DETAILS_GC_TIME = GC_TIMES.STANDARD;

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
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
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
    competition: competition as CompetitionDB,
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
    staleTime = DEFAULT_DETAILS_STALE_TIME,
    gcTime = DEFAULT_DETAILS_GC_TIME,
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

// =====================================================
// useCompetitionInfo
// =====================================================

/**
 * Minimal competition info for display and permission checks
 */
export interface CompetitionInfo {
  /** Competition name */
  name: string;
  /** ID of the competition organizer */
  organizer_id: string;
  /** Whether per-round rules overrides are enabled at the competition level */
  per_round_rules_enabled: boolean;
}

/**
 * Options for useCompetitionInfo hook
 */
export interface UseCompetitionInfoOptions {
  /**
   * Whether the query is enabled (default: true when id is provided)
   */
  enabled?: boolean;

  /**
   * How long the data is considered fresh (default: 5 minutes)
   */
  staleTime?: number;
}

/**
 * Default stale time for competition info (5 minutes)
 */
const DEFAULT_INFO_STALE_TIME = 5 * 60 * 1000;

/**
 * Fetch minimal competition info for display in header and organizer check
 *
 * @param competitionId - The competition UUID
 * @param options - Query options
 * @returns React Query result with competition info
 *
 * @example
 * ```tsx
 * function ViewRoundScreen({ competitionId }: { competitionId: string }) {
 *   const { user } = useAuth();
 *   const { data: competitionInfo } = useCompetitionInfo(competitionId);
 *
 *   // Check if user is organizer
 *   const isOrganizer = competitionInfo?.organizer_id === user?.id;
 *
 *   return (
 *     <PageHeader
 *       title="Round 1"
 *       subtitle={competitionInfo?.name}
 *     />
 *   );
 * }
 * ```
 */
export function useCompetitionInfo(
  competitionId: string | undefined | null,
  options?: UseCompetitionInfoOptions
) {
  const { staleTime = DEFAULT_INFO_STALE_TIME, enabled } = options ?? {};

  return useQuery({
    queryKey: [...competitionKeys.detail(competitionId || ''), 'info'],
    queryFn: async (): Promise<CompetitionInfo | null> => {
      if (!competitionId) return null;

      const { data, error } = await supabase
        .from('competitions')
        .select('name, organizer_id, per_round_rules_enabled')
        .eq('id', competitionId)
        .single();

      if (error) throw error;
      if (!data) return null;
      // Default to FALSE so competitions that predate the flag column behave
      // as general-rules mode (safest default for the new UI).
      const raw = data as { name: string; organizer_id: string; per_round_rules_enabled: boolean | null };
      return {
        name: raw.name,
        organizer_id: raw.organizer_id,
        per_round_rules_enabled: raw.per_round_rules_enabled ?? false,
      };
    },
    enabled: enabled ?? !!competitionId,
    staleTime,
  });
}
