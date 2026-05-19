/**
 * CourseOverviewTab - Overview tab for course statistics
 *
 * Displays score trend chart, overview stats, score distribution,
 * averages, par type stats, and recent rounds.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import {
  StatCard,
  RecentRoundRow,
  ParTypeStatsSection,
  PerformanceChart,
} from '@/components/statistics';
import { formatDateLong } from '@/utils/formatting';
import type { CourseStatisticsData } from '@/hooks/playerStatistics';

interface CourseOverviewTabProps {
  stats: CourseStatisticsData;
}

export const CourseOverviewTab = React.memo(function CourseOverviewTab({
  stats,
}: CourseOverviewTabProps) {
  const colors = useThemeColors();

  // Build chart data from recent rounds (ordered by date ascending)
  const chartRounds = [...stats.recentRounds]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({ date: r.date, totalGross: r.totalGross, totalPoints: r.totalPoints }));

  return (
    <>
      {/* Score Trend */}
      {chartRounds.length >= 2 && (
        <>
          <SectionHeader title="Score Trend" icon="chart-line" />
          <PerformanceChart rounds={chartRounds} />
        </>
      )}

      {/* Overview Stats */}
      <View style={chartRounds.length >= 2 ? styles.sectionGap : undefined} />
      <SectionHeader title="Overview" icon="golf" />
      <View style={styles.statsGrid}>
        <StatCard title="Rounds Played" value={stats.timesPlayed} icon="flag-checkered" iconColor={colors.primary} />
        <StatCard title="Avg Score" value={stats.averageGrossScore || '-'} subtitle="per round" icon="counter" iconColor={colors.info} />
        <StatCard title="Best Score" value={stats.bestGrossScore || '-'} icon="trophy" iconColor={colors.success} />
        <StatCard title="Worst Score" value={stats.worstGrossScore || '-'} icon="flag-variant" iconColor={colors.error} />
      </View>

      {/* Score Distribution */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Score Distribution" icon="chart-bar" />
      <View style={styles.statsGrid}>
        <StatCard title="Eagles" value={stats.scoreDistribution.eagles} icon="star-shooting" iconColor={colors.birdie} />
        <StatCard title="Birdies" value={stats.scoreDistribution.birdies} icon="star" iconColor={colors.birdie} />
        <StatCard title="Pars" value={stats.scoreDistribution.pars} icon="check-circle" iconColor={colors.par} />
        <StatCard title="Bogeys" value={stats.scoreDistribution.bogeys} icon="alert-circle" iconColor={colors.bogey} />
        <StatCard title="Double Bogeys" value={stats.scoreDistribution.doubleBogeys} icon="alert" iconColor={colors.doubleBogey} />
        <StatCard title="Triple+" value={stats.scoreDistribution.triplePlus} icon="alert-octagon" iconColor={colors.error} />
      </View>

      {/* Averages */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Averages" icon="chart-line" />
      <View style={styles.statsGrid}>
        <StatCard title="Avg Points" value={stats.averageStablefordPoints || '-'} subtitle="Stableford" icon="star" iconColor={colors.warning} />
        <StatCard title="Per Hole" value={stats.averageScorePerHole.toFixed(2) || '-'} subtitle="strokes" icon="target" iconColor={colors.info} />
        <StatCard title="Par or Better" value={`${stats.parOrBetterPercentage}%`} subtitle="of holes" icon="check-circle" iconColor={colors.success} />
      </View>

      {/* Par Type Stats */}
      {(stats.par3Stats.holesPlayed > 0 || stats.par4Stats.holesPlayed > 0 || stats.par5Stats.holesPlayed > 0) && (
        <>
          <View style={styles.sectionGap} />
          <ParTypeStatsSection par3Stats={stats.par3Stats} par4Stats={stats.par4Stats} par5Stats={stats.par5Stats} />
        </>
      )}

      {/* Recent Rounds */}
      {stats.recentRounds.length > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Recent Rounds" icon="history" />
          <View style={[styles.listCard, { backgroundColor: colors.surface }, shadows.sm]}>
            {stats.recentRounds.map((round, index) => (
              <RecentRoundRow
                key={round.roundId}
                date={formatDateLong(round.date)}
                courseName={round.courseName}
                clubName={round.clubName}
                competitionName={round.competitionName}
                totalGross={round.totalGross}
                totalPoints={round.totalPoints}
                gameType={round.gameType}
                isLast={index === stats.recentRounds.length - 1}
                isPracticeRound={round.isPracticeRound}
                isHandicapRound={round.isHandicapRound}
              />
            ))}
          </View>
        </>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  sectionGap: { marginTop: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  listCard: { borderRadius: borderRadius.lg, overflow: 'hidden' },
});
