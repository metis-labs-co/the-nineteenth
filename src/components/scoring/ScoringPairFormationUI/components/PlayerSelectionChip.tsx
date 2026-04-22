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
  /** Team the player belongs to. When present, shown as a small italic
   *  label under the player's name inside the chip. */
  teamName?: string;
  /** Team tint colour (a semantic palette colour like `colors.success`).
   *  When present, the chip background and border pick up a light and
   *  full tint of this colour so you can read team membership at a
   *  glance. */
  teamColor?: string;
  colors: ColorPalette;
}

export const PlayerSelectionChip = React.memo(function PlayerSelectionChip({
  player,
  isSelected,
  isCompact = false,
  onPress,
  teamName,
  teamColor,
  colors,
}: PlayerSelectionChipProps) {
  const styles = createStyles(colors);

  // Selection state takes precedence over team tint — a selected chip
  // always reads as "picked" (primary tint). Unselected chips wear
  // their team colour if one was supplied.
  const teamTintStyle =
    !isSelected && teamColor
      ? {
          backgroundColor: `${teamColor}15`,
          borderColor: teamColor,
        }
      : null;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isCompact && styles.chipCompact,
        teamTintStyle,
        isSelected && styles.chipSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${teamName ? `, ${teamName}` : ''}${
        isSelected ? ', selected' : ''
      }`}
      accessibilityHint="Tap to select for pairing"
      accessibilityState={{ selected: isSelected }}
    >
      <PlayerAvatar
        photoUrl={player.photo_url}
        name={player.name}
        size={isCompact ? 28 : 32}
        style={styles.avatar}
      />
      <View style={styles.nameColumn}>
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
        {teamName && (
          <Text
            style={[
              styles.teamName,
              isCompact && styles.teamNameCompact,
              teamColor ? { color: teamColor, opacity: 1 } : null,
            ]}
            numberOfLines={1}
          >
            {teamName}
          </Text>
        )}
      </View>
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
    nameColumn: {
      flexShrink: 1,
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
    teamName: {
      ...typography.caption,
      color: colors.textSecondary,
      fontStyle: 'italic',
      opacity: 0.7,
      maxWidth: 100,
    },
    teamNameCompact: {
      fontSize: 10,
      lineHeight: 12,
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
