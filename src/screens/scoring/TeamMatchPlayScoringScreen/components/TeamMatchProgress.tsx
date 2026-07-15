/**
 * TeamMatchProgress Component
 *
 * "Match by hole" strip for team match play.
 * Shows hole-by-hole results as ringed cells with team color coding.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { displayHoleNumber } from '@/utils/holeTransformers';
import type { TeamHoleResult, MatchTeam } from '../types';

interface TeamMatchProgressProps {
  holeResults: Record<number, TeamHoleResult>;
  currentHole: number;
  /** Hole numbers played in this round (handles back-9 / combo). */
  holeNumbers: number[];
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
  team1: MatchTeam;
  team2: MatchTeam;
  onHolePress: (hole: number) => void;
}

export function TeamMatchProgress({
  holeResults,
  currentHole,
  holeNumbers,
  startHole = 1,
  team1,
  team2,
  onHolePress,
}: TeamMatchProgressProps) {
  const colors = useThemeColors();

  // Presentational tally of the existing per-hole outcomes (no scoring math).
  let team1Wins = 0;
  let team2Wins = 0;
  let halvedCount = 0;
  for (const hole of holeNumbers) {
    const winner = holeResults[hole]?.winner;
    if (winner === 'team1') team1Wins += 1;
    else if (winner === 'team2') team2Wins += 1;
    else if (winner === 'halved') halvedCount += 1;
  }

  return (
    <View
      style={[
        styles.progressContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>
          Match Progress
        </Text>
        <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
          {team1Wins}A · {team2Wins}B · {halvedCount}=
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.holesScroll}>
        <View style={styles.holesRow}>
          {holeNumbers.map((hole) => {
            const result = holeResults[hole];
            const isCurrentHole = hole === currentHole;
            const hasResult = result?.winner !== null && result?.winner !== undefined;

            let cellBackground = 'transparent';
            let ringColor = colors.border;
            let labelColor = colors.textSecondary;
            let label = '';
            if (hasResult) {
              if (result?.winner === 'team1') {
                cellBackground = colors.successBackground;
                ringColor = colors.success;
                labelColor = colors.success;
                label = 'A';
              } else if (result?.winner === 'team2') {
                cellBackground = colors.errorBackground;
                ringColor = colors.error;
                labelColor = colors.error;
                label = 'B';
              } else if (result?.winner === 'halved') {
                cellBackground = colors.warningBackground;
                ringColor = colors.warning;
                labelColor = colors.warning;
                label = '=';
              }
            }
            if (isCurrentHole) {
              ringColor = colors.primary;
            }

            return (
              <TouchableOpacity
                key={hole}
                style={styles.holeCell}
                onPress={() => onHolePress(hole)}
                activeOpacity={0.7}
                accessibilityLabel={`Hole ${displayHoleNumber(hole, startHole)}${hasResult ? `, ${result?.winner === 'team1' ? team1.name : result?.winner === 'team2' ? team2.name : 'halved'}` : ''}`}
              >
                <Text style={[styles.holeNumber, { color: colors.textSecondary }]}>
                  {displayHoleNumber(hole, startHole)}
                </Text>
                <View
                  style={[
                    styles.holeIndicator,
                    { backgroundColor: cellBackground, borderColor: ringColor },
                  ]}
                >
                  {hasResult && (
                    <Text style={[styles.resultLabel, { color: labelColor }]}>
                      {label}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text
            style={[styles.legendText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {team1.name}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text
            style={[styles.legendText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {team2.name}
          </Text>
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
    paddingVertical: spacing.md,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
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
    paddingHorizontal: spacing.xs,
  },
  holeCell: {
    width: 33,
    alignItems: 'center',
  },
  holeNumber: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 3,
  },
  holeIndicator: {
    width: 33,
    height: 32,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 120,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  legendText: {
    ...typography.caption,
    flexShrink: 1,
  },
});

export default TeamMatchProgress;
