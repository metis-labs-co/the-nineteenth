/**
 * TeamMatchPlayScoreView Component
 *
 * Displays side-by-side team scores for Team Match Play format.
 * Features:
 * - Two teams displayed side-by-side
 * - Score entry for each team
 * - Match status indicator (e.g., "Team A 2 UP", "All Square")
 * - Hole-by-hole match result tracking
 * - Visual indication of which team won each hole
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, Icon, Divider } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, HoleScore } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

interface TeamMatchPlayScoreViewProps {
  team1: TeamWithMembers;
  team2: TeamWithMembers;
  currentHole: Hole;
  team1Score: HoleScore | undefined;
  team2Score: HoleScore | undefined;
  onTeam1ScoreSelect: (strokes: number) => void;
  onTeam2ScoreSelect: (strokes: number) => void;
  /** Map of hole number -> 'team1' | 'team2' | 'halved' */
  holeResults: Map<number, 'team1' | 'team2' | 'halved'>;
  disabled?: boolean;
}

const PICKUP_SCORE = 10;
const MIN_SCORE = 1;
const MAX_SCORE = 12;

/**
 * Calculate match status from hole results
 * Returns: { status: string, team1Holes: number, team2Holes: number, halved: number }
 */
function calculateMatchStatus(
  holeResults: Map<number, 'team1' | 'team2' | 'halved'>,
  team1Name: string,
  team2Name: string
): { status: string; team1Holes: number; team2Holes: number; halved: number; winner: 'team1' | 'team2' | null } {
  let team1Holes = 0;
  let team2Holes = 0;
  let halved = 0;

  holeResults.forEach((result) => {
    if (result === 'team1') team1Holes++;
    else if (result === 'team2') team2Holes++;
    else halved++;
  });

  const diff = team1Holes - team2Holes;

  if (diff === 0) {
    return { status: 'All Square', team1Holes, team2Holes, halved, winner: null };
  }

  const leadingTeam = diff > 0 ? team1Name : team2Name;
  const lead = Math.abs(diff);
  const holesRemaining = 18 - holeResults.size;

  // Check for "dormie" (lead equals holes remaining)
  if (lead === holesRemaining && holesRemaining > 0) {
    return {
      status: `${leadingTeam} ${lead} UP (Dormie)`,
      team1Holes,
      team2Holes,
      halved,
      winner: diff > 0 ? 'team1' : 'team2',
    };
  }

  // Check if match is over (lead > holes remaining)
  if (lead > holesRemaining) {
    return {
      status: `${leadingTeam} wins ${lead}&${holesRemaining}`,
      team1Holes,
      team2Holes,
      halved,
      winner: diff > 0 ? 'team1' : 'team2',
    };
  }

  return {
    status: `${leadingTeam} ${lead} UP`,
    team1Holes,
    team2Holes,
    halved,
    winner: diff > 0 ? 'team1' : 'team2',
  };
}

export const TeamMatchPlayScoreView = React.memo(function TeamMatchPlayScoreView({
  team1,
  team2,
  currentHole,
  team1Score,
  team2Score,
  onTeam1ScoreSelect,
  onTeam2ScoreSelect,
  holeResults,
  disabled = false,
}: TeamMatchPlayScoreViewProps) {
  const colors = useThemeColors();

  const matchStatus = useMemo(
    () => calculateMatchStatus(holeResults, team1.name, team2.name),
    [holeResults, team1.name, team2.name]
  );

  // Determine current hole result
  const currentHoleResult = useMemo(() => {
    const t1Strokes = team1Score?.strokes;
    const t2Strokes = team2Score?.strokes;

    if (!t1Strokes || !t2Strokes) return null;
    if (t1Strokes === PICKUP_SCORE && t2Strokes === PICKUP_SCORE) return 'halved';
    if (t1Strokes === PICKUP_SCORE) return 'team2';
    if (t2Strokes === PICKUP_SCORE) return 'team1';
    if (t1Strokes < t2Strokes) return 'team1';
    if (t2Strokes < t1Strokes) return 'team2';
    return 'halved';
  }, [team1Score?.strokes, team2Score?.strokes]);

  return (
    <View style={styles.container}>
      {/* Match Status Header */}
      <Surface style={[styles.statusCard, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.statusRow}>
          <View style={styles.holeCountContainer}>
            <Text style={[styles.holeCount, { color: colors.primary }]}>
              {matchStatus.team1Holes}
            </Text>
            <Text style={[styles.holeCountLabel, { color: colors.textSecondary }]}>holes</Text>
          </View>

          <View style={styles.statusCenter}>
            <Text
              style={[
                styles.statusText,
                { color: matchStatus.winner ? colors.primary : colors.textPrimary },
              ]}
            >
              {matchStatus.status}
            </Text>
            <Text style={[styles.halvedText, { color: colors.textSecondary }]}>
              {matchStatus.halved} halved
            </Text>
          </View>

          <View style={styles.holeCountContainer}>
            <Text style={[styles.holeCount, { color: colors.primary }]}>
              {matchStatus.team2Holes}
            </Text>
            <Text style={[styles.holeCountLabel, { color: colors.textSecondary }]}>holes</Text>
          </View>
        </View>
      </Surface>

      {/* Team Score Cards - Side by Side */}
      <View style={styles.teamsRow}>
        <TeamScorePanel
          team={team1}
          currentHole={currentHole}
          currentScore={team1Score}
          onScoreSelect={onTeam1ScoreSelect}
          isWinning={currentHoleResult === 'team1'}
          isLosing={currentHoleResult === 'team2'}
          disabled={disabled}
          position="left"
        />

        <View style={styles.vsContainer}>
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
        </View>

        <TeamScorePanel
          team={team2}
          currentHole={currentHole}
          currentScore={team2Score}
          onScoreSelect={onTeam2ScoreSelect}
          isWinning={currentHoleResult === 'team2'}
          isLosing={currentHoleResult === 'team1'}
          disabled={disabled}
          position="right"
        />
      </View>

      {/* Current Hole Result Indicator */}
      {currentHoleResult && (
        <View style={[styles.resultIndicator, { backgroundColor: colors.surface }]}>
          <Icon
            source={
              currentHoleResult === 'halved'
                ? 'equal'
                : currentHoleResult === 'team1'
                  ? 'arrow-left'
                  : 'arrow-right'
            }
            size={20}
            color={currentHoleResult === 'halved' ? colors.warning : colors.success}
          />
          <Text style={[styles.resultText, { color: colors.textPrimary }]}>
            {currentHoleResult === 'halved'
              ? 'Hole Halved'
              : `${currentHoleResult === 'team1' ? team1.name : team2.name} wins hole`}
          </Text>
        </View>
      )}
    </View>
  );
});

// Team Score Panel Component
interface TeamScorePanelProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  isWinning: boolean;
  isLosing: boolean;
  disabled: boolean;
  position: 'left' | 'right';
}

const TeamScorePanel = React.memo(function TeamScorePanel({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  isWinning,
  isLosing,
  disabled,
  position,
}: TeamScorePanelProps) {
  const colors = useThemeColors();

  const selectedScore = currentScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;
  const maxScoreBeforePickup = currentHole.par + 2;

  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(PICKUP_SCORE);
    }
  }, [disabled, onScoreSelect]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      if (isPickedUp) {
        onScoreSelect(maxScoreBeforePickup);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : currentHole.par;
        onScoreSelect(newScore);
      }
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp, maxScoreBeforePickup]);

  const handleIncrement = useCallback(() => {
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : currentHole.par;
      onScoreSelect(newScore);
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handleParSelect = useCallback(() => {
    if (!disabled) {
      onScoreSelect(currentHole.par);
    }
  }, [disabled, currentHole.par, onScoreSelect]);

  return (
    <Surface
      style={[
        styles.teamPanel,
        { backgroundColor: colors.white },
        isWinning && { borderColor: colors.success, borderWidth: 2 },
        isLosing && { opacity: 0.85 },
      ]}
      elevation={1}
    >
      {/* Team Name */}
      <View style={styles.teamHeader}>
        {isWinning && <Icon source="trophy" size={16} color={colors.success} />}
        <Text
          style={[
            styles.teamPanelName,
            { color: isWinning ? colors.success : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {team.name}
        </Text>
      </View>

      <Divider style={[styles.panelDivider, { backgroundColor: colors.border }]} />

      {/* Score Display */}
      <View style={styles.scoreArea}>
        <Text
          style={[
            styles.bigScore,
            { color: isPickedUp ? colors.textTertiary : colors.textPrimary },
          ]}
        >
          {isPickedUp ? 'P' : (selectedScore ?? '-')}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.panelControls}>
        {/* Pick Up */}
        <Pressable
          style={({ pressed }) => [
            styles.panelButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handlePickUp}
          disabled={disabled}
        >
          <Text
            style={[
              styles.panelButtonText,
              { color: isPickedUp ? colors.white : colors.textPrimary },
            ]}
          >
            P
          </Text>
        </Pressable>

        {/* Minus */}
        <Pressable
          style={({ pressed }) => [
            styles.panelButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleDecrement}
          disabled={disabled || (selectedScore !== undefined && selectedScore <= MIN_SCORE)}
        >
          <Text style={[styles.panelButtonText, { color: colors.textPrimary }]}>−</Text>
        </Pressable>

        {/* Par */}
        <Pressable
          style={({ pressed }) => [
            styles.panelButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            selectedScore === currentHole.par && { backgroundColor: colors.primary, borderColor: colors.primary },
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleParSelect}
          disabled={disabled}
        >
          <Text
            style={[
              styles.panelButtonText,
              { color: selectedScore === currentHole.par ? colors.white : colors.textPrimary },
            ]}
          >
            {currentHole.par}
          </Text>
        </Pressable>

        {/* Plus */}
        <Pressable
          style={({ pressed }) => [
            styles.panelButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            pressed && !isPickedUp && styles.buttonPressed,
            (disabled || isPickedUp) && styles.buttonDisabled,
          ]}
          onPress={handleIncrement}
          disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= MAX_SCORE)}
        >
          <Text style={[styles.panelButtonText, { color: colors.textPrimary }, isPickedUp && styles.disabledText]}>+</Text>
        </Pressable>
      </View>
    </Surface>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  statusCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holeCountContainer: {
    alignItems: 'center',
    minWidth: 48,
  },
  holeCount: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  holeCountLabel: {
    ...typography.caption,
  },
  statusCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  statusText: {
    ...typography.h4,
    textAlign: 'center',
  },
  halvedText: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  teamPanel: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 24,
  },
  teamPanelName: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  panelDivider: {
    marginVertical: spacing.sm,
  },
  scoreArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  bigScore: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  panelControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  panelButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  vsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  vsText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  resultIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    ...shadows.sm,
  },
  resultText: {
    ...typography.bodyBold,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
  },
});

export default TeamMatchPlayScoreView;
