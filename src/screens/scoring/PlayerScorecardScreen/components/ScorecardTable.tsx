/**
 * ScorecardTable Component
 *
 * Displays the scorecard table with header, hole rows,
 * subtotals (OUT/IN), and total row.
 *
 * Supports both single-ball and multi-ball modes:
 * - Single-ball: Shows Hole, SI, Par, Shots, Score, Pts, Putts
 * - Multi-ball: Shows Hole, SI, Par, Ball 1 (Score+Pts), Ball 2 (Score+Pts), etc.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { ScoreIndicator } from '@/components/scorecard';
import { ScorecardTableMultiBall } from './ScorecardTableMultiBall';
import type { HoleRowData, PlayerStats, MultiBallHoleRowData, MultiBallStats } from '../hooks';
import type { BallCount } from '@/types/multiball.types';
import type { ScorecardViewMode } from './ScorecardPlayerHeader';

interface ScorecardTableProps {
  front9Holes: HoleRowData[];
  back9Holes: HoleRowData[];
  playerStats: PlayerStats;
  playerHandicap: number;
  // Multi-ball props
  isMultiBall?: boolean;
  ballCount?: BallCount;
  multiBallFront9?: MultiBallHoleRowData[];
  multiBallBack9?: MultiBallHoleRowData[];
  multiBallStats?: MultiBallStats;
  // View mode - for multi-ball, 'compact' shows single best score per hole
  viewMode?: ScorecardViewMode;
}

export function ScorecardTable({
  front9Holes,
  back9Holes,
  playerStats,
  playerHandicap,
  isMultiBall = false,
  ballCount = 1,
  multiBallFront9 = [],
  multiBallBack9 = [],
  multiBallStats,
  viewMode = 'standard',
}: ScorecardTableProps) {
  const colors = useThemeColors();

  // Render multi-ball table if in multi-ball mode and standard view
  // In 'compact' mode, we show the single-ball table with best scores
  if (isMultiBall && ballCount > 1 && multiBallStats && viewMode === 'standard') {
    return (
      <ScorecardTableMultiBall
        front9Holes={multiBallFront9}
        back9Holes={multiBallBack9}
        multiBallStats={multiBallStats}
        ballCount={ballCount}
        playerHandicap={playerHandicap}
      />
    );
  }

  // Single-ball mode - render standard table

  // Render header row
  const renderHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
      {['Hole', 'SI', 'Par', 'Shots', 'Score', 'Pts', 'Putts'].map((label) => (
        <View
          key={label}
          style={[
            styles.tableCell,
            styles.headerCell,
            label === 'Hole' && styles.holeCell,
            (label === 'SI' || label === 'Par' || label === 'Shots') && styles.narrowCell,
            label === 'Score' && styles.scoreCell,
            (label === 'Pts' || label === 'Putts') && styles.wideCell,
            { backgroundColor: colors.gray800 },
          ]}
        >
          <Text style={[styles.headerText, { color: colors.textInverse }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  // Render hole row
  const renderHoleRow = (data: HoleRowData) => {
    const { hole, strokes, putts, stablefordPoints, strokesReceived } = data;

    return (
      <View
        key={hole.number}
        style={[styles.tableRow, { borderBottomColor: colors.border }]}
      >
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>
            {hole.number}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.smallText, { color: colors.textSecondary }]}>
            {hole.strokeIndex}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {hole.par}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.primaryLighter + '30' }]}>
          <Text
            style={[
              styles.smallText,
              { color: strokesReceived > 0 ? colors.primary : colors.textSecondary },
            ]}
          >
            {strokesReceived > 0 ? strokesReceived : '-'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell]}>
          <ScoreIndicator strokes={strokes} par={hole.par} display="bordered" size="sm" />
        </View>
        <View style={[styles.tableCell, styles.wideCell]}>
          <Text
            style={[
              styles.bodyText,
              {
                color:
                  stablefordPoints >= 2
                    ? colors.success
                    : stablefordPoints === 0 && strokes !== undefined
                      ? colors.error
                      : colors.textSecondary,
              },
            ]}
          >
            {strokes !== undefined ? stablefordPoints : '-'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {putts ?? '-'}
          </Text>
        </View>
      </View>
    );
  };

  // Render subtotal row (OUT / IN)
  const renderSubtotalRow = (label: string, isBack9: boolean) => {
    const par = isBack9 ? playerStats.back9Par : playerStats.front9Par;
    const gross = isBack9 ? playerStats.back9Gross : playerStats.front9Gross;
    const stableford = isBack9 ? playerStats.back9Stableford : playerStats.front9Stableford;
    const putts = isBack9 ? playerStats.back9Putts : playerStats.front9Putts;

    return (
      <View
        key={label}
        style={[styles.tableRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}
      >
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{gross || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{stableford}</Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{putts || '-'}</Text>
        </View>
      </View>
    );
  };

  // Render total row
  const renderTotalRow = () => {
    const grossDiff = playerStats.totalGross - playerStats.totalPar;
    const grossDiffDisplay =
      grossDiff > 0 ? `+${grossDiff}` : grossDiff === 0 ? 'E' : grossDiff.toString();

    return (
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800 }]}>
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>TOTAL</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{playerStats.totalPar}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{playerHandicap || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell, { backgroundColor: colors.gray800 }]}>
          <View style={styles.grossContainer}>
            <Text style={[styles.totalGrossText, { color: colors.textInverse }]}>
              {playerStats.totalGross || '-'}
            </Text>
            {playerStats.totalGross > 0 && (
              <Text
                style={[
                  styles.grossDiffText,
                  {
                    color:
                      grossDiff < 0
                        ? colors.successLight
                        : grossDiff === 0
                          ? colors.gray300
                          : colors.errorLight,
                  },
                ]}
              >
                ({grossDiffDisplay})
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.tableCell, styles.wideCell, styles.stablefordTotalCell, { backgroundColor: colors.primary }]}>
          <Text style={[styles.stablefordTotalText, { color: colors.textInverse }]}>
            {playerStats.totalStableford}
          </Text>
          <Text style={[styles.stablefordPtsLabel, { color: colors.primaryLighter }]}>pts</Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{playerStats.totalPutts || '-'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
      {renderHeaderRow()}
      {front9Holes.map(renderHoleRow)}
      {renderSubtotalRow('OUT', false)}
      {back9Holes.map(renderHoleRow)}
      {renderSubtotalRow('IN', true)}
      {renderTotalRow()}
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  headerCell: {
    paddingVertical: spacing.md,
  },
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  holeCell: {
    flex: 1.2,
  },
  narrowCell: {
    flex: 1,
  },
  scoreCell: {
    flex: 1.4,
  },
  wideCell: {
    flex: 1.1,
  },
  holeCellText: {
    ...typography.bodyBold,
  },
  smallText: {
    ...typography.small,
  },
  bodyText: {
    ...typography.body,
  },
  subtotalText: {
    ...typography.smallBold,
  },
  totalRow: {
    borderBottomWidth: 0,
  },
  totalLabelText: {
    ...typography.bodyBold,
  },
  totalText: {
    ...typography.bodyBold,
  },
  grossContainer: {
    alignItems: 'center',
  },
  totalGrossText: {
    ...typography.bodyBold,
  },
  grossDiffText: {
    ...typography.caption,
    marginTop: 2,
  },
  stablefordTotalCell: {},
  stablefordTotalText: {
    ...typography.h4,
  },
  stablefordPtsLabel: {
    ...typography.caption,
    marginTop: 2,
  },
});
