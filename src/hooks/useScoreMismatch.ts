/**
 * Score Mismatch Hooks
 *
 * @deprecated Import directly from '@/hooks/scoreMismatch' instead.
 *
 * This file re-exports everything from the scoreMismatch module for backward compatibility.
 * The module has been split into focused files:
 * - scoreMismatch/types.ts: Type definitions (ResolveMismatchResult)
 * - scoreMismatch/queries.ts: Query hooks (usePendingMismatches, useSubmissionReadiness, etc.)
 * - scoreMismatch/mutations.ts: Mutation hooks (useResolveMismatch)
 * - scoreMismatch/useMismatchResolutionFlow.ts: Composite hook for resolution flow
 *
 * @example
 * // Preferred import (new)
 * import { usePendingMismatches, useResolveMismatch } from '@/hooks/scoreMismatch';
 *
 * // Legacy import (still works)
 * import { usePendingMismatches, useResolveMismatch } from '@/hooks/useScoreMismatch';
 */

// Re-export everything from the scoreMismatch module
export * from './scoreMismatch';
