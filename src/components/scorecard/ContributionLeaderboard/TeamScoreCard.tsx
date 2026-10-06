/**
 * TeamScoreCard Component
 *
 * Renders the team score summary card for Shamble format.
 * Shows to-par banner, gross/net/stableford totals, and holes progress.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamScoreSummary } from './useContributionData';
import { formatRelativeToPar } from '@/utils/formatting';

interface TeamScoreCardProps {
  summary: TeamScoreSummary;
  totalHoles: number;
}

export const TeamScoreCard = React.memo(function TeamScoreCard({
  summary,
  totalHoles,
}: TeamScoreCardProps) {
  const colors = useThemeColors();
  const { grossTotal, netTotal, stablefordTotal, holesScored, toParNet } = summary;

  const getToParColor = useCallback(
    (value: number): string => {
      if (value < 0) return colors.success;
      if (value > 0) return colors.error;
      return colors.textSecondary;
    },
    [colors]
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Icon source="account-group" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Team Score</Text>
        {holesScored < totalHoles && (
          <Text style={[styles.holesLabel, { color: colors.textSecondary }]}>
            ({holesScored}/{totalHoles} holes)
          </Text>
        )}
      </View>

      {/* To Par Banner */}
      <View style={[styles.toParBanner, { backgroundColor: getToParColor(toParNet) + '15' }]}>
        <Text style={[styles.toParValue, { color: getToParColor(toParNet) }]}>
          {formatRelativeToPar(toParNet)}
        </Text>
        <Text style={[styles.toParLabel, { color: getToParColor(toParNet) }]}>
          {toParNet < 0 ? 'under par' : toParNet > 0 ? 'over par' : 'even par'}
        </Text>
      </View>

      <View style={styles.teamScoreGrid}>
        {/* Gross Score */}
        <View style={[styles.teamScoreItem, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.teamScoreValue, { color: colors.textPrimary }]}>
            {grossTotal}
          </Text>
          <Text style={[styles.teamScoreLabel, { color: colors.textSecondary }]}>
            Gross
          </Text>
        </View>

        {/* Net Score */}
        <View style={[styles.teamScoreItem, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.teamScoreValue, { color: colors.textPrimary }]}>
            {netTotal}
          </Text>
          <Text style={[styles.teamScoreLabel, { color: colors.textSecondary }]}>
            Net
          </Text>
        </View>

        {/* Stableford Points */}
        <View style={[styles.teamScoreItem, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.teamScoreValue, { color: colors.primary }]}>
            {stablefordTotal}
          </Text>
          <Text style={[styles.teamScoreLabel, { color: colors.primary }]}>
            Points
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  holesLabel: {
    ...typography.small,
    marginLeft: 'auto',
  },
  toParBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  toParValue: {
    ...typography.h2,
  },
  toParLabel: {
    ...typography.body,
  },
  teamScoreGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teamScoreItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  teamScoreValue: {
    ...typography.h2,
  },
  teamScoreLabel: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});
