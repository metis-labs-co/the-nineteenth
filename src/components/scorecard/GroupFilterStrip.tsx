/**
 * GroupFilterStrip
 *
 * Inline strip shown above the scorecard player rows when the round has
 * multiple pairings and the signed-in user is in one of them. Indicates
 * whether scoring is currently scoped to the user's group or all players,
 * and offers a single-tap toggle between the two.
 *
 * Renders nothing when the filter is not applicable — see useGroupFilter.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface GroupFilterStripProps {
  isFiltered: boolean;
  groupCount: number;
  totalCount: number;
  onToggle: () => void;
}

export const GroupFilterStrip = React.memo(function GroupFilterStrip({
  isFiltered,
  groupCount,
  totalCount,
  onToggle,
}: GroupFilterStripProps) {
  const colors = useThemeColors();

  const label = isFiltered
    ? `Scoring your group · ${groupCount} of ${totalCount}`
    : `Scoring all players · ${totalCount}`;
  const buttonLabel = isFiltered ? 'Show all' : 'Just my group';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
      accessibilityRole="summary"
    >
      <Text
        style={[styles.label, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        hitSlop={8}
      >
        <Text style={[styles.buttonLabel, { color: colors.primary }]}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    minHeight: 44,
    gap: spacing.sm,
  },
  label: {
    ...typography.small,
    flex: 1,
    fontWeight: '500',
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
});
