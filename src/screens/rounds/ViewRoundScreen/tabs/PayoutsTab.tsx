/**
 * PayoutsTab - Combined Skins & Wolf payouts tab
 *
 * Shows unified standings and settlement for rounds with both
 * skins and wolf side-games running with pots.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, Share, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useConfirmationDialog } from '@/hooks';
import { ConfirmationDialog } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, medalColors } from '@/constants/theme';
import { formatCurrency, formatNetResult } from '@/utils/currency';
import { getNetResultColor } from '@/utils/displayHelpers';
import { getRankMedal } from '@/utils/formatting';
import { calculateFinalPayouts } from '@/utils/skins/payouts';
import { calculateWolfPayouts } from '@/utils/wolf/payouts';
import {
  calculateCombinedPayouts,
  buildCombinedShareMessage,
} from '@/utils/combinedPayouts';
import type { PayoutsMode, CombinedPlayerPayout, CombinedDebtTransaction } from '@/utils/combinedPayouts';
import type { SkinsGameWithParticipants, SkinsResultWithWinner } from '@/types/database/skins.types';
import type { WolfGameSummary } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface PayoutsTabProps {
  mode: PayoutsMode;
  activeSkinsGame: SkinsGameWithParticipants | null;
  skinsResults: SkinsResultWithWinner[];
  wolfSummary: WolfGameSummary | null;
  playerNameMap: Record<string, string>;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const MEDAL_COLORS = {
  1: medalColors.gold,
  2: medalColors.silver,
  3: medalColors.bronze,
} as const;

const RankBadge = React.memo(function RankBadge({ rank }: { rank: number }) {
  const colors = useThemeColors();

  if (rank <= 3) {
    const medalColor = MEDAL_COLORS[rank as 1 | 2 | 3];
    return (
      <View style={[styles.rankBadge, { backgroundColor: `${medalColor}20` }]}>
        <Text style={[styles.rankText, { color: medalColor }]}>
          {getRankMedal(rank)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.rankBadge, { backgroundColor: colors.surfaceVariant }]}>
      <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>
        {rank}
      </Text>
    </View>
  );
});

const StandingRow = React.memo(function StandingRow({
  item,
  index,
  mode,
}: {
  item: CombinedPlayerPayout;
  index: number;
  mode: PayoutsMode;
}) {
  const colors = useThemeColors();
  const isCombined = mode === 'combined';

  return (
    <View
      style={[
        styles.standingRow,
        {
          backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.rankColumn}>
        <RankBadge rank={item.rank} />
      </View>
      <View style={styles.playerColumn}>
        <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      {isCombined && (
        <Text
          style={[
            styles.valueText,
            styles.skinsColumn,
            { color: item.in_skins ? getNetResultColor(item.skins_net, colors) : colors.textSecondary },
          ]}
        >
          {item.in_skins ? formatNetResult(item.skins_net) : '--'}
        </Text>
      )}
      {isCombined && (
        <Text
          style={[
            styles.valueText,
            styles.wolfColumn,
            { color: item.in_wolf ? getNetResultColor(item.wolf_net, colors) : colors.textSecondary },
          ]}
        >
          {item.in_wolf ? formatNetResult(item.wolf_net) : '--'}
        </Text>
      )}
      <Text
        style={[
          styles.valueText,
          styles.totalColumn,
          styles.totalValue,
          { color: getNetResultColor(item.total_net, colors) },
        ]}
      >
        {formatNetResult(item.total_net)}
      </Text>
    </View>
  );
});

const DebtRow = React.memo(function DebtRow({
  transaction,
  playerNameMap,
}: {
  transaction: CombinedDebtTransaction;
  playerNameMap: Record<string, string>;
}) {
  const colors = useThemeColors();
  const fromName = playerNameMap[transaction.from_player_id] || 'Unknown';
  const toName = playerNameMap[transaction.to_player_id] || 'Unknown';

  return (
    <View
      style={[
        styles.debtRow,
        { backgroundColor: colors.background, borderColor: colors.border },
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
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PayoutsTab({
  mode,
  activeSkinsGame,
  skinsResults,
  wolfSummary,
  playerNameMap,
}: PayoutsTabProps) {
  const colors = useThemeColors();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
  const isCombined = mode === 'combined';

  // 1. Compute skins net results (skip if wolf-only)
  const skinsEntries = useMemo(() => {
    if (!activeSkinsGame || mode === 'wolf-only') return [];
    const participants = activeSkinsGame.participant_ids.map((id) => ({ id }));
    const payouts = calculateFinalPayouts(activeSkinsGame, skinsResults, participants);
    return payouts.map((p) => ({
      player_id: p.player_id,
      net_result: p.net_result,
    }));
  }, [activeSkinsGame, skinsResults, mode]);

  // 2. Extract wolf net results (skip if skins-only)
  const wolfEntries = useMemo(() => {
    if (!wolfSummary || mode === 'skins-only') return [];
    if (wolfSummary.standings.length > 0 && wolfSummary.game.pot_enabled && wolfSummary.game.pot_value_per_point) {
      const standingsMap: Record<string, number> = {};
      for (const s of wolfSummary.standings) {
        standingsMap[s.player_id] = s.total_points;
      }
      const wolfPayouts = calculateWolfPayouts(standingsMap, wolfSummary.game.pot_value_per_point);
      return Object.entries(wolfPayouts).map(([player_id, p]) => ({
        player_id,
        net_result: p.netResult,
      }));
    }

    return wolfSummary.standings
      .filter((s) => s.net_result != null)
      .map((s) => ({
        player_id: s.player_id,
        net_result: s.net_result!,
      }));
  }, [wolfSummary, mode]);

  // 3. Merge into combined standings
  const { standings, debts } = useMemo(
    () => calculateCombinedPayouts(skinsEntries, wolfEntries, playerNameMap),
    [skinsEntries, wolfEntries, playerNameMap]
  );

  const playerCount = standings.length;
  const isInProgress =
    (activeSkinsGame?.status === 'active') || (wolfSummary?.game.status === 'active');

  const titleText = mode === 'skins-only'
    ? 'SKINS PAYOUTS'
    : mode === 'wolf-only'
      ? 'WOLF PAYOUTS'
      : 'COMBINED PAYOUTS';

  const subtitleSuffix = isCombined ? 'Skins + Wolf' : mode === 'skins-only' ? 'Skins' : 'Wolf';

  // Build share message
  const handleShare = useCallback(async () => {
    try {
      const message = buildCombinedShareMessage(
        standings,
        debts,
        activeSkinsGame ? { pot_value: activeSkinsGame.pot_value } : null,
        wolfSummary?.game.pot_value_per_point
          ? { pot_value_per_point: wolfSummary.game.pot_value_per_point }
          : null,
        playerNameMap,
        mode
      );
      await Share.share({
        message,
        title: titleText,
      });
    } catch (error) {
      if (error instanceof Error && error.message !== 'User did not share') {
        showAlert('Share Error', 'Unable to share results. Please try again.');
      }
    }
  }, [standings, debts, activeSkinsGame, wolfSummary, playerNameMap, showAlert, mode, titleText]);

  const renderStandingRow = useCallback(
    ({ item, index }: { item: CombinedPlayerPayout; index: number }) => (
      <StandingRow item={item} index={index} mode={mode} />
    ),
    [mode]
  );

  const keyExtractor = useCallback((item: CombinedPlayerPayout) => item.player_id, []);

  return (
    <View style={styles.container}>
      {/* Combined Standings Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.titleContainer}>
            <Icon source="cash-multiple" size={24} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {titleText}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {playerCount} player{playerCount !== 1 ? 's' : ''} | {subtitleSuffix}
          </Text>
        </View>

        {/* Column Headers */}
        <View style={[styles.columnHeaders, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.headerCell, styles.rankColumn, { color: colors.textSecondary }]}>
            #
          </Text>
          <Text style={[styles.headerCell, styles.playerColumn, { color: colors.textSecondary }]}>
            Player
          </Text>
          {isCombined && (
            <Text style={[styles.headerCell, styles.skinsColumn, { color: colors.textSecondary }]}>
              Skins
            </Text>
          )}
          {isCombined && (
            <Text style={[styles.headerCell, styles.wolfColumn, { color: colors.textSecondary }]}>
              Wolf
            </Text>
          )}
          <Text style={[styles.headerCell, styles.totalColumn, { color: colors.textSecondary }]}>
            {isCombined ? 'Total' : 'Net'}
          </Text>
        </View>

        {/* Standings List */}
        <FlatList
          data={standings}
          renderItem={renderStandingRow}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
        />
      </View>

      {/* Combined Settlement Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.titleContainer}>
            <Icon source="handshake" size={24} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              SETTLEMENT
            </Text>
          </View>
        </View>

        {debts.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              WHO OWES WHO
            </Text>
            <View style={styles.debtList}>
              {debts.map((transaction, index) => (
                <DebtRow
                  key={`${transaction.from_player_id}-${transaction.to_player_id}-${index}`}
                  transaction={transaction}
                  playerNameMap={playerNameMap}
                />
              ))}
            </View>
          </View>
        ) : (
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

        {/* Share Button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            accessibilityLabel="Share combined results"
            accessibilityRole="button"
          >
            <Icon source="share-variant" size={20} color="#fff" />
            <Text style={[styles.shareButtonText, { color: '#fff' }]}>
              Share Results
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* In-Progress Note */}
      {isInProgress && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <Icon source="information-outline" size={20} color={colors.primary} />
          <Text style={[styles.inProgressText, { color: colors.textSecondary }]}>
            Standings update as holes are completed
          </Text>
        </View>
      )}

      {/* Error Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },
  subtitle: {
    ...typography.small,
    marginLeft: 32,
  },

  // Column headers
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },

  // Standing row
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Columns
  rankColumn: {
    width: 40,
    alignItems: 'center',
  },
  playerColumn: {
    flex: 1,
  },
  skinsColumn: {
    width: 70,
    textAlign: 'right',
  },
  wolfColumn: {
    width: 70,
    textAlign: 'right',
  },
  totalColumn: {
    width: 80,
    textAlign: 'right',
  },

  // Rank badge
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
  },
  rankNumber: {
    ...typography.smallBold,
  },

  // Player
  playerName: {
    ...typography.small,
  },

  // Values
  valueText: {
    ...typography.small,
  },
  totalValue: {
    fontWeight: '600',
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
    padding: spacing.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  shareButtonText: {
    ...typography.bodyBold,
  },

  // In-progress
  inProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  inProgressText: {
    ...typography.small,
    flex: 1,
  },
});
