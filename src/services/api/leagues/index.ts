/**
 * Leagues API Service
 *
 * Split into focused modules:
 * - queries.ts: Read-only operations
 * - mutations.ts: Write operations
 * - types.ts: Shared types
 */

// Types
export type { CreateLeagueInput, EligibleScorecard } from './types';

// Queries
export {
  getLeagues,
  getPublicLeagues,
  getLeague,
  getLeaguePlayers,
  getLeagueLeaderboard,
  getEclecticLeaderboard,
  getEclecticBestScores,
  getMyLeagueRounds,
  getPlayerLeagueRounds,
  getEligibleScorecards,
  getLeagueTagsForScorecard,
  getPlayerTagCount,
} from './queries';

// Mutations
export {
  createLeague,
  joinLeague,
  joinPublicLeague,
  tagRoundToLeague,
  untagRound,
  leaveLeague,
  removePlayer,
  archiveLeague,
  deleteLeague,
  addPlayersToLeague,
  updateLeague,
} from './mutations';
