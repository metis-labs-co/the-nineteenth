/**
 * PerformanceChart - Line chart showing recent rounds performance
 *
 * Displays stroke scores and stableford points over recent rounds.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useOpenRound } from '@/navigation/openRound';
import { ChartPointChip } from './ChartPointChip';

const SCREEN_WIDTH = Dimensions.get('window').width;

// =====================================================
// TYPES
// =====================================================

export interface RoundDataPoint {
  /** Round date string */
  date: string;
  /** Total gross score */
  totalGross: number;
  /** Total stableford points */
  totalPoints: number;
  /** Round to open when the point is tapped (omit for a non-tappable point) */
  roundId?: string;
  /** Competition the round belongs to, if any */
  competitionId?: string | null;
}

export interface PerformanceChartProps {
  /** Array of round data points */
  rounds: RoundDataPoint[];
}

// =====================================================
// COMPONENT
// =====================================================

export const PerformanceChart = React.memo(function PerformanceChart({
  rounds,
}: PerformanceChartProps) {
  const colors = useThemeColors();
  const openRound = useOpenRound();
  // Index into the chart's oldest → newest order; -1 when nothing is focused.
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Format date for chart labels (DD/MM)
  const formatDateLabel = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Normalize value to a 0-100 scale for chart display
  const normalizeValue = (value: number, min: number, max: number): number => {
    if (max === min) return 50; // Handle edge case where all values are the same
    // Map to 10-90 range to leave padding at top and bottom
    return 10 + ((value - min) / (max - min)) * 80;
  };

  // Prepare chart data - reverse to show oldest to newest (left to right)
  const chartData = useMemo(() => {
    const reversedRounds = [...rounds].reverse();

    // Calculate ranges for normalization
    const strokeValues = reversedRounds.map((r) => r.totalGross);
    const stablefordValues = reversedRounds.map((r) => r.totalPoints);

    const minStroke = Math.min(...strokeValues);
    const maxStroke = Math.max(...strokeValues);
    const minStableford = Math.min(...stablefordValues);
    const maxStableford = Math.max(...stablefordValues);

    // Normalize both datasets to the same visual scale (10-90)
    // but keep original values as dataPointText for display
    const strokeData = reversedRounds.map((round) => ({
      value: normalizeValue(round.totalGross, minStroke, maxStroke),
      dataPointText: round.totalGross.toString(),
      label: formatDateLabel(round.date),
    }));

    const stablefordData = reversedRounds.map((round) => ({
      value: normalizeValue(round.totalPoints, minStableford, maxStableford),
      dataPointText: round.totalPoints.toString(),
    }));

    return { strokeData, stablefordData, orderedRounds: reversedRounds };
  }, [rounds]);

  const focusedRound = chartData.orderedRounds[focusedIndex];
  const focusedRoundId = focusedRound?.roundId;

  // Calculate chart width based on data points
  const chartWidth = SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2 - 50;

  if (rounds.length < 2) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        <View style={styles.emptyState}>
          <Icon source="chart-line" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Play at least 2 rounds to see your performance trend
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Stroke Score</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Stableford Points</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData.strokeData}
          data2={chartData.stablefordData}
          height={150}
          width={chartWidth}
          spacing={chartWidth / (chartData.strokeData.length - 1 || 1)}
          initialSpacing={10}
          endSpacing={10}
          color1={colors.primary}
          color2={colors.success}
          dataPointsColor1={colors.primary}
          dataPointsColor2={colors.success}
          dataPointsRadius={5}
          textColor1={colors.textPrimary}
          textColor2={colors.textPrimary}
          textFontSize={10}
          textShiftY={-10}
          textShiftX={-5}
          curved
          curvature={0.2}
          thickness={2}
          hideRules
          hideYAxisText
          xAxisColor={colors.border}
          yAxisColor="transparent"
          xAxisLabelTextStyle={{
            color: colors.textSecondary,
            fontSize: 10,
          }}
          noOfSections={4}
          maxValue={100}
          // Tapping anywhere in a point's column focuses it (full-height hit
          // area, unlike the small data points); the chip below opens it.
          focusEnabled
          focusedDataPointIndex={focusedIndex}
          onFocus={(_item: unknown, index: number) => setFocusedIndex(index)}
          unFocusOnPressOut={false}
          showStripOnFocus
          stripColor={colors.border}
          stripWidth={1}
          stripHeight={150}
        />
      </View>

      {focusedRound ? (
        <ChartPointChip
          summary={`${formatDateLabel(focusedRound.date)} · ${focusedRound.totalGross} strokes · ${focusedRound.totalPoints} pts`}
          onViewRound={
            focusedRoundId
              ? () => openRound({ roundId: focusedRoundId, competitionId: focusedRound.competitionId })
              : undefined
          }
          viewRoundAccessibilityLabel={`View round from ${formatDateLabel(focusedRound.date)}, ${focusedRound.totalGross} strokes`}
        />
      ) : (
        <Text style={[styles.description, { color: colors.textTertiary }]}>
          Tap a point to see that round
        </Text>
      )}

      {/* Chart description */}
      <Text style={[styles.description, { color: colors.textTertiary }]}>
        Last {rounds.length} rounds performance
      </Text>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.small,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  description: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.small,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default PerformanceChart;
