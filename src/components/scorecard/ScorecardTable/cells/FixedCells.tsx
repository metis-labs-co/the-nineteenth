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
import { displayHoleNumber } from '@/utils/holeTransformers';
import { styles, scorecardBand } from '../styles';
import type { Hole } from '@/types/database.types';

// =====================================================
// HEADER
// =====================================================

interface FixedHeaderCellsProps {}

export const FixedHeaderCells = React.memo(function FixedHeaderCells(_props: FixedHeaderCellsProps) {
  // Dark band is fixed in both themes (see scorecardBand in ../styles).
  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.headerLabelText, { color: scorecardBand.label }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.headerCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.headerLabelText, { color: scorecardBand.muted }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.headerCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.headerLabelText, { color: scorecardBand.muted }]}>Par</Text>
      </View>
    </>
  );
});

// =====================================================
// HOLE ROW
// =====================================================

interface FixedHoleCellsProps {
  hole: Hole;
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
  onHolePress?: (holeNumber: number) => void;
}

export const FixedHoleCells = React.memo(function FixedHoleCells({ hole, startHole = 1, onHolePress }: FixedHoleCellsProps) {
  const colors = useThemeColors();

  const holeCellContent = (
    <Text style={[styles.holeCellText, { color: onHolePress ? colors.primary : colors.textPrimary }]}>
      {displayHoleNumber(hole, startHole)}
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
  // Dark band is fixed in both themes (see scorecardBand in ../styles).
  return (
    <>
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.totalLabelText, { color: scorecardBand.label }]}>Gross</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.totalText, { color: scorecardBand.muted }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.totalText, { color: scorecardBand.text }]}>{parTotal}</Text>
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
      <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.totalLabelText, { color: colors.textSecondary }]}>Net</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.totalText, { color: colors.textTertiary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.totalText, { color: colors.textTertiary }]}>-</Text>
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
      <View style={[styles.tableCell, styles.holeCell, styles.stablefordCell, { backgroundColor: colors.primaryBackground }]}>
        <Text style={[styles.stablefordLabelText, { color: colors.primaryDark }]}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.stablefordCell, { backgroundColor: colors.primaryBackground }]}>
        <Text style={[styles.stablefordText, { color: colors.primaryDark }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.stablefordCell, { backgroundColor: colors.primaryBackground }]}>
        <Text style={[styles.stablefordText, { color: colors.primaryDark }]}>-</Text>
      </View>
    </>
  );
});
