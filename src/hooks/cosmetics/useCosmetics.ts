/**
 * useCosmetics - Cosmetic System Hooks
 *
 * TanStack Query hooks for the profile customization cosmetics feature:
 *
 * Queries:
 * - useCosmeticDefinitions() - All cosmetic definitions
 * - usePlayerCosmetics(playerId) - Player's unlocked cosmetics
 * - useEquippedCosmetics(playerId) - Player's equipped cosmetics
 * - useUnlockableCosmetics(playerId) - Cosmetics player can unlock
 *
 * Mutations:
 * - useUnlockCosmetic() - Unlock a cosmetic for a player
 * - useEquipCosmetic() - Equip a cosmetic
 * - useUnequipCosmetic() - Unequip a cosmetic
 *
 * @example
 * ```tsx
 * function ProfileCustomization() {
 *   const { user } = useAuth();
 *   const { data: equipped } = useEquippedCosmetics(user?.id ?? '');
 *   const { data: unlockable } = useUnlockableCosmetics(user?.id ?? '');
 *   const equipMutation = useEquipCosmetic();
 *
 *   return (
 *     <View>
 *       <ProfileFrame frame={equipped?.frame} />
 *       {unlockable?.map(c => (
 *         <CosmeticItem key={c.id} cosmetic={c} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { cosmeticKeys } from '../queryKeys';
import { useAchievementPoints } from '../achievements/useAchievements';
import type {
  CosmeticDefinition,
  PlayerCosmeticWithDefinition,
  EquippedCosmetics,
  CosmeticType,
  CosmeticWithStatus,
} from '@/types/database/cosmetic.types';

// =====================================================
// QUERY: COSMETIC DEFINITIONS
// =====================================================

/**
 * Query: All cosmetic definitions
 * Fetches all cosmetics ordered by type and points required
 *
 * @returns Query result with all cosmetic definitions
 *
 * @example
 * ```tsx
 * const { data: cosmetics, isLoading } = useCosmeticDefinitions();
 *
 * // Group by type
 * const badges = cosmetics?.filter(c => c.type === 'badge');
 * const frames = cosmetics?.filter(c => c.type === 'frame');
 * const titles = cosmetics?.filter(c => c.type === 'title');
 * ```
 */
export function useCosmeticDefinitions() {
  return useQuery({
    queryKey: cosmeticKeys.definitions(),
    queryFn: async (): Promise<CosmeticDefinition[]> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cosmetic_definitions')
        .select('*')
        .order('type')
        .order('points_required');

      if (error) {
        console.error('Error fetching cosmetic definitions:', error);
        throw new Error(error.message);
      }

      return data as CosmeticDefinition[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour - definitions rarely change
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// QUERY: PLAYER COSMETICS
// =====================================================

/**
 * Query: Player's unlocked cosmetics
 * Fetches all cosmetics unlocked by a player with definition details
 *
 * @param playerId - The player's ID
 * @returns Query result with unlocked cosmetics and their definitions
 *
 * @example
 * ```tsx
 * const { data: unlocked } = usePlayerCosmetics(user.id);
 * const unlockedCount = unlocked?.length ?? 0;
 * ```
 */
export function usePlayerCosmetics(playerId: string) {
  return useQuery({
    queryKey: cosmeticKeys.playerCosmetics(playerId),
    queryFn: async (): Promise<PlayerCosmeticWithDefinition[]> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('player_cosmetics')
        .select(
          `
          *,
          cosmetic:cosmetic_definitions(*)
        `
        )
        .eq('player_id', playerId)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching player cosmetics:', error);
        throw new Error(error.message);
      }

      return data as PlayerCosmeticWithDefinition[];
    },
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

// =====================================================
// QUERY: EQUIPPED COSMETICS
// =====================================================

/**
 * Query: Player's equipped cosmetics
 * Fetches the player's currently equipped badge, frame, and title
 *
 * @param playerId - The player's ID
 * @returns Query result with equipped cosmetics
 *
 * @example
 * ```tsx
 * const { data: equipped } = useEquippedCosmetics(user.id);
 *
 * return (
 *   <View>
 *     <ProfileFrame frame={equipped?.frame} />
 *     {equipped?.badge && <Badge badge={equipped.badge} />}
 *     {equipped?.title && <Title title={equipped.title} />}
 *   </View>
 * );
 * ```
 */
export function useEquippedCosmetics(playerId: string) {
  return useQuery({
    queryKey: cosmeticKeys.equipped(playerId),
    queryFn: async (): Promise<EquippedCosmetics> => {
      // Fetch player with equipped cosmetic joins
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('players')
        .select(
          `
          equipped_badge_id,
          equipped_frame_id,
          equipped_title_id,
          equipped_badge:cosmetic_definitions!players_equipped_badge_id_fkey(*),
          equipped_frame:cosmetic_definitions!players_equipped_frame_id_fkey(*),
          equipped_title:cosmetic_definitions!players_equipped_title_id_fkey(*)
        `
        )
        .eq('id', playerId)
        .single();

      if (error) {
        console.error('Error fetching equipped cosmetics:', error);
        throw new Error(error.message);
      }

      // Transform to EquippedCosmetics format
      return {
        badge: data.equipped_badge as CosmeticDefinition | null,
        frame: data.equipped_frame as CosmeticDefinition | null,
        title: data.equipped_title as CosmeticDefinition | null,
      };
    },
    enabled: !!playerId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// =====================================================
// QUERY: UNLOCKABLE COSMETICS
// =====================================================

/**
 * Query: Cosmetics the player can unlock
 * Combines definitions, unlocked cosmetics, and total points to show
 * what cosmetics are available for unlock
 *
 * @param playerId - The player's ID
 * @returns Query result with cosmetics and their unlock status
 *
 * @example
 * ```tsx
 * const { data: cosmetics } = useUnlockableCosmetics(user.id);
 *
 * return (
 *   <View>
 *     {cosmetics?.map(c => (
 *       <CosmeticItem
 *         key={c.id}
 *         cosmetic={c}
 *         canUnlock={c.can_unlock}
 *         isUnlocked={c.is_unlocked}
 *       />
 *     ))}
 *   </View>
 * );
 * ```
 */
export function useUnlockableCosmetics(playerId: string) {
  const { data: definitions, isLoading: isLoadingDefs } = useCosmeticDefinitions();
  const { data: unlocked, isLoading: isLoadingUnlocked } = usePlayerCosmetics(playerId);
  const { points: totalPoints, isLoading: isLoadingPoints } = useAchievementPoints(playerId);

  const cosmetics = useMemo((): (CosmeticWithStatus & { can_unlock: boolean })[] => {
    if (!definitions) return [];

    // Create set of unlocked cosmetic IDs
    const unlockedIds = new Set(unlocked?.map((u) => u.cosmetic_id) ?? []);
    const unlockedMap = new Map(unlocked?.map((u) => [u.cosmetic_id, u.unlocked_at]) ?? []);

    return definitions.map((def) => ({
      ...def,
      is_unlocked: unlockedIds.has(def.id),
      unlocked_at: unlockedMap.get(def.id) ?? null,
      is_equipped: false, // Will be updated by caller if needed
      can_unlock: !unlockedIds.has(def.id) && totalPoints >= def.points_required,
    }));
  }, [definitions, unlocked, totalPoints]);

  return {
    data: cosmetics,
    isLoading: isLoadingDefs || isLoadingUnlocked || isLoadingPoints,
    totalPoints,
    definitions,
    unlocked,
  };
}

// =====================================================
// QUERY: COSMETICS WITH STATUS
// =====================================================

/**
 * Query: All cosmetics with unlock and equipped status
 * Comprehensive view for cosmetic selection UI
 *
 * @param playerId - The player's ID
 * @returns Query result with all cosmetics and their status
 *
 * @example
 * ```tsx
 * const { data: cosmetics } = useCosmeticsWithStatus(user.id);
 *
 * return (
 *   <View>
 *     {cosmetics?.badges.map(c => (
 *       <BadgeItem key={c.id} cosmetic={c} />
 *     ))}
 *   </View>
 * );
 * ```
 */
export function useCosmeticsWithStatus(playerId: string) {
  const { data: definitions, isLoading: isLoadingDefs } = useCosmeticDefinitions();
  const { data: unlocked, isLoading: isLoadingUnlocked } = usePlayerCosmetics(playerId);
  const { data: equipped, isLoading: isLoadingEquipped } = useEquippedCosmetics(playerId);

  const cosmetics = useMemo(() => {
    if (!definitions) return null;

    // Create lookup sets
    const unlockedIds = new Set(unlocked?.map((u) => u.cosmetic_id) ?? []);
    const unlockedMap = new Map(unlocked?.map((u) => [u.cosmetic_id, u.unlocked_at]) ?? []);

    // Get equipped IDs
    const equippedIds = new Set<string>();
    if (equipped?.badge?.id) equippedIds.add(equipped.badge.id);
    if (equipped?.frame?.id) equippedIds.add(equipped.frame.id);
    if (equipped?.title?.id) equippedIds.add(equipped.title.id);

    // Map definitions to CosmeticWithStatus
    const allCosmetics: CosmeticWithStatus[] = definitions.map((def) => ({
      ...def,
      is_unlocked: unlockedIds.has(def.id),
      unlocked_at: unlockedMap.get(def.id) ?? null,
      is_equipped: equippedIds.has(def.id),
    }));

    // Group by type
    return {
      badges: allCosmetics.filter((c) => c.type === 'badge'),
      frames: allCosmetics.filter((c) => c.type === 'frame'),
      titles: allCosmetics.filter((c) => c.type === 'title'),
    };
  }, [definitions, unlocked, equipped]);

  return {
    data: cosmetics,
    isLoading: isLoadingDefs || isLoadingUnlocked || isLoadingEquipped,
    definitions,
    unlocked,
    equipped,
  };
}

// =====================================================
// MUTATION: UNLOCK COSMETIC
// =====================================================

interface UnlockCosmeticInput {
  player_id: string;
  cosmetic_id: string;
}

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
          console.log('Cosmetic already unlocked by player');
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

interface EquipCosmeticInput {
  player_id: string;
  cosmetic_id: string;
  cosmetic_type: CosmeticType;
}

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

interface UnequipCosmeticInput {
  player_id: string;
  cosmetic_type: CosmeticType;
}

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
