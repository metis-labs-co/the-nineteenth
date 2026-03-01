/**
 * Skins Hooks - Utility Hooks (barrel re-export)
 *
 * This file has been split into focused modules:
 * - teamSkinsProcessor.ts — pure async team skins processing
 * - useCanUseSkins.ts — subscription feature check
 * - useActiveSkinsGameForRound.ts — active game query
 * - useProcessSkinsIfNeeded.ts — hole completion processing
 * - useFinalizeSkinsForRound.ts — round finalization
 * - useAutoSplitSkinsForCompetition.ts — auto-split management
 *
 * This barrel file preserves backward compatibility for any
 * direct imports from './utilities'.
 */

export { processTeamSkins } from './teamSkinsProcessor';
export { useCanUseSkins } from './useCanUseSkins';
export { useActiveSkinsGameForRound } from './useActiveSkinsGameForRound';
export { useProcessSkinsIfNeeded } from './useProcessSkinsIfNeeded';
export { useFinalizeSkinsForRound } from './useFinalizeSkinsForRound';
export { useAutoSplitSkinsForCompetition } from './useAutoSplitSkinsForCompetition';
