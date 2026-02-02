/**
 * TanStack Query hooks for Skins Games
 *
 * @deprecated Import directly from '@/hooks/skins' instead.
 *
 * This file re-exports everything from the skins module for backward compatibility.
 * The module has been split into focused files:
 * - skins/types.ts: Type definitions
 * - skins/helpers.ts: Shared helper functions
 * - skins/queries.ts: Query hooks (useSkinsGame, useSkinsResults, etc.)
 * - skins/mutations.ts: Mutation hooks (useCreateSkinsGame, useProcessSkinsHole, etc.)
 * - skins/utilities.ts: Utility hooks (useCanUseSkins, useProcessSkinsIfNeeded, etc.)
 * - skins/statistics.ts: Statistics hooks (useSkinsStatistics, useSkinsLeaderboard, etc.)
 *
 * @example
 * // Preferred import (new)
 * import { useSkinsGame, useCreateSkinsGame } from '@/hooks/skins';
 *
 * // Legacy import (still works)
 * import { useSkinsGame, useCreateSkinsGame } from '@/hooks/useSkins';
 */

// Re-export everything from the skins module
export * from './skins';
