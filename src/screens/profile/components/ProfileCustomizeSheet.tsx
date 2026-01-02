/**
 * ProfileCustomizeSheet - Cosmetic customization bottom sheet
 *
 * Allows users to equip badges, frames, and titles from their
 * unlocked cosmetics collection.
 */

import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { CosmeticSelector } from '@/components/cosmetics';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { CosmeticDefinition, CosmeticType, PlayerCosmetic } from '@/types/database/cosmetic.types';

interface EquippedCosmetics {
  badge: CosmeticDefinition | null;
  frame: CosmeticDefinition | null;
  title: CosmeticDefinition | null;
}

interface UnlockedCosmetic {
  id: string;
  player_id: string;
  cosmetic_id: string;
  unlocked_at: string;
}

interface ProfileCustomizeSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** All available cosmetic definitions */
  cosmeticDefinitions: CosmeticDefinition[];
  /** Cosmetics the player has unlocked */
  unlockedCosmetics: UnlockedCosmetic[];
  /** Currently equipped cosmetics */
  equipped: EquippedCosmetics | null;
  /** Total achievement points for unlocking cosmetics */
  achievementPoints: number;
  /** Callback when a cosmetic is equipped */
  onEquip: (cosmetic: CosmeticDefinition) => void;
  /** Callback when a cosmetic is unequipped */
  onUnequip: (type: CosmeticType) => void;
}

export const ProfileCustomizeSheet = React.memo(function ProfileCustomizeSheet({
  visible,
  onClose,
  cosmeticDefinitions,
  unlockedCosmetics,
  equipped,
  achievementPoints,
  onEquip,
  onUnequip,
}: ProfileCustomizeSheetProps) {
  const colors = useThemeColors();

  // Convert unlocked cosmetics to PlayerCosmetic format for CosmeticSelector
  const unlockedAsPlayerCosmetics: PlayerCosmetic[] = unlockedCosmetics.map((pc) => ({
    id: pc.id,
    player_id: pc.player_id,
    cosmetic_id: pc.cosmetic_id,
    unlocked_at: pc.unlocked_at,
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Customize Profile"
      height={0.8}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Badges Section */}
        <CosmeticSelector
          type="badge"
          cosmetics={cosmeticDefinitions}
          unlocked={unlockedAsPlayerCosmetics}
          equipped={equipped?.badge ?? null}
          totalPoints={achievementPoints}
          onEquip={onEquip}
          onUnequip={() => onUnequip('badge')}
          testID="cosmetic-selector-badge"
        />

        {/* Frames Section */}
        <CosmeticSelector
          type="frame"
          cosmetics={cosmeticDefinitions}
          unlocked={unlockedAsPlayerCosmetics}
          equipped={equipped?.frame ?? null}
          totalPoints={achievementPoints}
          onEquip={onEquip}
          onUnequip={() => onUnequip('frame')}
          testID="cosmetic-selector-frame"
        />

        {/* Titles Section */}
        <CosmeticSelector
          type="title"
          cosmetics={cosmeticDefinitions}
          unlocked={unlockedAsPlayerCosmetics}
          equipped={equipped?.title ?? null}
          totalPoints={achievementPoints}
          onEquip={onEquip}
          onUnequip={() => onUnequip('title')}
          testID="cosmetic-selector-title"
        />

        {/* Points Info */}
        <View style={[styles.pointsInfo, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source="star" size={20} color={colors.primary} />
          <Text style={[styles.pointsText, { color: colors.textPrimary }]}>
            You have {achievementPoints} achievement points
          </Text>
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Earn more achievements to unlock additional cosmetics!
        </Text>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.lg,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  pointsText: {
    ...typography.body,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
  },
});

export default ProfileCustomizeSheet;
