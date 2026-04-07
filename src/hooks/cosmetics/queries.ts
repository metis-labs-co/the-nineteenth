/**
 * Cosmetic Query Hooks
 *
 * TanStack Query hooks for fetching cosmetic data:
 * - useCosmeticDefinitions() - All cosmetic definitions
 * - usePlayerCosmetics(playerId) - Player's unlocked cosmetics
 * - useEquippedCosmetics(playerId) - Player's equipped cosmetics
 * - useUnlockableCosmetics(playerId) - Cosmetics player can unlock
 * - useCosmeticsWithStatus(playerId) - All cosmetics with unlock/equipped status
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { cosmeticKeys } from '../queryKeys';
import { useAchievementPoints } from '../achievements/utilities';
import type {
  CosmeticDefinition,
  PlayerCosmeticWithDefinition,
  EquippedCosmetics,
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
    staleTime: CACHE_TIMES.STANDARD, // 5 minutes
    gcTime: GC_TIMES.STANDARD, // 10 minutes
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
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
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
