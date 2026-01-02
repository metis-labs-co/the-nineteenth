/**
 * ScorecardTableBallsAsPlayers Component
 *
 * Displays multi-ball scorecard data with each ball rendered as a separate
 * player-like card. Used when the view mode is toggled to show balls as
 * individual entities rather than side-by-side columns.
 *
 * Features:
 * - Each ball displayed as a separate card (Ball 1, Ball 2, etc.)
 * - Per-ball statistics header (gross, stableford)
 * - Hole-by-hole scores in horizontal rows
 * - Front 9 / Back 9 sections with subtotals
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { ScoreIndicator } from '@/components/scorecard';
import { getBallLabel } from '@/types/multiball.types';
import { getScoreColor } from '@/utils/scoring';
import type { MultiBallHoleRowData, MultiBallStats } from '../hooks';
import type { BallCount } from '@/types/multiball.types';

// Layout constants
const LABEL_WIDTH = 40;
const TOTAL_WIDTH = 36;

interface ScorecardTableBallsAsPlayersProps {
  front9Holes: MultiBallHoleRowData[];
  back9Holes: MultiBallHoleRowData[];
  multiBallStats: MultiBallStats;
  ballCount: BallCount;
  playerHandicap: number;
  // Stats visibility (Premium-only) - not displayed in this compact view
  showFIR?: boolean;
  showGIR?: boolean;
}

export function ScorecardTableBallsAsPlayers({
  front9Holes,
  back9Holes,
  multiBallStats,
  ballCount,
  playerHandicap: _playerHandicap,
  // FIR/GIR not displayed in compact ball-as-player view
  showFIR: _showFIR = false,
  showGIR: _showGIR = false,
}: ScorecardTableBallsAsPlayersProps) {
  const colors = useThemeColors();

  // Generate ball cards - one per ball
  const ballCards = useMemo(() => {
    return Array.from({ length: ballCount }, (_, index) => {
      const ballNumber = index + 1;
      const ballStats = multiBallStats.ballStats[ballNumber];
      const ballLabel = getBallLabel(index);

      return {
        ballNumber,
        ballLabel,
        stats: ballStats,
      };
    });
  }, [ballCount, multiBallStats]);

  const renderBallCard = (ballData: (typeof ballCards)[0]) => {
    const { ballNumber, ballLabel, stats } = ballData;
    const ballIndex = ballNumber - 1;

    const totalGross = stats?.totalGross || 0;
    const totalStableford = stats?.totalStableford || 0;
    const grossDiff = totalGross - multiBallStats.totalPar;
    const grossDiffDisplay =
      totalGross > 0
        ? grossDiff > 0
          ? `+${grossDiff}`
          : grossDiff === 0
            ? 'E'
            : grossDiff.toString()
        : '';

    const renderHoleRow = (holeList: MultiBallHoleRowData[], isBack9: boolean) => {
      const ninePar = isBack9 ? multiBallStats.back9Par : multiBallStats.front9Par;
      const nineGross = isBack9 ? stats?.back9Gross : stats?.front9Gross;
      const nineStableford = isBack9 ? stats?.back9Stableford : stats?.front9Stableford;

      return (
        <View style={styles.nineSection}>
          {/* Header Row: Hole numbers */}
          <View style={[styles.row, { backgroundColor: colors.surfaceVariant }]}>
            <View style={[styles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.labelText, { color: colors.textPrimary }]}>Hole</Text>
            </View>
            {holeList.map((data) => (
              <View key={data.hole.number} style={styles.cell}>
                <Text style={[styles.headerText, { color: colors.textPrimary }]}>
                  {data.hole.number}
                </Text>
              </View>
            ))}
            <View style={[styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.headerText, { color: colors.textPrimary }]}>
                {isBack9 ? 'IN' : 'OUT'}
              </Text>
            </View>
          </View>

          {/* SI Row */}
          <View style={[styles.row, { backgroundColor: colors.surfaceVariant }]}>
            <View style={[styles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.labelText, { color: colors.textSecondary }]}>SI</Text>
            </View>
            {holeList.map((data) => (
              <View key={data.hole.number} style={styles.cell}>
                <Text style={[styles.cellText, { color: colors.textSecondary }]}>
                  {data.hole.strokeIndex}
                </Text>
              </View>
            ))}
            <View style={[styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.cellText, { color: colors.textSecondary }]}>-</Text>
            </View>
          </View>

          {/* Par Row */}
          <View style={[styles.row, { backgroundColor: colors.surface }]}>
            <View style={[styles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.labelText, { color: colors.textSecondary }]}>Par</Text>
            </View>
            {holeList.map((data) => (
              <View key={data.hole.number} style={styles.cell}>
                <Text style={[styles.cellText, { color: colors.textPrimary }]}>
                  {data.hole.par}
                </Text>
              </View>
            ))}
            <View style={[styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.totalText, { color: colors.textPrimary }]}>{ninePar}</Text>
            </View>
          </View>

          {/* Score Row */}
          <View style={[styles.row, { backgroundColor: colors.surface }]}>
            <View style={[styles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.labelText, { color: colors.textPrimary }]}>Score</Text>
            </View>
            {holeList.map((data) => {
              const ballScore = data.balls[ballIndex];
              const strokes = ballScore?.strokes;
              return (
                <View key={data.hole.number} style={styles.cell}>
                  <ScoreIndicator strokes={strokes} par={data.hole.par} display="compact" />
                </View>
              );
            })}
            <View style={[styles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.totalText, { color: colors.textPrimary }]}>
                {nineGross || '-'}
              </Text>
            </View>
          </View>

          {/* Stableford Row */}
          <View style={[styles.row, { backgroundColor: colors.primary }]}>
            <View
              style={[styles.labelCell, { backgroundColor: colors.primaryDark || colors.primary }]}
            >
              <Text style={[styles.labelText, { color: colors.textOnColored }]}>Pts</Text>
            </View>
            {holeList.map((data) => {
              const ballScore = data.balls[ballIndex];
              const points = ballScore?.stablefordPoints || 0;
              const hasScore = ballScore?.strokes !== undefined;
              return (
                <View key={data.hole.number} style={styles.cell}>
                  <Text style={[styles.cellText, { color: colors.textOnColored }]}>
                    {hasScore ? points : '-'}
                  </Text>
                </View>
              );
            })}
            <View
              style={[styles.totalCell, { backgroundColor: colors.primaryDark || colors.primary }]}
            >
              <Text style={[styles.totalText, { color: colors.textOnColored }]}>
                {nineStableford || 0}
              </Text>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View
        key={ballNumber}
        style={[styles.ballCard, { backgroundColor: colors.surface }]}
      >
        {/* Ball Header */}
        <View style={[styles.ballHeader, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.ballInfo}>
            <Text style={[styles.ballName, { color: colors.textPrimary }]}>{ballLabel}</Text>
          </View>
          <View style={styles.ballTotals}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Gross</Text>
              <View style={styles.grossValueContainer}>
                <Text
                  style={[
                    styles.totalValue,
                    { color: getScoreColor(totalGross, multiBallStats.totalPar) },
                  ]}
                >
                  {totalGross || '-'}
                </Text>
                {totalGross > 0 && (
                  <Text
                    style={[
                      styles.grossDiffText,
                      {
                        color:
                          grossDiff < 0
                            ? colors.success
                            : grossDiff === 0
                              ? colors.textSecondary
                              : colors.error,
                      },
                    ]}
                  >
                    ({grossDiffDisplay})
                  </Text>
                )}
              </View>
            </View>
            <View
              style={[
                styles.totalItem,
                styles.stablefordTotal,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.totalLabel, { color: colors.textOnColored }]}>Pts</Text>
              <Text style={[styles.stablefordValue, { color: colors.textOnColored }]}>
                {totalStableford}
              </Text>
            </View>
          </View>
        </View>

        {/* Front 9 */}
        {renderHoleRow(front9Holes, false)}

        {/* Back 9 */}
        {renderHoleRow(back9Holes, true)}
      </View>
    );
  };

  return <View style={styles.container}>{ballCards.map(renderBallCard)}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  ballCard: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  ballHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  ballInfo: {
    flex: 1,
  },
  ballName: {
    ...typography.bodyBold,
  },
  ballTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totalItem: {
    alignItems: 'center',
    minWidth: 44,
  },
  totalLabel: {
    ...typography.caption,
  },
  totalValue: {
    ...typography.bodyBold,
  },
  grossValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  grossDiffText: {
    ...typography.caption,
  },
  stablefordTotal: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  stablefordValue: {
    ...typography.bodyBold,
  },
  nineSection: {},
  row: {
    flexDirection: 'row',
  },
  labelCell: {
    width: LABEL_WIDTH,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    ...typography.caption,
    fontWeight: '600',
  },
  cell: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalCell: {
    width: TOTAL_WIDTH,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    ...typography.caption,
    fontWeight: '600',
  },
  cellText: {
    ...typography.small,
  },
  totalText: {
    ...typography.smallBold,
  },
});
