/**
 * QuickScoreHoleRow - Single hole row for quick score entry
 *
 * Displays hole info (number, par, SI) with +/- stepper and score color coding.
 * Rounded row card per the Score & Round redesign; unscored rows are dashed/muted.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { getScoreColor } from '@/utils/scoring';
import { ScaledText } from '@/components/common/ScaledText';

interface QuickScoreHoleRowProps {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  score: number | undefined;
  stablefordPoints: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const QuickScoreHoleRow = React.memo(function QuickScoreHoleRow({
  holeNumber,
  par,
  strokeIndex,
  score,
  stablefordPoints,
  onIncrement,
  onDecrement,
}: QuickScoreHoleRowProps) {
  const colors = useThemeColors();
  const hasScore = score !== undefined && score > 0;
  const scoreColor = hasScore ? getScoreColor(score, par, colors) : colors.gray400;
  const canDecrement = score !== undefined && score > 1;
  const canIncrement = score === undefined || score < 12;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: hasScore ? colors.surface : 'transparent',
          borderColor: hasScore ? colors.border : colors.gray300,
          borderStyle: hasScore ? 'solid' : 'dashed',
        },
      ]}
    >
      {/* Hole info */}
      <View style={styles.holeInfo}>
        <Text style={[styles.holeNumber, { color: hasScore ? colors.textPrimary : colors.textSecondary }]}>
          {holeNumber}
        </Text>
        <Text style={[styles.holeMeta, { color: colors.textSecondary }]}>
          Par {par} · SI {strokeIndex}
        </Text>
      </View>

      {/* Stepper */}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepperButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onDecrement}
          disabled={!canDecrement}
          activeOpacity={0.7}
        >
          <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary, opacity: canDecrement ? 1 : 0.3 }]}>−</ScaledText>
        </TouchableOpacity>

        <View style={[styles.scoreCircle, { backgroundColor: hasScore ? scoreColor : colors.gray300 }]}>
          <ScaledText category="critical" style={[styles.scoreText, { color: hasScore ? colors.white : colors.textSecondary }]}>
            {score ?? '–'}
          </ScaledText>
        </View>

        <TouchableOpacity
          style={[styles.stepperButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onIncrement}
          disabled={!canIncrement}
          activeOpacity={0.7}
        >
          <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary, opacity: canIncrement ? 1 : 0.3 }]}>+</ScaledText>
        </TouchableOpacity>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsText, { color: hasScore ? scoreColor : colors.textSecondary }]}>
          {hasScore ? `${stablefordPoints} pts` : '–'}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
  },
  holeInfo: {
    width: 64,
  },
  holeNumber: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '800',
  },
  holeMeta: {
    ...typography.small,
    fontSize: 10.5,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 1,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '500',
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 19,
    fontWeight: '800',
  },
  pointsContainer: {
    width: 46,
    alignItems: 'flex-end',
  },
  pointsText: {
    ...typography.small,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default QuickScoreHoleRow;
