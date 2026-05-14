/**
 * Player Hooks - Module Index
 *
 * Hooks for player profile data, handicap calculations, and data export.
 *
 * @example
 * ```tsx
 * import { usePlayer, useHandicapHistory, usePlayingHandicap } from '@/hooks/player';
 * ```
 */

// Re-export player query hook
export { usePlayer } from './queries';

// Re-export handicap history hook and keys
export { useHandicapHistory, handicapKeys } from './handicapHistory';

// Re-export combine/uncombine handicap-round mutations
export {
  useCombineHandicapRounds,
  useUncombineHandicapRound,
} from './useCombineHandicapRounds';

// Re-export playing handicap hook and pure function
export { usePlayingHandicap, calculatePlayingHandicap } from './playingHandicap';

// Re-export data export hook
export { useDataExport } from './dataExport';
