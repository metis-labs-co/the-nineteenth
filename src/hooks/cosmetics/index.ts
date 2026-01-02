/**
 * Cosmetics Hooks Module
 *
 * Re-exports all cosmetic-related TanStack Query hooks.
 */

// Query hooks
export {
  useCosmeticDefinitions,
  usePlayerCosmetics,
  useEquippedCosmetics,
  useUnlockableCosmetics,
  useCosmeticsWithStatus,
} from './useCosmetics';

// Mutation hooks
export {
  useUnlockCosmetic,
  useEquipCosmetic,
  useUnequipCosmetic,
} from './useCosmetics';

// Convenience hooks
export {
  useHasCosmetic,
  useNextUnlockableCosmetic,
  useCosmeticCounts,
} from './useCosmetics';
