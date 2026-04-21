/**
 * MatchPlayScorecardTable
 *
 * A specialized scorecard table for match play rounds that displays:
 * - Hole-by-hole scores for both players
 * - Running match status per hole (e.g., "Sam 1 UP", "ALL SQUARE")
 * - Front 9 (OUT) and Back 9 (IN) subtotals
 * - Final match result
 *
 * Table format:
 * | Hole | Par | Player1 | Player2 | Status      |
 * |------|-----|---------|---------|-------------|
 * | 1    | 4   | 4       | 5       | Sam 1 UP    |
 * | 2    | 3   | 3       | 3       | Sam 1 UP    |
 * | OUT  | 36  | 38      | 37      | -           |
 * | ...  |     |         |         |             |
 * | TOT  | 72  | 77      | 75      | Joe 2 UP    |
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows } from '@/constants/theme';
import { HeaderRow } from './HeaderRow';
import { HoleRow } from './HoleRow';
import { SubtotalRow } from './SubtotalRow';
import { TotalRow } from './TotalRow';
import { calculateAllData } from './utils';
import type { MatchPlayScorecardTableProps } from './types';

// Re-export types for consumers
export type { MatchPlayScorecardTableProps } from './types';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const MatchPlayScorecardTable = React.memo(function MatchPlayScorecardTable({
  holes,
  player1,
  player2,
  getPlayerScore,
  onHolePress,
  player1Handicap = 0,
  player2Handicap = 0,
}: MatchPlayScorecardTableProps) {
  const colors = useThemeColors();

  // Split holes into front 9 and back 9
  const front9Holes = useMemo(
    () => holes.filter((h) => h.number <= 9).sort((a, b) => a.number - b.number),
    [holes]
  );
  const back9Holes = useMemo(
    () => holes.filter((h) => h.number > 9).sort((a, b) => a.number - b.number),
    [holes]
  );

  // Calculate all match data
  const data = useMemo(
    () => calculateAllData(holes, player1.id, player2.id, getPlayerScore, player1Handicap, player2Handicap),
    [holes, player1.id, player2.id, getPlayerScore, player1Handicap, player2Handicap]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <HeaderRow player1Name={player1.name} player2Name={player2.name} />

      {/* Front 9 */}
      {front9Holes.map((hole) => (
        <HoleRow
          key={hole.number}
          hole={hole}
          result={data.holeResults[hole.number]}
          runningStatus={data.runningStatus[hole.number]}
          player1Name={player1.name}
          player2Name={player2.name}
          onPress={onHolePress ? () => onHolePress(hole.number) : undefined}
        />
      ))}

      {/* OUT subtotal */}
      <SubtotalRow
        label="OUT"
        par={data.front9.par}
        player1Total={data.front9.player1}
        player2Total={data.front9.player2}
        holesPlayed={data.front9.holesPlayed}
      />

      {/* Back 9 */}
      {back9Holes.map((hole) => (
        <HoleRow
          key={hole.number}
          hole={hole}
          result={data.holeResults[hole.number]}
          runningStatus={data.runningStatus[hole.number]}
          player1Name={player1.name}
          player2Name={player2.name}
          onPress={onHolePress ? () => onHolePress(hole.number) : undefined}
        />
      ))}

      {/* IN subtotal */}
      <SubtotalRow
        label="IN"
        par={data.back9.par}
        player1Total={data.back9.player1}
        player2Total={data.back9.player2}
        holesPlayed={data.back9.holesPlayed}
      />

      {/* Total */}
      <TotalRow
        par={data.total.par}
        player1Total={data.total.player1}
        player2Total={data.total.player2}
        holesPlayed={data.total.holesPlayed}
        finalStatus={data.finalStatus}
        player1Name={player1.name}
        player2Name={player2.name}
      />
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
});

export default MatchPlayScorecardTable;
