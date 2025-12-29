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
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { ScoreIndicator } from '@/components/scorecard';
import { getBallLabel } from '@/types/multiball.types';
import type { MultiBallHoleRowData, MultiBallStats } from '../hooks';
import type { BallCount } from '@/types/multiball.types';

interface ScorecardTableMultiBallProps {
  front9Holes: MultiBallHoleRowData[];
  back9Holes: MultiBallHoleRowData[];
  multiBallStats: MultiBallStats;
  ballCount: BallCount;
  playerHandicap: number;
}

export function ScorecardTableMultiBall({
  front9Holes,
  back9Holes,
  multiBallStats,
  ballCount,
  playerHandicap,
}: ScorecardTableMultiBallProps) {
  const colors = useThemeColors();

  // Generate ball column headers
  const ballHeaders = Array.from({ length: ballCount }, (_, i) => getBallLabel(i));

  // Render header row
  const renderHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
      {/* Fixed columns */}
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.narrowCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.narrowCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Par</Text>
      </View>

      {/* Ball columns */}
      {ballHeaders.map((label, index) => (
        <View key={index} style={[styles.ballColumnGroup]}>
          <View style={[styles.tableCell, styles.ballHeaderCell, { backgroundColor: colors.gray800 }]}>
            <Text style={[styles.headerText, { color: colors.textInverse }]}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Render sub-header row (Score/Pts labels)
  const renderSubHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
      {/* Fixed columns - empty */}
      <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray700 }]} />
      <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray700 }]} />
      <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray700 }]} />

      {/* Ball columns - Score/Pts labels */}
      {ballHeaders.map((_, index) => (
        <View key={index} style={[styles.ballColumnGroup]}>
          <View style={[styles.tableCell, styles.ballScoreCell, { backgroundColor: colors.gray700 }]}>
            <Text style={[styles.smallText, { color: colors.gray300 }]}>Score</Text>
          </View>
          <View style={[styles.tableCell, styles.ballPtsCell, { backgroundColor: colors.gray700 }]}>
            <Text style={[styles.smallText, { color: colors.gray300 }]}>Pts</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Render hole row
  const renderHoleRow = (data: MultiBallHoleRowData) => {
    const { hole, balls } = data;

    return (
      <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
        {/* Fixed columns */}
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>{hole.number}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.smallText, { color: colors.textSecondary }]}>{hole.strokeIndex}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray50 }]}>
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
        style={[styles.tableRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}
      >
        {/* Fixed columns */}
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray200 }]}>
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
              <View style={[styles.tableCell, styles.ballScoreCell, { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{gross || '-'}</Text>
              </View>
              <View style={[styles.tableCell, styles.ballPtsCell, { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{stableford}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Render total row
  const renderTotalRow = () => {
    return (
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800 }]}>
        {/* Fixed columns */}
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>TOTAL</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.narrowCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{multiBallStats.totalPar}</Text>
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
              <View style={[styles.tableCell, styles.ballScoreCell, { backgroundColor: colors.gray800 }]}>
                <View style={styles.grossContainer}>
                  <Text style={[styles.totalText, { color: colors.textInverse }]}>{totalGross || '-'}</Text>
                  {totalGross > 0 && (
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
              <View style={[styles.tableCell, styles.ballPtsCell, styles.stablefordTotalCell, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stablefordTotalText, { color: colors.textInverse }]}>{totalStableford}</Text>
                <Text style={[styles.stablefordPtsLabel, { color: colors.primaryLighter }]}>pts</Text>
              </View>
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
    ...typography.bodyBold,
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
});
