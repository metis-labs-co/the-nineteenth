/**
 * TotalRow - Final total row with match result
 *
 * Displays overall totals and the final match status with primary background.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { getRunningStatusText } from './utils';
import type { MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';

// ============================================================================
// TYPES
// ============================================================================

export interface TotalRowProps {
  par: number;
  player1Total: number;
  player2Total: number;
  holesPlayed: number;
  finalStatus: MatchStatus;
  player1Name: string;
  player2Name: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TotalRow = React.memo(function TotalRow({
  par,
  player1Total,
  player2Total,
  holesPlayed,
  finalStatus,
  player1Name,
  player2Name,
}: TotalRowProps) {
  const colors = useThemeColors();

  const statusText = getRunningStatusText(finalStatus, player1Name, player2Name);
  const isComplete = finalStatus.status === 'complete';

  return (
    <View style={[styles.row, styles.totalRow, { backgroundColor: colors.primary, borderBottomColor: colors.primary }]}>
      <View style={[styles.cell, styles.holeCell]}>
        <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>TOT</Text>
      </View>
      <View style={[styles.cell, styles.parCell]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>{par}</Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>
          {holesPlayed > 0 ? player1Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>
          {holesPlayed > 0 ? player2Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text
          style={[
            styles.totalStatusText,
            { color: colors.textInverse },
            isComplete && styles.finalResultText,
          ]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>
    </View>
  );
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
  totalRow: {
    borderBottomWidth: 0,
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
  totalLabelText: {
    ...typography.smallBold,
  },
  totalText: {
    ...typography.bodyBold,
  },
  totalStatusText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  finalResultText: {
    fontWeight: '700',
  },
});
