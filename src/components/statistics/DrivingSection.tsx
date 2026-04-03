/**
 * DrivingSection - Driving statistics wrapper section
 *
 * Displays Fairways in Regulation percentage prominently with a sparkline
 * trend chart and a FairwayMissDirectionDiagram below when miss data exists.
 *
 * Shows an empty state when no fairway data has been recorded.
 *
 * @example
 * ```tsx
 * <DrivingSection stats={playerStatistics} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { FeatureLock } from '@/components/subscription';
import { SparklineChart } from './SparklineChart';
import { FairwayMissDirectionDiagram } from './FairwayMissDirectionDiagram';
import type { PlayerStatistics } from '@/hooks/playerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface DrivingSectionProps {
  /** Complete player statistics */
  stats: PlayerStatistics;
}

// =====================================================
// COMPONENT
// =====================================================

export const DrivingSection = React.memo(function DrivingSection({
  stats,
}: DrivingSectionProps) {
  const colors = useThemeColors();

  const hasFairwayData = stats.fairwayPercentage !== null && stats.fairwayOpportunities > 0;
  const hasMissData = stats.fairwayMissDirection.totalMisses > 0;

  const trendData = stats.roundTrends.map((r) => r.fairwayPercentage);

  return (
    <FeatureLock feature="score_distribution">
      <View style={styles.container}>
        <SectionHeader title="Driving" icon="golf-tee" />

        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          {hasFairwayData ? (
            <>
              {/* Primary FIR stat + sparkline */}
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

                {/* Sparkline trend */}
                <View style={styles.sparklineWrapper}>
                  <SparklineChart
                    data={trendData}
                    width={80}
                    height={32}
                    color={colors.success}
                    strokeWidth={1.5}
                  />
                  <Text style={[styles.trendLabel, { color: colors.textTertiary }]}>
                    trend
                  </Text>
                </View>
              </View>

              {/* Miss direction diagram */}
              {hasMissData && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.diagramSection}>
                    <Text style={[styles.diagramTitle, { color: colors.textSecondary }]}>
                      Miss Direction
                    </Text>
                    <FairwayMissDirectionDiagram
                      stats={stats.fairwayMissDirection}
                      compact={false}
                    />
                  </View>
                </>
              )}
            </>
          ) : (
            /* Empty state */
            <View style={styles.emptyState}>
              <Icon source="information-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Enable FIR tracking in Settings to see driving stats
              </Text>
            </View>
          )}
        </View>
      </View>
    </FeatureLock>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryStat: {
    flex: 1,
  },
  primaryValue: {
    ...typography.h1,
  },
  primaryLabel: {
    ...typography.smallBold,
    marginTop: spacing.xs,
  },
  subLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  sparklineWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendLabel: {
    ...typography.caption,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  diagramSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  diagramTitle: {
    ...typography.smallBold,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyStateText: {
    ...typography.small,
    flex: 1,
  },
});

export default DrivingSection;
