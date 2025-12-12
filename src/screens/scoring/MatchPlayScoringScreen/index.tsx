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
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, GolfBallLoader } from '@/components/common';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common';
import { ScorecardDebugPanel } from '@/components/scorecard';
import { useDebugMode } from '@/store/settingsStore';
import { matchPlayLogger } from '@/utils/debugLogger';
import type { RootStackScreenProps } from '@/navigation/types';

import { PlayerScoreCard, MatchProgress } from './components';
import { DEFAULT_HOLES, MIN_SCORE, MAX_SCORE } from './constants';
import { determineHoleWinner, calculateMatchStatus, getMatchStatusText } from './utils';
import type { MatchPlayer, HoleResult } from './types';

type Props = RootStackScreenProps<'MatchPlayScoring'>;

export default function MatchPlayScoringScreen({ navigation, route }: Props) {
  const { roundId, player1Id, player2Id, team1Id, team2Id } = route.params;
  const colors = useThemeColors();

  // Debug mode
  const { debugModeEnabled } = useDebugMode();
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // State
  const [isLoading] = useState(false);
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
  const matchStatus = useMemo(() => calculateMatchStatus(holeResults), [holeResults]);
  const isMatchComplete = matchStatus.status === 'complete';
  const matchStatusText = useMemo(
    () => getMatchStatusText(matchStatus, player1.name, player2.name),
    [matchStatus, player1.name, player2.name]
  );

  // Handle score selection
  const handleScoreSelect = useCallback((player: 'player1' | 'player2', score: number) => {
    if (isMatchComplete) {
      matchPlayLogger.debug('Score select ignored - match complete');
      return;
    }

    const playerName = player === 'player1' ? player1.name : player2.name;
    matchPlayLogger.info('MATCH PLAY: Score selected', {
      player,
      playerName,
      score,
      hole: currentHole,
      par: currentHoleData.par,
    });

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
  }, [currentHole, isMatchComplete, player1.name, player2.name, currentHoleData.par]);

  // Handle score adjustment
  const handleScoreAdjust = useCallback((player: 'player1' | 'player2', delta: number) => {
    if (isMatchComplete) {
      matchPlayLogger.debug('Score adjust ignored - match complete');
      return;
    }

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
  }, [currentHole, currentHoleData.par, isMatchComplete]);

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
      Alert.alert('Match Not Complete', 'The match must be finished before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Submit match result to API
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert('Match Submitted', matchStatusText, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit match result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isMatchComplete, matchStatusText, navigation]);

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
  const getScoreColor = useCallback((score: number | null): string => {
    if (score === null) return colors.textSecondary;
    const par = currentHoleData.par;
    if (score < par) return colors.birdie;
    if (score === par) return colors.par;
    if (score === par + 1) return colors.bogey;
    return colors.doubleBogey;
  }, [colors, currentHoleData.par]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading match..." />
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
        rightActions={
          debugModeEnabled
            ? [
                {
                  icon: 'bug-outline' as const,
                  onPress: () => setShowDebugPanel(true),
                  accessibilityLabel: 'Show debug panel',
                  color: colors.warning,
                },
              ]
            : undefined
        }
      />

      {/* Match Status Bar */}
      <View style={[styles.matchStatusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text
          style={[
            styles.matchStatusText,
            { color: isMatchComplete ? colors.success : colors.textPrimary },
          ]}
        >
          {matchStatusText}
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
          <PlayerScoreCard
            player={player1}
            currentScore={currentResult.player1Score}
            par={currentHoleData.par}
            isMatchComplete={isMatchComplete}
            onScoreAdjust={(delta) => handleScoreAdjust('player1', delta)}
            onParSelect={() => handleScoreSelect('player1', currentHoleData.par)}
            getScoreColor={getScoreColor}
          />

          {/* VS Divider */}
          <View style={styles.vsDivider}>
            <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          </View>

          <PlayerScoreCard
            player={player2}
            currentScore={currentResult.player2Score}
            par={currentHoleData.par}
            isMatchComplete={isMatchComplete}
            onScoreAdjust={(delta) => handleScoreAdjust('player2', delta)}
            onParSelect={() => handleScoreSelect('player2', currentHoleData.par)}
            getScoreColor={getScoreColor}
          />
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
        <MatchProgress
          holeResults={holeResults}
          currentHole={currentHole}
          player1={player1}
          player2={player2}
          onHolePress={handleHolePress}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {isMatchComplete ? (
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.success },
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmitMatch}
            disabled={isSubmitting}
            activeOpacity={0.7}
            accessibilityLabel="Submit match result"
          >
            {isSubmitting ? (
              <GolfBallLoader size="sm" />
            ) : (
              <>
                <Icon source="check" size={20} color={colors.white} />
                <Text style={[styles.submitButtonText, { color: colors.white }]}>Submit Match Result</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.navButtonsRow}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                currentHole === 1 && styles.buttonDisabled,
              ]}
              onPress={handlePreviousHole}
              disabled={currentHole === 1}
              activeOpacity={0.7}
              accessibilityLabel="Previous hole"
            >
              <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.navButtonPrimary,
                { backgroundColor: colors.primary },
                (currentHole === 18 || isMatchComplete) && styles.buttonDisabled,
              ]}
              onPress={handleNextHole}
              disabled={currentHole === 18 || isMatchComplete}
              activeOpacity={0.7}
              accessibilityLabel="Next hole"
            >
              <Text style={[styles.navButtonText, { color: colors.white }]}>Next Hole</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Debug Panel */}
      <ScorecardDebugPanel
        visible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
        roundId={roundId}
        matchPlayData={{
          player1: player1,
          player2: player2,
          holeResults: Object.fromEntries(
            Object.entries(holeResults).map(([hole, result]) => [
              hole,
              {
                player1Score: result.player1Score,
                player2Score: result.player2Score,
                winner: result.winner,
              },
            ])
          ),
          matchStatus: matchStatusText,
        }}
      />
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
  buttonDisabled: {
    opacity: 0.4,
  },
});
