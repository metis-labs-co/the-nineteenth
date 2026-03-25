/**
 * ViewRoundScreen Hooks - Barrel Export
 *
 * Sub-hooks extracted from useViewRoundScreen for separation of concerns:
 *
 * - `useViewRoundDataFetch` - Round/scorecard/player/leaderboard data fetching
 * - `useViewRoundPermissions` - User role and permission checks
 * - `useViewRoundSideGames` - Skins and Wolf game queries + team detection
 * - `useViewRoundTabs` - Dynamic tab builder based on game type/features
 * - `useViewRoundHandlers` - All handler callbacks (navigation, mutations, dialogs)
 * - `useViewRoundPlayerData` - Player data transformations (shamble, stroke, match play)
 * - `useViewRoundScramble` - Scramble-specific team/score logic
 */

export { useViewRoundDataFetch } from './useViewRoundDataFetch';
export { useViewRoundPermissions } from './useViewRoundPermissions';
export { useViewRoundSideGames } from './useViewRoundSideGames';
export { useViewRoundTabs } from './useViewRoundTabs';
export { useViewRoundHandlers } from './useViewRoundHandlers';
export { useViewRoundPlayerData } from './useViewRoundPlayerData';
export { useViewRoundScramble } from './useViewRoundScramble';
