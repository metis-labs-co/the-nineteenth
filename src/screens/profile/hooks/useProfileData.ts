/**
 * useProfileData - Aggregates profile-related data fetching
 *
 * Combines authentication, home club, achievements, and cosmetics data
 * into a single hook for the ProfileScreen.
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHomeClub, useSetHomeClub, useClearHomeClub } from '@/hooks/useHomeClub';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import { useAchievementPoints, useAchievementSummary } from '@/hooks/achievements';
import {
  useEquippedCosmetics,
  usePlayerCosmetics,
  useCosmeticDefinitions,
  useEquipCosmetic,
  useUnequipCosmetic,
} from '@/hooks/cosmetics';
import type { CosmeticDefinition, CosmeticType } from '@/types/database/cosmetic.types';

/**
 * Profile display data derived from player and user data
 */
interface ProfileDisplayData {
  displayName: string;
  displayEmail: string;
  displayHandicap: number | null;
  photoUrl: string | null;
}

/**
 * Hook return type
 */
interface UseProfileDataReturn {
  // Auth state
  isLoading: boolean;
  user: ReturnType<typeof useAuth>['user'];
  player: ReturnType<typeof useAuth>['player'];
  logout: () => Promise<void>;

  // Profile display
  profile: ProfileDisplayData;

  // Home club
  homeClub: ReturnType<typeof useHomeClub>['data'];
  setHomeClub: ReturnType<typeof useSetHomeClub>;
  clearHomeClub: ReturnType<typeof useClearHomeClub>;

  // Placeholder players
  placeholderPlayers: ReturnType<typeof usePlaceholderPlayers>['data'];

  // Achievements
  achievementPoints: number;
  achievementSummary: ReturnType<typeof useAchievementSummary>['data'];

  // Cosmetics
  equipped: ReturnType<typeof useEquippedCosmetics>['data'];
  unlockedCosmetics: ReturnType<typeof usePlayerCosmetics>['data'];
  cosmeticDefinitions: ReturnType<typeof useCosmeticDefinitions>['data'];
  handleEquipCosmetic: (cosmetic: CosmeticDefinition) => void;
  handleUnequipCosmetic: (type: CosmeticType) => void;
  isEquipping: boolean;
}

export function useProfileData(): UseProfileDataReturn {
  const { player, user, logout, isLoading } = useAuth();

  // Home club
  const { data: homeClub } = useHomeClub();
  const setHomeClub = useSetHomeClub();
  const clearHomeClub = useClearHomeClub();

  // Placeholder players
  const { data: placeholderPlayers } = usePlaceholderPlayers();

  // Achievements
  const { points: achievementPoints } = useAchievementPoints(user?.id ?? '');
  const { data: achievementSummary } = useAchievementSummary(user?.id ?? '');

  // Cosmetics
  const { data: equipped } = useEquippedCosmetics(user?.id ?? '');
  const { data: unlockedCosmetics } = usePlayerCosmetics(user?.id ?? '');
  const { data: cosmeticDefinitions } = useCosmeticDefinitions();
  const equipCosmetic = useEquipCosmetic();
  const unequipCosmetic = useUnequipCosmetic();

  // Derived profile display data
  const profile = useMemo<ProfileDisplayData>(() => ({
    displayName: player?.name || user?.user_metadata?.name || 'Guest User',
    displayEmail: player?.email || user?.email || 'guest@example.com',
    displayHandicap: player?.handicap ?? null,
    photoUrl: player?.photo_url ?? null,
  }), [player, user]);

  // Cosmetic handlers
  const handleEquipCosmetic = useCallback(
    (cosmetic: CosmeticDefinition) => {
      if (!user?.id) return;
      equipCosmetic.mutate({
        player_id: user.id,
        cosmetic_id: cosmetic.id,
        cosmetic_type: cosmetic.type,
      });
    },
    [user?.id, equipCosmetic]
  );

  const handleUnequipCosmetic = useCallback(
    (type: CosmeticType) => {
      if (!user?.id) return;
      unequipCosmetic.mutate({
        player_id: user.id,
        cosmetic_type: type,
      });
    },
    [user?.id, unequipCosmetic]
  );

  return {
    // Auth state
    isLoading,
    user,
    player,
    logout,

    // Profile display
    profile,

    // Home club
    homeClub,
    setHomeClub,
    clearHomeClub,

    // Placeholder players
    placeholderPlayers,

    // Achievements
    achievementPoints,
    achievementSummary,

    // Cosmetics
    equipped,
    unlockedCosmetics,
    cosmeticDefinitions,
    handleEquipCosmetic,
    handleUnequipCosmetic,
    isEquipping: equipCosmetic.isPending || unequipCosmetic.isPending,
  };
}
