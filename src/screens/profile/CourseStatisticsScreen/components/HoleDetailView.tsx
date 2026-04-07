/**
 * HoleDetailView - Detailed breakdown for a selected hole
 *
 * Shows score trend sparkline, score distribution bars, and key stats.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { StatCard, SparklineChart, ScoreDistributionBar } from '@/components/statistics';
import type { HoleStatistics } from '@/hooks/playerStatistics';

interface HoleDetailViewProps {
  hole: HoleStatistics;
}

export const HoleDetailView = React.memo(function HoleDetailView({
  hole,
}: HoleDetailViewProps) {
  const colors = useThemeColors();

  const scoreToParColor = hole.scoreToPar < -0.05 ? colors.birdie
    : hole.scoreToPar > 0.05 ? colors.bogey : colors.par;

  const scoreToParLabel = Math.abs(hole.scoreToPar) < 0.05 ? 'E'
    : `${hole.scoreToPar > 0 ? '+' : ''}${hole.scoreToPar.toFixed(1)}`;

  const trendData = hole.scoreTrend.map((t) => t.score);
  const totalDistribution = hole.birdieOrBetterPercentage + hole.parPercentage
    + hole.bogeyPercentage + hole.doublePlusPercentage;

  return (
    <>
      {/* Hole Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface }, shadows.sm]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Hole {hole.holeNumber}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Par {hole.par} · Played {hole.timesPlayed}x
            </Text>
          </View>
          <View style={styles.headerScores}>
            <Text style={[styles.avgScore, { color: colors.textPrimary }]}>
              {hole.averageScore.toFixed(1)}
            </Text>
            <Text style={[styles.scoreToPar, { color: scoreToParColor }]}>
              {scoreToParLabel}
            </Text>
          </View>
        </View>

        {/* Score Trend Sparkline */}
        {trendData.length >= 2 && (
          <View style={styles.sparklineRow}>
            <Text style={[styles.sparklineLabel, { color: colors.textTertiary }]}>
              Score trend
            </Text>
            <SparklineChart data={trendData} width={200} height={36} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Score Distribution */}
      {totalDistribution > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Score Distribution" icon="chart-bar" />
          <View style={[styles.distCard, { backgroundColor: colors.surface }, shadows.sm]}>
            <ScoreDistributionBar label="Birdie+" count={Math.round(hole.birdieOrBetterPercentage)} total={100} color={colors.birdie} />
            <ScoreDistributionBar label="Par" count={Math.round(hole.parPercentage)} total={100} color={colors.par} />
            <ScoreDistributionBar label="Bogey" count={Math.round(hole.bogeyPercentage)} total={100} color={colors.bogey} />
            <ScoreDistributionBar label="Double+" count={Math.round(hole.doublePlusPercentage)} total={100} color={colors.doubleBogey} />
          </View>
        </>
      )}

      {/* Stats Grid */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Hole Stats" icon="golf" />
      <View style={styles.statsGrid}>
        {hole.averagePutts !== null && (
          <StatCard title="Avg Putts" value={hole.averagePutts.toFixed(1)} icon="golf" iconColor={colors.info} />
        )}
        {hole.girPercentage !== null && (
          <StatCard title="GIR" value={`${hole.girPercentage}%`} icon="bullseye-arrow" iconColor={colors.success} />
        )}
        {hole.fairwayPercentage !== null && (
          <StatCard title="Fairway" value={`${hole.fairwayPercentage}%`} icon="golf-tee" iconColor={colors.primary} />
        )}
        <StatCard title="Best" value={hole.bestScore} icon="trophy" iconColor={colors.success} />
        <StatCard title="Worst" value={hole.worstScore} icon="flag-variant" iconColor={colors.error} />
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
  },
  headerSub: {
    ...typography.body,
    marginTop: 2,
  },
  headerScores: {
    alignItems: 'flex-end',
  },
  avgScore: {
    ...typography.h1,
  },
  scoreToPar: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  sparklineLabel: {
    ...typography.caption,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
  distCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
});
