/**
 * ScorecardTabContent - Scorecard tab with scramble/individual display logic
 *
 * Handles the scorecard display mode toggle for Stableford,
 * scramble team selection, and standard scorecard rendering.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { ScorecardTable, ScrambleTeamSelector, ScrambleScorecardTable } from '@/components/scorecard';
import type { ScorecardTablePlayer } from '@/components/scorecard';
import type { ScoreDisplayMode } from '@/components/scorecard/ScorecardTable/types';
import type { Player, Hole, HoleScore, MultiBallHoleScore, GameType, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database/enums';
import type { ScrambleTeam } from '../hooks/useScrambleTeams';

interface ScorecardTabContentProps {
  holes: Hole[];
  tablePlayerData: ScorecardTablePlayer[];
  currentPlayers: Player[];
  effectiveGameType: GameType;
  isScramble: boolean;
  scrambleTeams: ScrambleTeam[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  onHolePress: (holeNumber: number) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
  selectedTeeData?: TeeBox | null;
  handicapSource?: HandicapSource;
}

export function ScorecardTabContent({
  holes,
  tablePlayerData,
  currentPlayers,
  effectiveGameType,
  isScramble,
  scrambleTeams,
  getPlayerScore,
  onHolePress,
  isRefreshing,
  onRefresh,
  bottomInset,
  selectedTeeData,
  handicapSource,
}: ScorecardTabContentProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [scoreDisplayMode, setScoreDisplayMode] = useState<ScoreDisplayMode>(
    effectiveGameType === 'stableford' ? 'points' : 'strokes'
  );

  // Get players for a specific team by index
  const getScrambleTeamPlayersByIndex = useCallback((teamIndex: number): Player[] => {
    if (!isScramble || scrambleTeams.length === 0) return [];

    const team = scrambleTeams[teamIndex];
    if (!team) return [];

    return team.memberIds
      .map((id) => currentPlayers.find((p) => p.id === id))
      .filter((p): p is Player => p !== undefined);
  }, [isScramble, scrambleTeams, currentPlayers]);

  // Get team handicap for a specific team by index
  const getScrambleTeamHandicapByIndex = useCallback((teamIndex: number): number => {
    const teamPlayers = getScrambleTeamPlayersByIndex(teamIndex);
    if (teamPlayers.length === 0) return 0;
    const handicaps = teamPlayers
      .map((p) => p.handicap ?? 0)
      .sort((a, b) => a - b);
    const sum = handicaps.reduce((acc, h) => acc + h, 0);
    return Math.round((sum * 0.25) * 10) / 10;
  }, [getScrambleTeamPlayersByIndex]);

  // Get team score for a specific team by index
  const getScrambleTeamScoreByIndex = useCallback((teamIndex: number, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const team = scrambleTeams[teamIndex];
    if (!team) return undefined;

    for (const playerId of team.memberIds) {
      const score = getPlayerScore(playerId, holeNumber);
      if (score) return score;
    }
    return undefined;
  }, [scrambleTeams, getPlayerScore]);

  return (
    <>
      {/* Stableford score display toggle */}
      {effectiveGameType === 'stableford' && (
        <View style={styles.segmentedControlContainer}>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                scoreDisplayMode === 'points' && [styles.segmentButtonActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setScoreDisplayMode('points')}
              accessibilityRole="button"
              accessibilityState={{ selected: scoreDisplayMode === 'points' }}
              testID="score-display-points"
            >
              <Text style={[
                styles.segmentText,
                { color: scoreDisplayMode === 'points' ? colors.textOnColored : colors.textSecondary },
                scoreDisplayMode === 'points' && styles.segmentTextActive,
              ]}>
                Points
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                scoreDisplayMode === 'strokes' && [styles.segmentButtonActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setScoreDisplayMode('strokes')}
              accessibilityRole="button"
              accessibilityState={{ selected: scoreDisplayMode === 'strokes' }}
              testID="score-display-strokes"
            >
              <Text style={[
                styles.segmentText,
                { color: scoreDisplayMode === 'strokes' ? colors.textOnColored : colors.textSecondary },
                scoreDisplayMode === 'strokes' && styles.segmentTextActive,
              ]}>
                Strokes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scorecard Content - Different view for scramble vs individual */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {isScramble ? (
          <>
            {/* Team selector */}
            <ScrambleTeamSelector
              teams={scrambleTeams}
              selectedIndex={selectedTeamIndex}
              onSelectTeam={setSelectedTeamIndex}
              getTeamPlayers={getScrambleTeamPlayersByIndex}
            />
            {/* Selected team's scorecard */}
            <ScrambleScorecardTable
              holes={holes}
              teamName={scrambleTeams[selectedTeamIndex]?.name || 'Team'}
              teamHandicap={getScrambleTeamHandicapByIndex(selectedTeamIndex)}
              getTeamScore={(holeNumber) => getScrambleTeamScoreByIndex(selectedTeamIndex, holeNumber)}
              onHolePress={onHolePress}
            />
          </>
        ) : (
          <ScorecardTable
            players={tablePlayerData}
            holes={holes}
            screenWidth={screenWidth}
            onHolePress={onHolePress}
            gameType={effectiveGameType}
            scoreDisplayMode={scoreDisplayMode}
            selectedTeeData={selectedTeeData}
            handicapSource={handicapSource}
          />
        )}
      </ScrollView>
    </>
  );
}

// Also export scramble helpers for use by ContributionsTabContent
export { type ScorecardTabContentProps };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  segmentedControlContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  segmentButtonActive: {
    // backgroundColor set dynamically
  },
  segmentText: {
    ...typography.small,
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '600',
  },
});
