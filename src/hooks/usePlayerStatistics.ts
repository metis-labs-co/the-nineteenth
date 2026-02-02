/**
 * TanStack Query hooks for Player Statistics
 *
 * @deprecated Import directly from '@/hooks/playerStatistics' instead.
 *
 * This file re-exports everything from the playerStatistics module for backward compatibility.
 * The module has been split into focused files:
 * - playerStatistics/types.ts: Type definitions
 * - playerStatistics/helpers.ts: Shared helper functions
 * - playerStatistics/queries.ts: Query hooks
 *
 * @example
 * // Preferred import (new)
 * import { usePlayerStatistics } from '@/hooks/playerStatistics';
 *
 * // Legacy import (still works)
 * import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
 */

// Re-export everything from the playerStatistics module
export * from './playerStatistics';

// Default export for backward compatibility
export { usePlayerStatistics as default } from './playerStatistics';
