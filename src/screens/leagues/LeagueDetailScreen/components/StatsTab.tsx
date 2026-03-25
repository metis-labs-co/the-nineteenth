/**
 * StatsTab - League statistics tab for standard league types
 *
 * Sections:
 * A. League Overview (Free)
 * B. My Performance (Free)
 * C. Differential Trend Chart (Social+ - score_distribution)
 * D. Score Distribution (Social+ - score_distribution)
 * E. Course Breakdown (Free)
 * F. League Records (Free)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ErrorState, LoadingSpinner } from '@/components/common';
import { FeatureLock } from '@/components/subscription';
import { useLeagueStats } from '@/hooks/useLeagueStats';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

import {
  LeagueOverviewStats,
  MyLeaguePerformance,
  DifferentialTrendChart,
  LeagueScoreDistribution,
  LeagueCourseBreakdown,
  LeagueRecordsSection,
} from './stats';

interface StatsTabProps {
  leagueId: string;
}

export default function StatsTab({ leagueId }: StatsTabProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: stats, isLoading, error } = useLeagueStats(leagueId);

  const handleUpgradePress = () => {
    navigation.navigate('Subscription');
  };

  if (isLoading) {
    return (
      <LoadingSpinner size="md" message="Loading statistics..." />
    );
  }

  if (error) {
    return (
      <ErrorState error="Failed to load statistics" compact />
    );
  }

  if (!stats || stats.total_rounds === 0) {
    return (
      <View style={styles.centered}>
        <Icon source="chart-box-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No Statistics Yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Tag rounds to see league statistics
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section A: League Overview (Free) */}
      <LeagueOverviewStats
        totalRounds={stats.total_rounds}
        activePlayers={stats.active_players}
        avgDifferential={stats.league_avg_differential}
        coursesPlayed={stats.courses_played}
      />

      {/* Section B: My Performance (Free) */}
      <MyLeaguePerformance
        myRoundsCount={stats.my_rounds_count}
        myAvgDifferential={stats.my_avg_differential}
        myBestDifferential={stats.my_best_differential}
        myAvgGross={stats.my_avg_gross}
      />

      {/* Section C: Differential Trend (Social+ tier) */}
      <FeatureLock feature="score_distribution" onUpgradePress={handleUpgradePress}>
        <DifferentialTrendChart differentials={stats.my_differentials} />
      </FeatureLock>

      {/* Section D: Score Distribution (Social+ tier) */}
      {stats.scoreDistribution && (
        <FeatureLock feature="score_distribution" onUpgradePress={handleUpgradePress}>
          <LeagueScoreDistribution distribution={stats.scoreDistribution} />
        </FeatureLock>
      )}

      {/* Section E: Course Breakdown (Free) */}
      <LeagueCourseBreakdown courseStats={stats.course_stats} />

      {/* Section F: League Records (Free) */}
      {stats.records && <LeagueRecordsSection records={stats.records} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
