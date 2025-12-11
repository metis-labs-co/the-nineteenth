/**
 * MatchPlayScoringScreen
 *
 * Specialized scoring interface for Match Play format.
 * Features:
 * - Side-by-side score entry for both players/teams
 * - Hole header with par display
 * - Score buttons for each side
 * - Hole result display (Won/Lost/Halved)
 * - Match status: 'Player A is 2 up with 5 to play' or 'All Square'
 * - Early finish detection when lead exceeds remaining holes
 * - Submit match result button when complete
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  BackHandler,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Icon } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Player, Hole } from '@/types';

type Props = RootStackScreenProps<'MatchPlayScoring'>;

// Type definitions for match play scoring
interface MatchPlayer {
  id: string;
  name: string;
  handicap: number;
}

interface HoleResult {
  player1Score: number | null;
  player2Score: number | null;
  winner: 'player1' | 'player2' | 'halved' | null;
}

type MatchStatus =
  | { status: 'in_progress'; leader: 'player1' | 'player2' | null; holesUp: number; holesRemaining: number }
  | { status: 'complete'; winner: 'player1' | 'player2' | 'halved'; margin: string };

// Default holes (fallback)
const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: ([7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1),
  yardages: { white: 350 + i * 15 },
}));

const MIN_SCORE = 1;
const MAX_SCORE = 12;

export default function MatchPlayScoringScreen({ navigation, route }: Props) {
  const { roundId, player1Id, player2Id, team1Id, team2Id } = route.params;
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [currentHole, setCurrentHole] = useState(1);
  const [holeResults, setHoleResults] = useState<Record<number, HoleResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock players (in real implementation, fetch from API)
  const player1: MatchPlayer = useMemo(() => ({
    id: player1Id || team1Id || '1',
    name: 'Player 1',
    handicap: 10,
  }), [player1Id, team1Id]);

  const player2: MatchPlayer = useMemo(() => ({
    id: player2Id || team2Id || '2',
    name: 'Player 2',
    handicap: 15,
  }), [player2Id, team2Id]);

  // Use default holes for now
  const holes = DEFAULT_HOLES;
  const currentHoleData = holes[currentHole - 1];

  // Get current hole result
  const currentResult = holeResults[currentHole] || {
    player1Score: null,
    player2Score: null,
    winner: null,
  };

  // Calculate match status
  const matchStatus = useMemo((): MatchStatus => {
    let player1Up = 0;
    let holesPlayed = 0;

    for (let i = 1; i <= 18; i++) {
      const result = holeResults[i];
      if (result?.winner) {
        holesPlayed++;
        if (result.winner === 'player1') {
          player1Up++;
        } else if (result.winner === 'player2') {
          player1Up--;
        }
      }
    }

    const holesRemaining = 18 - holesPlayed;
    const absLead = Math.abs(player1Up);

    // Check for early finish (dormie or beyond)
    if (absLead > holesRemaining) {
      const winner = player1Up > 0 ? 'player1' : 'player2';
      const margin = `${absLead} & ${holesRemaining}`;
      return { status: 'complete', winner, margin };
    }

    // Check if all holes played
    if (holesRemaining === 0) {
      if (player1Up === 0) {
        return { status: 'complete', winner: 'halved', margin: 'All Square' };
      }
      const winner = player1Up > 0 ? 'player1' : 'player2';
      return { status: 'complete', winner, margin: `${absLead} up` };
    }

    // Match in progress
    if (player1Up === 0) {
      return { status: 'in_progress', leader: null, holesUp: 0, holesRemaining };
    }

    return {
      status: 'in_progress',
      leader: player1Up > 0 ? 'player1' : 'player2',
      holesUp: absLead,
      holesRemaining,
    };
  }, [holeResults]);

  const isMatchComplete = matchStatus.status === 'complete';

  // Get match status text
  const getMatchStatusText = useCallback((): string => {
    if (matchStatus.status === 'complete') {
      const winnerName = matchStatus.winner === 'player1'
        ? player1.name
        : matchStatus.winner === 'player2'
          ? player2.name
          : null;

      if (matchStatus.winner === 'halved') {
        return 'Match Halved';
      }
      return `${winnerName} wins ${matchStatus.margin}`;
    }

    if (matchStatus.leader === null) {
      return `All Square with ${matchStatus.holesRemaining} to play`;
    }

    const leaderName = matchStatus.leader === 'player1' ? player1.name : player2.name;
    return `${leaderName} is ${matchStatus.holesUp} up with ${matchStatus.holesRemaining} to play`;
  }, [matchStatus, player1.name, player2.name]);

  // Determine hole result when both scores are entered
  const determineHoleWinner = useCallback((
    p1Score: number | null,
    p2Score: number | null
  ): 'player1' | 'player2' | 'halved' | null => {
    if (p1Score === null || p2Score === null) return null;
    if (p1Score < p2Score) return 'player1';
    if (p2Score < p1Score) return 'player2';
    return 'halved';
  }, []);

  // Handle score selection
  const handleScoreSelect = useCallback((player: 'player1' | 'player2', score: number) => {
    if (isMatchComplete) return;

    setHoleResults(prev => {
      const current = prev[currentHole] || { player1Score: null, player2Score: null, winner: null };
      const newResult = {
        ...current,
        [player === 'player1' ? 'player1Score' : 'player2Score']: score,
      };

      // Determine winner if both scores are now set
      const p1 = player === 'player1' ? score : newResult.player1Score;
      const p2 = player === 'player2' ? score : newResult.player2Score;
      newResult.winner = determineHoleWinner(p1, p2);

      return {
        ...prev,
        [currentHole]: newResult,
      };
    });
  }, [currentHole, determineHoleWinner, isMatchComplete]);

  // Handle score adjustment
  const handleScoreAdjust = useCallback((player: 'player1' | 'player2', delta: number) => {
    if (isMatchComplete) return;

    setHoleResults(prev => {
      const current = prev[currentHole] || { player1Score: null, player2Score: null, winner: null };
      const currentScore = player === 'player1' ? current.player1Score : current.player2Score;

      let newScore: number;
      if (currentScore === null) {
        newScore = currentHoleData.par;
      } else {
        newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentScore + delta));
      }

      const newResult = {
        ...current,
        [player === 'player1' ? 'player1Score' : 'player2Score']: newScore,
      };

      // Determine winner if both scores are set
      const p1 = player === 'player1' ? newScore : newResult.player1Score;
      const p2 = player === 'player2' ? newScore : newResult.player2Score;
      newResult.winner = determineHoleWinner(p1, p2);

      return {
        ...prev,
        [currentHole]: newResult,
      };
    });
  }, [currentHole, currentHoleData.par, determineHoleWinner, isMatchComplete]);

  // Navigation handlers
  const handlePreviousHole = useCallback(() => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole]);

  const handleNextHole = useCallback(() => {
    if (currentHole < 18 && !isMatchComplete) {
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, isMatchComplete]);

  const handleHolePress = useCallback((holeNumber: number) => {
    setCurrentHole(holeNumber);
  }, []);

  const handleBackPress = useCallback(() => {
    const holesWithScores = Object.keys(holeResults).length;
    if (holesWithScores > 0 && !isMatchComplete) {
      Alert.alert(
        'Unsaved Match',
        'Are you sure you want to leave? Your match progress will be lost.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [holeResults, isMatchComplete, navigation]);

  // Handle back button
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Submit match result
  const handleSubmitMatch = useCallback(async () => {
    if (!isMatchComplete) {
      Alert.alert(
        'Match Not Complete',
        'The match must be finished before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Submit match result to API
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Match Submitted',
        getMatchStatusText(),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit match result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isMatchComplete, getMatchStatusText, navigation]);

  // Get hole result display
  const getHoleResultDisplay = useCallback((result: HoleResult | undefined): { text: string; color: string } | null => {
    if (!result?.winner) return null;

    switch (result.winner) {
      case 'player1':
        return { text: `${player1.name} wins`, color: colors.success };
      case 'player2':
        return { text: `${player2.name} wins`, color: colors.success };
      case 'halved':
        return { text: 'Halved', color: colors.warning };
      default:
        return null;
    }
  }, [colors, player1.name, player2.name]);

  // Get score color based on par
  const getScoreColor = useCallback((score: number | null, par: number): string => {
    if (score === null) return colors.textSecondary;
    if (score < par) return colors.birdie;
    if (score === par) return colors.par;
    if (score === par + 1) return colors.bogey;
    return colors.doubleBogey;
  }, [colors]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading match...</Text>
      </SafeAreaView>
    );
  }

  const holeResultDisplay = getHoleResultDisplay(currentResult);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader
        title="Match Play"
        showBack
        onBack={handleBackPress}
      />

      {/* Match Status Bar */}
      <View style={[styles.matchStatusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text
          style={[
            styles.matchStatusText,
            {
              color: isMatchComplete ? colors.success : colors.textPrimary,
            },
          ]}
        >
          {getMatchStatusText()}
        </Text>
        {isMatchComplete && (
          <View style={[styles.completeBadge, { backgroundColor: colors.success }]}>
            <Text style={[styles.completeBadgeText, { color: colors.white }]}>COMPLETE</Text>
          </View>
        )}
      </View>

      {/* Hole Header */}
      <View style={[styles.holeHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.holeInfo}>
          <Text style={[styles.holeLabel, { color: colors.textSecondary }]}>HOLE</Text>
          <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>{currentHole}</Text>
        </View>
        <View style={styles.holeDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Par</Text>
            <View style={[styles.parBadge, { backgroundColor: colors.par }]}>
              <Text style={[styles.parText, { color: colors.white }]}>{currentHoleData.par}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Index</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{currentHoleData.strokeIndex}</Text>
          </View>
        </View>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.contentArea} contentContainerStyle={styles.contentContainer}>
        {/* Side-by-side Score Entry */}
        <View style={styles.scoringContainer}>
          {/* Player 1 */}
          <Surface style={[styles.playerCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player1.name}
            </Text>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>HC: {player1.handicap}</Text>

            {/* Score Display */}
            <View style={styles.scoreSection}>
              <Text
                style={[
                  styles.scoreDisplay,
                  { color: getScoreColor(currentResult.player1Score, currentHoleData.par) },
                ]}
              >
                {currentResult.player1Score ?? '-'}
              </Text>
            </View>

            {/* Score Controls */}
            <View style={styles.scoreControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.scoreButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && styles.buttonPressed,
                  isMatchComplete && styles.buttonDisabled,
                ]}
                onPress={() => handleScoreAdjust('player1', -1)}
                disabled={isMatchComplete}
                accessibilityLabel="Decrease player 1 score"
              >
                <Text style={[styles.scoreButtonText, { color: colors.textPrimary }]}>−</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.parButton,
                  { borderColor: colors.primary, backgroundColor: colors.surface },
                  currentResult.player1Score === currentHoleData.par && { backgroundColor: colors.primary },
                  pressed && styles.buttonPressed,
                  isMatchComplete && styles.buttonDisabled,
                ]}
                onPress={() => handleScoreSelect('player1', currentHoleData.par)}
                disabled={isMatchComplete}
                accessibilityLabel="Set player 1 score to par"
              >
                <Text
                  style={[
                    styles.parButtonText,
                    { color: colors.primary },
                    currentResult.player1Score === currentHoleData.par && { color: colors.white },
                  ]}
                >
                  PAR
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.scoreButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && styles.buttonPressed,
                  isMatchComplete && styles.buttonDisabled,
                ]}
                onPress={() => handleScoreAdjust('player1', 1)}
                disabled={isMatchComplete}
                accessibilityLabel="Increase player 1 score"
              >
                <Text style={[styles.scoreButtonText, { color: colors.textPrimary }]}>+</Text>
              </Pressable>
            </View>
          </Surface>

          {/* VS Divider */}
          <View style={styles.vsDivider}>
            <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          </View>

          {/* Player 2 */}
          <Surface style={[styles.playerCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player2.name}
            </Text>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>HC: {player2.handicap}</Text>

            {/* Score Display */}
            <View style={styles.scoreSection}>
              <Text
                style={[
                  styles.scoreDisplay,
                  { color: getScoreColor(currentResult.player2Score, currentHoleData.par) },
                ]}
              >
                {currentResult.player2Score ?? '-'}
              </Text>
            </View>

            {/* Score Controls */}
            <View style={styles.scoreControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.scoreButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && styles.buttonPressed,
                  isMatchComplete && styles.buttonDisabled,
                ]}
                onPress={() => handleScoreAdjust('player2', -1)}
                disabled={isMatchComplete}
                accessibilityLabel="Decrease player 2 score"
              >
                <Text style={[styles.scoreButtonText, { color: colors.textPrimary }]}>−</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.parButton,
                  { borderColor: colors.primary, backgroundColor: colors.surface },
                  currentResult.player2Score === currentHoleData.par && { backgroundColor: colors.primary },
                  pressed && styles.buttonPressed,
                  isMatchComplete && styles.buttonDisabled,
                ]}
                onPress={() => handleScoreSelect('player2', currentHoleData.par)}
                disabled={isMatchComplete}
                accessibilityLabel="Set player 2 score to par"
              >
                <Text
                  style={[
                    styles.parButtonText,
                    { color: colors.primary },
                    currentResult.player2Score === currentHoleData.par && { color: colors.white },
                  ]}
                >
                  PAR
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.scoreButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && styles.buttonPressed,
                  isMatchComplete && styles.buttonDisabled,
                ]}
                onPress={() => handleScoreAdjust('player2', 1)}
                disabled={isMatchComplete}
                accessibilityLabel="Increase player 2 score"
              >
                <Text style={[styles.scoreButtonText, { color: colors.textPrimary }]}>+</Text>
              </Pressable>
            </View>
          </Surface>
        </View>

        {/* Hole Result */}
        {holeResultDisplay && (
          <View style={[styles.holeResultContainer, { backgroundColor: colors.surfaceVariant }]}>
            <Icon source="flag-checkered" size={20} color={holeResultDisplay.color} />
            <Text style={[styles.holeResultText, { color: holeResultDisplay.color }]}>
              {holeResultDisplay.text}
            </Text>
          </View>
        )}

        {/* Hole Progress */}
        <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Match Progress</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.holesScroll}>
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
                  <Pressable
                    key={hole}
                    style={[
                      styles.holeIndicator,
                      { backgroundColor },
                      isCurrentHole && { borderWidth: 2, borderColor: colors.primary },
                    ]}
                    onPress={() => handleHolePress(hole)}
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
                  </Pressable>
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
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {isMatchComplete ? (
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.success },
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmitMatch}
            disabled={isSubmitting}
            accessibilityLabel="Submit match result"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Icon source="check" size={20} color={colors.white} />
                <Text style={[styles.submitButtonText, { color: colors.white }]}>Submit Match Result</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.navButtonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                pressed && styles.buttonPressed,
                currentHole === 1 && styles.buttonDisabled,
              ]}
              onPress={handlePreviousHole}
              disabled={currentHole === 1}
              accessibilityLabel="Previous hole"
            >
              <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>Previous</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                styles.navButtonPrimary,
                { backgroundColor: colors.primary },
                pressed && styles.buttonPressed,
                (currentHole === 18 || isMatchComplete) && styles.buttonDisabled,
              ]}
              onPress={handleNextHole}
              disabled={currentHole === 18 || isMatchComplete}
              accessibilityLabel="Next hole"
            >
              <Text style={[styles.navButtonText, { color: colors.white }]}>Next Hole</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  matchStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  matchStatusText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  completeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  completeBadgeText: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  holeHeader: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  holeInfo: {
    alignItems: 'center',
  },
  holeLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 1,
  },
  holeNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  holeDetails: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  detailItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
  },
  detailValue: {
    ...typography.h3,
  },
  parBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parText: {
    ...typography.h4,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  scoringContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  playerCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  playerName: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  handicapLabel: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  scoreSection: {
    marginBottom: spacing.lg,
  },
  scoreDisplay: {
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 72,
  },
  scoreControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreButton: {
    width: layout.scoreButtonSize,
    height: layout.scoreButtonSize,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonText: {
    fontSize: 28,
    fontWeight: '400',
  },
  parButton: {
    paddingHorizontal: spacing.md,
    height: layout.scoreButtonSize,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parButtonText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  vsDivider: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  vsText: {
    ...typography.bodyBold,
  },
  holeResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  holeResultText: {
    ...typography.bodyBold,
  },
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
    borderRadius: 6,
  },
  legendText: {
    ...typography.caption,
  },
  bottomNav: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    ...shadows.sm,
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimary: {
    borderWidth: 0,
  },
  navButtonText: {
    ...typography.bodyBold,
  },
  submitButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submitButtonText: {
    ...typography.bodyBold,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
