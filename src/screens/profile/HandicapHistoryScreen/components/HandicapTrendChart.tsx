/**
 * HandicapTrendChart - Line chart of handicap differentials across rounds
 *
 * Shows the player's score differential progression over their last 20 rounds,
 * with qualifying rounds (those counted in the index) emphasised.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import type { HandicapRound } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface HandicapTrendChartProps {
  rounds: HandicapRound[];
  variant?: 'full' | 'compact';
}

export const HandicapTrendChart = React.memo(function HandicapTrendChart({
  rounds,
  variant = 'full',
}: HandicapTrendChartProps) {
  const colors = useThemeColors();

  const chartData = useMemo(() => {
    if (rounds.length < 2) return null;

    // Rounds come in newest-first; reverse so the x-axis flows oldest → newest.
    const ordered = [...rounds].reverse();
    const labelStep = Math.max(1, Math.ceil(ordered.length / 6));

    return ordered.map((round, index) => {
      const date = round.roundDate ? new Date(round.roundDate) : null;
      const label =
        date && index % labelStep === 0
          ? `${date.getDate()}/${date.getMonth() + 1}`
          : '';

      return {
        value: round.handicapDifferential,
        label,
        dataPointColor: round.isQualifying ? colors.primary : colors.textTertiary,
        dataPointRadius: round.isQualifying ? 5 : 3.5,
      };
    });
  }, [rounds, colors.primary, colors.textTertiary]);

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

  const chartWidth = SCREEN_WIDTH - spacing.lg * 2 - spacing.xl * 2 - 40;

  if (variant === 'compact') {
    if (!chartData) return null;
    return (
      <View style={styles.compactContainer}>
        <LineChart
          data={chartData}
          height={56}
          width={chartWidth}
          spacing={chartWidth / Math.max(chartData.length - 1, 1)}
          initialSpacing={6}
          endSpacing={6}
          color1={colors.primary}
          thickness={2}
          curved
          curvature={0.2}
          hideRules
          hideDataPoints
          hideYAxisText
          xAxisColor="transparent"
          yAxisColor="transparent"
          hideAxesAndRules
        />
      </View>
    );
  }

  if (rounds.length < 2) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface },
          shadows.sm,
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Differential Trend
        </Text>
        <View style={styles.emptyState}>
          <Icon source="chart-line" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Play at least two qualifying rounds to see your trend.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Differential Trend
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Score differential across your last {rounds.length}{' '}
        {rounds.length === 1 ? 'round' : 'rounds'}
      </Text>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData!}
          height={160}
          width={chartWidth}
          spacing={chartWidth / Math.max(chartData!.length - 1, 1)}
          initialSpacing={10}
          endSpacing={10}
          color1={colors.primary}
          thickness={2}
          curved
          curvature={0.2}
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

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.primary }]}
          />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Counts toward index
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              styles.legendDotSmall,
              { backgroundColor: colors.textTertiary },
            ]}
          />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Other round
          </Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        Lower is better
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  compactContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  title: {
    ...typography.h4,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
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
  legendDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    ...typography.caption,
  },
  footer: {
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
