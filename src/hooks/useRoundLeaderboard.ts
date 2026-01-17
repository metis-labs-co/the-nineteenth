/**
 * useRoundLeaderboard - Format-specific leaderboard for individual rounds
 *
 * Returns RoundLeaderboardEntry[] with format-specific data:
 * - Stableford: totalPoints
 * - Stroke Play: grossScore, netScore
 * - Match Play: matchResult, holesUpDown, opponent
 *
 * Features:
 * - Fetches round_results for roundId
 * - Joins player/team data
 * - Formats based on round.game_type
 * - Includes round metadata (game_type, is_team_round, team_format)
 * - Auto-refresh support
 * - Type-safe format-specific data
 */

import { useQuery } from '@tanstack/react-query';
import { leaderboardKeys } from './queryKeys';
import { supabase } from '@/services/supabase/client';
import type {
  GameType,
  TeamFormat,
  RoundResultData,
} from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/** Stableford-specific score data */
export interface StablefordScoreData {
  type: 'stableford';
  totalPoints: number;
}

/** Stroke play-specific score data */
export interface StrokeScoreData {
  type: 'stroke';
  grossScore: number;
  netScore: number;
}

/** Match play-specific score data */
export interface MatchPlayScoreData {
  type: 'match-play';
  matchResult: 'win' | 'loss' | 'halved';
  holesUpDown: string; // e.g., "3&2", "1 UP", "A/S"
  opponentId: string;
  opponentName: string;
  holesWon: number;
  holesLost: number;
  holesHalved: number;
}

/** Team format-specific score data */
export interface TeamScoreData {
  type: 'team';
  teamScore: number;
  teamFormat: TeamFormat;
}

/** Union type for all score data formats */
export type FormatSpecificScoreData =
  | StablefordScoreData
  | StrokeScoreData
  | MatchPlayScoreData
  | TeamScoreData;

/** Base leaderboard entry structure */
interface BaseLeaderboardEntry {
  /** Position in the leaderboard (1, 2, 3...) */
  position: number;
  /** Competition points earned for this round */
  competitionPoints: number;
  /** Whether this is a team result */
  isTeamResult: boolean;
}

/** Individual player leaderboard entry */
export interface PlayerLeaderboardEntry extends BaseLeaderboardEntry {
  isTeamResult: false;
  playerId: string;
  playerName: string;
  handicap: number;
  scoreData: FormatSpecificScoreData;
}

/** Team leaderboard entry */
export interface TeamLeaderboardEntry extends BaseLeaderboardEntry {
  isTeamResult: true;
  teamId: string;
  teamName: string;
  members: {
    playerId: string;
    playerName: string;
    handicap: number;
  }[];
  scoreData: FormatSpecificScoreData;
}

/** Union type for all leaderboard entries */
export type RoundLeaderboardEntry = PlayerLeaderboardEntry | TeamLeaderboardEntry;

/** Round metadata included in the response */
export interface RoundMetadata {
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  roundId: string;
  roundNumber: number;
  courseName?: string;
  date?: string;
  status: string;
}

/** Complete response from the hook */
export interface RoundLeaderboardResponse {
  entries: RoundLeaderboardEntry[];
  metadata: RoundMetadata;
}

// =====================================================
// DATABASE TYPES
// =====================================================

/** Player info from joined query */
interface PlayerInfo {
  id: string;
  name: string;
  handicap: number | null;
}

/** Team with members from joined query */
interface TeamInfo {
  id: string;
  name: string;
  team_members: {
    player_id: string;
    players: PlayerInfo | null;
  }[];
}

/** Round info from joined query */
interface RoundInfo {
  id: string;
  round_number: number;
  game_type: GameType;
  is_team_round: boolean;
  team_format: TeamFormat | null;
  date: string | null;
  status: string;
  courses: {
    name: string;
  } | null;
}

/** Round result row from Supabase with joins */
interface RoundResultRow {
  id: string;
  round_id: string;
  player_id: string | null;
  team_id: string | null;
  raw_score: number | null;
  raw_result_data: RoundResultData;
  position: number | null;
  competition_points: number;
  is_team_result: boolean;
  players: PlayerInfo | null;
  teams: TeamInfo | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format Stableford-specific score data
 */
function formatStablefordData(resultData: RoundResultData): StablefordScoreData {
  return {
    type: 'stableford',
    totalPoints: resultData.stableford_points ?? 0,
  };
}

/**
 * Format Stroke play-specific score data
 */
function formatStrokeData(resultData: RoundResultData): StrokeScoreData {
  return {
    type: 'stroke',
    grossScore: resultData.gross_score ?? 0,
    netScore: resultData.net_score ?? 0,
  };
}

/**
 * Format Match play-specific score data
 */
function formatMatchPlayData(
  resultData: RoundResultData,
  allResults: RoundResultRow[]
): MatchPlayScoreData {
  // Find opponent name from the results
  let opponentName = 'Unknown';
  if (resultData.opponent_id) {
    const opponentResult = allResults.find(
      (r) =>
        r.player_id === resultData.opponent_id || r.team_id === resultData.opponent_id
    );
    if (opponentResult) {
      opponentName =
        opponentResult.players?.name ||
        opponentResult.teams?.name ||
        'Unknown';
    }
  }

  return {
    type: 'match-play',
    matchResult: resultData.match_result ?? 'halved',
    holesUpDown: resultData.final_margin ?? 'A/S',
    opponentId: resultData.opponent_id ?? '',
    opponentName,
    holesWon: resultData.holes_won ?? 0,
    holesLost: resultData.holes_lost ?? 0,
    holesHalved: resultData.holes_halved ?? 0,
  };
}

/**
 * Format team-specific score data
 */
function formatTeamData(
  resultData: RoundResultData,
  teamFormat: TeamFormat | null
): TeamScoreData {
  return {
    type: 'team',
    teamScore: resultData.team_score ?? resultData.stableford_points ?? 0,
    teamFormat: teamFormat ?? 'best-ball',
  };
}

/**
 * Format score data based on game type
 */
function formatScoreData(
  gameType: GameType,
  isTeamRound: boolean,
  teamFormat: TeamFormat | null,
  resultData: RoundResultData,
  allResults: RoundResultRow[]
): FormatSpecificScoreData {
  // Match play always returns match play data, even for team rounds
  // Team match play uses the same match structure with team vs team
  if (gameType === 'match-play') {
    return formatMatchPlayData(resultData, allResults);
  }

  // For other team rounds, return team-specific data
  if (isTeamRound && teamFormat) {
    return formatTeamData(resultData, teamFormat);
  }

  switch (gameType) {
    case 'stableford':
      return formatStablefordData(resultData);
    case 'stroke':
      return formatStrokeData(resultData);
    case 'ambrose':
    case 'best-ball':
      // Team formats fall through to team data
      return formatTeamData(resultData, gameType as TeamFormat);
    default:
      // Default to Stableford if unknown
      return formatStablefordData(resultData);
  }
}

/**
 * Transform database result to leaderboard entry
 */
function transformToLeaderboardEntry(
  result: RoundResultRow,
  gameType: GameType,
  isTeamRound: boolean,
  teamFormat: TeamFormat | null,
  allResults: RoundResultRow[]
): RoundLeaderboardEntry {
  const scoreData = formatScoreData(
    gameType,
    isTeamRound,
    teamFormat,
    result.raw_result_data,
    allResults
  );

  if (result.is_team_result && result.teams) {
    // Team entry
    const members = result.teams.team_members
      .filter((m) => m.players)
      .map((m) => ({
        playerId: m.player_id,
        playerName: m.players?.name ?? 'Unknown',
        handicap: m.players?.handicap ?? 0,
      }));

    return {
      isTeamResult: true,
      position: result.position ?? 0,
      competitionPoints: result.competition_points,
      teamId: result.teams.id,
      teamName: result.teams.name,
      members,
      scoreData,
    };
  }

  // Individual player entry
  return {
    isTeamResult: false,
    position: result.position ?? 0,
    competitionPoints: result.competition_points,
    playerId: result.player_id ?? '',
    playerName: result.players?.name ?? 'Unknown',
    handicap: result.players?.handicap ?? 0,
    scoreData,
  };
}

// =====================================================
// FETCH FUNCTION
// =====================================================

/**
 * Fetch round leaderboard data from Supabase
 */
async function fetchRoundLeaderboard(
  roundId: string
): Promise<RoundLeaderboardResponse> {
  // First, get the round metadata
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select(
      `
      id,
      round_number,
      game_type,
      is_team_round,
      team_format,
      date,
      status,
      courses (
        name
      )
    `
    )
    .eq('id', roundId)
    .single();

  if (roundError) {
    throw new Error(`Failed to fetch round: ${roundError.message}`);
  }

  if (!round) {
    throw new Error('Round not found');
  }

  const typedRound = round as unknown as RoundInfo;

  // Get round results with player/team joins
  const { data: results, error: resultsError } = await supabase
    .from('round_results')
    .select(
      `
      id,
      round_id,
      player_id,
      team_id,
      raw_score,
      raw_result_data,
      position,
      competition_points,
      is_team_result,
      players!player_id (
        id,
        name,
        handicap
      ),
      teams!team_id (
        id,
        name,
        team_members (
          player_id,
          players (
            id,
            name,
            handicap
          )
        )
      )
    `
    )
    .eq('round_id', roundId)
    .order('position', { ascending: true, nullsFirst: false });

  if (resultsError) {
    throw new Error(`Failed to fetch round results: ${resultsError.message}`);
  }

  const typedResults = (results || []) as unknown as RoundResultRow[];

  // Transform results to leaderboard entries
  const entries = typedResults.map((result) =>
    transformToLeaderboardEntry(
      result,
      typedRound.game_type,
      typedRound.is_team_round,
      typedRound.team_format,
      typedResults
    )
  );

  // Sort by position (handle nulls)
  entries.sort((a, b) => {
    if (a.position === 0 && b.position === 0) return 0;
    if (a.position === 0) return 1;
    if (b.position === 0) return -1;
    return a.position - b.position;
  });

  // Build metadata
  const metadata: RoundMetadata = {
    gameType: typedRound.game_type,
    isTeamRound: typedRound.is_team_round,
    teamFormat: typedRound.team_format,
    roundId: typedRound.id,
    roundNumber: typedRound.round_number,
    courseName: typedRound.courses?.name,
    date: typedRound.date ?? undefined,
    status: typedRound.status,
  };

  return {
    entries,
    metadata,
  };
}

// =====================================================
// HOOK
// =====================================================

export interface UseRoundLeaderboardOptions {
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Auto-refresh interval in ms (default: 30000) */
  refetchInterval?: number;
  /** Only fetch when this is true (default: true if roundId exists) */
  enabled?: boolean;
}

/**
 * Hook to fetch format-specific leaderboard for a round
 *
 * @param roundId - The ID of the round
 * @param options - Optional configuration
 * @returns Query result with format-specific leaderboard data
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useRoundLeaderboard(roundId);
 *
 * // Access entries and metadata
 * if (data) {
 *   console.log('Game type:', data.metadata.gameType);
 *   console.log('Entries:', data.entries);
 *
 *   // Type-safe format-specific data
 *   data.entries.forEach(entry => {
 *     if (entry.scoreData.type === 'stableford') {
 *       console.log('Points:', entry.scoreData.totalPoints);
 *     } else if (entry.scoreData.type === 'stroke') {
 *       console.log('Gross:', entry.scoreData.grossScore);
 *       console.log('Net:', entry.scoreData.netScore);
 *     } else if (entry.scoreData.type === 'match-play') {
 *       console.log('Result:', entry.scoreData.matchResult);
 *       console.log('Margin:', entry.scoreData.holesUpDown);
 *     }
 *   });
 * }
 *
 * @example
 * // With team rounds
 * const { data } = useRoundLeaderboard(roundId);
 *
 * data?.entries.forEach(entry => {
 *   if (entry.isTeamResult) {
 *     console.log('Team:', entry.teamName);
 *     console.log('Members:', entry.members.map(m => m.playerName).join(', '));
 *   } else {
 *     console.log('Player:', entry.playerName);
 *     console.log('Handicap:', entry.handicap);
 *   }
 * });
 */
export function useRoundLeaderboard(
  roundId: string,
  options?: UseRoundLeaderboardOptions
) {
  const {
    autoRefresh = true,
    refetchInterval = 30000,
    enabled = !!roundId,
  } = options || {};

  return useQuery({
    queryKey: leaderboardKeys.round(roundId),
    queryFn: () => fetchRoundLeaderboard(roundId),
    enabled,
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: autoRefresh ? refetchInterval : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard to check if entry is a player entry
 */
export function isPlayerEntry(
  entry: RoundLeaderboardEntry
): entry is PlayerLeaderboardEntry {
  return !entry.isTeamResult;
}

/**
 * Type guard to check if entry is a team entry
 */
export function isTeamEntry(
  entry: RoundLeaderboardEntry
): entry is TeamLeaderboardEntry {
  return entry.isTeamResult;
}

/**
 * Type guard to check if score data is Stableford
 */
export function isStablefordScore(
  scoreData: FormatSpecificScoreData
): scoreData is StablefordScoreData {
  return scoreData.type === 'stableford';
}

/**
 * Type guard to check if score data is Stroke
 */
export function isStrokeScore(
  scoreData: FormatSpecificScoreData
): scoreData is StrokeScoreData {
  return scoreData.type === 'stroke';
}

/**
 * Type guard to check if score data is Match Play
 */
export function isMatchPlayScore(
  scoreData: FormatSpecificScoreData
): scoreData is MatchPlayScoreData {
  return scoreData.type === 'match-play';
}

/**
 * Type guard to check if score data is Team format
 */
export function isTeamScore(
  scoreData: FormatSpecificScoreData
): scoreData is TeamScoreData {
  return scoreData.type === 'team';
}
