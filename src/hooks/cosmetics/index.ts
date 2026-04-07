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
} from './queries';

// Mutation hooks
export {
  useUnlockCosmetic,
  useEquipCosmetic,
  useUnequipCosmetic,
} from './mutations';

// Mutation input types
export type {
  UnlockCosmeticInput,
  EquipCosmeticInput,
  UnequipCosmeticInput,
} from './mutations';

// Convenience hooks
export {
  useHasCosmetic,
  useNextUnlockableCosmetic,
  useCosmeticCounts,
} from './utilities';
