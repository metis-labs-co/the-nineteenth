/**
 * MatchProgress - Visual progress indicator for match play
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { HoleResult, MatchPlayer } from '../types';

interface MatchProgressProps {
  holeResults: Record<number, HoleResult>;
  currentHole: number;
  player1: MatchPlayer;
  player2: MatchPlayer;
  onHolePress: (hole: number) => void;
  /** Called when the user touches this component (to disable parent swipe gestures) */
  onTouchStart?: () => void;
  /** Called when the user stops touching this component */
  onTouchEnd?: () => void;
}

export function MatchProgress({
  holeResults,
  currentHole,
  player1,
  player2,
  onHolePress,
  onTouchStart,
  onTouchEnd,
}: MatchProgressProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.progressContainer, { backgroundColor: colors.surface }]}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Match Progress</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.holesScroll}
      >
        <View style={styles.holesRow}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
            const result = holeResults[hole];
            const isCurrentHole = hole === currentHole;
            const hasResult = result?.winner !== null && result?.winner !== undefined;

            let backgroundColor = colors.gray200;
            if (hasResult) {
              if (result?.winner === 'player1') backgroundColor = colors.success;
              else if (result?.winner === 'player2') backgroundColor = colors.error;
              else if (result?.winner === 'halved') backgroundColor = colors.warning;
            }

            return (
              <TouchableOpacity
                key={hole}
                style={[
                  styles.holeIndicator,
                  { backgroundColor },
                  isCurrentHole && { borderWidth: 2, borderColor: colors.primary },
                ]}
                onPress={() => onHolePress(hole)}
                activeOpacity={0.7}
                accessibilityLabel={`Hole ${hole}${hasResult ? `, ${result?.winner}` : ''}`}
              >
                <Text
                  style={[
                    styles.holeIndicatorText,
                    { color: hasResult ? colors.white : colors.textSecondary },
                  ]}
                >
                  {hole}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{player1.name}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{player2.name}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Halved</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  progressTitle: {
    ...typography.smallBold,
    marginBottom: spacing.md,
  },
  holesScroll: {
    marginBottom: spacing.md,
  },
  holesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  holeIndicator: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeIndicatorText: {
    ...typography.caption,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  legendText: {
    ...typography.caption,
  },
});

export default MatchProgress;
