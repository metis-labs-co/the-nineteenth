/**
 * HazardStatsSection - Hazard frequency breakdown card
 *
 * Displays 4 rows with icons for each hazard type: Water, Out of Bounds,
 * Lateral Hazard, and Lost Ball, with their respective counts.
 * Also shows a summary row with total hazards and average per round.
 *
 * Shows an empty state when totalHolesTracked === 0.
 *
 * @example
 * ```tsx
 * <HazardStatsSection hazardStats={stats.hazardStats} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { FeatureLock } from '@/components/subscription';
import type { HazardStats } from '@/hooks/playerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface HazardStatsSectionProps {
  /** Hazard aggregate statistics */
  hazardStats: HazardStats;
}

interface HazardRowProps {
  icon: string;
  label: string;
  count: number;
  color?: string;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

const HazardRow = React.memo(function HazardRow({
  icon,
  label,
  count,
  color,
}: HazardRowProps) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.textSecondary;

  return (
    <View
      style={styles.hazardRow}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${count}`}
    >
      <Icon source={icon} size={20} color={iconColor} />
      <Text style={[styles.hazardLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.hazardCount, { color: count > 0 ? colors.error : colors.textSecondary }]}>
        {count}
      </Text>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const HazardStatsSection = React.memo(function HazardStatsSection({
  hazardStats,
}: HazardStatsSectionProps) {
  const colors = useThemeColors();

  const hasData = hazardStats.totalHolesTracked > 0;

  return (
    <FeatureLock feature="score_distribution">
      <View style={styles.container}>
        <SectionHeader title="Hazards" icon="alert-circle-outline" />

        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          {hasData ? (
            <>
              {/* Hazard type rows */}
              <HazardRow
                icon="water"
                label="Water"
                count={hazardStats.waterCount}
                color={colors.primary}
              />
              <HazardRow
                icon="flag-outline"
                label="Out of Bounds"
                count={hazardStats.obCount}
                color={colors.error}
              />
              <HazardRow
                icon="arrow-right-circle-outline"
                label="Lateral Hazard"
                count={hazardStats.lateralCount}
                color={colors.warning}
              />
              <HazardRow
                icon="help-circle-outline"
                label="Lost Ball"
                count={hazardStats.lostBallCount}
                color={colors.textSecondary}
              />

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Summary row */}
              <View
                style={styles.summaryRow}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Total hazards: ${hazardStats.totalHazards}, average ${hazardStats.averageHazardsPerRound?.toFixed(1) ?? 'N/A'} per round`}
              >
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Total Hazards
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                    {hazardStats.totalHazards}
                  </Text>
                </View>

                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Avg / Round
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                    {hazardStats.averageHazardsPerRound !== null
                      ? hazardStats.averageHazardsPerRound.toFixed(1)
                      : '-'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            /* Empty state */
            <View style={styles.emptyState}>
              <Icon source="information-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Enable hazard tracking in Settings to see hazard stats
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
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hazardLabel: {
    ...typography.body,
    flex: 1,
  },
  hazardCount: {
    ...typography.bodyBold,
    minWidth: 32,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h3,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.md,
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

export default HazardStatsSection;
