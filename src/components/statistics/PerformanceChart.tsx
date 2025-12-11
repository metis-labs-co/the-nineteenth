/**
 * PerformanceChart - Line chart showing recent rounds performance
 *
 * Displays stroke scores and stableford points over recent rounds.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';

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
  const isDark = useIsDark();
  const cardBg = isDark ? colors.gray100 : colors.white;

  // Format date for chart labels (DD/MM)
  const formatDateLabel = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Prepare chart data - reverse to show oldest to newest (left to right)
  const chartData = useMemo(() => {
    const reversedRounds = [...rounds].reverse();

    const strokeData = reversedRounds.map((round) => ({
      value: round.totalGross,
      dataPointText: round.totalGross.toString(),
      label: formatDateLabel(round.date),
    }));

    const stablefordData = reversedRounds.map((round) => ({
      value: round.totalPoints,
      dataPointText: round.totalPoints.toString(),
    }));

    return { strokeData, stablefordData };
  }, [rounds]);

  // Calculate Y-axis range for stroke scores
  const strokeValues = chartData.strokeData.map((d) => d.value);
  const minStroke = Math.min(...strokeValues);
  const maxStroke = Math.max(...strokeValues);
  const strokePadding = Math.max(5, Math.ceil((maxStroke - minStroke) * 0.15));

  // Calculate chart width based on data points
  const chartWidth = SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2 - 50;

  if (rounds.length < 2) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg }, shadows.sm]}>
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
    <View style={[styles.card, { backgroundColor: cardBg }, shadows.sm]}>
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
          maxValue={Math.max(maxStroke + strokePadding, 50)}
          yAxisOffset={Math.max(0, minStroke - strokePadding)}
          pointerConfig={{
            pointerStripHeight: 150,
            pointerStripColor: colors.border,
            pointerStripWidth: 1,
            pointerColor: colors.primary,
            radius: 6,
            pointerLabelWidth: 100,
            pointerLabelHeight: 90,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any) => {
              return (
                <View
                  style={[
                    styles.tooltip,
                    { backgroundColor: isDark ? colors.gray200 : colors.gray100 },
                  ]}
                >
                  <Text style={[styles.tooltipText, { color: colors.textPrimary }]}>
                    Stroke: {items[0]?.value}
                  </Text>
                  <Text style={[styles.tooltipText, { color: colors.textPrimary }]}>
                    Points: {items[1]?.value}
                  </Text>
                </View>
              );
            },
          }}
        />
      </View>

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
  tooltip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tooltipText: {
    ...typography.small,
  },
});

export default PerformanceChart;
