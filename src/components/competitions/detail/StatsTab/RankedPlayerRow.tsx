/**
 * RankedPlayerRow - single row inside an expanded StatCategoryCard.
 *
 * Displays the player's rank (with a "T" prefix when tied), name, and
 * the stat value. Multiple players sharing a rank render as sibling rows
 * but share the same rank label visually.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface RankedPlayerRowProps {
  /** Pre-formatted rank label, e.g. "1", "T2" */
  rankLabel: string;
  /** Whether to show the rank label (only the first row in a tied group shows it) */
  showRank: boolean;
  playerName: string;
  displayValue: string;
  highlight?: boolean;
}

export const RankedPlayerRow = React.memo(function RankedPlayerRow({
  rankLabel,
  showRank,
  playerName,
  displayValue,
  highlight = false,
}: RankedPlayerRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.row}>
      <View style={styles.rankColumn}>
        {showRank && (
          <Text
            style={[
              styles.rank,
              { color: highlight ? colors.primary : colors.textSecondary },
            ]}
          >
            {rankLabel}
          </Text>
        )}
      </View>
      <Text
        style={[styles.name, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {playerName}
      </Text>
      <Text
        style={[
          styles.value,
          { color: highlight ? colors.primary : colors.textPrimary },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rankColumn: {
    width: 32,
    alignItems: 'flex-start',
  },
  rank: {
    ...typography.small,
    fontWeight: '600',
  },
  name: {
    ...typography.body,
    flex: 1,
  },
  value: {
    ...typography.bodyBold,
  },
});

export default RankedPlayerRow;
