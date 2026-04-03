/**
 * ApproachSection - Approach statistics wrapper section
 *
 * Displays Greens in Regulation percentage prominently with a sparkline
 * trend chart and a GreenMissDirectionDiagram below when miss data exists.
 *
 * Shows an empty state when no GIR data has been recorded.
 *
 * @example
 * ```tsx
 * <ApproachSection stats={playerStatistics} />
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
import { GreenMissDirectionDiagram } from './GreenMissDirectionDiagram';
import type { PlayerStatistics } from '@/hooks/playerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface ApproachSectionProps {
  /** Complete player statistics */
  stats: PlayerStatistics;
  /** Callback when upgrade is pressed on premium-locked content */
  onUpgradePress?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const ApproachSection = React.memo(function ApproachSection({
  stats,
  onUpgradePress,
}: ApproachSectionProps) {
  const colors = useThemeColors();

  const hasGIRData = stats.girPercentage !== null && stats.girOpportunities > 0;
  const hasMissData = stats.greenMissDirection.totalMisses > 0;

  const trendData = stats.roundTrends.map((r) => r.girPercentage);

  return (
    <FeatureLock feature="detailed_stats" onUpgradePress={onUpgradePress}>
      <View style={styles.container}>
        <SectionHeader title="Approach" icon="golf" />

        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          {hasGIRData ? (
            <>
              {/* Primary GIR stat + sparkline */}
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

              {/* Miss direction diagram - Premium tier */}
              {hasMissData && (
                <FeatureLock feature="advanced_stats" onUpgradePress={onUpgradePress} lockedMessage="Unlock miss tendencies">
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.diagramSection}>
                    <Text style={[styles.diagramTitle, { color: colors.textSecondary }]}>
                      Miss Direction
                    </Text>
                    <GreenMissDirectionDiagram
                      stats={stats.greenMissDirection}
                      compact={false}
                    />
                  </View>
                </FeatureLock>
              )}
            </>
          ) : (
            /* Empty state */
            <View style={styles.emptyState}>
              <Icon source="information-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Enable GIR tracking in Settings to see approach stats
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

export default ApproachSection;
