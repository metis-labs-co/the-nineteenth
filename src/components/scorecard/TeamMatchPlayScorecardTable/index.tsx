/**
 * TeamMatchPlayScorecardTable
 *
 * Team-aware match play scorecard. Mirrors the two-player
 * `MatchPlayScorecardTable`, but each "side" is a team and the per-hole score
 * is that team's best-ball contributor's gross (pickups excluded).
 *
 * Columns: Hole | Par | Team A | Team B | Status
 *
 * Reuses `HoleRow`, `SubtotalRow`, and `TotalRow` from `MatchPlayScorecardTable`
 * — the `player1/player2` props there carry team data semantically. Only the
 * header is inlined here so we can show the full team names (the shared header
 * uses `getFirstName` which would collapse "Team 1" / "Team 2" to "Team").
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { HoleRow } from '@/components/scorecard/MatchPlayScorecardTable/HoleRow';
import { SubtotalRow } from '@/components/scorecard/MatchPlayScorecardTable/SubtotalRow';
import { TotalRow } from '@/components/scorecard/MatchPlayScorecardTable/TotalRow';
import { calculateTeamMatchData } from './utils';
import type { TeamMatchPlayScorecardTableProps } from './types';

export const TeamMatchPlayScorecardTable = React.memo(function TeamMatchPlayScorecardTable({
  holes,
  team1,
  team2,
  getPlayerScore,
  onHolePress,
}: TeamMatchPlayScorecardTableProps) {
  const colors = useThemeColors();

  const front9Holes = useMemo(
    () => holes.filter((h) => h.number <= 9).sort((a, b) => a.number - b.number),
    [holes]
  );
  const back9Holes = useMemo(
    () => holes.filter((h) => h.number > 9).sort((a, b) => a.number - b.number),
    [holes]
  );

  const data = useMemo(
    () => calculateTeamMatchData(holes, team1, team2, getPlayerScore),
    [holes, team1, team2, getPlayerScore]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header (inlined so team names aren't truncated by getFirstName) */}
      <View
        style={[
          styles.row,
          styles.headerRow,
          { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.cell, styles.holeCell]}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Hole</Text>
        </View>
        <View style={[styles.cell, styles.parCell]}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Par</Text>
        </View>
        <View style={[styles.cell, styles.teamCell]}>
          <Text
            style={[styles.headerText, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {team1.name}
          </Text>
        </View>
        <View style={[styles.cell, styles.teamCell]}>
          <Text
            style={[styles.headerText, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {team2.name}
          </Text>
        </View>
        <View style={[styles.cell, styles.statusCell]}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Status</Text>
        </View>
      </View>

      {/* Front 9 */}
      {front9Holes.map((hole) => (
        <HoleRow
          key={hole.number}
          hole={hole}
          result={data.holeResults[hole.number]}
          runningStatus={data.runningStatus[hole.number]}
          player1Name={team1.name}
          player2Name={team2.name}
          onPress={onHolePress ? () => onHolePress(hole.number) : undefined}
        />
      ))}

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
          player1Name={team1.name}
          player2Name={team2.name}
          onPress={onHolePress ? () => onHolePress(hole.number) : undefined}
        />
      ))}

      <SubtotalRow
        label="IN"
        par={data.back9.par}
        player1Total={data.back9.player1}
        player2Total={data.back9.player2}
        holesPlayed={data.back9.holesPlayed}
      />

      <TotalRow
        par={data.total.par}
        player1Total={data.total.player1}
        player2Total={data.total.player2}
        holesPlayed={data.total.holesPlayed}
        finalStatus={data.finalStatus}
        player1Name={team1.name}
        player2Name={team2.name}
      />
    </View>
  );
});

export default TeamMatchPlayScorecardTable;
export type { TeamMatchPlayScorecardTableProps } from './types';

const CELL_HEIGHT = 40;

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  cell: {
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  holeCell: {
    width: 48,
  },
  parCell: {
    width: 40,
  },
  teamCell: {
    flex: 1,
    minWidth: 56,
  },
  statusCell: {
    width: 90,
    paddingHorizontal: spacing.sm,
  },
  headerText: {
    ...typography.captionBold,
  },
});
