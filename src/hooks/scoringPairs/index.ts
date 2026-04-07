/**
 * Scoring Pairs Hooks - Module Index
 *
 * TanStack Query hooks for Scoring Pairs.
 * Provides hooks for fetching and mutating scoring pair data in rounds.
 * Scoring pairs define who scores whom during a round.
 *
 * This module is organized into:
 * - queries.ts: Query hooks for fetching data
 * - mutations.ts: Mutation hooks for modifying data
 *
 * @example
 * ```tsx
 * // Import from the scoringPairs module
 * import { useScoringPairs, useCreateScoringPairs } from '@/hooks/scoringPairs';
 *
 * // Or import the entire module
 * import * as scoringPairs from '@/hooks/scoringPairs';
 * ```
 */

// Re-export query hooks
export {
  useScoringPairs,
  usePlayersToScore,
} from './queries';

// Re-export mutation hooks
export {
  useCreateScoringPairs,
  useAutoGenerateScoringPairs,
  useGenerateTeamMatchPlayPairs,
  useDeleteScoringPairs,
  useShuffleScoringPairs,
} from './mutations';
