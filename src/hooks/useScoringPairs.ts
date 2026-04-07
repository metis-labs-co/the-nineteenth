/**
 * TanStack Query hooks for Scoring Pairs
 *
 * @deprecated Import directly from '@/hooks/scoringPairs' instead.
 *
 * This file re-exports everything from the scoringPairs module for backward compatibility.
 * The module has been split into focused files:
 * - scoringPairs/queries.ts: Query hooks (useScoringPairs, usePlayersToScore)
 * - scoringPairs/mutations.ts: Mutation hooks (useCreateScoringPairs, useAutoGenerateScoringPairs, etc.)
 *
 * @example
 * // Preferred import (new)
 * import { useScoringPairs, useCreateScoringPairs } from '@/hooks/scoringPairs';
 *
 * // Legacy import (still works)
 * import { useScoringPairs, useCreateScoringPairs } from '@/hooks/useScoringPairs';
 */

// Re-export everything from the scoringPairs module
export * from './scoringPairs';
