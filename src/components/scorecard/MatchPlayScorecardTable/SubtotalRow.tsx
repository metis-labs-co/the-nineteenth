/**
 * SubtotalRow - Front 9 (OUT) or Back 9 (IN) subtotal row
 *
 * Displays aggregated scores for a set of 9 holes.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface SubtotalRowProps {
  label: string;
  par: number;
  player1Total: number;
  player2Total: number;
  holesPlayed: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SubtotalRow = React.memo(function SubtotalRow({
  label,
  par,
  player1Total,
  player2Total,
  holesPlayed,
}: SubtotalRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
      <View style={[styles.cell, styles.holeCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={[styles.cell, styles.parCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
          {holesPlayed > 0 ? player1Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
          {holesPlayed > 0 ? player2Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text style={[styles.subtotalText, { color: colors.textSecondary }]}>-</Text>
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
  subtotalRow: {},
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
  subtotalText: {
    ...typography.smallBold,
  },
});
