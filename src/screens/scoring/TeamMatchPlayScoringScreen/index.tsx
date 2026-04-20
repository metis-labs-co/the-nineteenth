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

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { HoleHeader, SwipeableHoleNavigator } from '@/components/scorecard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useIsSocial } from '@/context/SubscriptionContext';
import { useScorecardStore } from '@/store/scorecardStore';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
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
import { useTeamMatchPlayScores, useTeamMatchPlayState, useTeamMatchPlayNavigation } from './hooks';
import type { MatchTeam } from './types';
import { toMatchTeam } from './types';

type Props = RootStackScreenProps<'MatchPlayScoring'>;

export default function TeamMatchPlayScoringScreen({ navigation, route }: Props) {
  const { roundId, team1Id, team2Id } = route.params;
  const colors = useThemeColors();

  // Super admin check
  const isSuperAdmin = useIsSuperAdmin();
  const isSocial = useIsSocial();
  const { handicapSource } = useScorecardStore();

  // State
  const [currentHole, setCurrentHole] = useState(1);

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

  // Course data from round
  const courseName = roundData?.course?.name;
  const selectedTeeBox: TeeBox | undefined = roundData?.selected_tee ?? undefined;
  const selectedTeeColor = selectedTeeBox?.color ?? 'white';

  // Use course holes if available, otherwise default
  const holes = useMemo(() => {
    if (roundData?.course?.holes && Array.isArray(roundData.course.holes)) {
      return roundData.course.holes;
    }
    return DEFAULT_HOLES;
  }, [roundData]);

  // Determine handicap label for display
  const handicapLabel = isSocial && selectedTeeBox ? 'DHC' : 'HC';

  // Pre-compute daily handicap for all team members (Social tier+)
  const handicapMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const team of teamsData) {
      for (const member of team.members || []) {
        if (member.player_id && !map.has(member.player_id)) {
          const { playingHandicap } = calculatePlayingHandicap({
            player: member.player ?? null,
            selectedTeeData: selectedTeeBox ?? null,
            holes,
            handicapSource,
            gameType: 'match-play',
            applyDailyHandicap: isSocial,
          });
          map.set(member.player_id, playingHandicap);
        }
      }
    }
    return map;
  }, [teamsData, selectedTeeBox, holes, handicapSource, isSocial]);

  // Find team data based on IDs
  const team1: MatchTeam = useMemo(() => {
    if (team1Id && teamsData.length > 0) {
      const teamData = teamsData.find((t) => t.id === team1Id);
      if (teamData) return toMatchTeam(teamData, handicapMap);
    }
    if (teamsData.length > 0) {
      return toMatchTeam(teamsData[0], handicapMap);
    }
    return { id: team1Id || '1', name: 'Team A', members: [], handicap: 0 };
  }, [team1Id, teamsData, handicapMap]);

  const team2: MatchTeam = useMemo(() => {
    if (team2Id && teamsData.length > 1) {
      const teamData = teamsData.find((t) => t.id === team2Id);
      if (teamData) return toMatchTeam(teamData, handicapMap);
    }
    if (teamsData.length > 1) {
      return toMatchTeam(teamsData[1], handicapMap);
    }
    return { id: team2Id || '2', name: 'Team B', members: [], handicap: 0 };
  }, [team2Id, teamsData, handicapMap]);

  const currentHoleData = holes[currentHole - 1];

  // Score management hook
  const {
    setPlayerScore,
    getPlayerScoreValue,
    team1BestScore,
    team2BestScore,
    currentHoleWinner,
    getPlayerScoreForHole,
    getTeamBestScoreForHole,
    getBestContributorForHole,
    getHoleWinnerForHole,
    getHoleResultDisplay,
  } = useTeamMatchPlayScores(team1, team2, currentHole);

  // Match state hook
  const {
    holeResults,
    isSubmitting,
    isMatchComplete,
    matchStatusText,
    team1MatchStatus,
    team2MatchStatus,
    holesWon,
    handleSubmitMatch,
    dialogConfig,
    showDialog,
    dismissDialog,
  } = useTeamMatchPlayState({
    team1,
    team2,
    currentHole,
    team1BestScore,
    team2BestScore,
    currentHoleWinner,
    getPlayerScoreValue,
    onSubmitSuccess: () => navigation.goBack(),
  });

  // Navigation hook
  const {
    handlePreviousHole,
    handleNextHole,
    handleHolePress,
    handleBackPress,
    handleDeleteRound,
  } = useTeamMatchPlayNavigation({
    currentHole,
    setCurrentHole,
    isMatchComplete,
    holeResults,
    roundId,
    navigation,
    showDialog,
    dismissDialog,
  });

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

  // Get hole data for any hole number (used by SwipeableHoleNavigator)
  const getHoleData = useCallback(
    (holeNumber: number) => {
      return holes[holeNumber - 1];
    },
    [holes]
  );

  // Render content for any hole number (used by SwipeableHoleNavigator for transitions)
  const renderHoleContent = useCallback(
    (holeNumber: number) => {
      const holeData = getHoleData(holeNumber);
      if (!holeData) return null;

      const team1Score = getTeamBestScoreForHole(team1, holeNumber);
      const team2Score = getTeamBestScoreForHole(team2, holeNumber);
      const team1Contributor = getBestContributorForHole(team1, holeNumber);
      const team2Contributor = getBestContributorForHole(team2, holeNumber);
      const holeWinner = getHoleWinnerForHole(holeNumber);
      const holeResultDisplay = getHoleResultDisplay(holeWinner);

      const canGoPrev = holeNumber > 1;
      const canGoNext = holeNumber < 18 && !isMatchComplete;

      return (
        <View style={styles.contentArea}>
          <HoleHeader
            hole={holeData}
            selectedTee={selectedTeeColor}
            onPrevious={handlePreviousHole}
            onNext={handleNextHole}
            canGoPrevious={canGoPrev}
            canGoNext={canGoNext}
          />

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
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
                handicapLabel={handicapLabel}
              />

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
                handicapLabel={handicapLabel}
              />
            </View>

            {holeResultDisplay && (
              <View style={[styles.holeResultContainer, { backgroundColor: colors.surfaceVariant }]}>
                <Icon source="flag-checkered" size={20} color={holeResultDisplay.color} />
                <Text style={[styles.holeResultText, { color: holeResultDisplay.color }]}>
                  {holeResultDisplay.text}
                </Text>
              </View>
            )}

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.goBackButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.goBackButtonLabel, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <TeamMatchPlayHeader
        courseName={courseName}
        selectedTee={selectedTeeBox}
        onBack={handleBackPress}
        onDeletePress={isSuperAdmin ? handleDeleteRound : undefined}
        isSuperAdmin={isSuperAdmin}
        roundId={roundId}
      />

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

      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={18}
        onHoleChange={setCurrentHole}
        enabled={!isSubmitting && !isMatchComplete}
        renderHole={renderHoleContent}
      />

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
  goBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  goBackButtonLabel: {
    ...typography.bodyBold,
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
    borderRadius: borderRadius.full,
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
