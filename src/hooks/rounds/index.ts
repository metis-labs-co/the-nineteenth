/**
 * Round Hooks - Module Index
 *
 * TanStack Query hooks for round-related data fetching and mutations.
 *
 * ## Hook Responsibilities (Round Hook Architecture)
 *
 * ### QUERY HOOKS (queries.ts)
 * - `useRoundDetails(roundId)` - Single round with course and competition info
 * - `useRoundScorecards(roundId)` - Scorecards for a round with player data
 * - `useRoundPlayers(roundId)` - Players in a round (from pairings, competition, or round_players)
 * - `useGameResults()` - Combined skins + wolf game results and history
 *
 * ### MUTATION HOOKS (mutations.ts)
 * - `useDeleteRound()` - Delete a round with cascade cleanup
 *
 * ### LEADERBOARD HOOKS (leaderboard.ts)
 * - `useRoundLeaderboard(roundId)` - Format-specific leaderboard with type-safe score data
 *
 * ### PAIRING HOOKS (pairings.ts)
 * - `usePairings(roundId)` - Fetch pairings for a round
 * - `useHasPairings(roundId)` - Check if round has pairings
 * - `useCreatePairings()` - Create pairings
 * - `useUpdatePairing()` - Update a single pairing
 * - `useDeletePairing()` - Delete a single pairing
 * - `useDeleteAllPairings()` - Delete all pairings for a round
 * - `useAutoGeneratePairings()` - Auto-generate balanced pairings
 * - `useReplacePairings()` - Replace all pairings
 * - `useUpdatePairingTeeTimes()` - Update tee times
 *
 * ### TEAM HOOKS (teams.ts)
 * - `useTeams(competitionId)` - Fetch teams for a competition
 * - `useCreateTeam()` - Create a team
 * - `useUpdateTeam()` - Update team members
 * - `useUpdateTeamName()` - Update team name
 * - `useDeleteTeam()` - Delete a team
 * - `useAutoGenerateTeams()` - Auto-generate balanced teams
 *
 * @example
 * ```tsx
 * // Import from the rounds module
 * import { useRoundDetails, useRoundLeaderboard, usePairings } from '@/hooks/rounds';
 *
 * // Or import the entire module
 * import * as rounds from '@/hooks/rounds';
 * ```
 */

// Re-export query hooks and types
export {
  // Hooks
  useRoundDetails,
  useRoundScorecards,
  useRoundPlayers,
  useGameResults,
  // Types
} from './queries';

export type {
  CourseWithClub,
  CompetitionSummary,
  RoundWithCourse,
  ScorecardWithPlayer,
  RoundPlayer,
  GameType,
  GameResultsSummary,
  CombinedGameHistoryEntry,
  GameTypeFilter,
} from './queries';

// Re-export mutation hooks and types
export { useDeleteRound } from './mutations';

export type {
  DeleteRoundInput,
  DeleteRoundResult,
} from './mutations';

// Re-export leaderboard hooks, types, and type guards
export {
  useRoundLeaderboard,
  // Type guards re-exported from roundLeaderboardFormatters
  isPlayerEntry,
  isTeamEntry,
  isStablefordScore,
  isStrokeScore,
  isParScore,
  isMatchPlayScore,
  isTeamScore,
} from './leaderboard';

export type {
  RoundMetadata,
  RoundLeaderboardResponse,
  UseRoundLeaderboardOptions,
  // Types re-exported from roundLeaderboardFormatters
  StablefordScoreData,
  StrokeScoreData,
  ParScoreData,
  MatchPlayScoreData,
  TeamScoreData,
  FormatSpecificScoreData,
  PlayerLeaderboardEntry,
  TeamLeaderboardEntry,
  RoundLeaderboardEntry,
} from './leaderboard';

// Re-export pairing hooks
export {
  usePairings,
  useHasPairings,
  useCreatePairings,
  useUpdatePairing,
  useDeletePairing,
  useDeleteAllPairings,
  useAutoGeneratePairings,
  useReplacePairings,
  useUpdatePairingTeeTimes,
} from './pairings';

// Re-export team hooks
export {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useUpdateTeamName,
  useDeleteTeam,
  useAutoGenerateTeams,
} from './teams';
