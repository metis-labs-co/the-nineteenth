import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { MatchPlayRowData } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

export interface MatchPlayMatchRowProps {
  leftName: string;
  rightName: string;
  /** Team colour for the left side (team_a). */
  leftColor: string;
  /** Team colour for the right side (team_b). */
  rightColor: string;
  data: MatchPlayRowData;
  /** Emphasise a name when it is the current user. */
  highlightLeft?: boolean;
  highlightRight?: boolean;
  testID?: string;
}

export function MatchPlayMatchRow({
  leftName,
  rightName,
  leftColor,
  rightColor,
  data,
  highlightLeft = false,
  highlightRight = false,
  testID,
}: MatchPlayMatchRowProps) {
  const colors = useThemeColors();
  const statusColor =
    data.leaderSide === 'a' ? leftColor : data.leaderSide === 'b' ? rightColor : colors.textSecondary;

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID={testID}
    >
      <View style={[styles.side, styles.left]}>
        <View style={[styles.dot, { backgroundColor: leftColor }]} />
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: colors.textPrimary, fontWeight: highlightLeft ? '700' : '500' },
          ]}
        >
          {leftName}
        </Text>
      </View>

      <Text
        testID="match-row-status"
        style={[styles.status, { color: statusColor }]}
        accessibilityLabel={`Match status ${data.statusText}`}
      >
        {data.statusText}
      </Text>

      <View style={[styles.side, styles.right]}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            styles.nameRight,
            { color: colors.textPrimary, fontWeight: highlightRight ? '700' : '500' },
          ]}
        >
          {rightName}
        </Text>
        <View style={[styles.dot, { backgroundColor: rightColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { ...typography.body, flexShrink: 1 },
  nameRight: { textAlign: 'right' },
  status: { ...typography.h4, fontWeight: '800', textAlign: 'center', minWidth: 64, paddingHorizontal: spacing.sm },
});
