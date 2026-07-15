/**
 * RoundByRoundList - Compact tappable per-round rows for the Standings tab
 *
 * Each row: format badge, round title + sub line, optional score, optional
 * winner dot. Tapping a row switches the standings scope to that round.
 * Purely presentational.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface RoundByRoundRow {
  key: string;
  /** Short format badge, e.g. "Team Stbf" */
  badge: string;
  /** Row title, e.g. "Round 1 · Team Stableford" */
  name: string;
  /** Muted sub line, e.g. course/date or status */
  sub?: string;
  /** Right-aligned score, e.g. "2 – 0" */
  score?: string;
  /** Colour for the score text (defaults to textPrimary) */
  scoreColor?: string;
  /** Winner dot colour; omit for no dot, pass a neutral for ties */
  dotColor?: string;
  onPress?: () => void;
}

export interface RoundByRoundListProps {
  rows: RoundByRoundRow[];
  testID?: string;
}

export function RoundByRoundList({ rows, testID }: RoundByRoundListProps) {
  const colors = useThemeColors();

  if (rows.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      testID={testID}
    >
      {rows.map((row, index) => (
        <TouchableOpacity
          key={row.key}
          onPress={row.onPress}
          disabled={!row.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${row.name}${row.score ? `, ${row.score}` : ''}`}
          style={[
            styles.row,
            index < rows.length - 1 && [
              styles.rowDivider,
              { borderBottomColor: colors.borderLight },
            ],
          ]}
          testID={testID ? `${testID}-row-${row.key}` : undefined}
        >
          <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {row.badge}
            </Text>
          </View>
          <View style={styles.body}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {row.name}
            </Text>
            {row.sub ? (
              <Text style={[styles.sub, { color: colors.textTertiary }]} numberOfLines={1}>
                {row.sub}
              </Text>
            ) : null}
          </View>
          {row.score ? (
            <Text
              style={[styles.score, { color: row.scoreColor ?? colors.textPrimary }]}
            >
              {row.score}
            </Text>
          ) : null}
          {row.dotColor ? (
            <View style={[styles.dot, { backgroundColor: row.dotColor }]} />
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl + 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 1,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.md + 2,
    minHeight: 44,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    marginTop: 1,
  },
  score: {
    fontSize: 15,
    fontWeight: '800',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
});

export default RoundByRoundList;
