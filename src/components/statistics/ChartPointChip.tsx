/**
 * ChartPointChip - Summary of a tapped chart point, with an optional
 * "View round" action.
 *
 * Line charts focus a point on tap; the chip under the chart shows what was
 * focused and, when the point maps to a round, opens it. A chip is a larger,
 * more reliable target than the chart's small data points.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface ChartPointChipProps {
  /** One-line summary of the focused point */
  summary: string;
  /** Opens the point's round; omitted when the point has no round */
  onViewRound?: () => void;
  /** Screen-reader label for the View round action */
  viewRoundAccessibilityLabel?: string;
}

export function ChartPointChip({
  summary,
  onViewRound,
  viewRoundAccessibilityLabel = 'View round',
}: ChartPointChipProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.chip, { backgroundColor: colors.surfaceVariant }]}>
      <Text style={[styles.summary, { color: colors.textPrimary }]} numberOfLines={1}>
        {summary}
      </Text>
      {onViewRound && (
        <TouchableOpacity
          onPress={onViewRound}
          style={styles.action}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={viewRoundAccessibilityLabel}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>View round</Text>
          <Icon source="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  summary: {
    ...typography.small,
    flex: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    ...typography.smallBold,
  },
});

export default ChartPointChip;
