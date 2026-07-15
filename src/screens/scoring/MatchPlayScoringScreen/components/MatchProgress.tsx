/**
 * MatchProgress - "Match by hole" strip card for match play
 *
 * Hole-by-hole outcome strip (W / L / ½ from player 1's perspective) with a
 * won/lost summary in the card header and a colour legend underneath.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows } from '@/constants/theme';
import { displayHoleNumber } from '@/utils/holeTransformers';
import type { HoleResult, MatchPlayer } from '../types';

interface MatchProgressProps {
  holeResults: Record<number, HoleResult>;
  currentHole: number;
  /** Hole numbers played in this round (handles back-9 / combo). */
  holeNumbers: number[];
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
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
  holeNumbers,
  startHole = 1,
  player1,
  player2,
  onHolePress,
  onTouchStart,
  onTouchEnd,
}: MatchProgressProps) {
  const colors = useThemeColors();

  // Won / lost / halved summary from the existing per-hole outcomes
  // (player 1's perspective — matches the cell colours below).
  let won = 0;
  let lost = 0;
  let halved = 0;
  holeNumbers.forEach((hole) => {
    const winner = holeResults[hole]?.winner;
    if (winner === 'player1') won += 1;
    else if (winner === 'player2') lost += 1;
    else if (winner === 'halved') halved += 1;
  });

  return (
    <View
      style={[
        styles.progressContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.progressTitle, { color: colors.textTertiary }]}>MATCH BY HOLE</Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {won}W · {lost}L · {halved}½
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.holesScroll}
      >
        <View style={styles.holesRow}>
          {holeNumbers.map(hole => {
            const result = holeResults[hole];
            const isCurrentHole = hole === currentHole;
            const hasResult = result?.winner !== null && result?.winner !== undefined;

            // Cell state from the existing outcome data:
            // win = primary tint, loss = bogey tint, halve = muted.
            let cellBackground = 'transparent';
            let cellRing = colors.border;
            let cellText = colors.textTertiary;
            let cellLabel = '';
            if (hasResult) {
              if (result?.winner === 'player1') {
                cellBackground = colors.primaryBackground;
                cellRing = colors.primary;
                cellText = colors.primaryDark;
                cellLabel = 'W';
              } else if (result?.winner === 'player2') {
                cellBackground = colors.bogeyBackground;
                cellRing = colors.bogey;
                cellText = colors.bogey;
                cellLabel = 'L';
              } else if (result?.winner === 'halved') {
                cellBackground = colors.surfaceVariant;
                cellRing = colors.border;
                cellText = colors.textSecondary;
                cellLabel = '½';
              }
            }
            if (isCurrentHole) {
              cellRing = colors.primary;
            }

            return (
              <TouchableOpacity
                key={hole}
                style={styles.holeColumn}
                onPress={() => onHolePress(hole)}
                activeOpacity={0.7}
                accessibilityLabel={`Hole ${displayHoleNumber(hole, startHole)}${hasResult ? `, ${result?.winner}` : ''}`}
              >
                <Text style={[styles.holeNumber, { color: colors.textTertiary }]}>
                  {displayHoleNumber(hole, startHole)}
                </Text>
                <View
                  style={[
                    styles.holeCell,
                    { backgroundColor: cellBackground, borderColor: cellRing },
                  ]}
                >
                  <Text style={[styles.holeCellText, { color: cellText }]}>{cellLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{player1.name}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.bogey }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{player2.name}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Halved</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  progressTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  holesScroll: {
    marginBottom: spacing.md,
  },
  holesRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 4,
  },
  holeColumn: {
    width: 33,
    alignItems: 'stretch',
  },
  holeNumber: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },
  holeCell: {
    height: 32,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeCellText: {
    fontSize: 12,
    fontWeight: '800',
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
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
});

export default MatchProgress;
