/**
 * useClubs - Hook for club and course data fetching
 *
 * @deprecated Import directly from '@/hooks/clubs' instead.
 *
 * This file re-exports everything from the clubs module for backward compatibility.
 * The module has been split into focused files:
 * - clubs/types.ts: Type definitions
 * - clubs/helpers.ts: Shared helper functions
 * - clubs/queries.ts: Query hooks
 * - clubs/mutations.ts: Mutation hooks
 * - clubs/deprecated.ts: Deprecated venue aliases
 *
 * @example
 * // Preferred import (new)
 * import { useClubsWithCourses, useSearchClubs } from '@/hooks/clubs';
 *
 * // Legacy import (still works)
 * import { useClubsWithCourses, useSearchClubs } from '@/hooks/useClubs';
 */

// Re-export everything from the clubs module
export * from './clubs';
