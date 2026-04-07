/**
 * Placeholder Players Hooks - Module Index
 *
 * TanStack Query hooks for Placeholder (Guest) Players.
 * Provides hooks for fetching and mutating placeholder player data.
 *
 * Placeholder players are "guests" added to competitions/rounds without
 * requiring an app account. They can be scored and later linked to real
 * accounts when those people sign up.
 *
 * This module is organized into:
 * - queries.ts: Query hooks for fetching data
 * - mutations.ts: Mutation hooks for modifying data
 *
 * @example
 * ```tsx
 * // Import from the placeholderPlayers module
 * import { usePlaceholderPlayers, useCreatePlaceholderPlayer } from '@/hooks/placeholderPlayers';
 *
 * // Or import the entire module
 * import * as placeholderPlayers from '@/hooks/placeholderPlayers';
 * ```
 */

// Re-export query hooks
export {
  usePlaceholderPlayers,
  usePlaceholderPlayer,
} from './queries';

// Re-export mutation hooks
export {
  useCreatePlaceholderPlayer,
  useLinkPlaceholderPlayer,
  useDeletePlaceholderPlayer,
  useUpdatePlaceholderPlayer,
} from './mutations';
