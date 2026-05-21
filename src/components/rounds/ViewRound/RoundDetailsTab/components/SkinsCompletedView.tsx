/**
 * SkinsCompletedView - Displays skins game results for a completed round
 *
 * Shows:
 * - Header with config summary (per-hole value, scoring type, total pot)
 * - Player winnings table sorted by winnings
 * - Empty state when no results were recorded
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, skinsColor } from '@/constants/theme';
import { formatCurrency, formatNetResult } from '@/utils/skins';
import { getNetResultColor } from '@/utils/displayHelpers';
import type { SkinsPayoutWithPlayer, SkinsResultWithWinner, SkinsResultWithTeamWinner } from '@/types/database/skins.types';

export interface SkinsCompletedViewProps {
  perHoleValue: number;
  totalPot: number;
  scoringTypeLabel: string;
  sortedPayouts: SkinsPayoutWithPlayer[];
  skinsResults: SkinsResultWithWinner[] | SkinsResultWithTeamWinner[] | undefined;
}

export function SkinsCompletedView({
  perHoleValue,
  totalPot,
  scoringTypeLabel,
  sortedPayouts,
  skinsResults,
}: SkinsCompletedViewProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Header with config summary */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.skinsIcon, { backgroundColor: `${skinsColor}20` }]}>
            <Icon source="cash-multiple" size={20} color={skinsColor} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Completed
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {formatCurrency(perHoleValue)}/hole | {scoringTypeLabel}
            </Text>
          </View>
        </View>
        <View style={[styles.totalPotBadge, { backgroundColor: `${skinsColor}15` }]}>
          <Text style={[styles.totalPotLabel, { color: skinsColor }]}>
            Total
          </Text>
          <Text style={[styles.totalPotValue, { color: skinsColor }]}>
            {formatCurrency(totalPot)}
          </Text>
        </View>
      </View>

      {/* Player Winnings Table */}
      <View style={styles.payoutsSection}>
        <Text style={[styles.payoutsSectionTitle, { color: colors.textSecondary }]}>
          PLAYER WINNINGS
        </Text>

        {sortedPayouts.length > 0 ? (
          <View style={[styles.payoutsTable, { borderColor: colors.border }]}>
            {/* Table Header */}
            <View style={[styles.payoutsHeader, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.payoutsHeaderCell, styles.playerColumn, { color: colors.textSecondary }]}>
                Player
              </Text>
              <Text style={[styles.payoutsHeaderCell, styles.holesColumn, { color: colors.textSecondary }]}>
                Holes
              </Text>
              <Text style={[styles.payoutsHeaderCell, styles.wonColumn, { color: colors.textSecondary }]}>
                Won
              </Text>
              <Text style={[styles.payoutsHeaderCell, styles.netColumn, { color: colors.textSecondary }]}>
                Net
              </Text>
            </View>

            {/* Table Rows */}
            {sortedPayouts.map((payout, index) => (
              <View
                key={payout.player_id}
                style={[
                  styles.payoutsRow,
                  {
                    backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                    borderBottomColor: colors.border,
                  },
                  index === sortedPayouts.length - 1 && styles.lastRow,
                ]}
              >
                <View style={styles.playerColumn}>
                  {index === 0 && payout.total_winnings > 0 && (
                    <View style={styles.winnerIcon}>
                      <Icon source="trophy" size={14} color={skinsColor} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.playerName,
                      { color: colors.textPrimary },
                      index === 0 && payout.total_winnings > 0 && styles.winnerName,
                    ]}
                    numberOfLines={1}
                  >
                    {payout.player?.name ?? 'Unknown'}
                  </Text>
                </View>
                <Text style={[styles.payoutsCell, styles.holesColumn, { color: colors.textSecondary }]}>
                  {payout.holes_won}
                </Text>
                <Text style={[styles.payoutsCell, styles.wonColumn, { color: colors.textPrimary }]}>
                  {formatCurrency(payout.total_winnings)}
                </Text>
                <Text
                  style={[
                    styles.payoutsCell,
                    styles.netColumn,
                    styles.netValue,
                    { color: getNetResultColor(payout.net_result, colors) },
                  ]}
                >
                  {formatNetResult(payout.net_result)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPayouts}>
            <Icon
              source={skinsResults && skinsResults.length > 0 ? 'clock-outline' : 'alert-circle-outline'}
              size={24}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyPayoutsText, { color: colors.textSecondary }]}>
              {skinsResults && skinsResults.length > 0
                ? 'Calculating payouts...'
                : 'No hole results recorded during scoring'}
            </Text>
            {(!skinsResults || skinsResults.length === 0) && (
              <Text style={[styles.emptyPayoutsHint, { color: colors.textTertiary }]}>
                Skins results are calculated when all players have scored each hole
              </Text>
            )}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skinsIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodyBold,
  },
  headerSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  totalPotBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  totalPotLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalPotValue: {
    ...typography.h4,
    marginTop: 2,
  },
  payoutsSection: {
    padding: spacing.md,
    gap: spacing.md,
  },
  payoutsSectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payoutsTable: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  payoutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  payoutsHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  payoutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  payoutsCell: {
    ...typography.small,
  },
  playerColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holesColumn: {
    width: 50,
    textAlign: 'center',
  },
  wonColumn: {
    width: 60,
    textAlign: 'right',
  },
  netColumn: {
    width: 70,
    textAlign: 'right',
  },
  playerName: {
    ...typography.small,
    flex: 1,
  },
  winnerIcon: {
    marginRight: spacing.xs,
  },
  winnerName: {
    fontWeight: '600',
  },
  netValue: {
    fontWeight: '600',
  },
  emptyPayouts: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyPayoutsText: {
    ...typography.body,
    textAlign: 'center',
  },
  emptyPayoutsHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
