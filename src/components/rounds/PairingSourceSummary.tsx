/**
 * PairingSourceSummary — display + tap-to-edit entry point for a round's
 * pairing configuration.
 *
 * Behaviour:
 *   - `pairingSource === 'current_standings'` → render the rich summary
 *     (style + metric) so the organiser can see how pairings were generated.
 *   - `pairingSource === 'manual'` → render a thin "Pairings: Manual" card
 *     ONLY when `onPress` is provided, so the card serves as an entry point
 *     to enable standings-driven pairing. With no `onPress`, the manual case
 *     stays hidden (preserves the original read-only-only behaviour).
 *   - When `onPress` is provided, the card becomes a `TouchableOpacity` and
 *     gains a chevron + "Edit" hint.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type {
  BracketSeedingStyle,
  PairingSource,
  QualifyingMetric,
} from '@/types/database/enums';

export interface PairingSourceSummaryProps {
  pairingSource: PairingSource;
  pairingStyle: BracketSeedingStyle | null;
  pairingMetric: QualifyingMetric | null;
  /** When provided, the card becomes tappable (TouchableOpacity) and shows a
   *  chevron + "Edit" hint. Callers gate this on the `canEditPairings` rule
   *  (organiser + round.status === 'upcoming'). */
  onPress?: () => void;
}

const STYLE_LABEL: Record<BracketSeedingStyle, string> = {
  standard: 'Standard (1 vs N, 2 vs N-1…)',
  adjacent: 'Adjacent (1 vs 2, 3 vs 4…)',
};

const METRIC_LABEL: Record<QualifyingMetric, string> = {
  competition_points: 'Competition points',
  stableford_points: 'Stableford points',
  net_strokes: 'Net strokes',
};

export function PairingSourceSummary({
  pairingSource,
  pairingStyle,
  pairingMetric,
  onPress,
}: PairingSourceSummaryProps) {
  const colors = useThemeColors();

  // Manual + read-only → render nothing (preserves the original behaviour).
  // Manual + tappable → render a slim "Manual" card so the organiser has
  // somewhere to tap to enable standings-driven pairing.
  if (pairingSource === 'manual' && !onPress) return null;

  const isStandings = pairingSource === 'current_standings';
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? {
        onPress,
        activeOpacity: 0.7,
        accessibilityRole: 'button' as const,
        accessibilityLabel: isStandings
          ? 'Edit standings-based pairing settings'
          : 'Enable standings-based pairing',
      }
    : {};

  return (
    <Wrapper
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      {...wrapperProps}
    >
      <View style={styles.headerRow}>
        <Icon
          source={isStandings ? 'account-switch' : 'account-edit-outline'}
          size={20}
          color={isStandings ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isStandings ? 'Auto-paired from current standings' : 'Manual pairings'}
        </Text>
        {onPress && (
          <View style={styles.editHint}>
            <Text style={[styles.editLabel, { color: colors.primary }]}>Edit</Text>
            <Icon source="chevron-right" size={18} color={colors.primary} />
          </View>
        )}
      </View>
      {isStandings ? (
        <>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Style: {pairingStyle ? STYLE_LABEL[pairingStyle] : '—'}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Metric: {pairingMetric ? METRIC_LABEL[pairingMetric] : '—'}
          </Text>
        </>
      ) : (
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Tap to auto-pair from the current competition standings.
        </Text>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    flex: 1,
  },
  body: {
    ...typography.small,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editLabel: {
    ...typography.small,
    fontWeight: '600',
  },
});

export default PairingSourceSummary;
