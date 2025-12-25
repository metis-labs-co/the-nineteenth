/**
 * PlayerSelectionChip - Tappable chip for selecting players during manual pairing
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import { IconCheck } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  type ColorPalette,
} from '@/constants/theme';
import type { Player } from '@/types/database.types';

interface PlayerSelectionChipProps {
  player: Player;
  isSelected: boolean;
  isCompact?: boolean;
  onPress: () => void;
  colors: ColorPalette;
}

export const PlayerSelectionChip = React.memo(function PlayerSelectionChip({
  player,
  isSelected,
  isCompact = false,
  onPress,
  colors,
}: PlayerSelectionChipProps) {
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isCompact && styles.chipCompact,
        isSelected && styles.chipSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${isSelected ? ', selected' : ''}`}
      accessibilityHint="Tap to select for pairing"
      accessibilityState={{ selected: isSelected }}
    >
      <PlayerAvatar
        photoUrl={player.photo_url}
        name={player.name}
        size={isCompact ? 28 : 32}
        style={styles.avatar}
      />
      <Text
        style={[
          styles.name,
          isCompact && styles.nameCompact,
          isSelected && { color: colors.primary },
        ]}
        numberOfLines={1}
      >
        {player.name}
      </Text>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <IconCheck size={14} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
});

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      ...shadows.sm,
    },
    chipCompact: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    chipSelected: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
      borderWidth: 2,
    },
    avatar: {
      marginRight: 0,
    },
    name: {
      ...typography.small,
      color: colors.textPrimary,
      maxWidth: 100,
    },
    nameCompact: {
      ...typography.caption,
      maxWidth: 80,
    },
    selectedIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default PlayerSelectionChip;
