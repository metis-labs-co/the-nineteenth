/**
 * TanStack Query hooks for Placeholder Players
 *
 * @deprecated Import directly from '@/hooks/placeholderPlayers' instead.
 *
 * This file re-exports everything from the placeholderPlayers module for backward compatibility.
 * The module has been split into focused files:
 * - placeholderPlayers/queries.ts: Query hooks (usePlaceholderPlayers, usePlaceholderPlayer)
 * - placeholderPlayers/mutations.ts: Mutation hooks (useCreatePlaceholderPlayer, useLinkPlaceholderPlayer, etc.)
 *
 * @example
 * // Preferred import (new)
 * import { usePlaceholderPlayers, useCreatePlaceholderPlayer } from '@/hooks/placeholderPlayers';
 *
 * // Legacy import (still works)
 * import { usePlaceholderPlayers, useCreatePlaceholderPlayer } from '@/hooks/usePlaceholderPlayers';
 */

// Re-export everything from the placeholderPlayers module
export * from './placeholderPlayers';
