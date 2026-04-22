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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSubMatches, useUpdateSubMatchResult } from '@/hooks/rounds';
import { useCompetitionInfo } from '@/hooks/competitions';
import { useAuth } from '@/hooks/useAuth';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { useProcessSkinsIfNeeded } from '@/hooks';
import { teamMatchPlayLogger } from '@/utils/debugLogger';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Player, TeeBox } from '@/types';

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
  const {
    handicapSource,
    currentRoundId,
    currentPlayers,
    isInitialized,
    initializeRound,
    loadFromOffline,
    resetRound,
  } = useScorecardStore();

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
  } = useRoundTeams(competitionId, isTeamRound, roundId);

  // Split-round support: when round_format === 'split', find the sub-match
  // this user is scoring (either because they're in it or because the route
  // specifies team1Id/team2Id to narrow down). Only the players on that
  // sub-match's two sides are rendered in the scoring UI.
  const isSplitRound = roundData?.round_format === 'split';
  const { data: subMatches } = useSubMatches(isSplitRound ? roundId : undefined);
  const { user: authUser, player: authPlayer } = useAuth();
  const { data: competitionInfo } = useCompetitionInfo(competitionId);

  // Organizer check drives the sub-match picker: players auto-land on their
  // own sub-match, organizers can hop between them.
  const isOrganizer = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!authUser?.id) return false;
    if (roundData?.user_id === authUser.id) return true;
    if (competitionInfo?.organizer_id === authUser.id) return true;
    return false;
  }, [isSuperAdmin, authUser?.id, roundData?.user_id, competitionInfo?.organizer_id]);

  const ownSubMatchId = useMemo(() => {
    if (!isSplitRound || !subMatches || !authPlayer?.id) return null;
    const own = subMatches.find(
      (sm) =>
        sm.team_a_player_ids.includes(authPlayer.id) ||
        sm.team_b_player_ids.includes(authPlayer.id)
    );
    return own?.id ?? null;
  }, [isSplitRound, subMatches, authPlayer?.id]);

  // Organizer picker state: null means "auto" (follow own sub-match or first).
  const [selectedSubMatchId, setSelectedSubMatchId] = useState<string | null>(null);

  const activeSubMatch = useMemo(() => {
    if (!isSplitRound || !subMatches || subMatches.length === 0) return null;
    if (selectedSubMatchId) {
      const picked = subMatches.find((sm) => sm.id === selectedSubMatchId);
      if (picked) return picked;
    }
    // Prefer a sub-match containing the signed-in player.
    if (ownSubMatchId) {
      const own = subMatches.find((sm) => sm.id === ownSubMatchId);
      if (own) return own;
    }
    // Fallback to the first sub-match (organizer viewing, for example).
    return subMatches[0] ?? null;
  }, [isSplitRound, subMatches, selectedSubMatchId, ownSubMatchId]);

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

  // Ensure the scorecard store is initialized for this round.
  // The initial call from `useStartNewRound` can silently fail (errors are
  // swallowed in `initializeRoundSlice`), and the resume-from-list flow
  // skips that call entirely. Without this, downstream screens that read
  // `currentPlayers` from the store (e.g. ReviewScorecardScreen) hang on
  // their loading state.
  useEffect(() => {
    if (teamsData.length === 0 || holes.length === 0) return;

    const alreadyHydrated =
      isInitialized &&
      currentRoundId === roundId &&
      currentPlayers.length > 0;
    if (alreadyHydrated) return;

    const players: Player[] = teamsData.flatMap((team) =>
      (team.members ?? []).map((m) => ({
        id: m.player_id,
        name: m.player?.name ?? 'Unknown',
        email: m.player?.email ?? '',
        handicap: m.player?.handicap ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
    if (players.length === 0) return;

    let cancelled = false;
    (async () => {
      if (currentRoundId && currentRoundId !== roundId) {
        resetRound();
      }

      const loaded = await loadFromOffline(roundId);
      if (cancelled || loaded) return;

      await initializeRound(
        roundId,
        players,
        holes,
        'match-play',
        false,
        [],
        selectedTeeBox ?? null,
        handicapSource
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    teamsData,
    holes,
    roundId,
    isInitialized,
    currentRoundId,
    currentPlayers.length,
    selectedTeeBox,
    handicapSource,
    initializeRound,
    loadFromOffline,
    resetRound,
  ]);

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

  // Find team data based on IDs. For split rounds, synthesize the two "teams"
  // from the active sub-match's sides so the existing best-ball scoring UI
  // scopes down to just those players.
  const team1: MatchTeam = useMemo(() => {
    if (isSplitRound && activeSubMatch && teamsData.length > 0) {
      const filtered: import('@/types').TeamWithMembers = {
        id: `${activeSubMatch.id}-a`,
        competition_id: teamsData[0].competition_id,
        name: 'Team A',
        created_at: teamsData[0].created_at,
        updated_at: teamsData[0].updated_at,
        members: teamsData
          .flatMap((t) => t.members || [])
          .filter((m) => activeSubMatch.team_a_player_ids.includes(m.player_id)),
      };
      return toMatchTeam(filtered, handicapMap);
    }
    if (team1Id && teamsData.length > 0) {
      const teamData = teamsData.find((t) => t.id === team1Id);
      if (teamData) return toMatchTeam(teamData, handicapMap);
    }
    // Legacy fallback: first team in the list. Warn if the competition has
    // 3+ teams — an explicit matchup should have been picked in that case.
    if (teamsData.length >= 3 && !team1Id) {
      teamMatchPlayLogger.warn(
        'Team match play fell back to teamsData[0] with 3+ teams — matchup likely unset',
        { roundId, teamCount: teamsData.length }
      );
    }
    if (teamsData.length > 0) {
      return toMatchTeam(teamsData[0], handicapMap);
    }
    return { id: team1Id || '1', name: 'Team A', members: [], handicap: 0 };
  }, [isSplitRound, activeSubMatch, team1Id, teamsData, handicapMap, roundId]);

  const team2: MatchTeam = useMemo(() => {
    if (isSplitRound && activeSubMatch && teamsData.length > 1) {
      const filtered: import('@/types').TeamWithMembers = {
        id: `${activeSubMatch.id}-b`,
        competition_id: teamsData[1].competition_id,
        name: 'Team B',
        created_at: teamsData[1].created_at,
        updated_at: teamsData[1].updated_at,
        members: teamsData
          .flatMap((t) => t.members || [])
          .filter((m) => activeSubMatch.team_b_player_ids.includes(m.player_id)),
      };
      return toMatchTeam(filtered, handicapMap);
    }
    if (team2Id && teamsData.length > 1) {
      const teamData = teamsData.find((t) => t.id === team2Id);
      if (teamData) return toMatchTeam(teamData, handicapMap);
    }
    if (teamsData.length > 1) {
      return toMatchTeam(teamsData[1], handicapMap);
    }
    return { id: team2Id || '2', name: 'Team B', members: [], handicap: 0 };
  }, [isSplitRound, activeSubMatch, team2Id, teamsData, handicapMap]);

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
    getPlayerStrokesReceivedForHole,
    isPlayerPickedUpOnHole,
    pickUpPlayer,
  } = useTeamMatchPlayScores(team1, team2, currentHole, holes);

  // Persist the completed sub-match's result (only for split rounds). For
  // combined rounds the round-level result is handled elsewhere — see
  // existing combined flow — so this mutation only fires when there's an
  // active sub-match to update.
  const { mutateAsync: updateSubMatchResult } = useUpdateSubMatchResult(roundId);
  const handlePersistSubMatchResult = useCallback(
    async ({
      winner,
      differential,
    }: {
      winner: 'team1' | 'team2' | 'halved';
      differential: number;
    }) => {
      if (!isSplitRound || !activeSubMatch) return;
      const result =
        winner === 'team1' ? 'a-wins' : winner === 'team2' ? 'b-wins' : 'halved';
      await updateSubMatchResult({
        subMatchId: activeSubMatch.id,
        status: 'completed',
        result,
        finalDifferential: differential,
      });
    },
    [isSplitRound, activeSubMatch, updateSubMatchResult]
  );

  // Match state hook
  const {
    holeResults,
    isSubmitting,
    isMatchComplete,
    matchStatusText,
    team1MatchStatus,
    team2MatchStatus,
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
    onPersistResult: isSplitRound && activeSubMatch ? handlePersistSubMatchResult : undefined,
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
    roundId,
    navigation,
    showDialog,
    dismissDialog,
  });

  // Navigate to full scorecard review (leaderboard + individual scorecards)
  const handleViewScorecard = useCallback(() => {
    navigation.navigate('ReviewScorecard', {
      roundId,
      competitionId,
      holes,
    });
  }, [navigation, roundId, competitionId, holes]);

  // Skins processing hook
  const { processSkinsHole } = useProcessSkinsIfNeeded();

  // Process skins for the given hole after a score change (non-blocking)
  const triggerSkinsProcessing = useCallback(
    (holeNumber: number, holeData: { par: number; strokeIndex: number }) => {
      const latestScorecards = useScorecardStore.getState().groupScorecards;
      const scorecardsRecord: Record<string, Record<string, { strokes: number }>> = {};
      latestScorecards.forEach((scorecard, playerId) => {
        scorecardsRecord[playerId] = scorecard.scores as Record<string, { strokes: number }>;
      });

      processSkinsHole({
        roundId,
        holeNumber,
        scorecards: scorecardsRecord,
        hole: { par: holeData.par, strokeIndex: holeData.strokeIndex },
      })
        .then((result) => {
          if (result.processed) {
            if (result.hasWinner) {
              teamMatchPlayLogger.info('SKINS: Hole won', {
                hole: holeNumber,
                winner: result.winnerName,
                amount: result.winningsAmount,
              });
            } else if (result.carryoverAmount) {
              teamMatchPlayLogger.info('SKINS: Carryover', {
                hole: holeNumber,
                carryover: result.carryoverAmount,
              });
            }
          }
        })
        .catch((error) => {
          teamMatchPlayLogger.warn('SKINS: Processing error (non-blocking)', { error });
        });
    },
    [roundId, processSkinsHole]
  );

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

      triggerSkinsProcessing(currentHole, {
        par: currentHoleData.par,
        strokeIndex: currentHoleData.strokeIndex,
      });
    },
    [
      currentHole,
      currentHoleData.par,
      currentHoleData.strokeIndex,
      isMatchComplete,
      getPlayerScoreValue,
      setPlayerScore,
      triggerSkinsProcessing,
    ]
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

      triggerSkinsProcessing(currentHole, {
        par: currentHoleData.par,
        strokeIndex: currentHoleData.strokeIndex,
      });
    },
    [
      currentHole,
      currentHoleData.par,
      currentHoleData.strokeIndex,
      isMatchComplete,
      setPlayerScore,
      triggerSkinsProcessing,
    ]
  );

  // Handle player pickup (concede hole). Uses the same setPlayerScore pathway
  // — pickup is stored as the magic gross score `par + strokes + 2`.
  const handlePlayerPickUp = useCallback(
    async (playerId: string) => {
      if (isMatchComplete) {
        teamMatchPlayLogger.debug('Pickup ignored - match complete');
        return;
      }

      teamMatchPlayLogger.info('TEAM MATCH PLAY: Player pickup toggled', {
        playerId: playerId.substring(0, 8),
        hole: currentHole,
      });

      await pickUpPlayer(playerId);

      triggerSkinsProcessing(currentHole, {
        par: currentHoleData.par,
        strokeIndex: currentHoleData.strokeIndex,
      });
    },
    [
      currentHole,
      currentHoleData.par,
      currentHoleData.strokeIndex,
      isMatchComplete,
      pickUpPlayer,
      triggerSkinsProcessing,
    ]
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
                getPlayerStrokesReceived={(playerId) => getPlayerStrokesReceivedForHole(playerId, holeNumber)}
                getPlayerIsPickedUp={(playerId) => isPlayerPickedUpOnHole(playerId, holeNumber)}
                onPlayerScoreAdjust={handlePlayerScoreAdjust}
                onPlayerParSelect={handlePlayerParSelect}
                onPlayerPickUp={handlePlayerPickUp}
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
                getPlayerStrokesReceived={(playerId) => getPlayerStrokesReceivedForHole(playerId, holeNumber)}
                getPlayerIsPickedUp={(playerId) => isPlayerPickedUpOnHole(playerId, holeNumber)}
                onPlayerScoreAdjust={handlePlayerScoreAdjust}
                onPlayerParSelect={handlePlayerParSelect}
                onPlayerPickUp={handlePlayerPickUp}
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
      getPlayerStrokesReceivedForHole,
      isPlayerPickedUpOnHole,
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
      handlePlayerPickUp,
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

  const showSubMatchPicker =
    isSplitRound && isOrganizer && !!subMatches && subMatches.length > 1;

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

      {showSubMatchPicker && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.subMatchPickerRow,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
          contentContainerStyle={styles.subMatchPickerContent}
        >
          {subMatches!.map((sm, i) => {
            const selected = activeSubMatch?.id === sm.id;
            return (
              <TouchableOpacity
                key={sm.id}
                onPress={() => setSelectedSubMatchId(sm.id)}
                style={[
                  styles.subMatchChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Switch to Sub-Match ${i + 1}`}
                testID={`sub-match-picker-chip-${i}`}
              >
                <Text
                  style={[
                    styles.subMatchChipText,
                    { color: selected ? colors.white : colors.textPrimary },
                  ]}
                >
                  Sub-Match {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

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
        onViewScorecard={handleViewScorecard}
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
  subMatchPickerRow: {
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  subMatchPickerContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  subMatchChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMatchChipText: {
    ...typography.captionBold,
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
