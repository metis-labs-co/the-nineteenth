/**
 * ScorecardEntryScreen
 *
 * Offline-first scoring interface for 18-hole rounds.
 * Features:
 * - Current hole display with par and stroke index
 * - Score entry for all players in group
 * - Team scoring modes: Scramble, Best Ball, Team Match Play
 * - Previous/Next hole navigation buttons
 * - Progress bar showing completion
 * - Quick scorecard view for jumping to any hole
 * - Auto-save to SQLite for offline support
 * - Sync on submit when online
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
  Animated,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNetInfo } from '@react-native-community/netinfo';
import { LoadingSpinner, OfflineIndicator, ConfirmationDialog } from '@/components/common';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScorecardStore } from '@/store/scorecardStore';
import { useOfflineSync, useRoundData, useTeamScoring } from '@/hooks/scorecard';
import {
  PlayerScoreCard,
  QuickScorecardView,
  HoleHeader,
  TeamScoreCard,
  BestBallScoreView,
  TeamMatchPlayScoreView,
  SwipeableHoleNavigator,
  ScorecardDebugPanel,
} from '@/components/scorecard';
import { useDebugMode } from '@/store/settingsStore';
import { scoringLogger } from '@/utils/debugLogger';
import { supabase } from '@/services/supabase/client';
import { deleteScorecardsByRound } from '@/services/offline/database';
import { spacing, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation/types';
import type { HoleScore } from '@/types';
import { PageHeader } from '@/components/common';

type Props = RootStackScreenProps<'Scorecard'>;

export default function ScorecardEntryScreen({ navigation, route }: Props) {
  const { roundId, competitionId } = route.params;
  const colors = useThemeColors();
  const { user } = useAuth();
  const isStandaloneRound = competitionId === 'standalone';

  // Debug panel state
  const { debugModeEnabled } = useDebugMode();
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Leave confirmation dialog state
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Submit confirmation dialog state
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
  const [completedHolesCount, setCompletedHolesCount] = useState(0);

  // Core scorecard store
  const {
    currentHole,
    currentPlayers,
    holes,
    isLoading: storeLoading,
    isInitialized,
    isSyncing,
    pendingSyncCount,
    setCurrentHole,
    setPlayerScore,
    updatePlayerHoleScore,
    getPlayerScore,
    getHoleInfo,
    isHoleComplete,
    getCompletedHolesCount,
    submitScorecards,
    resetRound,
  } = useScorecardStore();

  // Data fetching hook
  const {
    courseName,
    isTeamRound,
    teamFormat,
    teams,
    fetchError,
    isLoading: dataLoading,
    retryFetch,
    scoringPairsEnabled,
    playersToScore,
  } = useRoundData({ roundId, competitionId, currentUserId: user?.id });

  // Network status
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  // Offline sync hook
  const { triggerSync } = useOfflineSync();

  // Compute offline status for indicator (syncing handled by sync line, not indicator)
  const getOfflineStatus = useCallback((): 'online' | 'offline' | 'syncing' | 'error' => {
    if (!isOnline) return 'offline';
    return 'online';
  }, [isOnline]);

  // Team scoring hook
  const {
    selectedContributor,
    teamMatchPlayResults,
    playerScoresMap,
    setSelectedContributor,
    handleTeamScoreSelect,
    handleBestBallScoreSelect,
    handleTeamMatchPlayScoreSelect,
    getTeamScore,
  } = useTeamScoring({
    teams,
    teamFormat,
    currentHole,
    players: currentPlayers,
  });

  // Sync line animation
  const syncLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(syncLineAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(syncLineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      syncLineAnim.setValue(0);
    }
  }, [isSyncing, syncLineAnim]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [pendingSyncCount]);

  // Navigation handlers
  const handleBackPress = useCallback(() => {
    if (pendingSyncCount > 0) {
      setShowLeaveDialog(true);
    } else {
      navigation.goBack();
    }
  }, [pendingSyncCount, navigation]);

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveDialog(false);
    triggerSync();
    navigation.goBack();
  }, [triggerSync, navigation]);

  const handlePreviousHole = useCallback(() => {
    if (currentHole > 1) {
      scoringLogger.info('Navigation: Previous hole', {
        from: currentHole,
        to: currentHole - 1,
      });
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole, setCurrentHole]);

  const handleNextHole = useCallback(() => {
    if (currentHole < 18) {
      scoringLogger.info('Navigation: Next hole', {
        from: currentHole,
        to: currentHole + 1,
      });
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, setCurrentHole]);

  const handleHolePress = useCallback(
    (holeNumber: number) => {
      scoringLogger.info('Navigation: Jump to hole', {
        from: currentHole,
        to: holeNumber,
      });
      setCurrentHole(holeNumber);
    },
    [setCurrentHole, currentHole]
  );

  // Score handlers
  const handleScoreSelect = useCallback(
    async (playerId: string, strokes: number) => {
      const player = currentPlayers.find(p => p.id === playerId);
      const holeData = getHoleInfo(currentHole);
      scoringLogger.info('SCORE ENTRY: Individual player score', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        strokes,
        holeInfo: holeData ? { par: holeData.par, si: holeData.strokeIndex } : null,
      });
      await setPlayerScore(playerId, currentHole, strokes);
    },
    [currentHole, setPlayerScore, currentPlayers, getHoleInfo]
  );

  const handleStatsUpdate = useCallback(
    async (playerId: string, updates: Partial<HoleScore>) => {
      const player = currentPlayers.find(p => p.id === playerId);
      scoringLogger.info('STATS UPDATE: Player stats', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        updates,
      });
      await updatePlayerHoleScore(playerId, currentHole, updates);
    },
    [currentHole, updatePlayerHoleScore, currentPlayers]
  );

  const handlePlayerPress = useCallback(
    (playerId: string) => {
      navigation.navigate('PlayerScorecard', {
        playerId,
        roundId,
      });
    },
    [navigation, roundId]
  );

  const handleViewScorecard = useCallback(() => {
    if (currentPlayers.length === 1) {
      navigation.navigate('PlayerScorecard', {
        playerId: currentPlayers[0].id,
        roundId,
      });
    } else {
      navigation.navigate('ReviewScorecard', {
        roundId,
        competitionId,
        holes,
      });
    }
  }, [navigation, roundId, competitionId, holes, currentPlayers]);

  // Submit handlers
  const performSubmit = useCallback(async () => {
    setShowIncompleteDialog(false);
    scoringLogger.info('SUBMIT: Starting scorecard submission', {
      roundId: roundId?.substring(0, 8),
      competitionId: competitionId?.substring(0, 8),
      playerCount: currentPlayers.length,
    });
    try {
      await submitScorecards();
      scoringLogger.info('SUBMIT: Scorecard submission successful');
      navigation.navigate('ReviewScorecard', {
        roundId,
        competitionId,
        holes,
      });
    } catch (error) {
      scoringLogger.error('SUBMIT: Scorecard submission failed', error);
      setShowSubmitErrorDialog(true);
    }
  }, [submitScorecards, navigation, roundId, competitionId, holes, currentPlayers.length]);

  const handleSubmit = useCallback(async () => {
    const completedCount = getCompletedHolesCount();
    scoringLogger.info('SUBMIT: Submit button pressed', {
      completedHoles: completedCount,
      totalHoles: 18,
      isComplete: completedCount === 18,
    });
    if (completedCount < 18) {
      setCompletedHolesCount(completedCount);
      setShowIncompleteDialog(true);
    } else {
      await performSubmit();
    }
  }, [getCompletedHolesCount, performSubmit]);

  const handleDeleteRound = useCallback(() => {
    Alert.alert(
      'Delete Round',
      'Are you sure you want to delete this round? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('rounds').delete().eq('id', roundId);

              if (error) {
                console.error('[ScorecardEntryScreen] Failed to delete round:', error);
                Alert.alert('Error', 'Failed to delete round. Please try again.');
                return;
              }

              await deleteScorecardsByRound(roundId);
              resetRound();
              navigation.goBack();
            } catch (error) {
              console.error('[ScorecardEntryScreen] Error deleting round:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
          },
        },
      ]
    );
  }, [roundId, navigation, resetRound]);

  const currentHoleData = getHoleInfo(currentHole);
  const isLoading = storeLoading || dataLoading;

  // Loading state
  if (isLoading || (!isInitialized && !fetchError)) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading scorecard..." />
      </SafeAreaView>
    );
  }

  // Fetch error state
  if (fetchError) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Unable to Load Scorecard
        </Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{fetchError}</Text>
        <View style={styles.errorButtons}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.errorButton}>
            Go Back
          </Button>
          <Button mode="contained" onPress={retryFetch} style={styles.errorButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // No hole data state
  if (!currentHoleData) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Failed to load hole data
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  // Determine which players to show based on scoring pairs setting
  // When scoringPairsEnabled is true, only show players assigned to the current user
  const playersToRender = scoringPairsEnabled && playersToScore.length > 0
    ? playersToScore
    : currentPlayers;

  // Filter teams to only include members the user can score (for team rounds with scoring pairs)
  const getFilteredTeamMembers = (team: typeof teams[0]) => {
    if (!scoringPairsEnabled || playersToScore.length === 0) {
      return team.members;
    }
    const allowedPlayerIds = new Set(playersToScore.map((p) => p.id));
    return team.members.filter((m) => allowedPlayerIds.has(m.player_id));
  };

  // Render score content based on format
  const renderScoreContent = () => {
    // Team round: Scramble format
    if (isTeamRound && teamFormat === 'scramble' && teams.length > 0) {
      // For scramble, the whole team scores together - show teams with allowed members
      return teams.map((team, index) => {
        const filteredMembers = getFilteredTeamMembers(team);
        // Skip team if no members are allowed to be scored by this user
        if (scoringPairsEnabled && filteredMembers.length === 0) return null;
        return (
          <TeamScoreCard
            key={team.id}
            team={{ ...team, members: filteredMembers }}
            currentHole={currentHoleData}
            currentScore={getTeamScore(index)}
            onScoreSelect={(strokes) => handleTeamScoreSelect(index, strokes)}
            onContributorSelect={setSelectedContributor}
            selectedContributor={selectedContributor}
          />
        );
      }).filter(Boolean);
    }

    // Team round: Best Ball format
    // Show ALL team members but only allow editing players in playersToScore
    if (isTeamRound && teamFormat === 'best-ball' && teams.length > 0) {
      // Build set of editable player IDs (players the current user can score)
      const editablePlayerIds = scoringPairsEnabled && playersToScore.length > 0
        ? new Set(playersToScore.map(p => p.id))
        : undefined; // undefined means all players are editable

      return teams.map((team) => {
        // Check if the current user's team (at least one editable player on this team)
        const hasEditableMember = !editablePlayerIds ||
          team.members?.some(m => editablePlayerIds.has(m.player_id));

        return (
          <BestBallScoreView
            key={team.id}
            team={team}
            currentHole={currentHoleData}
            playerScores={playerScoresMap}
            onScoreSelect={handleBestBallScoreSelect}
            editablePlayerIds={editablePlayerIds}
          />
        );
      });
    }

    // Team round: Match Play format (requires exactly 2 teams)
    if (isTeamRound && teamFormat === 'match-play-team' && teams.length >= 2) {
      // For team match play with scoring pairs, cross-team restriction is handled by
      // playersToScore - each user only scores opposing team members
      return (
        <TeamMatchPlayScoreView
          team1={teams[0]}
          team2={teams[1]}
          currentHole={currentHoleData}
          team1Score={getTeamScore(0)}
          team2Score={getTeamScore(1)}
          onTeam1ScoreSelect={(strokes) => handleTeamMatchPlayScoreSelect(0, strokes)}
          onTeam2ScoreSelect={(strokes) => handleTeamMatchPlayScoreSelect(1, strokes)}
          holeResults={teamMatchPlayResults}
        />
      );
    }

    // Default: Individual player scoring
    // When scoring pairs enabled, only show PlayerScoreCards for players in playersToScore
    return playersToRender.map((player) => (
      <PlayerScoreCard
        key={player.id}
        player={player}
        currentHole={currentHoleData}
        currentScore={getPlayerScore(player.id, currentHole)}
        onScoreSelect={(strokes) => handleScoreSelect(player.id, strokes)}
        onStatsUpdate={(updates) => handleStatsUpdate(player.id, updates)}
        onPlayerPress={handlePlayerPress}
      />
    ));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <PageHeader
        title="Score Entry"
        subtitle={courseName ?? undefined}
        showBack
        onBack={handleBackPress}
        rightActions={[
          // Debug button (only shown when debug mode is enabled)
          ...(debugModeEnabled
            ? [
                {
                  icon: 'bug-outline' as const,
                  onPress: () => setShowDebugPanel(true),
                  accessibilityLabel: 'Show debug panel',
                  color: colors.warning,
                },
              ]
            : []),
          // Delete button for standalone rounds
          ...(isStandaloneRound
            ? [
                {
                  icon: 'delete-outline' as const,
                  onPress: handleDeleteRound,
                  accessibilityLabel: 'Delete round',
                  color: colors.error,
                },
              ]
            : []),
        ]}
      />

      {/* Offline Status Indicator - only show when offline, not during sync */}
      <OfflineIndicator
        status={getOfflineStatus()}
        pendingSyncs={pendingSyncCount}
        onSyncPress={triggerSync}
      />

      {/* Sync Line Indicator */}
      {isSyncing && (
        <View style={[styles.syncLineContainer, { backgroundColor: colors.gray200 }]}>
          <Animated.View
            style={[
              styles.syncLine,
              {
                backgroundColor: colors.primary,
                transform: [
                  {
                    translateX: syncLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-200, 400],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* Scoring Pairs Info Header */}
      {scoringPairsEnabled && playersToScore.length > 0 && (
        <View style={[styles.scoringPairsHeader, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.scoringPairsLabel, { color: colors.primary }]}>
            Scoring for:{' '}
            <Text style={styles.scoringPairsNames}>
              {playersToScore.map((p) => p.name).join(', ')}
            </Text>
          </Text>
        </View>
      )}

      {/* Content Area with Swipe Navigation */}
      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={18}
        onHoleChange={setCurrentHole}
        enabled={!isSyncing && !isLoading}
        playerCount={playersToRender.length}
      >
        <View style={styles.contentArea}>
          <HoleHeader
            hole={currentHoleData}
            onPrevious={handlePreviousHole}
            onNext={handleNextHole}
            canGoPrevious={currentHole > 1}
            canGoNext={currentHole < 18}
            onHolePress={handleViewScorecard}
          />

          <ScrollView
            style={styles.playersContainer}
            contentContainerStyle={styles.playersContent}
            showsVerticalScrollIndicator={false}
          >
            {renderScoreContent()}

            {/* Quick Scorecard View - only show for individual scoring */}
            {!isTeamRound && (
              <View style={styles.quickViewContainer}>
                <QuickScorecardView
                  holes={holes}
                  currentHole={currentHole}
                  players={playersToRender}
                  getPlayerHoleScore={getPlayerScore}
                  isHoleComplete={isHoleComplete}
                  onHolePress={handleHolePress}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </SwipeableHoleNavigator>

      {/* Navigation Buttons */}
      <View
        style={[
          styles.navigationContainer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.viewScorecardRow}>
          <Button
            mode="text"
            onPress={handleViewScorecard}
            style={styles.viewScorecardButton}
            labelStyle={[styles.viewScorecardLabel, { color: colors.primary }]}
            compact
          >
            View Full Scorecard
          </Button>
        </View>
        <View style={styles.navButtonsRow}>
          <Button
            mode="outlined"
            onPress={handlePreviousHole}
            disabled={currentHole === 1}
            style={styles.navButton}
            labelStyle={[styles.navButtonLabel, { color: colors.textPrimary }]}
            contentStyle={styles.navButtonContent}
          >
            Previous
          </Button>

          {currentHole < 18 ? (
            <Button
              mode="contained"
              onPress={handleNextHole}
              style={[styles.navButton, { backgroundColor: colors.primary }]}
              labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
              contentStyle={styles.navButtonContent}
            >
              Next Hole
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.navButton, { backgroundColor: colors.success }]}
              labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
              contentStyle={styles.navButtonContent}
            >
              Review & Submit
            </Button>
          )}
        </View>
      </View>

      {/* Debug Panel */}
      <ScorecardDebugPanel
        visible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
        roundId={roundId}
        competitionId={competitionId}
        courseName={courseName}
        isTeamRound={isTeamRound}
        teamFormat={teamFormat}
        teams={teams}
        scoringPairsEnabled={scoringPairsEnabled}
        playersToScore={playersToScore}
      />

      {/* Leave Confirmation Dialog */}
      <ConfirmationDialog
        visible={showLeaveDialog}
        title="Unsaved Changes"
        message={`You have ${pendingSyncCount} unsaved change${pendingSyncCount !== 1 ? 's' : ''}. Your progress will be saved automatically.`}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={handleLeaveConfirm}
        onCancel={() => setShowLeaveDialog(false)}
        icon="content-save-outline"
      />

      {/* Incomplete Round Confirmation Dialog */}
      <ConfirmationDialog
        visible={showIncompleteDialog}
        title="Incomplete Round"
        message={`You have only completed ${completedHolesCount} of 18 holes. Submit anyway?`}
        confirmLabel="Submit"
        cancelLabel="Continue Scoring"
        onConfirm={performSubmit}
        onCancel={() => setShowIncompleteDialog(false)}
        icon="alert-circle-outline"
      />

      {/* Submit Error Dialog */}
      <ConfirmationDialog
        visible={showSubmitErrorDialog}
        title="Submit Failed"
        message="Failed to submit scorecards. Your scores are saved locally and will sync when connection is restored."
        confirmLabel="OK"
        cancelLabel="Dismiss"
        onConfirm={() => setShowSubmitErrorDialog(false)}
        onCancel={() => setShowSubmitErrorDialog(false)}
        icon="cloud-off-outline"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scoringPairsHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  scoringPairsLabel: {
    ...typography.small,
  },
  scoringPairsNames: {
    ...typography.smallBold,
  },
  syncLineContainer: {
    height: 2,
    overflow: 'hidden',
  },
  syncLine: {
    width: 200,
    height: 2,
  },
  contentArea: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  errorButton: {
    minWidth: 100,
  },
  playersContainer: {
    flex: 1,
  },
  playersContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  quickViewContainer: {
    marginTop: spacing.lg,
  },
  navigationContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    ...shadows.sm,
  },
  viewScorecardRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewScorecardButton: {
    marginVertical: 0,
  },
  viewScorecardLabel: {
    ...typography.small,
    textDecorationLine: 'underline',
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
  },
  navButtonContent: {
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  navButtonLabel: {
    ...typography.bodyBold,
  },
  navButtonLabelPrimary: {
    ...typography.bodyBold,
  },
});
