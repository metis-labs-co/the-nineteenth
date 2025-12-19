/**
 * SelectedPlayerChip - Rounded pill chip for selected players
 *
 * Uses the PartnersStep design: custom View with border instead of Paper Chip.
 * Special styling for current user (darker background, no remove button).
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconX } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { SelectedPlayerChipProps } from './FriendSelector.types';

export const SelectedPlayerChip = memo(function SelectedPlayerChip({
  player,
  onRemove,
  isCurrentUser = false,
}: SelectedPlayerChipProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isCurrentUser ? colors.primary : colors.primaryLighter,
          borderColor: colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.name,
          { color: isCurrentUser ? colors.white : colors.primaryDark },
        ]}
        numberOfLines={1}
      >
        {player.name}
        {isCurrentUser && ' (You)'}
      </Text>
      {!isCurrentUser && onRemove && (
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
  chip: {
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
