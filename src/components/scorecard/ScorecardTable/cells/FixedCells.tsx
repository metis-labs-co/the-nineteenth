/**
 * FixedCells
 *
 * Fixed column cell components for the scorecard table.
 * These render the left-side columns (Hole, SI, Par) that remain
 * visible when the player columns scroll horizontally.
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { styles } from '../styles';
import type { Hole } from '@/types/database.types';

// =====================================================
// HEADER
// =====================================================

interface FixedHeaderCellsProps {}

export const FixedHeaderCells = React.memo(function FixedHeaderCells(_props: FixedHeaderCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.headerCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Par</Text>
      </View>
    </>
  );
});

// =====================================================
// HOLE ROW
// =====================================================

interface FixedHoleCellsProps {
  hole: Hole;
  onHolePress?: (holeNumber: number) => void;
}

export const FixedHoleCells = React.memo(function FixedHoleCells({ hole, onHolePress }: FixedHoleCellsProps) {
  const colors = useThemeColors();

  const holeCellContent = (
    <Text style={[styles.holeCellText, { color: onHolePress ? colors.primary : colors.textPrimary }]}>
      {hole.number}
    </Text>
  );

  return (
    <>
      {onHolePress ? (
        <TouchableOpacity
          style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surface }]}
          onPress={() => onHolePress(hole.number)}
          activeOpacity={0.7}
        >
          {holeCellContent}
        </TouchableOpacity>
      ) : (
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surface }]}>
          {holeCellContent}
        </View>
      )}
      <View style={[styles.tableCell, styles.indexCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>{hole.strokeIndex}</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.parCellText, { color: colors.textSecondary }]}>{hole.par}</Text>
      </View>
    </>
  );
});

// =====================================================
// SUBTOTAL ROW (OUT / IN)
// =====================================================

interface FixedSubtotalCellsProps {
  label: string;
  par: number;
}

export const FixedSubtotalCells = React.memo(function FixedSubtotalCells({
  label,
  par,
}: FixedSubtotalCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.subtotalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
      </View>
    </>
  );
});

// =====================================================
// GROSS ROW
// =====================================================

interface FixedGrossCellsProps {
  parTotal: number;
}

export const FixedGrossCells = React.memo(function FixedGrossCells({ parTotal }: FixedGrossCellsProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalLabelText, { color: colors.textPrimary }]}>Gross</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>{parTotal}</Text>
      </View>
    </>
  );
});

// =====================================================
// NET ROW
// =====================================================

export const FixedNetCells = React.memo(function FixedNetCells() {
  const colors = useThemeColors();

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalLabelText, { color: colors.textPrimary }]}>Net</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
      </View>
    </>
  );
});

// =====================================================
// STABLEFORD / SCORE ROW
// =====================================================

interface FixedStablefordCellsProps {
  gameType?: string;
}

export const FixedStablefordCells = React.memo(function FixedStablefordCells({ gameType }: FixedStablefordCellsProps) {
  const colors = useThemeColors();
  const label = gameType === 'par' ? 'Score' : 'Pts';

  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordLabelText, { color: colors.textOnColored }]}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.stablefordCell, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stablefordText, { color: colors.textOnColored }]}>-</Text>
      </View>
    </>
  );
});
