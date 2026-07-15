/**
 * RankedPlayerRow - single runner-up row inside a StatCategoryCard.
 *
 * Design (competition-details redesign, Stats tab): position number,
 * small dot, name, bold value — all on one compact line.
 * Multiple players sharing a rank render as sibling rows but only the
 * first shows the rank label.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';

export interface RankedPlayerRowProps {
  /** Pre-formatted rank label, e.g. "2", "T2" */
  rankLabel: string;
  /** Whether to show the rank label (only the first row in a tied group shows it) */
  showRank: boolean;
  playerName: string;
  displayValue: string;
  /** Dot colour; defaults to the theme primary when no team context exists. */
  dotColor?: string;
}

export const RankedPlayerRow = React.memo(function RankedPlayerRow({
  rankLabel,
  showRank,
  playerName,
  displayValue,
  dotColor,
}: RankedPlayerRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${rankLabel}. ${playerName}, ${displayValue}`}
    >
      <Text style={[styles.rank, { color: colors.textTertiary }]}>
        {showRank ? rankLabel : ''}
      </Text>
      <View
        style={[styles.dot, { backgroundColor: dotColor ?? colors.primary }]}
      />
      <Text
        style={[styles.name, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {playerName}
      </Text>
      <Text style={[styles.value, { color: colors.textSecondary }]}>
        {displayValue}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  rank: {
    fontSize: 11,
    fontWeight: '700',
    width: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  name: {
    flex: 1,
    fontSize: 12.5,
  },
  value: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});

export default RankedPlayerRow;
