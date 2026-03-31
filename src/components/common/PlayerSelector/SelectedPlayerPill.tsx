/**
 * SelectedPlayerPill - Rounded pill chip for selected players
 *
 * Displays selected player as a pill with optional remove button.
 * Locked players (e.g., current user) have different styling and no remove button.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconX } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { SelectedPlayerPillProps } from './PlayerSelector.types';

export const SelectedPlayerPill = memo(function SelectedPlayerPill({
  player,
  isLocked = false,
  onRemove,
}: SelectedPlayerPillProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isLocked ? colors.primary : colors.primary + '25',
          borderColor: colors.primary,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Selected: ${player.name}${isLocked ? ' (locked)' : ''}`}
    >
      <Text
        style={[
          styles.name,
          { color: isLocked ? colors.white : colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {player.name}
        {isLocked && ' (You)'}
      </Text>
      {!isLocked && onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${player.name}`}
        >
          <IconX size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  name: {
    ...typography.small,
    fontWeight: '600',
  },
});
