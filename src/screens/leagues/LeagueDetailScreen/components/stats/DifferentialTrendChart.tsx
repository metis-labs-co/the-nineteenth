/**
 * DifferentialTrendChart - Section C: Line chart of user's differentials over time
 *
 * Uses react-native-gifted-charts LineChart (same pattern as PerformanceChart).
 * Requires 2+ rounds to display.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { SectionHeader } from '@/components/common/SectionHeader';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DifferentialTrendChartProps {
  differentials: { differential: number; date_played: string; course_name: string }[];
}

export const DifferentialTrendChart = React.memo(function DifferentialTrendChart({
  differentials,
}: DifferentialTrendChartProps) {
  const colors = useThemeColors();

  const chartData = useMemo(() => {
    if (differentials.length < 2) return null;

    return differentials.map((d) => {
      const date = d.date_played ? new Date(d.date_played) : null;
      const label = date ? `${date.getDate()}/${date.getMonth() + 1}` : '';
      return {
        value: d.differential,
        label,
        dataPointText: d.differential.toFixed(1),
      };
    });
  }, [differentials]);

  const yAxisConfig = useMemo(() => {
    if (!chartData) return { min: 0, max: 40 };
    const values = chartData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;
    const padding = range > 0 ? range * 0.2 : 2;
    return {
      min: Math.max(0, Math.floor(minVal - padding)),
      max: Math.ceil(maxVal + padding),
    };
  }, [chartData]);

  const chartWidth = SCREEN_WIDTH - spacing.lg * 4 - 50;

  if (differentials.length < 2) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Differential Trend" icon="chart-timeline-variant" />
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
          <View style={styles.emptyState}>
            <Icon source="chart-line" size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Play more rounds to see trends
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Differential Trend" icon="chart-timeline-variant" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData!}
            height={150}
            width={chartWidth}
            spacing={chartWidth / Math.max(chartData!.length - 1, 1)}
            initialSpacing={10}
            endSpacing={10}
            color1={colors.primary}
            dataPointsColor1={colors.primary}
            dataPointsRadius={5}
            textColor1={colors.textPrimary}
            textFontSize={10}
            textShiftY={-10}
            textShiftX={-5}
            curved
            curvature={0.2}
            thickness={2}
            hideRules
            xAxisColor={colors.border}
            yAxisColor="transparent"
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            noOfSections={4}
            maxValue={yAxisConfig.max}
            yAxisOffset={yAxisConfig.min}
          />
        </View>
        <Text style={[styles.description, { color: colors.textTertiary }]}>
          Lower is better
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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

export default DifferentialTrendChart;
