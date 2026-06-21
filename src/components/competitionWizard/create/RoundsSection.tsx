/**
 * RoundsSection - Displays rounds summary in the review step
 *
 * Shows each round with its configuration status, course, date, tee time, and match type.
 * Highlights unconfigured rounds with a warning badge.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ReviewItem, ReviewItemWithBadge } from './ReviewItem';
import type { SimplifiedRoundFormData, GameType } from '@/schemas/competition';

// Game type labels for display
const gameTypeLabels: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  par: 'Par',
  'match-play': 'Match Play',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
  shamble: 'Shamble',
  'alt-shot': 'Alt Shot',
};

export interface RoundsSectionProps {
  roundsData: SimplifiedRoundFormData[];
  formatDate: (dateString?: string) => string;
}

export function RoundsSection({ roundsData, formatDate }: RoundsSectionProps) {
  const colors = useThemeColors();

  const configuredRounds = roundsData.filter((r) => r.isConfigured || !!r.courseId).length;

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Rounds ({roundsData.length})
        </Text>
        {configuredRounds < roundsData.length && (
          <View style={[styles.warningBadge, { backgroundColor: colors.warningLight }]}>
            <Icon source="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={[styles.warningBadgeText, { color: colors.warning }]}>
              {roundsData.length - configuredRounds} not configured
            </Text>
          </View>
        )}
      </View>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      <View style={styles.itemsContainer}>
        {roundsData.map((round, index) => {
          const isConfigured = round.isConfigured || !!round.courseId;

          return (
            <View key={index} style={styles.roundContainer}>
              <View style={styles.roundHeader}>
                <Text style={[styles.roundNumber, { color: colors.primary }]}>
                  Round {index + 1}
                </Text>
                {isConfigured ? (
                  <View
                    style={[styles.statusBadge, { backgroundColor: colors.successLight }]}
                  >
                    <Icon source="check-circle" size={12} color={colors.success} />
                    <Text style={[styles.statusText, { color: colors.success }]}>
                      Configured
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: colors.gray100 }]}>
                    <Icon source="clock-outline" size={12} color={colors.gray500} />
                    <Text style={[styles.statusText, { color: colors.gray500 }]}>
                      Not configured
                    </Text>
                  </View>
                )}
              </View>

              {isConfigured ? (
                <>
                  {round.courseName && (
                    <ReviewItem label="Course" value={round.courseName} colors={colors} />
                  )}
                  <ReviewItem
                    label="Date"
                    value={formatDate(round.date)}
                    colors={colors}
                  />
                  {round.teeTime && (
                    <ReviewItem label="Tee Time" value={round.teeTime} colors={colors} />
                  )}
                  <ReviewItemWithBadge
                    label="Match Type"
                    value={gameTypeLabels[(round.matchType as GameType) || 'stableford']}
                    colors={colors}
                  />
                </>
              ) : (
                <View
                  style={[styles.notConfiguredBox, { backgroundColor: colors.gray50 }]}
                >
                  <Icon source="information-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.notConfiguredText, { color: colors.textSecondary }]}>
                    Configure this round in competition settings after creation
                  </Text>
                </View>
              )}

              {index < roundsData.length - 1 && (
                <Divider
                  style={[styles.roundDivider, { backgroundColor: colors.gray200 }]}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  warningBadgeText: {
    ...typography.caption,
    fontWeight: '500',
  },
  divider: {
    marginVertical: spacing.md,
  },
  itemsContainer: {
    gap: spacing.md,
  },
  roundContainer: {
    gap: spacing.sm,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roundNumber: {
    ...typography.smallBold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
  },
  notConfiguredBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  notConfiguredText: {
    ...typography.small,
    flex: 1,
  },
  roundDivider: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
