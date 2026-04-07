/**
 * Score Mismatch Hooks - Module Index
 *
 * TanStack Query hooks for score mismatch detection and resolution.
 * Used when scoring pairs are enabled to handle self + partner scoring
 * with automatic mismatch detection on submission.
 *
 * This module is organized into:
 * - types.ts: Type definitions (ResolveMismatchResult)
 * - queries.ts: Query hooks (usePendingMismatches, useSubmissionReadiness, etc.)
 * - mutations.ts: Mutation hooks (useResolveMismatch)
 * - useMismatchResolutionFlow.ts: Composite hook combining queries and mutations
 *
 * @example
 * ```tsx
 * // Import from the scoreMismatch module
 * import { usePendingMismatches, useResolveMismatch } from '@/hooks/scoreMismatch';
 *
 * // Or import the entire module
 * import * as scoreMismatch from '@/hooks/scoreMismatch';
 * ```
 */

// Re-export types
export type { ResolveMismatchResult } from './types';

// Re-export query keys (from canonical location for backward compatibility)
export { scoreMismatchKeys } from '@/hooks/queryKeys';

// Re-export query hooks
export {
  usePendingMismatches,
  useSubmissionReadiness,
  usePartnerStatus,
  useSubmissionStatus,
} from './queries';

// Re-export mutation hooks
export { useResolveMismatch } from './mutations';

// Re-export composite hooks
export { useMismatchResolutionFlow } from './useMismatchResolutionFlow';
