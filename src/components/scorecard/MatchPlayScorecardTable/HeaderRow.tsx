/**
 * HeaderRow - Table header for the MatchPlayScorecardTable
 *
 * Displays column headers: Hole, Par, Player1, Player2, Status.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { getFirstName } from '@/utils/displayHelpers';

// ============================================================================
// TYPES
// ============================================================================

export interface HeaderRowProps {
  player1Name: string;
  player2Name: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const HeaderRow = React.memo(function HeaderRow({
  player1Name,
  player2Name,
}: HeaderRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, styles.headerRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
      <View style={[styles.cell, styles.holeCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Hole</Text>
      </View>
      <View style={[styles.cell, styles.parCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Par</Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {getFirstName(player1Name)}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {getFirstName(player2Name)}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Status</Text>
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const CELL_HEIGHT = 44;
const HEADER_HEIGHT = 52;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  headerRow: {
    height: HEADER_HEIGHT,
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
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
});
