/**
 * TeamMatchProgress Component
 *
 * Visual progress indicator for team match play.
 * Shows hole-by-hole results with team color coding.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { TeamHoleResult, MatchTeam } from '../types';

interface TeamMatchProgressProps {
  holeResults: Record<number, TeamHoleResult>;
  currentHole: number;
  team1: MatchTeam;
  team2: MatchTeam;
  onHolePress: (hole: number) => void;
}

export function TeamMatchProgress({
  holeResults,
  currentHole,
  team1,
  team2,
  onHolePress,
}: TeamMatchProgressProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
      <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
        Match Progress
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.holesScroll}>
        <View style={styles.holesRow}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => {
            const result = holeResults[hole];
            const isCurrentHole = hole === currentHole;
            const hasResult = result?.winner !== null && result?.winner !== undefined;

            let backgroundColor = colors.gray200;
            let label = '';
            if (hasResult) {
              if (result?.winner === 'team1') {
                backgroundColor = colors.success;
                label = 'A';
              } else if (result?.winner === 'team2') {
                backgroundColor = colors.error;
                label = 'B';
              } else if (result?.winner === 'halved') {
                backgroundColor = colors.warning;
                label = '=';
              }
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
                accessibilityLabel={`Hole ${hole}${hasResult ? `, ${result?.winner === 'team1' ? team1.name : result?.winner === 'team2' ? team2.name : 'halved'}` : ''}`}
              >
                <Text
                  style={[
                    styles.holeNumber,
                    { color: hasResult ? colors.white : colors.textSecondary },
                  ]}
                >
                  {hole}
                </Text>
                {hasResult && (
                  <Text style={[styles.resultLabel, { color: colors.white }]}>
                    {label}
                  </Text>
                )}
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
    width: 36,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  holeNumber: {
    ...typography.caption,
    fontWeight: '600',
  },
  resultLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
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
