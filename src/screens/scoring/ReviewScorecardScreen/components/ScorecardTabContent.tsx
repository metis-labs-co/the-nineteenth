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
import {
  ScorecardTable,
  ScorecardTableBallsAsPlayers,
  ScrambleTeamSelector,
  ScrambleScorecardTable,
} from '@/components/scorecard';
import type { ScorecardTablePlayer } from '@/components/scorecard';
import type { ScoreDisplayMode } from '@/components/scorecard/ScorecardTable/types';
import { buildMultiBallHoleData, buildMultiBallStats } from '@/utils/multiBallScorecard';
import { calculatePlayerStats } from '@/utils/scorecardCalculations';
import type { BallCount } from '@/types/multiball.types';
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
  /** Display offset for combo / cross-nine courses (default 1). */
  startHole?: number;
  /** True for solo practice rounds scored with more than one ball. */
  isMultiBall?: boolean;
  ballCount?: BallCount;
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
  startHole = 1,
  isMultiBall = false,
  ballCount = 1,
}: ScorecardTabContentProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  // Multi-ball is a solo practice format, so it only applies to a lone player.
  const multiBallPlayer =
    isMultiBall && ballCount > 1 && tablePlayerData.length === 1
      ? tablePlayerData[0]
      : undefined;

  const multiBall = React.useMemo(() => {
    if (!multiBallPlayer) return undefined;

    // Reuse the table's own handicap resolution so strokes received — and
    // therefore per-ball points — match what the single-ball table would show.
    const [stats] = calculatePlayerStats(
      [multiBallPlayer],
      holes,
      selectedTeeData,
      handicapSource
    );
    const dailyHandicap = stats?.dailyHandicap ?? 0;

    const holeData = buildMultiBallHoleData({
      holes,
      scores: multiBallPlayer.scores,
      dailyHandicap,
      ballCount,
    });

    return {
      dailyHandicap,
      front9: holeData.filter((d) => d.hole.number <= 9),
      back9: holeData.filter((d) => d.hole.number > 9),
      stats: buildMultiBallStats(holeData, ballCount),
    };
  }, [multiBallPlayer, holes, selectedTeeData, handicapSource, ballCount]);

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
        ) : multiBall ? (
          <ScorecardTableBallsAsPlayers
            front9Holes={multiBall.front9}
            back9Holes={multiBall.back9}
            multiBallStats={multiBall.stats}
            ballCount={ballCount}
            playerHandicap={multiBall.dailyHandicap}
          />
        ) : (
          <>
            <ScorecardTable
              players={tablePlayerData}
              holes={holes}
              screenWidth={screenWidth}
              onHolePress={onHolePress}
              gameType={effectiveGameType}
              scoreDisplayMode={scoreDisplayMode}
              selectedTeeData={selectedTeeData}
              handicapSource={handicapSource}
              startHole={startHole}
            />
            {/* Ring legend — only meaningful when the table shows stroke rings
                (hidden in the Stableford points display mode). */}
            {scoreDisplayMode !== 'points' && (
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendCircle, { borderColor: colors.birdie }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Birdie</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSquare, { borderColor: colors.bogey }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Bogey+</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendEagleOuter, { borderColor: colors.eagle }]}>
                    <View style={[styles.legendEagleInner, { borderColor: colors.eagle }]} />
                  </View>
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Eagle</Text>
                </View>
              </View>
            )}
          </>
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
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md + 2,
    marginTop: spacing.md + 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: 11,
  },
  legendCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.6,
  },
  legendSquare: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 1.6,
  },
  legendEagleOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendEagleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.6,
  },
});
