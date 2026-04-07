/**
 * CourseGameStatsTab - Advanced game stats scoped to this course
 *
 * Renders driving (FIR + miss diagram), approach (GIR + miss diagram),
 * short game, putting, bunker, and hazard sections.
 * Driving and Approach are rendered inline because the shared DrivingSection/
 * ApproachSection components require PlayerStatistics, not CourseStatisticsData.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import {
  SparklineChart,
  FairwayMissDirectionDiagram,
  GreenMissDirectionDiagram,
  ShortGameSection,
  PuttingAnalysisSection,
  BunkerStatsSection,
  HazardStatsSection,
} from '@/components/statistics';
import type { CourseStatisticsData } from '@/hooks/playerStatistics';

interface CourseGameStatsTabProps {
  stats: CourseStatisticsData;
}

export const CourseGameStatsTab = React.memo(function CourseGameStatsTab({
  stats,
}: CourseGameStatsTabProps) {
  const colors = useThemeColors();

  const hasFairwayData = stats.fairwayPercentage !== null && stats.fairwayOpportunities > 0;
  const hasMissData = stats.fairwayMissDirection.totalMisses > 0;
  const hasGIRData = stats.girPercentage !== null && stats.girOpportunities > 0;
  const hasGreenMissData = stats.greenMissDirection.totalMisses > 0;

  const firTrend = stats.roundTrends.map((r) => r.fairwayPercentage);
  const girTrend = stats.roundTrends.map((r) => r.girPercentage);

  return (
    <>
      {/* Driving Section (inline) */}
      <SectionHeader title="Driving" icon="golf-tee" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        {hasFairwayData ? (
          <>
            <View style={styles.primaryRow}>
              <View style={styles.primaryStat}>
                <Text style={[styles.primaryValue, { color: colors.success }]}>
                  {stats.fairwayPercentage}%
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textSecondary }]}>
                  Fairways Hit
                </Text>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>
                  {stats.fairwaysHit ?? 0}/{stats.fairwayOpportunities} holes
                </Text>
              </View>
              <SparklineChart data={firTrend} width={80} height={32} color={colors.success} />
            </View>
            {hasMissData && (
              <View style={styles.diagramWrapper}>
                <FairwayMissDirectionDiagram stats={stats.fairwayMissDirection} compact />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Icon source="golf-tee" size={20} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No fairway data recorded at this course
            </Text>
          </View>
        )}
      </View>

      {/* Approach Section (inline) */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Approach" icon="golf" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        {hasGIRData ? (
          <>
            <View style={styles.primaryRow}>
              <View style={styles.primaryStat}>
                <Text style={[styles.primaryValue, { color: colors.success }]}>
                  {stats.girPercentage}%
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textSecondary }]}>
                  Greens in Regulation
                </Text>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>
                  {stats.greensInRegulation ?? 0}/{stats.girOpportunities} holes
                </Text>
              </View>
              <SparklineChart data={girTrend} width={80} height={32} color={colors.success} />
            </View>
            {hasGreenMissData && (
              <View style={styles.diagramWrapper}>
                <GreenMissDirectionDiagram stats={stats.greenMissDirection} compact />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Icon source="golf" size={20} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No GIR data recorded at this course
            </Text>
          </View>
        )}
      </View>

      {/* Short Game */}
      <View style={styles.sectionGap} />
      <ShortGameSection shortGame={stats.shortGame} />

      {/* Putting */}
      <View style={styles.sectionGap} />
      <PuttingAnalysisSection
        puttingDepth={stats.puttingDepth}
        averagePuttsPerHole={stats.averagePuttsPerHole}
        totalPuttsPerRound={stats.averagePuttsPerRound}
      />

      {/* Bunkers */}
      <View style={styles.sectionGap} />
      <BunkerStatsSection bunkerStats={stats.bunkerStats} />

      {/* Hazards */}
      <View style={styles.sectionGap} />
      <HazardStatsSection hazardStats={stats.hazardStats} />
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryStat: {
    flex: 1,
  },
  primaryValue: {
    ...typography.h1,
  },
  primaryLabel: {
    ...typography.body,
    marginTop: 2,
  },
  subLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  diagramWrapper: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyText: {
    ...typography.body,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
});
