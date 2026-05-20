/**
 * BunkerStatsSection - Bunker aggregate statistics card
 *
 * Displays total bunker shots (prominent), average bunker shots per round,
 * and percentage of holes that included a bunker shot.
 *
 * Shows an empty state when no holes have been tracked (totalHolesTracked === 0).
 *
 * @example
 * ```tsx
 * <BunkerStatsSection bunkerStats={stats.bunkerStats} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { FeatureLock } from '@/components/subscription';
import type { BunkerStats } from '@/hooks/playerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface BunkerStatsSectionProps {
  /** Bunker aggregate statistics */
  bunkerStats: BunkerStats;
  /**
   * Whether bunker tracking is currently enabled for the user.
   * When tracking is on but no data has been recorded, the empty state shows a
   * neutral "no data" message instead of wrongly prompting to enable settings.
   * @default true
   */
  trackingEnabled?: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export const BunkerStatsSection = React.memo(function BunkerStatsSection({
  bunkerStats,
  trackingEnabled = true,
}: BunkerStatsSectionProps) {
  const colors = useThemeColors();

  const hasData = bunkerStats.totalHolesTracked > 0;
  const emptyStateText = trackingEnabled
    ? 'No bunker shots recorded for these rounds yet'
    : 'Enable bunker tracking in Settings to see bunker stats';

  return (
    <FeatureLock feature="score_distribution">
      <View style={styles.container}>
        <SectionHeader title="Bunker Play" icon="golf" />

        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          {hasData ? (
            <>
              {/* Primary stat: total bunker shots */}
              <View style={styles.primarySection}>
                <Text style={[styles.primaryValue, { color: colors.textPrimary }]}>
                  {bunkerStats.totalBunkerShots}
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textSecondary }]}>
                  Total Bunker Shots
                </Text>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Secondary stats row */}
              <View style={styles.secondaryStatsRow}>
                {/* Avg per round */}
                <View
                  style={styles.secondaryStat}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Average bunker shots per round: ${bunkerStats.averageBunkerShotsPerRound?.toFixed(1) ?? 'N/A'}`}
                >
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Avg / Round
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.textPrimary }]}>
                    {bunkerStats.averageBunkerShotsPerRound !== null
                      ? bunkerStats.averageBunkerShotsPerRound.toFixed(1)
                      : '-'}
                  </Text>
                </View>

                {/* Vertical divider */}
                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                {/* Holes with bunkers % */}
                <View
                  style={styles.secondaryStat}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Holes with bunker shots: ${bunkerStats.holesWithBunkersPercentage?.toFixed(0) ?? 'N/A'}%`}
                >
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Holes w/ Bunker
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.warning }]}>
                    {bunkerStats.holesWithBunkersPercentage !== null
                      ? `${bunkerStats.holesWithBunkersPercentage.toFixed(0)}%`
                      : '-'}
                  </Text>
                </View>

                {/* Vertical divider */}
                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                {/* Sand Save % */}
                <View
                  style={styles.secondaryStat}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={
                    bunkerStats.sandSavePercentage !== null
                      ? `Sand save percentage: ${bunkerStats.sandSavePercentage.toFixed(0)}%, ${bunkerStats.sandSaves} of ${bunkerStats.sandSaveAttempts}`
                      : 'Sand save percentage: not available'
                  }
                >
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Sand Save
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.success }]}>
                    {bunkerStats.sandSavePercentage !== null
                      ? `${bunkerStats.sandSavePercentage.toFixed(0)}%`
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
                {emptyStateText}
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
  primarySection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryValue: {
    ...typography.h1,
  },
  primaryLabel: {
    ...typography.smallBold,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  secondaryValue: {
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

export default BunkerStatsSection;
