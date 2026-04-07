/**
 * HoleRow - Individual hole row in the MatchPlayScorecardTable
 *
 * Displays hole number, par, both player scores with result coloring,
 * and running match status. Optionally pressable.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { MatchPlayScoreCell } from './MatchPlayScoreCell';
import { getRunningStatusText } from './utils';
import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface HoleRowProps {
  hole: Hole;
  result: HoleResult | undefined;
  runningStatus: MatchStatus | undefined;
  player1Name: string;
  player2Name: string;
  onPress?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getPlayerResult(
  isPlayer1: boolean,
  p1Score: number | null | undefined,
  p2Score: number | null | undefined,
  winner: HoleResult['winner'] | undefined
): 'won' | 'lost' | 'halved' | 'none' {
  // No scores yet
  if (p1Score === null && p2Score === null) return 'none';
  if (p1Score === undefined && p2Score === undefined) return 'none';

  // Determine result based on winner
  if (winner === 'halved') return 'halved';
  if (winner === null) return 'none'; // Still in progress or no result

  if (isPlayer1) {
    return winner === 'player1' ? 'won' : 'lost';
  } else {
    return winner === 'player2' ? 'won' : 'lost';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const HoleRow = React.memo(function HoleRow({
  hole,
  result,
  runningStatus,
  player1Name,
  player2Name,
  onPress,
}: HoleRowProps) {
  const colors = useThemeColors();

  const p1Score = result?.player1Score;
  const p2Score = result?.player2Score;
  const p1PickedUp = result?.player1PickedUp ?? false;
  const p2PickedUp = result?.player2PickedUp ?? false;
  const winner = result?.winner;

  const p1Result = getPlayerResult(true, p1Score, p2Score, winner);
  const p2Result = getPlayerResult(false, p1Score, p2Score, winner);

  const statusText = getRunningStatusText(runningStatus, player1Name, player2Name);

  const rowContent = (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.cell, styles.holeCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>{hole.number}</Text>
      </View>
      <View style={[styles.cell, styles.parCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.parCellText, { color: colors.textSecondary }]}>{hole.par}</Text>
      </View>
      <View style={[styles.cell, styles.playerCell, { backgroundColor: colors.surface }]}>
        <MatchPlayScoreCell score={p1Score} isPickup={p1PickedUp} result={p1Result} />
      </View>
      <View style={[styles.cell, styles.playerCell, { backgroundColor: colors.surface }]}>
        <MatchPlayScoreCell score={p2Score} isPickup={p2PickedUp} result={p2Result} />
      </View>
      <View style={[styles.cell, styles.statusCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statusText, { color: colors.textSecondary }]} numberOfLines={1}>
          {statusText}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {rowContent}
      </TouchableOpacity>
    );
  }

  return rowContent;
});

// ============================================================================
// STYLES
// ============================================================================

const CELL_HEIGHT = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  cell: {
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  holeCell: {
    width: 48,
  },
  parCell: {
    width: 40,
  },
  playerCell: {
    flex: 1,
    minWidth: 56,
  },
  statusCell: {
    width: 90,
    paddingHorizontal: spacing.sm,
  },
  holeCellText: {
    ...typography.bodyBold,
  },
  parCellText: {
    ...typography.body,
  },
  statusText: {
    ...typography.caption,
    textAlign: 'center',
  },
});
