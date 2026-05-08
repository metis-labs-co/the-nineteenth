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
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { ScoreIndicator } from '@/components/scorecard';
import { displayHoleNumber } from '@/utils/holeTransformers';
import { ScorecardTableMultiBall } from './ScorecardTableMultiBall';
import { ScorecardTableBallsAsPlayers } from './ScorecardTableBallsAsPlayers';
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
  // Stats visibility (Premium-only)
  showFIR?: boolean;
  showGIR?: boolean;
  // Hole press handler - navigates back to score entry for that hole
  onHolePress?: (holeNumber: number) => void;
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
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
  showFIR = false,
  showGIR = false,
  onHolePress,
  startHole = 1,
}: ScorecardTableProps) {
  const colors = useThemeColors();

  // Render multi-ball table if in multi-ball mode
  if (isMultiBall && ballCount > 1 && multiBallStats) {
    if (viewMode === 'standard') {
      // Standard view: Show all balls as columns side-by-side
      return (
        <ScorecardTableMultiBall
          front9Holes={multiBallFront9}
          back9Holes={multiBallBack9}
          multiBallStats={multiBallStats}
          ballCount={ballCount}
          playerHandicap={playerHandicap}
          showFIR={showFIR}
          showGIR={showGIR}
        />
      );
    } else {
      // Compact view: Show each ball as a separate player-like card
      return (
        <ScorecardTableBallsAsPlayers
          front9Holes={multiBallFront9}
          back9Holes={multiBallBack9}
          multiBallStats={multiBallStats}
          ballCount={ballCount}
          playerHandicap={playerHandicap}
          showFIR={showFIR}
          showGIR={showGIR}
        />
      );
    }
  }

  // Single-ball mode - render standard table

  // Build header labels based on visible columns
  const getHeaderLabels = () => {
    const labels = ['Hole', 'SI', 'Par', 'Shots', 'Score', 'Pts', 'Putts'];
    if (showFIR) labels.push('FIR');
    if (showGIR) labels.push('GIR');
    return labels;
  };

  // Render header row
  const renderHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
      {getHeaderLabels().map((label) => (
        <View
          key={label}
          style={[
            styles.tableCell,
            styles.headerCell,
            label === 'Hole' && styles.holeCell,
            (label === 'SI' || label === 'Par' || label === 'Shots') && styles.narrowCell,
            label === 'Score' && styles.scoreCell,
            (label === 'Pts' || label === 'Putts') && styles.wideCell,
            (label === 'FIR' || label === 'GIR') && styles.statCell,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  // Render hole row
  const renderHoleRow = (data: HoleRowData) => {
    const { hole, strokes, putts, stablefordPoints, strokesReceived, fairwayHit, greenInRegulation, isPickup } = data;
    // FIR only applicable for par 4+ holes
    const isFIRApplicable = hole.par >= 4;

    return (
      <View
        key={hole.number}
        style={[styles.tableRow, { borderBottomColor: colors.border }]}
      >
        <TouchableOpacity
          style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surface }]}
          onPress={() => onHolePress?.(hole.number)}
          disabled={!onHolePress}
          activeOpacity={onHolePress ? 0.6 : 1}
        >
          <Text style={[styles.holeCellText, { color: onHolePress ? colors.primary : colors.textPrimary }]}>
            {displayHoleNumber(hole, startHole)}
          </Text>
        </TouchableOpacity>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surface }]}>
          <Text style={[styles.smallText, { color: colors.textSecondary }]}>
            {hole.strokeIndex}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surface }]}>
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
          <ScoreIndicator strokes={strokes} par={hole.par} display="compact" />
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
        {/* FIR column - only applicable for par 4+ holes */}
        {showFIR && (
          <View style={[styles.tableCell, styles.statCell]}>
            {isPickup || strokes === undefined ? (
              <Text style={[styles.smallText, { color: colors.textSecondary }]}>-</Text>
            ) : !isFIRApplicable ? (
              <Text style={[styles.smallText, { color: colors.textSecondary }]}>N/A</Text>
            ) : fairwayHit === true ? (
              <Icon source="check" size={16} color={colors.success} />
            ) : fairwayHit === false ? (
              <Icon source="close" size={16} color={colors.error} />
            ) : (
              <Text style={[styles.smallText, { color: colors.textSecondary }]}>-</Text>
            )}
          </View>
        )}
        {/* GIR column */}
        {showGIR && (
          <View style={[styles.tableCell, styles.statCell]}>
            {isPickup || strokes === undefined ? (
              <Text style={[styles.smallText, { color: colors.textSecondary }]}>-</Text>
            ) : greenInRegulation === true ? (
              <Icon source="check" size={16} color={colors.success} />
            ) : greenInRegulation === false ? (
              <Icon source="close" size={16} color={colors.error} />
            ) : (
              <Text style={[styles.smallText, { color: colors.textSecondary }]}>-</Text>
            )}
          </View>
        )}
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
        style={[styles.tableRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}
      >
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{gross || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{stableford}</Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{putts || '-'}</Text>
        </View>
        {/* Empty FIR/GIR cells for subtotal row */}
        {showFIR && (
          <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
          </View>
        )}
        {showGIR && (
          <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
          </View>
        )}
      </View>
    );
  };

  // Render total row
  const renderTotalRow = () => {
    const grossDiff = playerStats.totalGross - playerStats.totalPar;
    const grossDiffDisplay =
      grossDiff > 0 ? `+${grossDiff}` : grossDiff === 0 ? 'E' : grossDiff.toString();

    // FIR/GIR totals display (e.g., "7/14")
    const firDisplay =
      playerStats.totalFairwaysPossible > 0
        ? `${playerStats.totalFairwaysHit}/${playerStats.totalFairwaysPossible}`
        : '-';
    const girDisplay =
      playerStats.totalGIRPossible > 0
        ? `${playerStats.totalGIR}/${playerStats.totalGIRPossible}`
        : '-';

    return (
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalLabelText, { color: colors.textPrimary }]}>TOTAL</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>{playerStats.totalPar}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>{playerHandicap || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.grossContainer}>
            <Text style={[styles.totalGrossText, { color: colors.textPrimary }]}>
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
                          ? colors.textSecondary
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
          <Text style={[styles.stablefordTotalText, { color: colors.textOnColored }]}>
            {playerStats.totalStableford}
          </Text>
          <Text style={[styles.stablefordPtsLabel, { color: colors.primaryLighter }]}>pts</Text>
        </View>
        <View style={[styles.tableCell, styles.wideCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>{playerStats.totalPutts || '-'}</Text>
        </View>
        {/* FIR total */}
        {showFIR && (
          <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.statTotalText, { color: colors.textPrimary }]}>{firDisplay}</Text>
          </View>
        )}
        {/* GIR total */}
        {showGIR && (
          <View style={[styles.tableCell, styles.statCell, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.statTotalText, { color: colors.textPrimary }]}>{girDisplay}</Text>
          </View>
        )}
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
  // FIR/GIR stat cell styles
  statCell: {
    flex: 0.9,
  },
  statTotalText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
});
