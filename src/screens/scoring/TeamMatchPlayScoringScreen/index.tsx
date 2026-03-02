/**
 * TeamMatchPlayScoringScreen
 *
 * Specialized scoring interface for Team Match Play format.
 * Features:
 * - Side-by-side team panels with VS divider
 * - Individual player scores shown within team panels
 * - Team total automatically calculated (best ball)
 * - Match status bar showing which team is up
 * - Hole winner indicator
 * - Match progress showing A/B/= per hole
 * - Early finish detection (dormie)
 * - Skins indicator in header
 * - Submit match result button when complete
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, BackHandler } from 'react-native';
import { Text, Icon, Button } from 'react-native-paper';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { HoleHeader, SwipeableHoleNavigator } from '@/components/scorecard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useScorecardStore } from '@/store/scorecardStore';
import { isSingleBallScore } from '@/types/database';
import { teamMatchPlayLogger } from '@/utils/debugLogger';
import type { RootStackScreenProps } from '@/navigation/types';
import type { TeeBox } from '@/types';

import {
  TeamMatchPlayHeader,
  TeamMatchPlayFooter,
  TeamScorePanel,
  TeamMatchProgress,
} from './components';
import { DEFAULT_HOLES, MIN_SCORE, MAX_SCORE } from './constants';
import {
  calculateTeamMatchStatus,
  getTeamMatchStatusText,
  getTeamMatchStatusDisplay,
  determineTeamHoleWinner,
  getBestContributor,
  countHolesWon,
} from './utils';
import type { TeamHoleResult, MatchTeam, TeamMatchStatus } from './types';
import { toMatchTeam } from './types';

type Props = RootStackScreenProps<'MatchPlayScoring'>;

export default function TeamMatchPlayScoringScreen({ navigation, route }: Props) {
  const { roundId, team1Id, team2Id } = route.params;
  const colors = useThemeColors();

  // Confirmation dialog hook
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Super admin check
  const isSuperAdmin = useIsSuperAdmin();

  // State
  const [currentHole, setCurrentHole] = useState(1);
  const [holeResults, setHoleResults] = useState<Record<number, TeamHoleResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch round details for course/tee info
  const {
    data: roundData,
    isLoading: isRoundLoading,
    error: roundError,
  } = useRoundDetails(roundId);

  // Fetch teams for the round
  const competitionId = roundData?.competition_id ?? undefined;
  const isTeamRound = roundData?.team_format !== null && roundData?.team_format !== undefined;
  const {
    teams: teamsData,
    isLoading: isTeamsLoading,
    error: teamsError,
  } = useRoundTeams(competitionId, isTeamRound);

  // Scorecard store for player scores
  const { setPlayerScore, getPlayerScore } = useScorecardStore();

  // Find team data based on IDs
  const team1: MatchTeam = useMemo(() => {
    if (team1Id && teamsData.length > 0) {
      const teamData = teamsData.find((t) => t.id === team1Id);
      if (teamData) return toMatchTeam(teamData);
    }
    // Fallback to first team
    if (teamsData.length > 0) {
      return toMatchTeam(teamsData[0]);
    }
    return {
      id: team1Id || '1',
      name: 'Team A',
      members: [],
      handicap: 0,
    };
  }, [team1Id, teamsData]);

  const team2: MatchTeam = useMemo(() => {
    if (team2Id && teamsData.length > 1) {
      const teamData = teamsData.find((t) => t.id === team2Id);
      if (teamData) return toMatchTeam(teamData);
    }
    // Fallback to second team
    if (teamsData.length > 1) {
      return toMatchTeam(teamsData[1]);
    }
    return {
      id: team2Id || '2',
      name: 'Team B',
      members: [],
      handicap: 0,
    };
  }, [team2Id, teamsData]);

  // Course data from round
  const courseName = roundData?.course?.name;

  // selected_tee is a TeeBox object stored in the round
  const selectedTeeBox: TeeBox | undefined = roundData?.selected_tee ?? undefined;

  // Get the tee color string for HoleHeader
  const selectedTeeColor = selectedTeeBox?.color ?? 'white';

  // Use course holes if available, otherwise default
  const holes = useMemo(() => {
    if (roundData?.course?.holes && Array.isArray(roundData.course.holes)) {
      return roundData.course.holes;
    }
    return DEFAULT_HOLES;
  }, [roundData]);

  const currentHoleData = holes[currentHole - 1];

  // Get player score for a specific player on current hole
  const getPlayerScoreValue = useCallback(
    (playerId: string): number | null => {
      const score = getPlayerScore(playerId, currentHole);
      if (score && isSingleBallScore(score)) {
        return score.strokes;
      }
      return null;
    },
    [currentHole, getPlayerScore]
  );

  // Calculate team best scores for current hole
  const team1BestScore = useMemo(() => {
    let best: number | null = null;
    for (const member of team1.members) {
      const score = getPlayerScoreValue(member.id);
      if (score !== null && (best === null || score < best)) {
        best = score;
      }
    }
    return best;
  }, [team1.members, getPlayerScoreValue]);

  const team2BestScore = useMemo(() => {
    let best: number | null = null;
    for (const member of team2.members) {
      const score = getPlayerScoreValue(member.id);
      if (score !== null && (best === null || score < best)) {
        best = score;
      }
    }
    return best;
  }, [team2.members, getPlayerScoreValue]);

  // Get best contributors for current hole
  const _team1BestContributor = useMemo(() => {
    return getBestContributor(team1, currentHole, (id, hole) => {
      const score = getPlayerScore(id, hole);
      if (score && isSingleBallScore(score)) {
        return { strokes: score.strokes };
      }
      return undefined;
    });
  }, [team1, currentHole, getPlayerScore]);

  const _team2BestContributor = useMemo(() => {
    return getBestContributor(team2, currentHole, (id, hole) => {
      const score = getPlayerScore(id, hole);
      if (score && isSingleBallScore(score)) {
        return { strokes: score.strokes };
      }
      return undefined;
    });
  }, [team2, currentHole, getPlayerScore]);

  // Determine current hole winner
  const currentHoleWinner = useMemo(() => {
    return determineTeamHoleWinner(team1BestScore, team2BestScore);
  }, [team1BestScore, team2BestScore]);

  // Update hole results when scores change
  useEffect(() => {
    if (team1BestScore !== null || team2BestScore !== null) {
      setHoleResults((prev) => {
        const current = prev[currentHole] || {
          team1Score: null,
          team2Score: null,
          team1PlayerScores: {},
          team2PlayerScores: {},
          winner: null,
        };

        // Build player scores
        const team1PlayerScores: Record<string, number | null> = {};
        for (const member of team1.members) {
          team1PlayerScores[member.id] = getPlayerScoreValue(member.id);
        }

        const team2PlayerScores: Record<string, number | null> = {};
        for (const member of team2.members) {
          team2PlayerScores[member.id] = getPlayerScoreValue(member.id);
        }

        const newResult: TeamHoleResult = {
          ...current,
          team1Score: team1BestScore,
          team2Score: team2BestScore,
          team1PlayerScores,
          team2PlayerScores,
          winner: currentHoleWinner,
        };

        return {
          ...prev,
          [currentHole]: newResult,
        };
      });
    }
  }, [
    currentHole,
    team1BestScore,
    team2BestScore,
    currentHoleWinner,
    team1.members,
    team2.members,
    getPlayerScoreValue,
  ]);

  // Calculate match status
  const matchStatus: TeamMatchStatus = useMemo(
    () => calculateTeamMatchStatus(holeResults),
    [holeResults]
  );
  const isMatchComplete = matchStatus.status === 'complete';
  const matchStatusText = useMemo(
    () => getTeamMatchStatusText(matchStatus, team1.name, team2.name),
    [matchStatus, team1.name, team2.name]
  );

  // Calculate per-team match status
  const team1MatchStatus = useMemo(
    () => getTeamMatchStatusDisplay(matchStatus, 'team1'),
    [matchStatus]
  );
  const team2MatchStatus = useMemo(
    () => getTeamMatchStatusDisplay(matchStatus, 'team2'),
    [matchStatus]
  );

  // Count holes won
  const holesWon = useMemo(() => countHolesWon(holeResults), [holeResults]);

  // Handle player score adjustment
  const handlePlayerScoreAdjust = useCallback(
    async (playerId: string, delta: number) => {
      if (isMatchComplete) {
        teamMatchPlayLogger.debug('Score adjust ignored - match complete');
        return;
      }

      const currentScore = getPlayerScoreValue(playerId);
      let newScore: number;
      if (currentScore === null) {
        newScore = currentHoleData.par;
      } else {
        newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentScore + delta));
      }

      teamMatchPlayLogger.info('TEAM MATCH PLAY: Score adjusted', {
        playerId: playerId.substring(0, 8),
        delta,
        newScore,
        hole: currentHole,
      });

      await setPlayerScore(playerId, currentHole, newScore);
    },
    [currentHole, currentHoleData.par, isMatchComplete, getPlayerScoreValue, setPlayerScore]
  );

  // Handle player par select
  const handlePlayerParSelect = useCallback(
    async (playerId: string, par: number) => {
      if (isMatchComplete) {
        teamMatchPlayLogger.debug('Par select ignored - match complete');
        return;
      }

      teamMatchPlayLogger.info('TEAM MATCH PLAY: Par selected', {
        playerId: playerId.substring(0, 8),
        par,
        hole: currentHole,
      });

      await setPlayerScore(playerId, currentHole, par);
    },
    [currentHole, isMatchComplete, setPlayerScore]
  );

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

  // Get hole data for any hole number (used by SwipeableHoleNavigator)
  const getHoleData = useCallback(
    (holeNumber: number) => {
      return holes[holeNumber - 1];
    },
    [holes]
  );

  // Get hole result for any hole number
  const _getHoleResult = useCallback(
    (holeNumber: number): TeamHoleResult => {
      return (
        holeResults[holeNumber] || {
          team1Score: null,
          team2Score: null,
          team1PlayerScores: {},
          team2PlayerScores: {},
          winner: null,
        }
      );
    },
    [holeResults]
  );

  // Get player score for any hole (dynamic version for swipe rendering)
  const getPlayerScoreForHole = useCallback(
    (playerId: string, holeNumber: number): number | null => {
      const score = getPlayerScore(playerId, holeNumber);
      if (score && isSingleBallScore(score)) {
        return score.strokes;
      }
      return null;
    },
    [getPlayerScore]
  );

  // Get team best score for any hole
  const getTeamBestScoreForHole = useCallback(
    (team: MatchTeam, holeNumber: number): number | null => {
      let best: number | null = null;
      for (const member of team.members) {
        const score = getPlayerScoreForHole(member.id, holeNumber);
        if (score !== null && (best === null || score < best)) {
          best = score;
        }
      }
      return best;
    },
    [getPlayerScoreForHole]
  );

  // Get best contributor for any hole
  const getBestContributorForHole = useCallback(
    (team: MatchTeam, holeNumber: number): string | null => {
      return getBestContributor(team, holeNumber, (id, hole) => {
        const score = getPlayerScore(id, hole);
        if (score && isSingleBallScore(score)) {
          return { strokes: score.strokes };
        }
        return undefined;
      });
    },
    [getPlayerScore]
  );

  // Determine hole winner for any hole
  const getHoleWinnerForHole = useCallback(
    (holeNumber: number): 'team1' | 'team2' | 'halved' | null => {
      const team1Score = getTeamBestScoreForHole(team1, holeNumber);
      const team2Score = getTeamBestScoreForHole(team2, holeNumber);
      return determineTeamHoleWinner(team1Score, team2Score);
    },
    [getTeamBestScoreForHole, team1, team2]
  );

  // Get hole result display
  const getHoleResultDisplay = useCallback(
    (
      winner: 'team1' | 'team2' | 'halved' | null
    ): { text: string; color: string } | null => {
      if (!winner) return null;

      switch (winner) {
        case 'team1':
          return { text: `${team1.name} wins`, color: colors.success };
        case 'team2':
          return { text: `${team2.name} wins`, color: colors.success };
        case 'halved':
          return { text: 'Halved', color: colors.warning };
        default:
          return null;
      }
    },
    [colors, team1.name, team2.name]
  );

  const handleBackPress = useCallback(() => {
    const holesWithScores = Object.keys(holeResults).length;
    if (holesWithScores > 0 && !isMatchComplete) {
      showDialog({
        title: 'Unsaved Match',
        message: 'Are you sure you want to leave? Your match progress will be lost.',
        confirmLabel: 'Leave',
        confirmVariant: 'destructive',
        icon: 'alert-outline',
        onConfirm: () => {
          dismissDialog();
          navigation.goBack();
        },
      });
    } else {
      navigation.goBack();
    }
  }, [holeResults, isMatchComplete, navigation, showDialog, dismissDialog]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Delete round handler (super admin only)
  const handleDeleteRound = useCallback(() => {
    showDialog({
      title: 'Delete Match',
      message: 'Are you sure you want to delete this match? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        // TODO: Implement actual deletion
        teamMatchPlayLogger.info('TEAM MATCH PLAY: Delete requested', { roundId });
        navigation.goBack();
      },
    });
  }, [navigation, roundId, showDialog, dismissDialog]);

  // Submit match result
  const handleSubmitMatch = useCallback(async () => {
    if (!isMatchComplete) {
      showAlert('Match Not Complete', 'The match must be finished before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Submit match result to API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      showDialog({
        title: 'Match Submitted',
        message: matchStatusText,
        confirmLabel: 'OK',
        cancelLabel: '',
        icon: 'check-circle-outline',
        onConfirm: () => {
          dismissDialog();
          navigation.goBack();
        },
      });
    } catch {
      showAlert('Error', 'Failed to submit match result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isMatchComplete, matchStatusText, navigation, showAlert, showDialog, dismissDialog]);

  // Render content for any hole number (used by SwipeableHoleNavigator for transitions)
  const renderHoleContent = useCallback(
    (holeNumber: number) => {
      const holeData = getHoleData(holeNumber);
      if (!holeData) return null;

      // Calculate dynamic values for this hole
      const team1Score = getTeamBestScoreForHole(team1, holeNumber);
      const team2Score = getTeamBestScoreForHole(team2, holeNumber);
      const team1Contributor = getBestContributorForHole(team1, holeNumber);
      const team2Contributor = getBestContributorForHole(team2, holeNumber);
      const holeWinner = getHoleWinnerForHole(holeNumber);
      const holeResultDisplay = getHoleResultDisplay(holeWinner);

      // Calculate navigation state for this hole
      const canGoPrev = holeNumber > 1;
      const canGoNext = holeNumber < 18 && !isMatchComplete;

      return (
        <View style={styles.contentArea}>
          {/* Hole Header - using shared component */}
          <HoleHeader
            hole={holeData}
            selectedTee={selectedTeeColor}
            onPrevious={handlePreviousHole}
            onNext={handleNextHole}
            canGoPrevious={canGoPrev}
            canGoNext={canGoNext}
          />

          {/* Content Area */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
            {/* Team Score Panels */}
            <View style={styles.teamsContainer}>
              <TeamScorePanel
                team={team1}
                teamScore={team1Score}
                bestPlayerId={team1Contributor}
                par={holeData.par}
                isMatchComplete={isMatchComplete}
                isWinning={holeWinner === 'team1'}
                matchStatus={team1MatchStatus}
                getPlayerScore={(playerId) => getPlayerScoreForHole(playerId, holeNumber)}
                onPlayerScoreAdjust={handlePlayerScoreAdjust}
                onPlayerParSelect={handlePlayerParSelect}
              />

              {/* VS Divider */}
              <View style={styles.vsDivider}>
                <View style={[styles.vsDividerLine, { backgroundColor: colors.border }]} />
                <View
                  style={[
                    styles.vsCircle,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
                </View>
                <View style={[styles.vsDividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TeamScorePanel
                team={team2}
                teamScore={team2Score}
                bestPlayerId={team2Contributor}
                par={holeData.par}
                isMatchComplete={isMatchComplete}
                isWinning={holeWinner === 'team2'}
                matchStatus={team2MatchStatus}
                getPlayerScore={(playerId) => getPlayerScoreForHole(playerId, holeNumber)}
                onPlayerScoreAdjust={handlePlayerScoreAdjust}
                onPlayerParSelect={handlePlayerParSelect}
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

            {/* Match Progress */}
            <TeamMatchProgress
              holeResults={holeResults}
              currentHole={holeNumber}
              team1={team1}
              team2={team2}
              onHolePress={handleHolePress}
            />
          </ScrollView>
        </View>
      );
    },
    [
      getHoleData,
      getTeamBestScoreForHole,
      getBestContributorForHole,
      getHoleWinnerForHole,
      getHoleResultDisplay,
      getPlayerScoreForHole,
      selectedTeeColor,
      handlePreviousHole,
      handleNextHole,
      isMatchComplete,
      team1,
      team2,
      team1MatchStatus,
      team2MatchStatus,
      handlePlayerScoreAdjust,
      handlePlayerParSelect,
      colors,
      holeResults,
      handleHolePress,
    ]
  );

  // Loading state
  const isLoading = isRoundLoading || isTeamsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading match..." />
      </SafeAreaView>
    );
  }

  // Error state
  if (roundError || teamsError) {
    const errorMessage =
      roundError?.message || teamsError || 'Failed to load match data';
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{errorMessage}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Header with course/tee info, skins indicator, and delete button */}
      <TeamMatchPlayHeader
        courseName={courseName}
        selectedTee={selectedTeeBox}
        onBack={handleBackPress}
        onDeletePress={isSuperAdmin ? handleDeleteRound : undefined}
        isSuperAdmin={isSuperAdmin}
        roundId={roundId}
      />

      {/* Match Status Bar */}
      <View
        style={[
          styles.matchStatusBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
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

      {/* Holes Won Summary */}
      <View
        style={[
          styles.holesWonBar,
          { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.holesWonItem}>
          <View style={[styles.holesWonDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.holesWonText, { color: colors.textPrimary }]}>
            {holesWon.team1}
          </Text>
        </View>
        <Text style={[styles.holesWonLabel, { color: colors.textSecondary }]}>HOLES WON</Text>
        <View style={styles.holesWonItem}>
          <Text style={[styles.holesWonText, { color: colors.textPrimary }]}>
            {holesWon.team2}
          </Text>
          <View style={[styles.holesWonDot, { backgroundColor: colors.error }]} />
        </View>
        {holesWon.halved > 0 && (
          <Text style={[styles.halvedText, { color: colors.textSecondary }]}>
            {holesWon.halved} halved
          </Text>
        )}
      </View>

      {/* Content Area with Swipe Navigation */}
      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={18}
        onHoleChange={setCurrentHole}
        enabled={!isSubmitting && !isMatchComplete}
        renderHole={renderHoleContent}
      />

      {/* Footer */}
      <TeamMatchPlayFooter
        currentHole={currentHole}
        isMatchComplete={isMatchComplete}
        isSubmitting={isSubmitting}
        onPreviousHole={handlePreviousHole}
        onNextHole={handleNextHole}
        onSubmitMatch={handleSubmitMatch}
      />

      {/* Confirmation/Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  matchStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
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
  holesWonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.lg,
  },
  holesWonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  holesWonDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  holesWonText: {
    ...typography.h3,
  },
  holesWonLabel: {
    ...typography.caption,
    letterSpacing: 0.5,
  },
  halvedText: {
    ...typography.caption,
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  teamsContainer: {
    gap: spacing.sm,
  },
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  vsDividerLine: {
    flex: 1,
    height: 1,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  vsText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
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
});
