/**
 * HoleTable - Displays hole breakdown with OUT/IN/TOTAL summaries
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { HoleTableProps } from '../types';
import type { Hole } from '@/types/database.types';

/**
 * Converts yards to metres (1 yard = 0.9144 metres)
 */
function yardsToMetres(yards: number): number {
  return Math.round(yards * 0.9144);
}

export function HoleTable({ holes, selectedTee, useMetres }: HoleTableProps) {
  const colors = useThemeColors();

  const headerBg = colors.surfaceVariant;
  const rowBg = colors.surface;
  const altRowBg = colors.surfaceVariant;
  const totalRowBg = colors.primaryLighter;

  // Sort holes by number
  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.number - b.number),
    [holes]
  );

  // Split into front 9 and back 9
  const frontNine = sortedHoles.filter((h) => h.number <= 9);
  const backNine = sortedHoles.filter((h) => h.number > 9);

  // Calculate totals
  const frontPar = frontNine.reduce((sum, h) => sum + h.par, 0);
  const backPar = backNine.reduce((sum, h) => sum + h.par, 0);
  const totalPar = frontPar + backPar;

  const frontYardage = frontNine.reduce(
    (sum, h) => sum + (selectedTee && h.yardages?.[selectedTee] ? h.yardages[selectedTee] : 0),
    0
  );
  const backYardage = backNine.reduce(
    (sum, h) => sum + (selectedTee && h.yardages?.[selectedTee] ? h.yardages[selectedTee] : 0),
    0
  );
  const totalYardage = frontYardage + backYardage;

  // Convert to display distance based on user preference
  const formatDistance = (yards: number | undefined | null): string | number => {
    if (!yards) return '-';
    return useMetres ? yardsToMetres(yards) : yards;
  };

  const renderHoleRow = (hole: Hole, index: number) => {
    const yardage = selectedTee ? hole.yardages?.[selectedTee] : undefined;
    const displayDistance = formatDistance(yardage);
    const bgColor = index % 2 === 0 ? rowBg : altRowBg;

    return (
      <View key={hole.number} style={[styles.tableRow, { backgroundColor: bgColor }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>{hole.number}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>{hole.par}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>{hole.strokeIndex}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: yardage ? colors.textPrimary : colors.textTertiary }]}>
            {displayDistance}
          </Text>
        </View>
      </View>
    );
  };

  const renderTotalRow = (label: string, par: number, yardage: number) => {
    const displayDistance = formatDistance(yardage);
    return (
      <View key={label} style={[styles.tableRow, styles.totalRow, { backgroundColor: totalRowBg }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.totalLabel, { color: colors.primary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{par}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.totalValue, { color: colors.primary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.totalValue, { color: yardage ? colors.primary : colors.textTertiary }]}>
            {displayDistance}
          </Text>
        </View>
      </View>
    );
  };

  // Distance column header based on user preference
  const distanceHeader = useMetres ? 'Mtrs' : 'Yds';

  return (
    <View style={[styles.tableContainer, { borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.tableHeader, { backgroundColor: headerBg }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Hole</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Par</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>SI</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>{distanceHeader}</Text>
        </View>
      </View>

      {/* Front Nine */}
      {frontNine.map((hole, index) => renderHoleRow(hole, index))}
      {frontNine.length > 0 && renderTotalRow('OUT', frontPar, frontYardage)}

      {/* Back Nine */}
      {backNine.map((hole, index) => renderHoleRow(hole, index))}
      {backNine.length > 0 && renderTotalRow('IN', backPar, backYardage)}

      {/* Total */}
      {holes.length > 0 && (
        <View style={[styles.tableRow, styles.grandTotalRow, { backgroundColor: colors.primary }]}>
          <View style={[styles.tableCell, styles.holeCellWide]}>
            <Text style={[styles.grandTotalLabel, { color: colors.white }]}>TOTAL</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: colors.white }]}>{totalPar}</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: colors.white }]}>-</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: totalYardage ? colors.white : colors.gray300 }]}>
              {formatDistance(totalYardage)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  totalRow: {
    paddingVertical: spacing.sm,
  },
  grandTotalRow: {
    paddingVertical: spacing.md,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  holeCellWide: {
    flex: 1.5,
  },
  cellCenter: {
    alignItems: 'center',
  },
  headerText: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  holeNumber: {
    ...typography.bodyBold,
  },
  cellText: {
    ...typography.body,
  },
  totalLabel: {
    ...typography.smallBold,
  },
  totalValue: {
    ...typography.smallBold,
  },
  grandTotalLabel: {
    ...typography.bodyBold,
  },
  grandTotalValue: {
    ...typography.bodyBold,
  },
});

export default HoleTable;
