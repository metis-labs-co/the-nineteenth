// src/components/competitions/ringer/RingerScorecard.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RingerEntry } from '@/utils/ringer';

interface RingerScorecardProps {
  entry: RingerEntry;
  /** Resolve a player id to a short display name (for team source tags). */
  shortNameFor: (playerId: string | null) => string;
}

/** Horizontal 18-hole composite card: hole number, best points, source tag. */
export const RingerScorecard = React.memo(function RingerScorecard({
  entry,
  shortNameFor,
}: RingerScorecardProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {entry.holes.map((h) => {
        const tag =
          h.sourceRoundLabel === null
            ? '—'
            : entry.isTeam
              ? `${h.sourceRoundLabel} · ${shortNameFor(h.sourcePlayerId)}`
              : h.sourceRoundLabel;
        return (
          <View
            key={h.hole}
            style={[styles.cell, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityLabel={`Hole ${h.hole}: ${h.points} points, ${tag}`}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{h.hole}</Text>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>{h.points}</Text>
            <Text style={[styles.tag, { color: colors.textTertiary }]} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        );
      })}
      <View
        style={[
          styles.cell,
          styles.totalCell,
          { borderColor: colors.primary, backgroundColor: colors.surface },
        ]}
        accessibilityLabel={`Total: ${entry.total} points`}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[typography.h4, { color: colors.primary }]}>{entry.total}</Text>
        <Text style={[styles.tag, { color: colors.textTertiary }]}>pts</Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cell: {
    width: 56,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    gap: 2,
  },
  totalCell: {
    borderWidth: 2,
  },
  tag: {
    fontSize: 10,
    maxWidth: 52,
  },
});

export default RingerScorecard;
