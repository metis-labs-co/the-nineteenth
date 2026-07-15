/**
 * ProfileQuickStats - Three-tile quick stats row under the profile card.
 *
 * Presentational only: maps values the Profile screen already loads
 * (handicap, achievement points, badges earned) into design-language
 * stat tiles (surface cards, radius 16, big value + uppercase label).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';

interface ProfileQuickStatsProps {
  /** Player's handicap (null if not set) */
  handicap: number | null;
  /** Total achievement points */
  achievementPoints: number;
  /** Number of achievements (badges) earned */
  badgesEarned: number;
}

interface StatTileProps {
  value: string;
  label: string;
}

function StatTile({ value, label }: StatTileProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.tileValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: colors.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const ProfileQuickStats = React.memo(function ProfileQuickStats({
  handicap,
  achievementPoints,
  badgesEarned,
}: ProfileQuickStatsProps) {
  return (
    <View style={styles.row}>
      <StatTile
        value={handicap !== null ? formatHandicapIndex(handicap) : '—'}
        label="HANDICAP"
      />
      <StatTile value={String(achievementPoints)} label="POINTS" />
      <StatTile value={String(badgesEarned)} label="BADGES" />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md + 2,
  },
  tile: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 3,
  },
});

export default ProfileQuickStats;
