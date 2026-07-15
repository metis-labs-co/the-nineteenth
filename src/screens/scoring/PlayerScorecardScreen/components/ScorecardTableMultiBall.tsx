/**
 * ScorecardTableMultiBall Component
 *
 * Displays the scorecard table for multi-ball rounds with separate
 * columns for each ball (Ball 1, Ball 2, etc.).
 *
 * Features:
 * - Dynamic columns based on ball count (2-4 balls)
 * - Score indicator for each ball
 * - Stableford points per ball
 * - Per-ball subtotals (OUT/IN) and totals
 * - Horizontal scrolling for 4-ball rounds
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { ScoreIndicator } from '@/components/scorecard';
// Fixed dark header-band colors shared with the scorecard redesign (same dark
// green in both themes). Read-only constant import — no scorecard code touched.
import { scorecardBand } from '@/components/scorecard/ScorecardTable/styles';
import { getBallLabel } from '@/types/multiball.types';
import type { MultiBallHoleRowData, MultiBallStats } from '../hooks';
import type { BallCount } from '@/types/multiball.types';

interface ScorecardTableMultiBallProps {
  front9Holes: MultiBallHoleRowData[];
  back9Holes: MultiBallHoleRowData[];
  multiBallStats: MultiBallStats;
  ballCount: BallCount;
  playerHandicap: number;
  // Stats visibility (Premium-only)
  showFIR?: boolean;
  showGIR?: boolean;
}

export function ScorecardTableMultiBall({
  front9Holes,
  back9Holes,
  multiBallStats,
  ballCount,
  playerHandicap: _playerHandicap,
  showFIR = false,
  showGIR = false,
}: ScorecardTableMultiBallProps) {
  const colors = useThemeColors();

  // Generate ball column headers
  const ballHeaders = Array.from({ length: ballCount }, (_, i) => getBallLabel(i));

  // Check if any stats columns are visible
  const _hasStats = showFIR || showGIR;

  // Render header row (fixed dark band in both themes)
  const renderHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: scorecardBand.background }]}>
      {/* Fixed columns */}
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.headerText, { color: scorecardBand.label }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.narrowCell, styles.headerCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.headerText, { color: scorecardBand.label }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.narrowCell, styles.headerCell, { backgroundColor: scorecardBand.background }]}>
        <Text style={[styles.headerText, { color: scorecardBand.label }]}>Par</Text>
      </View>

      {/* Ball columns */}
      {ballHeaders.map((label, index) => (
        <View key={index} style={[styles.ballColumnGroup]}>
          <View style={[styles.tableCell, styles.ballHeaderCell, { backgroundColor: scorecardBand.background }]}>
            <Text style={[styles.headerText, { color: scorecardBand.label }]}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Render sub-header row (Score/Pts/FIR/GIR labels) on the dark band
  const renderSubHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: scorecardBand.background }]}>
      {/* Fixed columns - empty */}
      <View style={[styles.tableCell, styles.holeCell, { backgroundColor: scorecardBand.background }]} />
      <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: scorecardBand.background }]} />
      <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: scorecardBand.background }]} />

      {/* Ball columns - Score/Pts/FIR/GIR labels */}
      {ballHeaders.map((_, index) => (
        <View key={index} style={[styles.ballColumnGroup]}>
          <View style={[styles.tableCell, styles.ballScoreCell, { backgroundColor: scorecardBand.background }]}>
            <Text style={[styles.smallText, { color: scorecardBand.muted }]}>Score</Text>
          </View>
          <View style={[styles.tableCell, styles.ballPtsCell, { backgroundColor: scorecardBand.background }]}>
            <Text style={[styles.smallText, { color: scorecardBand.muted }]}>Pts</Text>
          </View>
          {showFIR && (
            <View style={[styles.tableCell, styles.ballStatCell, { backgroundColor: scorecardBand.background }]}>
              <Text style={[styles.tinyText, { color: scorecardBand.muted }]}>FIR</Text>
            </View>
          )}
          {showGIR && (
            <View style={[styles.tableCell, styles.ballStatCell, { backgroundColor: scorecardBand.background }]}>
              <Text style={[styles.tinyText, { color: scorecardBand.muted }]}>GIR</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // Render hole row
  const renderHoleRow = (data: MultiBallHoleRowData) => {
    const { hole, balls } = data;
    // FIR only applicable for par 4+ holes
    const isFIRApplicable = hole.par >= 4;

    return (
      <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.borderLight }]}>
        {/* Fixed columns */}
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surface }]}>
          <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>{hole.number}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surface }]}>
          <Text style={[styles.smallText, { color: colors.textSecondary }]}>{hole.strokeIndex}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surface }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{hole.par}</Text>
        </View>

        {/* Ball columns */}
        {balls.map((ball, index) => (
          <View key={index} style={[styles.ballColumnGroup]}>
            <View style={[styles.tableCell, styles.ballScoreCell]}>
              <ScoreIndicator strokes={ball.strokes} par={hole.par} display="bordered" size="sm" />
            </View>
            <View style={[styles.tableCell, styles.ballPtsCell]}>
              <Text
                style={[
                  styles.bodyText,
                  {
                    color:
                      ball.stablefordPoints >= 2
                        ? colors.success
                        : ball.stablefordPoints === 0 && ball.strokes !== undefined
                          ? colors.error
                          : colors.textSecondary,
                  },
                ]}
              >
                {ball.strokes !== undefined ? ball.stablefordPoints : '-'}
              </Text>
            </View>
            {/* FIR column per ball */}
            {showFIR && (
              <View style={[styles.tableCell, styles.ballStatCell]}>
                {ball.isPickup || ball.strokes === undefined ? (
                  <Text style={[styles.tinyText, { color: colors.textSecondary }]}>-</Text>
                ) : !isFIRApplicable ? (
                  <Text style={[styles.tinyText, { color: colors.textSecondary }]}>-</Text>
                ) : ball.fairwayHit === true ? (
                  <Icon source="check" size={12} color={colors.success} />
                ) : ball.fairwayHit === false ? (
                  <Icon source="close" size={12} color={colors.error} />
                ) : (
                  <Text style={[styles.tinyText, { color: colors.textSecondary }]}>-</Text>
                )}
              </View>
            )}
            {/* GIR column per ball */}
            {showGIR && (
              <View style={[styles.tableCell, styles.ballStatCell]}>
                {ball.isPickup || ball.strokes === undefined ? (
                  <Text style={[styles.tinyText, { color: colors.textSecondary }]}>-</Text>
                ) : ball.greenInRegulation === true ? (
                  <Icon source="check" size={12} color={colors.success} />
                ) : ball.greenInRegulation === false ? (
                  <Icon source="close" size={12} color={colors.error} />
                ) : (
                  <Text style={[styles.tinyText, { color: colors.textSecondary }]}>-</Text>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  // Render subtotal row (OUT / IN)
  const renderSubtotalRow = (label: string, isBack9: boolean) => {
    const par = isBack9 ? multiBallStats.back9Par : multiBallStats.front9Par;

    return (
      <View
        key={label}
        style={[styles.tableRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.borderLight }]}
      >
        {/* Fixed columns */}
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
        </View>

        {/* Ball columns - subtotals */}
        {Array.from({ length: ballCount }, (_, index) => {
          const ballNumber = index + 1;
          const ballStats = multiBallStats.ballStats[ballNumber];
          const gross = isBack9 ? ballStats?.back9Gross : ballStats?.front9Gross;
          const stableford = isBack9 ? ballStats?.back9Stableford : ballStats?.front9Stableford;

          return (
            <View key={index} style={[styles.ballColumnGroup]}>
              <View style={[styles.tableCell, styles.ballScoreCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{gross || '-'}</Text>
              </View>
              <View style={[styles.tableCell, styles.ballPtsCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{stableford}</Text>
              </View>
              {/* Empty FIR/GIR cells for subtotal row */}
              {showFIR && (
                <View style={[styles.tableCell, styles.ballStatCell, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.tinyText, { color: colors.textPrimary }]}>-</Text>
                </View>
              )}
              {showGIR && (
                <View style={[styles.tableCell, styles.ballStatCell, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.tinyText, { color: colors.textPrimary }]}>-</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Render total row
  const renderTotalRow = () => {
    return (
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.surfaceVariant }]}>
        {/* Fixed columns */}
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalLabelText, { color: colors.textPrimary }]}>TOTAL</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>{multiBallStats.totalPar}</Text>
        </View>

        {/* Ball columns - totals */}
        {Array.from({ length: ballCount }, (_, index) => {
          const ballNumber = index + 1;
          const ballStats = multiBallStats.ballStats[ballNumber];
          const totalGross = ballStats?.totalGross || 0;
          const totalStableford = ballStats?.totalStableford || 0;
          const grossDiff = totalGross - multiBallStats.totalPar;
          const grossDiffDisplay =
            totalGross > 0
              ? grossDiff > 0
                ? `+${grossDiff}`
                : grossDiff === 0
                  ? 'E'
                  : grossDiff.toString()
              : '';

          return (
            <View key={index} style={[styles.ballColumnGroup]}>
              <View style={[styles.tableCell, styles.ballScoreCell, { backgroundColor: colors.surfaceVariant }]}>
                <View style={styles.grossContainer}>
                  <Text style={[styles.totalText, { color: colors.textPrimary }]}>{totalGross || '-'}</Text>
                  {totalGross > 0 && (
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
              <View style={[styles.tableCell, styles.ballPtsCell, styles.stablefordTotalCell, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stablefordTotalText, { color: colors.textOnColored }]}>{totalStableford}</Text>
                <Text style={[styles.stablefordPtsLabel, { color: colors.primaryLighter }]}>pts</Text>
              </View>
              {/* FIR/GIR totals - show dash for now */}
              {showFIR && (
                <View style={[styles.tableCell, styles.ballStatCell, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.tinyText, { color: colors.textPrimary }]}>-</Text>
                </View>
              )}
              {showGIR && (
                <View style={[styles.tableCell, styles.ballStatCell, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.tinyText, { color: colors.textPrimary }]}>-</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Wrap in horizontal ScrollView for 4-ball rounds
  const tableContent = (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
      {renderHeaderRow()}
      {renderSubHeaderRow()}
      {front9Holes.map(renderHoleRow)}
      {renderSubtotalRow('OUT', false)}
      {back9Holes.map(renderHoleRow)}
      {renderSubtotalRow('IN', true)}
      {renderTotalRow()}
    </View>
  );

  // Use horizontal scroll for 4 balls to prevent cramped layout
  if (ballCount >= 4) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        {tableContent}
      </ScrollView>
    );
  }

  return tableContent;
}

const styles = StyleSheet.create({
  tableContainer: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  headerCell: {
    paddingVertical: spacing.md,
  },
  headerText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  holeCell: {
    width: 36,
  },
  narrowCell: {
    width: 28,
  },
  ballColumnGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  ballHeaderCell: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  ballScoreCell: {
    flex: 0.6,
    minWidth: 36,
  },
  ballPtsCell: {
    flex: 0.4,
    minWidth: 28,
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
    ...typography.smallBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalText: {
    ...typography.bodyBold,
  },
  grossContainer: {
    alignItems: 'center',
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
  ballStatCell: {
    flex: 0.25,
    minWidth: 24,
  },
  tinyText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
