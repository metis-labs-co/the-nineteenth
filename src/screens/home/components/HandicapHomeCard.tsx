/**
 * HandicapHomeCard - Home-screen hero card surfacing the player's Social
 * Handicap Index with a compact trend graph. Taps through to the full
 * HandicapHistory screen. Empty (no qualifying rounds) state still renders,
 * prompting play.
 *
 * Restyled per "The Nineteenth - Polished" (HOME L77-94) onto the shared
 * HeroCard: dark-green gradient in both themes, eyebrow label, 52px index,
 * trend pill (delta of the two most recent differentials — the same rounds
 * the chart already renders), and the trend chart recolored for the dark
 * surface via the chart's color props.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, layout } from '@/constants/theme';
import { HeroCard, heroPalette } from '@/components/common';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import { HandicapTrendChart } from '@/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart';
import type { HandicapSummary } from '@/types/handicap.types';

// Available width for the compact chart inside this card:
// screen width minus home body padding (layout.screenPadding × 2) and card padding (spacing.lg × 2).
const CARD_CHART_WIDTH =
  Dimensions.get('window').width - layout.screenPadding * 2 - spacing.lg * 2;

/** Design chart line on the dark hero card — fixed in both themes. */
const HERO_CHART_LINE = '#8bc26e';
/** Trend-pill tint behind the improving (down) delta. */
const TREND_PILL_BG_DOWN = 'rgba(139, 194, 110, 0.18)';

interface HandicapHomeCardProps {
  summary: HandicapSummary | null;
  onPress: () => void;
  testID?: string;
}

export function HandicapHomeCard({ summary, onPress, testID }: HandicapHomeCardProps) {
  const hasData = !!summary && summary.totalRounds > 0;
  const showChart = hasData && summary!.rounds.length >= 2;

  // Latest movement between the two most recent differentials — display-only,
  // derived from the same rounds array the chart plots. Rounds arrive
  // newest-first. Down (negative) = improving.
  const trendDelta = showChart
    ? summary!.rounds[0].handicapDifferential -
      summary!.rounds[1].handicapDifferential
    : null;
  const showTrendPill = trendDelta !== null && Math.abs(trendDelta) >= 0.05;
  const trendDown = (trendDelta ?? 0) < 0;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        hasData
          ? `Social Handicap Index ${formatHandicapIndex(summary!.handicapIndex)}, view history`
          : 'Social Handicap Index not yet established, view history'
      }
      style={styles.container}
    >
      <HeroCard variant="green" glow="green" padding={spacing.lg}>
        <Text style={styles.eyebrow}>Social Handicap Index</Text>
        <View style={styles.indexRow}>
          <Text style={styles.indexValue}>
            {hasData ? formatHandicapIndex(summary!.handicapIndex) : '—'}
          </Text>
          {showTrendPill ? (
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor: trendDown
                    ? TREND_PILL_BG_DOWN
                    : heroPalette.iconTintGold,
                },
              ]}
            >
              <Text
                style={[
                  styles.trendLabel,
                  { color: trendDown ? HERO_CHART_LINE : heroPalette.gold },
                ]}
              >
                {trendDown ? '▼' : '▲'} {Math.abs(trendDelta!).toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.description}>
          Your social handicap, based on your completed rounds in The Nineteenth.
        </Text>
        {hasData ? (
          <Text style={styles.subtitle}>
            Best {summary!.qualifyingRoundsCount} of {summary!.totalRounds}
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            Play rounds to establish your index
          </Text>
        )}

        {showChart ? (
          <View style={styles.chartWrapper}>
            <HandicapTrendChart
              rounds={summary!.rounds}
              variant="compact"
              width={CARD_CHART_WIDTH}
              lineColor={HERO_CHART_LINE}
              averageLineColor={heroPalette.gold}
              axisLabelColor={heroPalette.statusGreen}
            />
          </View>
        ) : null}
      </HeroCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: heroPalette.eyebrowGreen,
  },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm + 2,
    marginTop: spacing.xs + 2,
  },
  indexValue: {
    fontSize: 52,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -1,
    color: heroPalette.text,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    marginBottom: spacing.xs + 2,
  },
  trendLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  description: {
    ...typography.caption,
    color: heroPalette.mutedGreen,
    marginTop: spacing.xs + 2,
  },
  subtitle: {
    ...typography.caption,
    color: heroPalette.statusGreen,
    marginTop: spacing.xxs,
  },
  chartWrapper: {
    marginTop: spacing.sm,
  },
});
