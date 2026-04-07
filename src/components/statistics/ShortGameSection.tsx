/**
 * ShortGameSection - Short game statistics section
 *
 * Displays scrambling percentage with progress bar visualization,
 * scrambles made/attempts, bogey avoidance rate, and double+ rate.
 *
 * @example
 * ```tsx
 * <ShortGameSection shortGame={stats.shortGame} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { FeatureLock } from '@/components/subscription';
import type { ShortGameStats } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface ShortGameSectionProps {
  /** Short game statistics */
  shortGame: ShortGameStats;
}

// =====================================================
// COMPONENT
// =====================================================

export const ShortGameSection = React.memo(function ShortGameSection({
  shortGame,
}: ShortGameSectionProps) {
  const colors = useThemeColors();

  const hasGIRData = shortGame.scramblingPercentage !== null;

  // Accessibility label for the section
  const scramblingAccessibility = hasGIRData
    ? `Scrambling: ${shortGame.scramblingPercentage}%, ${shortGame.scramblesMade} of ${shortGame.scrambleAttempts} saves`
    : 'Scrambling data not available. Enable GIR tracking to see scrambling stats.';

  return (
    <FeatureLock feature="score_distribution">
      <View style={styles.container}>
        <SectionHeader title="Short Game" icon="golf" />

        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          {/* Scrambling Section */}
          <View style={styles.scramblingSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Scrambling
            </Text>

            {hasGIRData ? (
              <>
                {/* Progress Bar */}
                <View
                  style={styles.progressBarContainer}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={scramblingAccessibility}
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.round(shortGame.scramblingPercentage ?? 0),
                  }}
                >
                  <View style={[styles.progressBarBackground, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${shortGame.scramblingPercentage ?? 0}%`,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressPercentage, { color: colors.textPrimary }]}>
                    {shortGame.scramblingPercentage}%
                  </Text>
                </View>

                {/* Scrambles Made/Attempts */}
                <Text style={[styles.scramblesSummary, { color: colors.textSecondary }]}>
                  {shortGame.scramblesMade}/{shortGame.scrambleAttempts} saves
                </Text>
              </>
            ) : (
              /* Empty State - No GIR Data */
              <View style={styles.emptyState}>
                <Icon source="information-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Enable GIR tracking in Settings to see scrambling stats
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Secondary Stats Row */}
          <View style={styles.secondaryStatsRow}>
            {/* Bogey Avoidance */}
            <View
              style={styles.secondaryStat}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Bogey Avoidance: ${shortGame.bogeyAvoidanceRate}%`}
            >
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                Bogey Avoidance
              </Text>
              <Text style={[styles.secondaryValue, { color: colors.success }]}>
                {shortGame.bogeyAvoidanceRate}%
              </Text>
            </View>

            {/* Vertical Divider */}
            <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

            {/* Double+ Rate */}
            <View
              style={styles.secondaryStat}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Double Bogey or Worse Rate: ${shortGame.doubleBogeyOrWorseRate}%`}
            >
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                Double+ Rate
              </Text>
              <Text style={[styles.secondaryValue, { color: colors.error }]}>
                {shortGame.doubleBogeyOrWorseRate}%
              </Text>
            </View>
          </View>
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
  scramblingSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    ...typography.h3,
    minWidth: 50,
    textAlign: 'right',
  },
  scramblesSummary: {
    ...typography.small,
    marginTop: spacing.xs,
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
});

export default ShortGameSection;
