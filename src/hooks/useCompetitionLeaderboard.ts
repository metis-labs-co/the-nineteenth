/**
 * useCompetitionLeaderboard - Hook for fetching competition leaderboard with teams support
 *
 * Features:
 * - Fetches leaderboard entries from round_results table
 * - Supports both individual players and teams
 * - Aggregates competition points across multiple rounds
 * - Auto-refreshes every 30 seconds (configurable)
 * - Handles position assignment with tie handling
 * - Filter by participant type (individuals vs teams)
 * - Provides team member details for team entries
 */

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { leaderboardKeys } from './queryKeys';
import { getCompetitionResults } from '@/services/rounds/roundResultsService';
import {
  aggregateCompetitionStandings,
  type RoundResultsForAggregation,
  type StandingsEntry,
} from '@/utils/competitionPoints';
import type { Player, TeamWithMembers, TeamMember } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/** Filter options for leaderboard display */
export type LeaderboardFilter = 'all' | 'individuals' | 'teams';

/**
 * Legacy leaderboard entry format (individual players only)
 * Used by LeaderboardTable component for backward compatibility
 */
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  handicap: number;
  totalPoints: number;
  roundsPlayed: number;
}

/** Team member info for display */
export interface TeamMemberInfo {
  playerId: string;
  playerName: string;
  handicap: number;
}

/** Competition leaderboard entry returned by the hook */
export interface CompetitionLeaderboardEntry {
  /** Unique identifier (player_id or team_id) */
  participantId: string;
  /** Display name (player name or team name) */
  participantName: string;
  /** Whether this entry is for a team */
  isTeam: boolean;
  /** Total competition points across all rounds */
  totalPoints: number;
  /** Number of rounds played */
  roundsPlayed: number;
  /** Current position in standings (1-indexed) */
  position: number;
  /** Whether tied with another entry at this position */
  tied: boolean;
  /** Player handicap (for individuals only, null for teams) */
  handicap: number | null;
  /** Team members (for teams only, empty array for individuals) */
  teamMembers: TeamMemberInfo[];
  /** Points breakdown by round */
  roundPoints: {
    roundId: string;
    points: number;
    position: number;
  }[];
}

/** Options for the useCompetitionLeaderboard hook */
export interface UseCompetitionLeaderboardOptions {
  /** Filter by participant type (default: 'all') */
  filter?: LeaderboardFilter;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Auto-refresh interval in ms (default: 30000) */
  refetchInterval?: number;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extract team member info from TeamWithMembers
 */
function extractTeamMembers(team: TeamWithMembers): TeamMemberInfo[] {
  if (!team.members || team.members.length === 0) {
    return [];
  }

  return team.members
    .filter((member): member is TeamMember & { player: Player } => !!member.player)
    .map((member) => ({
      playerId: member.player_id,
      playerName: member.player.name,
      handicap: member.player.handicap ?? 0,
    }));
}

/**
 * Convert standings entry to leaderboard entry with enriched data
 */
function createLeaderboardEntry(
  standing: StandingsEntry<string>,
  participant: { player?: Player; team?: TeamWithMembers } | undefined,
  isTeam: boolean
): CompetitionLeaderboardEntry {
  let participantName = 'Unknown';
  let handicap: number | null = null;
  let teamMembers: TeamMemberInfo[] = [];

  if (isTeam && participant?.team) {
    participantName = participant.team.name;
    teamMembers = extractTeamMembers(participant.team);
    // For teams, handicap is null (could calculate average if needed)
    handicap = null;
  } else if (!isTeam && participant?.player) {
    participantName = participant.player.name;
    handicap = participant.player.handicap ?? 0;
    teamMembers = [];
  }

  return {
    participantId: standing.participantId,
    participantName,
    isTeam,
    totalPoints: standing.totalPoints,
    roundsPlayed: standing.roundsPlayed,
    position: standing.position,
    tied: standing.tied,
    handicap,
    teamMembers,
    roundPoints: standing.roundPoints,
  };
}

/**
 * Fetch and aggregate competition leaderboard data
 */
async function fetchCompetitionLeaderboard(
  competitionId: string,
  filter: LeaderboardFilter
): Promise<CompetitionLeaderboardEntry[]> {
  // Fetch all competition results across rounds
  const competitionResults = await getCompetitionResults(competitionId);

  if (!competitionResults.rounds || competitionResults.rounds.length === 0) {
    return [];
  }

  // Build participant lookup map (player_id/team_id -> participant data)
  const participantMap = new Map<
    string,
    { player?: Player; team?: TeamWithMembers; isTeam: boolean }
  >();

  // Track which participants are individuals vs teams
  const individualIds = new Set<string>();
  const teamIds = new Set<string>();

  // Process all round results to build participant data and track types
  for (const round of competitionResults.rounds) {
    for (const result of round.results) {
      const id = result.player_id || result.team_id;
      if (!id) continue;

      const isTeam = result.is_team_result;

      if (isTeam) {
        teamIds.add(id);
      } else {
        individualIds.add(id);
      }

      // Store participant data if not already stored
      if (!participantMap.has(id)) {
        participantMap.set(id, {
          player: result.player,
          team: result.team,
          isTeam,
        });
      }
    }
  }

  // Build round results for aggregation based on filter
  const roundResultsForAggregation: RoundResultsForAggregation<string>[] = [];

  for (const round of competitionResults.rounds) {
    const filteredResults = round.results.filter((result) => {
      const id = result.player_id || result.team_id;
      if (!id) return false;

      const isTeam = result.is_team_result;

      if (filter === 'individuals') {
        return !isTeam;
      } else if (filter === 'teams') {
        return isTeam;
      }
      return true; // 'all' filter
    });

    if (filteredResults.length === 0) continue;

    roundResultsForAggregation.push({
      roundId: round.roundId,
      results: filteredResults.map((result) => ({
        participantId: result.player_id || result.team_id || '',
        rawScore: result.raw_score ?? 0,
        position: result.position ?? 0,
        tied: false, // Will be recalculated by aggregation
        competitionPoints: result.competition_points,
      })),
    });
  }

  if (roundResultsForAggregation.length === 0) {
    return [];
  }

  // Aggregate standings across all rounds
  const standings = aggregateCompetitionStandings(roundResultsForAggregation);

  // Convert to leaderboard entries with enriched participant data
  const leaderboardEntries: CompetitionLeaderboardEntry[] = standings.map((standing) => {
    const participantData = participantMap.get(standing.participantId);
    const isTeam = participantData?.isTeam ?? teamIds.has(standing.participantId);

    return createLeaderboardEntry(standing, participantData, isTeam);
  });

  return leaderboardEntries;
}

// =====================================================
// HOOK
// =====================================================

/**
 * Hook to fetch competition leaderboard with teams support
 *
 * @param competitionId - The ID of the competition
 * @param options - Optional configuration
 * @returns Query result with leaderboard data
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data: leaderboard, isLoading, refetch } = useCompetitionLeaderboard(competitionId);
 *
 * // Filter to show only individuals
 * const { data: individuals } = useCompetitionLeaderboard(competitionId, {
 *   filter: 'individuals'
 * });
 *
 * // Filter to show only teams
 * const { data: teams } = useCompetitionLeaderboard(competitionId, {
 *   filter: 'teams'
 * });
 *
 * // With custom refresh interval
 * const { data: live } = useCompetitionLeaderboard(competitionId, {
 *   autoRefresh: true,
 *   refetchInterval: 15000, // 15 seconds
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Usage in a component
 * function LeaderboardScreen({ competitionId }: { competitionId: string }) {
 *   const [filter, setFilter] = useState<LeaderboardFilter>('all');
 *   const { data: leaderboard, isLoading, error, refetch } = useCompetitionLeaderboard(
 *     competitionId,
 *     { filter }
 *   );
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return (
 *     <FlatList
 *       data={leaderboard}
 *       renderItem={({ item }) => (
 *         <View>
 *           <Text>{item.position}. {item.participantName}</Text>
 *           <Text>{item.totalPoints} pts ({item.roundsPlayed} rounds)</Text>
 *           {item.isTeam && (
 *             <Text>
 *               Members: {item.teamMembers.map(m => m.playerName).join(', ')}
 *             </Text>
 *           )}
 *           {!item.isTeam && item.handicap !== null && (
 *             <Text>Handicap: {item.handicap}</Text>
 *           )}
 *         </View>
 *       )}
 *       keyExtractor={(item) => item.participantId}
 *       refreshing={isLoading}
 *       onRefresh={refetch}
 *     />
 *   );
 * }
 * ```
 */
export function useCompetitionLeaderboard(
  competitionId: string,
  options?: UseCompetitionLeaderboardOptions
) {
  const {
    filter = 'all',
    autoRefresh = true,
    refetchInterval = 30000,
  } = options || {};

  return useQuery({
    // Include filter in query key for proper cache separation
    queryKey: [...leaderboardKeys.competition(competitionId), filter],
    queryFn: () => fetchCompetitionLeaderboard(competitionId, filter),
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.SHORT, // Consider data stale after 30 seconds
    gcTime: GC_TIMES.SHORT, // Keep in cache for 5 minutes
    refetchInterval: autoRefresh ? refetchInterval : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
