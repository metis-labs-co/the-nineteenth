// src/components/competitions/ringer/RingerTeamCard.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RingerEntry } from '@/utils/ringer';

interface RingerTeamCardProps {
  entry: RingerEntry;
  /** Resolve a player id to a short display name. */
  shortNameFor: (playerId: string | null) => string;
}

/**
 * Expanded team body: a "most hole contributions" mini-leaderboard followed by a
 * vertical 18-row composite scorecard (Hole · Par · Player · Pts · Shots).
 */
export const RingerTeamCard = React.memo(function RingerTeamCard({
  entry,
  shortNameFor,
}: RingerTeamCardProps) {
  const colors = useThemeColors();

  const contributions = useMemo(() => {
    const counts = new Map<string, number>();
    entry.holes.forEach((h) => {
      if (h.sourcePlayerId) {
        counts.set(h.sourcePlayerId, (counts.get(h.sourcePlayerId) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([playerId, count]) => ({ playerId, name: shortNameFor(playerId), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [entry.holes, shortNameFor]);

  return (
    <View style={styles.container}>
      {contributions.length > 0 && (
        <View
          style={[styles.contrib, { backgroundColor: colors.surfaceVariant }]}
          accessibilityLabel={`Hole contributions: ${contributions
            .map((c) => `${c.name} ${c.count}`)
            .join(', ')}`}
        >
          <Text style={[typography.caption, styles.contribTitle, { color: colors.textSecondary }]}>
            Hole contributions
          </Text>
          <View style={styles.contribRow}>
            {contributions.map((c) => (
              <View key={c.playerId} style={styles.contribItem}>
                <Text style={[typography.smallBold, { color: colors.textPrimary }]}>{c.name}</Text>
                <Text style={[typography.small, { color: colors.primary }]}>{c.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.row, styles.headerRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colHole, typography.caption, { color: colors.textSecondary }]}>Hole</Text>
        <Text style={[styles.colPar, typography.caption, { color: colors.textSecondary }]}>Par</Text>
        <Text style={[styles.colPlayer, typography.caption, { color: colors.textSecondary }]}>Player</Text>
        <Text style={[styles.colPts, typography.caption, { color: colors.textSecondary }]}>Pts</Text>
        <Text style={[styles.colShots, typography.caption, { color: colors.textSecondary }]}>Shots</Text>
      </View>

      {entry.holes.map((h) => (
        <View
          key={h.hole}
          style={[styles.row, { borderBottomColor: colors.border }]}
          accessibilityLabel={`Hole ${h.hole}, par ${h.par ?? 'unknown'}, ${shortNameFor(h.sourcePlayerId)}, ${h.points} points, ${h.strokes ?? 'no'} shots`}
        >
          <Text style={[styles.colHole, typography.body, { color: colors.textPrimary }]}>{h.hole}</Text>
          <Text style={[styles.colPar, typography.body, { color: colors.textSecondary }]}>
            {h.par ?? '—'}
          </Text>
          <Text
            style={[styles.colPlayer, typography.body, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {shortNameFor(h.sourcePlayerId)}
          </Text>
          <Text style={[styles.colPts, typography.body, { color: colors.primary }]}>{h.points}</Text>
          <Text style={[styles.colShots, typography.body, { color: colors.textSecondary }]}>
            {h.strokes ?? '—'}
          </Text>
        </View>
      ))}

      <View
        style={[styles.row, styles.totalRow, { borderTopColor: colors.border }]}
        accessibilityLabel={`Total ${entry.total} points`}
      >
        <Text style={[styles.colHole, typography.body, { color: colors.textPrimary }]}>Tot</Text>
        <View style={styles.colPar} />
        <View style={styles.colPlayer} />
        <Text style={[styles.colPts, typography.body, styles.bold, { color: colors.primary }]}>
          {entry.total}
        </Text>
        <View style={styles.colShots} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  contrib: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  contribTitle: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  contribRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  contribItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  bold: {
    fontWeight: '700',
  },
  colHole: { width: 44 },
  colPar: { width: 40, textAlign: 'center' },
  colPlayer: { flex: 1 },
  colPts: { width: 44, textAlign: 'right' },
  colShots: { width: 52, textAlign: 'right' },
});
