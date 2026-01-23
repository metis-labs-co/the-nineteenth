/**
 * PuttingAnalysisSection - Extended putting statistics section
 *
 * Displays one-putt %, three-putt %, putts per GIR, and existing putt averages.
 * Shows empty state when putt tracking is not enabled.
 *
 * @example
 * ```tsx
 * <PuttingAnalysisSection
 *   puttingDepth={stats.puttingDepth}
 *   averagePuttsPerHole={stats.averagePuttsPerHole}
 *   totalPuttsPerRound={stats.averagePuttsPerRound}
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { FeatureLock } from '@/components/subscription';
import type { PuttingDepthStats } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface PuttingAnalysisSectionProps {
  /** Extended putting statistics */
  puttingDepth: PuttingDepthStats;
  /** Average putts per hole (from existing stats) */
  averagePuttsPerHole: number | null;
  /** Average total putts per round (from existing stats) */
  totalPuttsPerRound: number | null;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface StatBoxProps {
  label: string;
  value: string;
  color?: string;
  accessibilityLabel: string;
}

const StatBox = React.memo(function StatBox({
  label,
  value,
  color,
  accessibilityLabel,
}: StatBoxProps) {
  const colors = useThemeColors();
  const valueColor = color || colors.textPrimary;

  return (
    <View
      style={styles.statBox}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.statBoxValueContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.statBoxValue, { color: valueColor }]}>
          {value}
        </Text>
      </View>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const PuttingAnalysisSection = React.memo(function PuttingAnalysisSection({
  puttingDepth,
  averagePuttsPerHole,
  totalPuttsPerRound,
}: PuttingAnalysisSectionProps) {
  const colors = useThemeColors();

  const hasPuttData = puttingDepth.onePuttPercentage !== null;

  return (
    <FeatureLock feature="score_distribution">
      <View style={styles.container}>
        <SectionHeader title="Putting Analysis" icon="golf" />

        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          {hasPuttData ? (
            <>
              {/* Main Stats Row */}
              <View style={styles.mainStatsRow}>
                <StatBox
                  label="One-Putt %"
                  value={`${puttingDepth.onePuttPercentage}%`}
                  color={colors.success}
                  accessibilityLabel={`One-putt percentage: ${puttingDepth.onePuttPercentage}%`}
                />
                <StatBox
                  label="Three-Putt %"
                  value={`${puttingDepth.threePuttPercentage}%`}
                  color={colors.error}
                  accessibilityLabel={`Three-putt percentage: ${puttingDepth.threePuttPercentage}%`}
                />
                <StatBox
                  label="Putts/GIR"
                  value={puttingDepth.puttsPerGIR !== null ? puttingDepth.puttsPerGIR.toFixed(2) : 'N/A'}
                  accessibilityLabel={`Average putts when hitting green in regulation: ${puttingDepth.puttsPerGIR !== null ? puttingDepth.puttsPerGIR.toFixed(2) : 'not available'}`}
                />
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Secondary Stats */}
              <View
                style={styles.secondaryStatsRow}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Average putts: ${averagePuttsPerHole?.toFixed(2) ?? '-'} per hole, ${totalPuttsPerRound?.toFixed(1) ?? '-'} per round`}
              >
                <View style={styles.secondaryStatItem}>
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Avg Putts:
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.textPrimary }]}>
                    {averagePuttsPerHole?.toFixed(2) ?? '-'}/hole
                  </Text>
                </View>
                <View style={[styles.secondaryDivider, { backgroundColor: colors.textTertiary }]} />
                <View style={styles.secondaryStatItem}>
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Total:
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.textPrimary }]}>
                    {totalPuttsPerRound?.toFixed(1) ?? '-'}/round
                  </Text>
                </View>
              </View>
            </>
          ) : (
            /* Empty State - No Putt Data */
            <View style={styles.emptyState}>
              <Icon source="information-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Enable putt tracking in Settings to see putting analysis
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
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statBoxValueContainer: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxValue: {
    ...typography.h3,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  secondaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  secondaryLabel: {
    ...typography.small,
  },
  secondaryValue: {
    ...typography.smallBold,
  },
  secondaryDivider: {
    width: 1,
    height: 16,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyStateText: {
    ...typography.body,
    flex: 1,
  },
});

export default PuttingAnalysisSection;
