/**
 * LeagueOverviewStats - Section A: League-wide aggregate stats
 *
 * 2x2 grid: Total Rounds, Active Players, Avg Differential, Courses Played
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatCard } from '@/components/statistics';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface LeagueOverviewStatsProps {
  totalRounds: number;
  activePlayers: number;
  avgDifferential: number | null;
  coursesPlayed: number;
}

export const LeagueOverviewStats = React.memo(function LeagueOverviewStats({
  totalRounds,
  activePlayers,
  avgDifferential,
  coursesPlayed,
}: LeagueOverviewStatsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <SectionHeader title="League Overview" icon="chart-box-outline" />
      <View style={styles.grid}>
        <StatCard
          title="Total Rounds"
          value={totalRounds}
          icon="golf"
          iconColor={colors.primary}
        />
        <StatCard
          title="Active Players"
          value={activePlayers}
          icon="account-group"
          iconColor={colors.success}
        />
        <StatCard
          title="Avg Differential"
          value={avgDifferential != null ? avgDifferential.toFixed(1) : '—'}
          icon="chart-line"
          iconColor={colors.warning}
        />
        <StatCard
          title="Courses Played"
          value={coursesPlayed}
          icon="map-marker-multiple"
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
});

export default LeagueOverviewStats;
