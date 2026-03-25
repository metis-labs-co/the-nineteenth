/**
 * GameResultsSummary - Summary cards for game results
 *
 * Shows overall net balance, games played, and per-game-type
 * breakdown. Uses App Store safe terminology throughout.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { GameResultsSummary as GameResultsSummaryType } from '@/hooks/useGameResults';

interface GameResultsSummaryProps {
  summary: GameResultsSummaryType;
}

function formatCurrency(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

function formatWinRate(rate: number | null): string {
  if (rate === null) return '-';
  return `${rate.toFixed(0)}%`;
}

export const GameResultsSummary = React.memo(function GameResultsSummary({
  summary,
}: GameResultsSummaryProps) {
  const colors = useThemeColors();

  const balanceColor = summary.totalNetResult > 0
    ? colors.success
    : summary.totalNetResult < 0
    ? colors.error
    : colors.textPrimary;

  return (
    <View style={styles.container}>
      {/* Top row - 3 stat cards */}
      <View style={styles.statRow}>
        {/* Net Balance */}
        <View style={[styles.statCard, styles.statCardWide, { backgroundColor: colors.surface }, shadows.sm]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Net Balance
          </Text>
          <Text style={[styles.statValueLarge, { color: balanceColor }]}>
            {formatCurrency(summary.totalNetResult)}
          </Text>
        </View>

        {/* Games Played */}
        <View style={[styles.statCard, { backgroundColor: colors.surface }, shadows.sm]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Games
          </Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {summary.totalGamesPlayed}
          </Text>
        </View>
      </View>

      {/* Breakdown rows */}
      <View style={[styles.breakdownCard, { backgroundColor: colors.surface }, shadows.sm]}>
        {/* Skins row */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.typeDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.breakdownLabel, { color: colors.textPrimary }]}>
              Skins
            </Text>
          </View>
          <View style={styles.breakdownRight}>
            <View style={styles.breakdownStat}>
              <Text style={[styles.breakdownStatLabel, { color: colors.textSecondary }]}>
                Games
              </Text>
              <Text style={[styles.breakdownStatValue, { color: colors.textPrimary }]}>
                {summary.skins.gamesPlayed}
              </Text>
            </View>
            <View style={styles.breakdownStat}>
              <Text style={[styles.breakdownStatLabel, { color: colors.textSecondary }]}>
                Win Rate
              </Text>
              <Text style={[styles.breakdownStatValue, { color: colors.textPrimary }]}>
                {formatWinRate(summary.skins.winRate)}
              </Text>
            </View>
            <View style={[styles.breakdownStat, styles.breakdownStatResult]}>
              <Text style={[styles.breakdownStatLabel, { color: colors.textSecondary }]}>
                Net
              </Text>
              <Text
                style={[
                  styles.breakdownStatValue,
                  {
                    color: summary.skins.netResult > 0
                      ? colors.success
                      : summary.skins.netResult < 0
                      ? colors.error
                      : colors.textPrimary,
                  },
                ]}
              >
                {formatCurrency(summary.skins.netResult)}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Wolf row */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.typeDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.breakdownLabel, { color: colors.textPrimary }]}>
              Wolf
            </Text>
          </View>
          <View style={styles.breakdownRight}>
            <View style={styles.breakdownStat}>
              <Text style={[styles.breakdownStatLabel, { color: colors.textSecondary }]}>
                Games
              </Text>
              <Text style={[styles.breakdownStatValue, { color: colors.textPrimary }]}>
                {summary.wolf.gamesPlayed}
              </Text>
            </View>
            <View style={styles.breakdownStat}>
              <Text style={[styles.breakdownStatLabel, { color: colors.textSecondary }]}>
                Win Rate
              </Text>
              <Text style={[styles.breakdownStatValue, { color: colors.textPrimary }]}>
                {formatWinRate(summary.wolf.winRate)}
              </Text>
            </View>
            <View style={[styles.breakdownStat, styles.breakdownStatResult]}>
              <Text style={[styles.breakdownStatLabel, { color: colors.textSecondary }]}>
                Net
              </Text>
              <Text
                style={[
                  styles.breakdownStatValue,
                  {
                    color: summary.wolf.netResult > 0
                      ? colors.success
                      : summary.wolf.netResult < 0
                      ? colors.error
                      : colors.textPrimary,
                  },
                ]}
              >
                {formatCurrency(summary.wolf.netResult)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statCardWide: {
    flex: 1.5,
  },
  statLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
  },
  statValueLarge: {
    ...typography.h2,
  },
  breakdownCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 80,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    ...typography.bodyBold,
  },
  breakdownRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  breakdownStat: {
    alignItems: 'center',
    minWidth: 50,
  },
  breakdownStatResult: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  breakdownStatLabel: {
    ...typography.caption,
    fontSize: 10,
    marginBottom: 2,
  },
  breakdownStatValue: {
    ...typography.smallBold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
});
