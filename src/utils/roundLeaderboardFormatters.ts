/**
 * Round Leaderboard Formatters
 *
 * Utility functions for formatting round leaderboard data by game type.
 * Extracted from useRoundLeaderboard for reusability and testability.
 *
 * Formatters:
 * - formatStablefordData: Format Stableford-specific score data
 * - formatStrokeData: Format Stroke play-specific score data
 * - formatMatchPlayData: Format Match play-specific score data
 * - formatTeamData: Format Team-specific score data
 * - formatScoreData: Format score data based on game type
 * - transformToLeaderboardEntry: Transform database result to leaderboard entry
 *
 * Type Guards:
 * - isPlayerEntry: Check if entry is a player entry
 * - isTeamEntry: Check if entry is a team entry
 * - isStablefordScore: Check if score data is Stableford
 * - isStrokeScore: Check if score data is Stroke
 * - isMatchPlayScore: Check if score data is Match Play
 * - isTeamScore: Check if score data is Team format
 */

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

/** Par game-specific score data */
export interface ParScoreData {
  type: 'par';
  parScore: number;
}

/** Match play-specific score data */
export interface MatchPlayScoreData {
  type: 'match-play';
  /**
   * Undefined means the match is in progress and no final result has been
   * determined yet. The leaderboard helpers (`isMatchComplete`,
   * `formatMatchStatusText`, `calculateTeamAggregate`) already treat an
   * undefined/absent value as in-progress.
   */
  matchResult?: 'win' | 'loss' | 'halved';
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
  /**
   * Team handicap as computed during finalization (e.g. scramble's 25%
   * of sum of member handicaps). Optional — present when the engine
   * persisted it in raw_result_data. When absent, `getEntryHandicap`
   * falls back to a rounded average of member handicaps.
   */
  teamHandicap?: number;
  /** Team gross score (raw strokes), present for stroke-based team formats. */
  teamGross?: number;
  /** Team net score (gross - team handicap), present for stroke-based team formats. */
  teamNet?: number;
}

/** Union type for all score data formats */
export type FormatSpecificScoreData =
  | StablefordScoreData
  | StrokeScoreData
  | ParScoreData
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
  /** Whether this scorecard was submitted without partner verification */
  bypassed: boolean;
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
  /** Avatar palette id stored on the team (e.g. 'avatar-green'), or null
   *  for legacy rows without a stored colour. Resolved at render-time via
   *  `getTeamColorHex` so consumers don't need to know the palette. */
  teamColor?: string | null;
  members: {
    playerId: string;
    playerName: string;
    handicap: number;
    /** Sum of points / strokes this player contributed to the team total.
     *  Only populated by the live (in-progress) builder — server-derived
     *  entries omit this. For best-ball this is the player's points on
     *  holes where they were the contributing member of their sub-match;
     *  for aggregate it's their per-hole values summed. */
    contributedScore?: number;
  }[];
  scoreData: FormatSpecificScoreData;
}

/** Union type for all leaderboard entries */
export type RoundLeaderboardEntry = PlayerLeaderboardEntry | TeamLeaderboardEntry;

// =====================================================
// DATABASE TYPES (for formatter functions)
// =====================================================

/** Player info from joined query */
export interface PlayerInfo {
  id: string;
  name: string;
  handicap: number | null;
}

/** Team with members from joined query */
export interface TeamInfo {
  id: string;
  name: string;
  team_members: {
    player_id: string;
    players: PlayerInfo | null;
  }[];
}

/** Round result row from Supabase with joins */
export interface RoundResultRow {
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
// FORMATTERS
// =====================================================

/**
 * Format Stableford-specific score data
 */
export function formatStablefordData(resultData: RoundResultData): StablefordScoreData {
  return {
    type: 'stableford',
    totalPoints: resultData.stableford_points ?? 0,
  };
}

/**
 * Format Stroke play-specific score data
 */
export function formatStrokeData(resultData: RoundResultData): StrokeScoreData {
  return {
    type: 'stroke',
    grossScore: resultData.gross_score ?? 0,
    netScore: resultData.net_score ?? 0,
  };
}

/**
 * Format Par game-specific score data
 */
export function formatParData(resultData: RoundResultData): ParScoreData {
  return {
    type: 'par',
    parScore: resultData.par_score ?? 0,
  };
}

/**
 * Format Match play-specific score data
 */
export function formatMatchPlayData(
  resultData: RoundResultData,
  allResults: RoundResultRow[]
): MatchPlayScoreData {
  // Find opponent name from the results
  let opponentName = 'Unknown';
  if (resultData.opponent_id) {
    const opponentResult = allResults.find(
      (r) => r.player_id === resultData.opponent_id || r.team_id === resultData.opponent_id
    );
    if (opponentResult) {
      opponentName = opponentResult.players?.name || opponentResult.teams?.name || 'Unknown';
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
export function formatTeamData(
  resultData: RoundResultData,
  teamFormat: TeamFormat | null
): TeamScoreData {
  return {
    type: 'team',
    teamScore: resultData.team_score ?? resultData.stableford_points ?? 0,
    teamFormat: teamFormat ?? 'best-ball',
    teamHandicap: resultData.team_handicap,
    teamGross: resultData.gross_score,
    teamNet: resultData.net_score,
  };
}

/**
 * Format score data based on game type
 */
export function formatScoreData(
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
    case 'par':
      return formatParData(resultData);
    case 'scramble':
    case 'shamble':
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
export function transformToLeaderboardEntry(
  result: RoundResultRow,
  gameType: GameType,
  isTeamRound: boolean,
  teamFormat: TeamFormat | null,
  allResults: RoundResultRow[],
  bypassMap: Map<string, boolean>
): RoundLeaderboardEntry {
  const scoreData = formatScoreData(gameType, isTeamRound, teamFormat, result.raw_result_data, allResults);

  if (result.is_team_result && result.teams) {
    // Team entry
    const members = result.teams.team_members
      .filter((m) => m.players)
      .map((m) => ({
        playerId: m.player_id,
        playerName: m.players?.name ?? 'Unknown',
        handicap: m.players?.handicap ?? 0,
      }));

    // For teams, check if any team member has a bypassed scorecard
    const teamBypassed = result.teams.team_members.some((m) => bypassMap.get(m.player_id) === true);

    return {
      isTeamResult: true,
      position: result.position ?? 0,
      competitionPoints: result.competition_points,
      teamId: result.teams.id,
      teamName: result.teams.name,
      members,
      scoreData,
      bypassed: teamBypassed,
    };
  }

  // Individual player entry - get bypass status from map
  const bypassed = bypassMap.get(result.player_id ?? '') ?? false;

  return {
    isTeamResult: false,
    position: result.position ?? 0,
    competitionPoints: result.competition_points,
    playerId: result.player_id ?? '',
    playerName: result.players?.name ?? 'Unknown',
    handicap: result.players?.handicap ?? 0,
    scoreData,
    bypassed,
  };
}

/**
 * Sort leaderboard entries by position
 */
export function sortLeaderboardEntries(entries: RoundLeaderboardEntry[]): RoundLeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.position === 0 && b.position === 0) return 0;
    if (a.position === 0) return 1;
    if (b.position === 0) return -1;
    return a.position - b.position;
  });
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard to check if entry is a player entry
 */
export function isPlayerEntry(entry: RoundLeaderboardEntry): entry is PlayerLeaderboardEntry {
  return !entry.isTeamResult;
}

/**
 * Type guard to check if entry is a team entry
 */
export function isTeamEntry(entry: RoundLeaderboardEntry): entry is TeamLeaderboardEntry {
  return entry.isTeamResult;
}

/**
 * Type guard to check if score data is Stableford
 */
export function isStablefordScore(scoreData: FormatSpecificScoreData): scoreData is StablefordScoreData {
  return scoreData.type === 'stableford';
}

/**
 * Type guard to check if score data is Stroke
 */
export function isStrokeScore(scoreData: FormatSpecificScoreData): scoreData is StrokeScoreData {
  return scoreData.type === 'stroke';
}

/**
 * Type guard to check if score data is Par game
 */
export function isParScore(scoreData: FormatSpecificScoreData): scoreData is ParScoreData {
  return scoreData.type === 'par';
}

/**
 * Type guard to check if score data is Match Play
 */
export function isMatchPlayScore(scoreData: FormatSpecificScoreData): scoreData is MatchPlayScoreData {
  return scoreData.type === 'match-play';
}

/**
 * Type guard to check if score data is Team format
 */
export function isTeamScore(scoreData: FormatSpecificScoreData): scoreData is TeamScoreData {
  return scoreData.type === 'team';
}
