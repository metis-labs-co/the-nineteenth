/**
 * Cosmetic Utility Hooks
 *
 * Derived/convenience hooks for cosmetic data:
 * - useHasCosmetic(playerId, cosmeticId) - Check if player has unlocked a cosmetic
 * - useNextUnlockableCosmetic(playerId) - Get next unlockable cosmetic
 * - useCosmeticCounts(playerId) - Get count of unlocked cosmetics by type
 */

import { useMemo } from 'react';
import { usePlayerCosmetics, useUnlockableCosmetics } from './queries';

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Hook: Check if player has unlocked a specific cosmetic
 *
 * @param playerId - The player's ID
 * @param cosmeticId - The cosmetic ID to check
 * @returns Boolean indicating if unlocked, plus loading state
 *
 * @example
 * ```tsx
 * const { isUnlocked, isLoading } = useHasCosmetic(user.id, 'cosmetic-123');
 * ```
 */
export function useHasCosmetic(playerId: string, cosmeticId: string) {
  const { data: unlocked, isLoading } = usePlayerCosmetics(playerId);

  const isUnlocked = useMemo(() => {
    if (!unlocked) return false;
    return unlocked.some((u) => u.cosmetic_id === cosmeticId);
  }, [unlocked, cosmeticId]);

  return { isUnlocked, isLoading };
}

/**
 * Hook: Get the next cosmetic the player can unlock
 * Returns the cheapest unlockable cosmetic based on current points
 *
 * @param playerId - The player's ID
 * @returns Next unlockable cosmetic and points needed
 *
 * @example
 * ```tsx
 * const { nextCosmetic, pointsNeeded } = useNextUnlockableCosmetic(user.id);
 *
 * if (nextCosmetic) {
 *   return <Text>{pointsNeeded} points to unlock {nextCosmetic.name}</Text>;
 * }
 * ```
 */
export function useNextUnlockableCosmetic(playerId: string) {
  const { data: cosmetics, totalPoints, isLoading } = useUnlockableCosmetics(playerId);

  const result = useMemo(() => {
    if (!cosmetics) return { nextCosmetic: null, pointsNeeded: 0 };

    // Find the first locked cosmetic (sorted by points_required)
    const nextCosmetic = cosmetics.find((c) => !c.is_unlocked);

    if (!nextCosmetic) {
      return { nextCosmetic: null, pointsNeeded: 0 };
    }

    return {
      nextCosmetic,
      pointsNeeded: Math.max(0, nextCosmetic.points_required - totalPoints),
    };
  }, [cosmetics, totalPoints]);

  return { ...result, isLoading };
}

/**
 * Hook: Get count of unlocked cosmetics by type
 *
 * @param playerId - The player's ID
 * @returns Counts of unlocked cosmetics by type
 *
 * @example
 * ```tsx
 * const { counts } = useCosmeticCounts(user.id);
 * // { badges: 3, frames: 2, titles: 1 }
 * ```
 */
export function useCosmeticCounts(playerId: string) {
  const { data: unlocked, isLoading } = usePlayerCosmetics(playerId);

  const counts = useMemo(() => {
    if (!unlocked) {
      return { badges: 0, frames: 0, titles: 0 };
    }

    return unlocked.reduce(
      (acc, item) => {
        const type = item.cosmetic?.type;
        if (type === 'badge') acc.badges++;
        else if (type === 'frame') acc.frames++;
        else if (type === 'title') acc.titles++;
        return acc;
      },
      { badges: 0, frames: 0, titles: 0 }
    );
  }, [unlocked]);

  return { counts, isLoading };
}
