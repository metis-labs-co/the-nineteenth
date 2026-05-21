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
import { View, StyleSheet, Share } from 'react-native';
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
  // Team skins functions
  calculateTeamNetPositions,
  simplifyTeamDebts,
  formatTeamDebtTransactions,
  type PlayerNameMap,
  type TeamNameMap,
  type TeamPayoutParticipant,
} from '@/utils/skins';
import { getNetResultColor as getNetResultColorUtil } from '@/utils/displayHelpers';
import type { SkinsPayoutWithPlayer, SkinsPayoutWithTeam, SkinsGame } from '@/types';
import { SettlementTotalsTable } from './SettlementTotalsTable';
import { DebtTransactionsList } from './DebtTransactionsList';
import { UnsettledPotCard } from './UnsettledPotCard';
import { SettlementActions } from './SettlementActions';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsSettlementCardProps {
  /** Array of skins payouts with player details (individual skins) */
  payouts?: SkinsPayoutWithPlayer[];
  /** Array of team payouts with team details (team skins) */
  teamPayouts?: SkinsPayoutWithTeam[];
  /** The skins game configuration */
  game: SkinsGame;
  /** Whether this is a team skins game */
  isTeamSkins?: boolean;
  /** Optional: Unsettled carryover amount (if hole 18 was tied) */
  unsettledCarryover?: number;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsSettlementCard = React.memo(function SkinsSettlementCard({
  payouts = [],
  teamPayouts = [],
  game,
  isTeamSkins = false,
  unsettledCarryover = 0,
  testID,
}: SkinsSettlementCardProps) {
  const colors = useThemeColors();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Determine which payouts to use based on mode
  const activePayouts = isTeamSkins ? teamPayouts : payouts;
  const participantCount = activePayouts.length;

  // Sort payouts by total winnings (descending) - unified for both modes
  const sortedPayouts = useMemo(() => {
    if (isTeamSkins) {
      return [...teamPayouts].sort((a, b) => b.total_winnings - a.total_winnings);
    }
    return [...payouts].sort((a, b) => b.total_winnings - a.total_winnings);
  }, [isTeamSkins, payouts, teamPayouts]);

  // Calculate who owes who (handles both individual and team)
  const { debtTransactions, teamDebtTransactions, formattedDebts, nameMap } = useMemo(() => {
    if (isTeamSkins) {
      // Team skins - calculate team debts
      const map: TeamNameMap = {};
      const teamParticipants: TeamPayoutParticipant[] = [];
      teamPayouts.forEach((p) => {
        if (p.team_id) {
          map[p.team_id] = p.team.name;
          teamParticipants.push({
            id: p.team_id,
            member_count: p.team.members?.length ?? 1,
          });
        }
      });

      const netPositions = calculateTeamNetPositions(
        teamPayouts
          .filter((p): p is SkinsPayoutWithTeam & { team_id: string } => p.team_id !== null)
          .map((p) => ({ team_id: p.team_id, net_result: p.net_result })),
        teamParticipants
      );
      const transactions = simplifyTeamDebts(netPositions, teamParticipants);
      const formatted = formatTeamDebtTransactions(transactions, map);

      return {
        debtTransactions: [],
        teamDebtTransactions: transactions,
        formattedDebts: formatted,
        nameMap: map,
      };
    } else {
      // Individual skins - calculate player debts
      const map: PlayerNameMap = {};
      payouts.forEach((p) => {
        if (p.player_id && p.player) {
          map[p.player_id] = p.player.name;
        }
      });

      const netPositions = calculateNetPositions(payouts);
      const transactions = simplifyDebts(netPositions);
      const formatted = formatDebtTransactions(transactions, map);

      return {
        debtTransactions: transactions,
        teamDebtTransactions: [],
        formattedDebts: formatted,
        nameMap: map,
      };
    }
  }, [isTeamSkins, payouts, teamPayouts]);

  // Calculate per-participant split if there's unsettled carryover
  const perParticipantSplit = useMemo(() => {
    if (unsettledCarryover <= 0 || participantCount === 0) return 0;
    return Math.round((unsettledCarryover / participantCount) * 100) / 100;
  }, [unsettledCarryover, participantCount]);

  // Build share message
  const buildShareMessage = useCallback((): string => {
    const perHoleValue = calculateHoleValue(game.pot_type, game.pot_value);
    const totalPot = calculateTotalPot(game.pot_type, game.pot_value);

    let message = `${isTeamSkins ? 'Team ' : ''}Skins Game Settlement\n`;
    message += `${formatCurrency(perHoleValue)}/hole | ${totalPot.toFixed(0)} total pot | ${game.scoring_type === 'gross' ? 'Gross' : 'Net'}\n\n`;

    message += `Results:\n`;
    if (isTeamSkins) {
      (sortedPayouts as SkinsPayoutWithTeam[]).forEach((p, index) => {
        const prefix = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
        const memberCount = p.team.members?.length ?? 1;
        const perMember = p.net_result / memberCount;
        message += `${prefix}: ${p.team.name} - ${formatNetResult(p.net_result)} (${p.holes_won} holes won)`;
        if (memberCount > 1) {
          message += ` [${formatNetResult(perMember)}/member]`;
        }
        message += '\n';
      });
    } else {
      (sortedPayouts as SkinsPayoutWithPlayer[]).forEach((p, index) => {
        const prefix = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
        message += `${prefix}: ${p.player?.name ?? 'Unknown'} - ${formatNetResult(p.net_result)} (${p.holes_won} holes won)\n`;
      });
    }

    if (formattedDebts.length > 0) {
      message += `\nSettlement:\n`;
      formattedDebts.forEach((debt) => {
        message += `  ${debt}\n`;
      });
    }

    if (unsettledCarryover > 0) {
      const splitLabel = isTeamSkins ? 'per team' : 'each';
      message += `\nUnsettled: ${formatCurrency(unsettledCarryover)} (split ${formatCurrency(perParticipantSplit)} ${splitLabel})`;
    }

    message += `\n\nShared from The Nineteenth`;

    return message;
  }, [game, isTeamSkins, sortedPayouts, formattedDebts, unsettledCarryover, perParticipantSplit]);

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
  const getNetResultColor = useCallback(
    (value: number): string => getNetResultColorUtil(value, colors),
    [colors]
  );

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
      <SettlementTotalsTable
        sortedPayouts={sortedPayouts}
        isTeamSkins={isTeamSkins}
        getNetResultColor={getNetResultColor}
      />

      <Divider style={{ backgroundColor: colors.border }} />

      {/* Who Owes Who Section / All Even Message */}
      <DebtTransactionsList
        isTeamSkins={isTeamSkins}
        debtTransactions={debtTransactions}
        teamDebtTransactions={teamDebtTransactions}
        formattedDebts={formattedDebts}
        nameMap={nameMap}
      />

      {/* Unsettled Pot Section */}
      <UnsettledPotCard
        unsettledCarryover={unsettledCarryover}
        perParticipantSplit={perParticipantSplit}
        isTeamSkins={isTeamSkins}
      />

      <Divider style={{ backgroundColor: colors.border }} />

      {/* Action Buttons */}
      <SettlementActions onShare={handleShare} />

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
});

export default SkinsSettlementCard;
