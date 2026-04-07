/**
 * TanStack Query hooks for Leagues
 *
 * @deprecated Import directly from '@/hooks/leagues' instead.
 *
 * This file re-exports everything from the leagues module for backward compatibility.
 * The module has been split into focused files:
 * - leagues/queries.ts: Query hooks (useLeagues, useLeague, useLeaguePlayers, etc.)
 * - leagues/mutations.ts: Mutation hooks (useCreateLeague, useJoinLeague, etc.)
 *
 * @example
 * // Preferred import (new)
 * import { useLeagues, useCreateLeague } from '@/hooks/leagues';
 *
 * // Legacy import (still works)
 * import { useLeagues, useCreateLeague } from '@/hooks/useLeagues';
 */

// Re-export everything from the leagues module
export * from './leagues';
