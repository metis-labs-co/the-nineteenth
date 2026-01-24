/**
 * SkinsSettlementCard - Final settlement showing who owes who
 *
 * Displays the final settlement summary for a completed skins game including:
 * - Totals won table sorted by winnings
 * - Who owes who section with minimized transactions
 * - Unsettled pot display if any carryover remains
 * - Share results button
 *
 * @example
 * ```tsx
 * <SkinsSettlementCard
 *   payouts={skinsPayouts}
 *   game={skinsGame}
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Share, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useConfirmationDialog } from '@/hooks';
import { ConfirmationDialog } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import {
  calculateNetPositions,
  simplifyDebts,
  formatDebtTransactions,
  calculateHoleValue,
  calculateTotalPot,
  formatCurrency,
  formatNetResult,
  type PlayerNameMap,
} from '@/utils/skinsCalculations';
import type { SkinsPayoutWithPlayer, SkinsGame } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsSettlementCardProps {
  /** Array of skins payouts with player details */
  payouts: SkinsPayoutWithPlayer[];
  /** The skins game configuration */
  game: SkinsGame;
  /** Optional: Unsettled carryover amount (if hole 18 was tied) */
  unsettledCarryover?: number;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsSettlementCard = React.memo(function SkinsSettlementCard({
  payouts,
  game,
  unsettledCarryover = 0,
  testID,
}: SkinsSettlementCardProps) {
  const colors = useThemeColors();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Sort payouts by total winnings (descending)
  const sortedPayouts = useMemo(() => {
    return [...payouts].sort((a, b) => b.total_winnings - a.total_winnings);
  }, [payouts]);

  // Sort payouts by net result for the settlement section
  const payoutsByNet = useMemo(() => {
    return [...payouts].sort((a, b) => b.net_result - a.net_result);
  }, [payouts]);

  // Calculate who owes who
  const { debtTransactions, formattedDebts, playerMap } = useMemo(() => {
    // Create player name map
    const map: PlayerNameMap = {};
    payouts.forEach((p) => {
      map[p.player_id] = p.player.name;
    });

    // Calculate net positions and simplify debts
    const netPositions = calculateNetPositions(payouts);
    const transactions = simplifyDebts(netPositions);
    const formatted = formatDebtTransactions(transactions, map);

    return {
      debtTransactions: transactions,
      formattedDebts: formatted,
      playerMap: map,
    };
  }, [payouts]);

  // Calculate per-player split if there's unsettled carryover
  const perPlayerSplit = useMemo(() => {
    if (unsettledCarryover <= 0 || payouts.length === 0) return 0;
    return Math.round((unsettledCarryover / payouts.length) * 100) / 100;
  }, [unsettledCarryover, payouts.length]);

  // Build share message
  const buildShareMessage = useCallback((): string => {
    const perHoleValue = calculateHoleValue(game.pot_type, game.pot_value);
    const totalPot = calculateTotalPot(game.pot_type, game.pot_value);

    let message = `Skins Game Settlement\n`;
    message += `${formatCurrency(perHoleValue)}/hole | ${totalPot.toFixed(0)} total pot | ${game.scoring_type === 'gross' ? 'Gross' : 'Net'}\n\n`;

    message += `Results:\n`;
    sortedPayouts.forEach((p, index) => {
      const prefix = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
      message += `${prefix}: ${p.player.name} - ${formatNetResult(p.net_result)} (${p.holes_won} holes won)\n`;
    });

    if (formattedDebts.length > 0) {
      message += `\nSettlement:\n`;
      formattedDebts.forEach((debt) => {
        message += `  ${debt}\n`;
      });
    }

    if (unsettledCarryover > 0) {
      message += `\nUnsettled: ${formatCurrency(unsettledCarryover)} (split ${formatCurrency(perPlayerSplit)} each)`;
    }

    message += `\n\nShared from The Nineteenth`;

    return message;
  }, [game, sortedPayouts, formattedDebts, unsettledCarryover, perPlayerSplit]);

  // Handle share button press
  const handleShare = useCallback(async () => {
    try {
      const message = buildShareMessage();
      await Share.share({
        message,
        title: 'Skins Game Results',
      });
    } catch (error) {
      if (error instanceof Error && error.message !== 'User did not share') {
        showAlert('Share Error', 'Unable to share results. Please try again.');
      }
    }
  }, [buildShareMessage, showAlert]);

  // Get color for net result
  const getNetResultColor = (value: number): string => {
    if (value > 0) return colors.success;
    if (value < 0) return colors.error;
    return colors.textSecondary;
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Card Header */}
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.titleContainer}>
          <Icon source="cash-multiple" size={24} color={skinsColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            SETTLEMENT SUMMARY
          </Text>
        </View>
      </View>

      {/* Totals Won Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          TOTALS WON
        </Text>
        <View style={[styles.table, { borderColor: colors.border }]}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.tableHeaderCell, styles.playerColumn, { color: colors.textSecondary }]}>
              Player
            </Text>
            <Text style={[styles.tableHeaderCell, styles.holesColumn, { color: colors.textSecondary }]}>
              Holes
            </Text>
            <Text style={[styles.tableHeaderCell, styles.wonColumn, { color: colors.textSecondary }]}>
              Won
            </Text>
            <Text style={[styles.tableHeaderCell, styles.netColumn, { color: colors.textSecondary }]}>
              Net
            </Text>
          </View>

          {/* Table Rows */}
          {sortedPayouts.map((payout, index) => (
            <View
              key={payout.player_id}
              style={[
                styles.tableRow,
                {
                  backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                  borderBottomColor: colors.border,
                },
                index === sortedPayouts.length - 1 && styles.lastRow,
              ]}
            >
              <View style={[styles.tableCell, styles.playerColumn]}>
                <Text
                  style={[styles.playerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {payout.player.name}
                </Text>
              </View>
              <Text style={[styles.tableCell, styles.holesColumn, { color: colors.textSecondary }]}>
                {payout.holes_won}
              </Text>
              <Text style={[styles.tableCell, styles.wonColumn, { color: colors.textPrimary }]}>
                {formatCurrency(payout.total_winnings)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.netColumn,
                  styles.netValue,
                  { color: getNetResultColor(payout.net_result) },
                ]}
              >
                {formatNetResult(payout.net_result)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Divider style={{ backgroundColor: colors.border }} />

      {/* Who Owes Who Section */}
      {formattedDebts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            WHO OWES WHO
          </Text>
          <View style={styles.debtList}>
            {debtTransactions.map((transaction, index) => {
              const fromName = playerMap[transaction.from_player_id] || 'Unknown';
              const toName = playerMap[transaction.to_player_id] || 'Unknown';

              return (
                <View
                  key={`${transaction.from_player_id}-${transaction.to_player_id}-${index}`}
                  style={[
                    styles.debtRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.debtParties}>
                    <Text style={[styles.debtFromName, { color: colors.error }]}>
                      {fromName}
                    </Text>
                    <Icon source="arrow-right" size={16} color={colors.textSecondary} />
                    <Text style={[styles.debtToName, { color: colors.success }]}>
                      {toName}
                    </Text>
                  </View>
                  <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* All Even Message */}
      {formattedDebts.length === 0 && (
        <View style={styles.section}>
          <View style={[styles.evenCard, { backgroundColor: `${colors.success}15` }]}>
            <Icon source="check-circle" size={24} color={colors.success} />
            <Text style={[styles.evenText, { color: colors.success }]}>
              All even - no money owed!
            </Text>
          </View>
        </View>
      )}

      {/* Unsettled Pot Section */}
      {unsettledCarryover > 0 && (
        <>
          <Divider style={{ backgroundColor: colors.border }} />
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              UNSETTLED POT
            </Text>
            <View style={[styles.unsettledCard, { backgroundColor: `${skinsColor}15`, borderColor: skinsColor }]}>
              <View style={styles.unsettledHeader}>
                <Icon source="alert-circle" size={20} color={skinsColor} />
                <Text style={[styles.unsettledAmount, { color: skinsColor }]}>
                  {formatCurrency(unsettledCarryover)}
                </Text>
              </View>
              <Text style={[styles.unsettledSuggestion, { color: colors.textSecondary }]}>
                Hole 18 was tied. Suggestion: split evenly ({formatCurrency(perPlayerSplit)} each)
              </Text>
            </View>
          </View>
        </>
      )}

      <Divider style={{ backgroundColor: colors.border }} />

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Mark as Settled - Disabled for now (future feature) */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.settledButton,
            { borderColor: colors.border, opacity: 0.5 },
          ]}
          disabled
          accessibilityLabel="Mark as settled (coming soon)"
          accessibilityHint="This feature is not yet available"
        >
          <Icon source="check" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
            Mark as Settled
          </Text>
        </TouchableOpacity>

        {/* Share Results */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.shareButton,
            { backgroundColor: skinsColor },
          ]}
          onPress={handleShare}
          accessibilityLabel="Share results"
          accessibilityHint="Share the skins game results with others"
          accessibilityRole="button"
        >
          <Icon source="share-variant" size={20} color="#fff" />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>
            Share Results
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },

  // Section
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Table
  table: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeader: {
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  tableCell: {
    ...typography.small,
  },

  // Column widths
  playerColumn: {
    flex: 1,
  },
  holesColumn: {
    width: 50,
    textAlign: 'center',
  },
  wonColumn: {
    width: 70,
    textAlign: 'right',
  },
  netColumn: {
    width: 80,
    textAlign: 'right',
  },
  playerName: {
    ...typography.small,
  },
  netValue: {
    fontWeight: '600',
  },

  // Debt list
  debtList: {
    gap: spacing.sm,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  debtParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  debtFromName: {
    ...typography.small,
    fontWeight: '600',
  },
  debtToName: {
    ...typography.small,
    fontWeight: '600',
  },
  debtAmount: {
    ...typography.bodyBold,
  },

  // Even card
  evenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  evenText: {
    ...typography.bodyBold,
  },

  // Unsettled card
  unsettledCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  unsettledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unsettledAmount: {
    ...typography.h4,
  },
  unsettledSuggestion: {
    ...typography.small,
    fontStyle: 'italic',
    marginLeft: 28, // Align with text after icon
  },

  // Actions
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  settledButton: {
    borderWidth: 1,
  },
  shareButton: {
    // Background color applied inline
  },
  actionButtonText: {
    ...typography.bodyBold,
  },
});

export default SkinsSettlementCard;
