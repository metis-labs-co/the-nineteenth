/**
 * ScrambleScorecardTable Component
 *
 * Displays team scores for scramble format with:
 * - Hole number, par, and stroke index
 * - Team gross score per hole
 * - Team net score per hole (with strokes received)
 * - Stableford points per hole
 * - Front 9 (OUT) and Back 9 (IN) subtotals
 * - Total gross, net, and points
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesOnHole, calculateStablefordPoints } from '@/utils/scoring';
import { getScoreBackgroundColor } from '@/utils/displayHelpers';
import { isSingleBallScore } from '@/types/database';
import type { Hole, HoleScore, MultiBallHoleScore } from '@/types';

interface ScrambleScorecardTableProps {
  /** Course holes (1-18) */
  holes: Hole[];
  /** Team name to display */
  teamName: string;
  /** Combined team handicap */
  teamHandicap: number;
  /** Function to get team score for a hole */
  getTeamScore: (holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
}

interface HoleRowData {
  hole: Hole;
  gross: number | null;
  strokesReceived: number;
  net: number | null;
  points: number;
}

export function ScrambleScorecardTable({
  holes,
  teamName,
  teamHandicap,
  getTeamScore,
}: ScrambleScorecardTableProps) {
  const colors = useThemeColors();

  // Calculate data for each hole
  const holeData: HoleRowData[] = useMemo(() => {
    return holes.map((hole) => {
      const score = getTeamScore(hole.number);
      const strokes = score && isSingleBallScore(score) ? score.strokes : null;
      const strokesReceived = getStrokesOnHole(teamHandicap, hole);
      const net = strokes !== null ? Math.max(0, strokes - strokesReceived) : null;
      const points = strokes !== null
        ? calculateStablefordPoints(strokes, teamHandicap, hole)
        : 0;

      return {
        hole,
        gross: strokes,
        strokesReceived,
        net,
        points,
      };
    });
  }, [holes, teamHandicap, getTeamScore]);

  // Split into front 9 and back 9
  const front9 = holeData.slice(0, 9);
  const back9 = holeData.slice(9, 18);

  // Calculate totals
  const front9Totals = useMemo(() => ({
    par: front9.reduce((sum, h) => sum + h.hole.par, 0),
    gross: front9.reduce((sum, h) => sum + (h.gross ?? 0), 0),
    net: front9.reduce((sum, h) => sum + (h.net ?? 0), 0),
    points: front9.reduce((sum, h) => sum + h.points, 0),
    hasScores: front9.some((h) => h.gross !== null),
  }), [front9]);

  const back9Totals = useMemo(() => ({
    par: back9.reduce((sum, h) => sum + h.hole.par, 0),
    gross: back9.reduce((sum, h) => sum + (h.gross ?? 0), 0),
    net: back9.reduce((sum, h) => sum + (h.net ?? 0), 0),
    points: back9.reduce((sum, h) => sum + h.points, 0),
    hasScores: back9.some((h) => h.gross !== null),
  }), [back9]);

  const totalTotals = useMemo(() => ({
    par: front9Totals.par + back9Totals.par,
    gross: front9Totals.gross + back9Totals.gross,
    net: front9Totals.net + back9Totals.net,
    points: front9Totals.points + back9Totals.points,
    hasScores: front9Totals.hasScores || back9Totals.hasScores,
  }), [front9Totals, back9Totals]);

  // Use flex ratios for columns to fill screen width
  // Hole and Par are narrower, Gross/Net/Pts are wider
  const colFlex = {
    hole: 1,
    par: 1,
    gross: 1.2,
    net: 1.2,
    pts: 1,
  };

  // Get score color based on relation to par
  const getScoreColor = (gross: number | null, par: number): string => {
    if (gross === null) return colors.textSecondary;
    const diff = gross - par;
    if (diff <= -2) return colors.eagle ?? colors.birdie; // Eagle or better
    if (diff === -1) return colors.birdie;
    if (diff === 0) return colors.par;
    if (diff === 1) return colors.bogey;
    return colors.doubleBogey;
  };

  const renderHoleRow = (data: HoleRowData, index: number) => {
    const isEven = index % 2 === 0;
    const scoreColor = getScoreColor(data.gross, data.hole.par);

    return (
      <View
        key={data.hole.number}
        style={[
          styles.row,
          { backgroundColor: isEven ? colors.surface : colors.surfaceVariant },
        ]}
      >
        <View style={[styles.cell, { flex: colFlex.hole }]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>
            {data.hole.number}
          </Text>
        </View>
        <View style={[styles.cell, { flex: colFlex.par }]}>
          <Text style={[styles.cellText, { color: colors.textSecondary }]}>
            {data.hole.par}
          </Text>
        </View>
        <View style={[styles.cell, { flex: colFlex.gross }]}>
          <View
            style={[
              styles.scoreCell,
              data.gross !== null && {
                backgroundColor: getScoreBackgroundColor(data.gross, data.hole.par, colors),
              },
            ]}
          >
            <Text style={[styles.cellTextBold, { color: scoreColor }]}>
              {data.gross ?? '-'}
            </Text>
          </View>
        </View>
        <View style={[styles.cell, { flex: colFlex.net }]}>
          <Text style={[styles.cellText, { color: colors.textSecondary }]}>
            {data.net ?? '-'}
          </Text>
        </View>
        <View style={[styles.cell, { flex: colFlex.pts }]}>
          <Text style={[styles.cellTextBold, { color: colors.primary }]}>
            {data.points || '-'}
          </Text>
        </View>
      </View>
    );
  };

  const renderTotalsRow = (
    label: string,
    totals: typeof front9Totals,
    isGrandTotal: boolean = false
  ) => (
    <View
      style={[
        styles.row,
        styles.totalsRow,
        { backgroundColor: isGrandTotal ? colors.primary : colors.surfaceVariant },
      ]}
    >
      <View style={[styles.cell, { flex: colFlex.hole }]}>
        <Text
          style={[
            styles.cellTextBold,
            { color: isGrandTotal ? colors.white : colors.textPrimary },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={[styles.cell, { flex: colFlex.par }]}>
        <Text
          style={[
            styles.cellText,
            { color: isGrandTotal ? colors.white : colors.textSecondary },
          ]}
        >
          {totals.par}
        </Text>
      </View>
      <View style={[styles.cell, { flex: colFlex.gross }]}>
        <Text
          style={[
            styles.cellTextBold,
            { color: isGrandTotal ? colors.white : colors.textPrimary },
          ]}
        >
          {totals.hasScores ? totals.gross : '-'}
        </Text>
      </View>
      <View style={[styles.cell, { flex: colFlex.net }]}>
        <Text
          style={[
            styles.cellText,
            { color: isGrandTotal ? colors.white : colors.textSecondary },
          ]}
        >
          {totals.hasScores ? totals.net : '-'}
        </Text>
      </View>
      <View style={[styles.cell, { flex: colFlex.pts }]}>
        <Text
          style={[
            styles.cellTextBold,
            { color: isGrandTotal ? colors.white : colors.primary },
          ]}
        >
          {totals.hasScores ? totals.points : '-'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header with team name */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>
          {teamName}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.white }]}>
          Team HC: {teamHandicap.toFixed(1)}
        </Text>
      </View>

      <View>
        {/* Column Headers */}
        <View style={[styles.row, styles.headerRow, { backgroundColor: colors.surfaceVariant }]}>
          <View style={[styles.cell, { flex: colFlex.hole }]}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Hole</Text>
          </View>
          <View style={[styles.cell, { flex: colFlex.par }]}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Par</Text>
          </View>
          <View style={[styles.cell, { flex: colFlex.gross }]}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Gross</Text>
          </View>
          <View style={[styles.cell, { flex: colFlex.net }]}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Net</Text>
          </View>
          <View style={[styles.cell, { flex: colFlex.pts }]}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Pts</Text>
          </View>
        </View>

        {/* Front 9 */}
        {front9.map((data, index) => renderHoleRow(data, index))}
        {renderTotalsRow('OUT', front9Totals)}

        {/* Back 9 */}
        {back9.map((data, index) => renderHoleRow(data, index + 9))}
        {renderTotalsRow('IN', back9Totals)}

        {/* Grand Total */}
        {renderTotalsRow('TOT', totalTotals, true)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.small,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    minHeight: 40,
    alignItems: 'center',
  },
  headerRow: {
    minHeight: 36,
  },
  totalsRow: {
    minHeight: 44,
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellText: {
    ...typography.body,
  },
  cellTextBold: {
    ...typography.bodyBold,
  },
  scoreCell: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
});

export default ScrambleScorecardTable;
