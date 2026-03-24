/**
 * MyLeaguePerformance - Section B: Current user's personal league stats
 *
 * 2x2 grid: My Rounds, My Avg Diff, My Best Diff, My Avg Gross
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatCard } from '@/components/statistics';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface MyLeaguePerformanceProps {
  myRoundsCount: number;
  myAvgDifferential: number | null;
  myBestDifferential: number | null;
  myAvgGross: number | null;
}

export const MyLeaguePerformance = React.memo(function MyLeaguePerformance({
  myRoundsCount,
  myAvgDifferential,
  myBestDifferential,
  myAvgGross,
}: MyLeaguePerformanceProps) {
  const colors = useThemeColors();

  if (myRoundsCount === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="My Performance" icon="account-circle-outline" />
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Icon source="golf-tee" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Play a round to see your stats
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="My Performance" icon="account-circle-outline" />
      <View style={styles.grid}>
        <StatCard
          title="My Rounds"
          value={myRoundsCount}
          icon="numeric"
          iconColor={colors.primary}
        />
        <StatCard
          title="My Avg Diff"
          value={myAvgDifferential != null ? myAvgDifferential.toFixed(1) : '—'}
          icon="trending-down"
          iconColor={colors.success}
        />
        <StatCard
          title="My Best Diff"
          value={myBestDifferential != null ? myBestDifferential.toFixed(1) : '—'}
          icon="star"
          iconColor={colors.warning}
        />
        <StatCard
          title="My Avg Gross"
          value={myAvgGross != null ? Math.round(myAvgGross) : '—'}
          icon="counter"
          iconColor={colors.info}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    ...typography.small,
    textAlign: 'center',
  },
});

export default MyLeaguePerformance;
