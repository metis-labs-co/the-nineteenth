/**
 * Leagues Hooks - Module Index
 *
 * TanStack Query hooks for League operations.
 * Provides hooks for fetching and mutating league data.
 *
 * This module is organized into:
 * - queries.ts: Query hooks for fetching data
 * - mutations.ts: Mutation hooks for modifying data
 *
 * @example
 * ```tsx
 * // Import from the leagues module
 * import { useLeagues, useCreateLeague } from '@/hooks/leagues';
 *
 * // Or import the entire module
 * import * as leagues from '@/hooks/leagues';
 * ```
 */

// Re-export query hooks
export {
  useLeagues,
  useLeague,
  usePublicLeagues,
  useLeaguePlayers,
  useLeagueLeaderboard,
  useMyLeagueRounds,
  usePlayerLeagueRounds,
  useEligibleScorecards,
  useScorecardLeagueTags,
  usePlayerTagCount,
  useLadderStandings,
  useLeagueChallenges,
  useMyActiveChallenges,
  useChallenge,
  useEclecticLeaderboard,
  useEclecticBestScores,
} from './queries';

// Re-export mutation hooks
export {
  useCreateLeague,
  useJoinLeague,
  useJoinPublicLeague,
  useTagRoundToLeague,
  useUntagRound,
  useLeaveLeague,
  useRemoveLeaguePlayer,
  useAddLeaguePlayers,
  useDeleteLeague,
  useArchiveLeague,
  useUpdateLeague,
  useCreateChallenge,
  useRespondToChallenge,
  useSubmitChallengeRound,
  useCancelChallenge,
} from './mutations';

// Re-export league stats hooks
export { useLeagueStats } from './stats';
export type { LeagueStats } from './stats';

// Re-export partnership league hooks
export {
  usePartnerships,
  useMyPartnership,
  usePartnershipLeaderboard,
  usePartnershipCourseBests,
  usePartnershipRounds,
  useCreatePartnership,
  useDissolvePartnership,
  useUpdatePartnershipName,
  useTagPartnershipRound,
  useUntagPartnershipRound,
} from './partnerships';
