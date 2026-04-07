/**
 * Cosmetic Mutation Hooks
 *
 * TanStack Query mutation hooks for cosmetic operations:
 * - useUnlockCosmetic() - Unlock a cosmetic for a player
 * - useEquipCosmetic() - Equip a cosmetic
 * - useUnequipCosmetic() - Unequip a cosmetic
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { cosmeticKeys } from '../queryKeys';
import type {
  PlayerCosmeticWithDefinition,
  CosmeticType,
} from '@/types/database/cosmetic.types';

// =====================================================
// MUTATION INPUT TYPES
// =====================================================

export interface UnlockCosmeticInput {
  player_id: string;
  cosmetic_id: string;
}

export interface EquipCosmeticInput {
  player_id: string;
  cosmetic_id: string;
  cosmetic_type: CosmeticType;
}

export interface UnequipCosmeticInput {
  player_id: string;
  cosmetic_type: CosmeticType;
}

// =====================================================
// MUTATION: UNLOCK COSMETIC
// =====================================================

/**
 * Mutation: Unlock a cosmetic for a player
 * Inserts a new player_cosmetic record
 *
 * @returns Mutation object for unlocking cosmetics
 *
 * @example
 * ```tsx
 * const unlockMutation = useUnlockCosmetic();
 *
 * const handleUnlock = (cosmeticId: string) => {
 *   unlockMutation.mutate({
 *     player_id: user.id,
 *     cosmetic_id: cosmeticId,
 *   });
 * };
 * ```
 */
export function useUnlockCosmetic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UnlockCosmeticInput
    ): Promise<PlayerCosmeticWithDefinition> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('player_cosmetics')
        .insert({
          player_id: input.player_id,
          cosmetic_id: input.cosmetic_id,
          unlocked_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          cosmetic:cosmetic_definitions(*)
        `
        )
        .single();

      if (error) {
        // Handle unique constraint violation (already unlocked)
        if (error.code === '23505') {
          throw new Error('Cosmetic already unlocked');
        }
        console.error('Error unlocking cosmetic:', error);
        throw new Error(error.message);
      }

      return data as PlayerCosmeticWithDefinition;
    },
    onSuccess: (data) => {
      // Invalidate player cosmetics
      queryClient.invalidateQueries({
        queryKey: cosmeticKeys.playerCosmetics(data.player_id),
      });
    },
  });
}

// =====================================================
// MUTATION: EQUIP COSMETIC
// =====================================================

/**
 * Mutation: Equip a cosmetic
 * Updates the player's equipped cosmetic column for the cosmetic type
 *
 * @returns Mutation object for equipping cosmetics
 *
 * @example
 * ```tsx
 * const equipMutation = useEquipCosmetic();
 *
 * const handleEquip = (cosmetic: CosmeticDefinition) => {
 *   equipMutation.mutate({
 *     player_id: user.id,
 *     cosmetic_id: cosmetic.id,
 *     cosmetic_type: cosmetic.type,
 *   });
 * };
 * ```
 */
export function useEquipCosmetic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EquipCosmeticInput): Promise<void> => {
      // Determine which column to update based on cosmetic type
      const columnMap: Record<CosmeticType, string> = {
        badge: 'equipped_badge_id',
        frame: 'equipped_frame_id',
        title: 'equipped_title_id',
      };

      const column = columnMap[input.cosmetic_type];

      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('players')
        .update({ [column]: input.cosmetic_id })
        .eq('id', input.player_id);

      if (error) {
        console.error('Error equipping cosmetic:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: (_, input) => {
      // Invalidate equipped cosmetics
      queryClient.invalidateQueries({
        queryKey: cosmeticKeys.equipped(input.player_id),
      });
    },
  });
}

// =====================================================
// MUTATION: UNEQUIP COSMETIC
// =====================================================

/**
 * Mutation: Unequip a cosmetic
 * Sets the player's equipped cosmetic column to null for the cosmetic type
 *
 * @returns Mutation object for unequipping cosmetics
 *
 * @example
 * ```tsx
 * const unequipMutation = useUnequipCosmetic();
 *
 * const handleUnequip = (type: CosmeticType) => {
 *   unequipMutation.mutate({
 *     player_id: user.id,
 *     cosmetic_type: type,
 *   });
 * };
 * ```
 */
export function useUnequipCosmetic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UnequipCosmeticInput): Promise<void> => {
      // Determine which column to update based on cosmetic type
      const columnMap: Record<CosmeticType, string> = {
        badge: 'equipped_badge_id',
        frame: 'equipped_frame_id',
        title: 'equipped_title_id',
      };

      const column = columnMap[input.cosmetic_type];

      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('players')
        .update({ [column]: null })
        .eq('id', input.player_id);

      if (error) {
        console.error('Error unequipping cosmetic:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: (_, input) => {
      // Invalidate equipped cosmetics
      queryClient.invalidateQueries({
        queryKey: cosmeticKeys.equipped(input.player_id),
      });
    },
  });
}
