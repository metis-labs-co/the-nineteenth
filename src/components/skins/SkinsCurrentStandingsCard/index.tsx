/**
 * SkinsCurrentStandingsCard - Live standings for an active skins game
 *
 * Shows each participant's payout as it stands right now (winnings banked so
 * far minus buy-in), reusing the settlement table so the mid-round view reads
 * exactly like the final settlement. Pending carryover is shown separately —
 * it is still up for grabs on the remaining holes, so nobody banks it yet.
 *
 * Individual skins games only; team games keep the plain in-progress copy.
 *
 * @example
 * ```tsx
 * <SkinsCurrentStandingsCard
 *   game={skinsGame}
 *   results={results}
 *   totalHoles={18}
 *   holesCompleted={12}
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import { calculateInProgressPayouts, formatCurrency } from '@/utils/skins';
import { getNetResultColor as getNetResultColorUtil } from '@/utils/displayHelpers';
import type { SkinsGameWithParticipants, SkinsResult, SkinsPayoutWithPlayer } from '@/types/database';
import { SettlementTotalsTable } from '../SkinsSettlementCard/SettlementTotalsTable';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsCurrentStandingsCardProps {
  /** The active skins game with participant details */
  game: SkinsGameWithParticipants;
  /** Hole results recorded so far */
  results: Pick<
    SkinsResult,
    'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'
  >[];
  /** Holes the round actually plays (9 or 18) — prices the buy-in */
  totalHoles: number;
  /** Holes with a skins result so far */
  holesCompleted: number;
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SkinsCurrentStandingsCard({
  game,
  results,
  totalHoles,
  holesCompleted,
  testID,
}: SkinsCurrentStandingsCardProps) {
  const colors = useThemeColors();

  const { sortedPayouts, unsettledCarryover } = useMemo(() => {
    const participants = game.participants.map((p) => ({ id: p.id }));
    const standing = calculateInProgressPayouts(game, results, participants, totalHoles);

    const nameById = new Map(game.participants.map((p) => [p.id, p.name]));
    const payoutsWithPlayer: SkinsPayoutWithPlayer[] = standing.payouts.map((payout) => ({
      // Synthetic row — this standing is derived client-side, not persisted
      id: payout.player_id,
      skins_game_id: game.id,
      player_id: payout.player_id,
      team_id: null,
      is_team_payout: false,
      buy_in: payout.buy_in,
      total_winnings: payout.total_winnings,
      net_result: payout.net_result,
      holes_won: payout.holes_won,
      holes_tied: payout.holes_tied,
      holes_lost: payout.holes_lost,
      calculated_at: '',
      player: {
        id: payout.player_id,
        name: nameById.get(payout.player_id) ?? 'Unknown',
      },
    }));
    payoutsWithPlayer.sort((a, b) => b.net_result - a.net_result);

    return {
      sortedPayouts: payoutsWithPlayer,
      unsettledCarryover: standing.unsettledCarryover,
    };
  }, [game, results, totalHoles]);

  const getNetResultColor = useCallback(
    (value: number): string => getNetResultColorUtil(value, colors),
    [colors]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      <View style={styles.header}>
        <Icon source="golf" size={20} color={skinsColor} />
        <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
          Game In Progress
        </Text>
      </View>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        {holesCompleted} of {totalHoles} holes completed
        {unsettledCarryover > 0 &&
          ` • ${formatCurrency(unsettledCarryover)} carryover still to be won`}
      </Text>

      <SettlementTotalsTable
        sortedPayouts={sortedPayouts}
        isTeamSkins={false}
        getNetResultColor={getNetResultColor}
      />

      <Text style={[typography.caption, { color: colors.textTertiary }]}>
        If the game ended now. Buy-in {formatCurrency(sortedPayouts[0]?.buy_in ?? 0)} per player.
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
