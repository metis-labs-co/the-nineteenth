/**
 * WolfSettlementCard - Final settlement showing who owes who
 *
 * Displays the final settlement summary for a completed Wolf game including:
 * - Per-point value reminder
 * - Totals table sorted by points (Player | Points | Winnings | Net)
 * - Who owes who section with minimized transactions
 * - Share results button
 *
 * Only shown when pot is enabled.
 *
 * @example
 * ```tsx
 * <WolfSettlementCard
 *   payouts={wolfPayouts}
 *   potValue={2.00}
 *   currency="AUD"
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Share, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useConfirmationDialog } from '@/hooks';
import { ConfirmationDialog } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import {
  formatWolfCurrency,
  formatWolfNetResult,
  simplifyWolfDebts,
} from '@/utils/wolf';
import type { WolfPayoutWithPlayer } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfSettlementCardProps {
  /** Array of Wolf payouts with player details */
  payouts: WolfPayoutWithPlayer[];
  /** Dollar value per point */
  potValue: number;
  /** Currency code (default: AUD) */
  currency?: string;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfSettlementCard = React.memo(function WolfSettlementCard({
  payouts,
  potValue,
  currency: _currency = 'AUD',
  testID,
}: WolfSettlementCardProps) {
  const colors = useThemeColors();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Sort payouts by total points (descending)
  const sortedPayouts = useMemo(() => {
    return [...payouts].sort((a, b) => b.total_points - a.total_points);
  }, [payouts]);

  // Create player name map
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    payouts.forEach((p) => {
      map[p.player_id] = p.player.name;
    });
    return map;
  }, [payouts]);

  // Calculate who owes who
  const debtTransactions = useMemo(() => {
    const payoutMap: Record<string, { netResult: number }> = {};
    payouts.forEach((p) => {
      payoutMap[p.player_id] = { netResult: p.net_result };
    });
    return simplifyWolfDebts(payoutMap);
  }, [payouts]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalPoints = payouts.reduce((sum, p) => sum + p.total_points, 0);
    const totalPot = totalPoints * potValue;
    return { totalPoints, totalPot };
  }, [payouts, potValue]);

  // Build share message
  const buildShareMessage = useCallback((): string => {
    let message = `Wolf Game Settlement\n`;
    message += `${formatWolfCurrency(potValue)}/point | ${totals.totalPoints} total points | ${formatWolfCurrency(totals.totalPot)} total pot\n\n`;

    message += `Results:\n`;
    sortedPayouts.forEach((p, index) => {
      const prefix = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${prefix} ${p.player.name} - ${p.total_points} pts, ${formatWolfNetResult(p.net_result)}\n`;
    });

    if (debtTransactions.length > 0) {
      message += `\nSettlement:\n`;
      debtTransactions.forEach((t) => {
        const fromName = playerNameMap[t.fromPlayerId] || 'Unknown';
        const toName = playerNameMap[t.toPlayerId] || 'Unknown';
        message += `  ${fromName} → ${toName}: ${formatWolfCurrency(t.amount)}\n`;
      });
    }

    message += `\nShared from The Nineteenth 🐺`;

    return message;
  }, [potValue, totals, sortedPayouts, debtTransactions, playerNameMap]);

  // Handle share button press
  const handleShare = useCallback(async () => {
    try {
      const message = buildShareMessage();
      await Share.share({
        message,
        title: 'Wolf Game Results',
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
          <Icon source="cash-multiple" size={24} color={wolfColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            SETTLEMENT
          </Text>
        </View>
        <View style={styles.potValueRow}>
          <Text style={[styles.potValueLabel, { color: colors.textSecondary }]}>
            Per-point value:
          </Text>
          <Text style={[styles.potValue, { color: wolfColor }]}>
            {formatWolfCurrency(potValue)}
          </Text>
        </View>
      </View>

      {/* Totals Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          TOTALS
        </Text>
        <View style={[styles.table, { borderColor: colors.border }]}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.tableHeaderCell, styles.playerColumn, { color: colors.textSecondary }]}>
              Player
            </Text>
            <Text style={[styles.tableHeaderCell, styles.pointsColumn, { color: colors.textSecondary }]}>
              Points
            </Text>
            <Text style={[styles.tableHeaderCell, styles.winningsColumn, { color: colors.textSecondary }]}>
              Winnings
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
              <View style={styles.playerColumn}>
                <Text
                  style={[styles.playerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {payout.player.name}
                </Text>
              </View>
              <Text style={[styles.tableCellText, styles.pointsColumn, { color: colors.textPrimary }]}>
                {payout.total_points}
              </Text>
              <Text style={[styles.tableCellText, styles.winningsColumn, { color: colors.textPrimary }]}>
                {formatWolfCurrency(payout.total_winnings)}
              </Text>
              <Text
                style={[
                  styles.tableCellText,
                  styles.netColumn,
                  styles.netValue,
                  { color: getNetResultColor(payout.net_result) },
                ]}
              >
                {formatWolfNetResult(payout.net_result)}
              </Text>
            </View>
          ))}

          {/* Total Row */}
          <View
            style={[
              styles.tableRow,
              styles.totalRow,
              { backgroundColor: colors.surfaceVariant, borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.tableTotalCell, styles.playerColumn, { color: colors.textPrimary }]}>
              Total
            </Text>
            <Text style={[styles.tableTotalCell, styles.pointsColumn, { color: colors.textPrimary }]}>
              {totals.totalPoints}
            </Text>
            <Text style={[styles.tableTotalCell, styles.winningsColumn, { color: colors.textPrimary }]}>
              {formatWolfCurrency(totals.totalPot)}
            </Text>
            <Text style={[styles.tableTotalCell, styles.netColumn, { color: colors.textSecondary }]}>
              --
            </Text>
          </View>
        </View>
      </View>

      <Divider style={{ backgroundColor: colors.border }} />

      {/* Who Owes Who Section */}
      {debtTransactions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            WHO OWES WHO
          </Text>
          <View style={styles.debtList}>
            {debtTransactions.map((transaction, index) => {
              const fromName = playerNameMap[transaction.fromPlayerId] || 'Unknown';
              const toName = playerNameMap[transaction.toPlayerId] || 'Unknown';

              return (
                <View
                  key={`${transaction.fromPlayerId}-${transaction.toPlayerId}-${index}`}
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
                    {formatWolfCurrency(transaction.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* All Even Message */}
      {debtTransactions.length === 0 && (
        <View style={styles.section}>
          <View style={[styles.evenCard, { backgroundColor: `${colors.success}15` }]}>
            <Icon source="check-circle" size={24} color={colors.success} />
            <Text style={[styles.evenText, { color: colors.success }]}>
              All even - no money owed!
            </Text>
          </View>
        </View>
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
            { backgroundColor: wolfColor },
          ]}
          onPress={handleShare}
          accessibilityLabel="Share results"
          accessibilityHint="Share the Wolf game results with others"
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
    gap: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },
  potValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 32, // Align with title text
  },
  potValueLabel: {
    ...typography.small,
  },
  potValue: {
    ...typography.bodyBold,
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
  totalRow: {
    borderTopWidth: 1,
    borderBottomWidth: 0,
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  tableCellText: {
    ...typography.small,
  },
  tableTotalCell: {
    ...typography.smallBold,
  },

  // Column widths
  playerColumn: {
    flex: 1,
  },
  pointsColumn: {
    width: 50,
    textAlign: 'center',
  },
  winningsColumn: {
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

export default WolfSettlementCard;
