/**
 * useCompetitionDetailHandlers
 *
 * All navigation and action handlers for the competition detail screen:
 * - Back, edit, add round, add players
 * - Score/view round routing
 * - Team management
 * - Scoring pairs management
 * - Refresh
 * - Leaderboard entry press / points breakdown
 * - Player removal
 */

import { useCallback, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useConfirmationDialog } from '@/hooks';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useUpdateTeamMetadata } from '@/hooks/useTeams';
import { useRemoveCompetitionPlayer } from '@/hooks/useRemoveCompetitionPlayer';
import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

interface UseCompetitionDetailHandlersParams {
  id: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'CompetitionDetail'>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  competitionData: any;
  refetch: () => void;
  refetchLeaderboard: () => void;
  refetchTeams: () => void;
  refetchPrizePool: () => void;
}

export function useCompetitionDetailHandlers({
  id,
  navigation,
  competitionData,
  refetch,
  refetchLeaderboard,
  refetchTeams,
  refetchPrizePool,
}: UseCompetitionDetailHandlersParams) {
  const { checkCanAddRound, checkCanAddPlayer } = useSubscriptionContext();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Upgrade prompt state
  const [showRoundUpgradePrompt, setShowRoundUpgradePrompt] = useState(false);
  const [showPlayerUpgradePrompt, setShowPlayerUpgradePrompt] = useState(false);

  // Add players bottom sheet state
  const [showAddPlayersSheet, setShowAddPlayersSheet] = useState(false);

  // Quick score state
  const [quickScoreRoundId, setQuickScoreRoundId] = useState<string | null>(null);

  // Points breakdown modal state
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [selectedLeaderboardEntry, setSelectedLeaderboardEntry] = useState<CompetitionLeaderboardEntry | null>(null);

  // Team metadata update hook (name + colour)
  const { mutate: updateTeamMutation } = useUpdateTeamMetadata();

  // Player removal hook
  const {
    state: removePlayerState,
    removePlayer: initiateRemovePlayer,
    dialogConfig: removePlayerDialogConfig,
    dismissDialog: dismissRemovePlayerDialog,
  } = useRemoveCompetitionPlayer({
    competitionId: id,
    onSuccess: (_playerId, affectedRoundIds) => {
      refetch();
      refetchLeaderboard();
      refetchTeams();

      if (affectedRoundIds.length > 0) {
        showAlert(
          'Player Removed',
          `The player has been removed. ${affectedRoundIds.length} round${affectedRoundIds.length !== 1 ? 's' : ''} had scoring pair assignments that were deleted. Please re-configure scoring pairs for affected rounds.`
        );
      }
    },
    onError: (error) => {
      showAlert('Error', error.message || 'Failed to remove player');
    },
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddRound = useCallback(() => {
    const currentRoundCount = competitionData?.rounds?.length ?? 0;
    const access = checkCanAddRound(id, currentRoundCount);

    if (!access.allowed) {
      setShowRoundUpgradePrompt(true);
      return;
    }

    navigation.navigate('AddRound', { competitionId: id });
  }, [navigation, id, competitionData?.rounds?.length, checkCanAddRound]);

  const handleAddPlayers = useCallback(() => {
    const currentPlayerCount = competitionData?.players?.length ?? 0;
    const access = checkCanAddPlayer(id, currentPlayerCount);

    if (!access.allowed) {
      setShowPlayerUpgradePrompt(true);
      return;
    }

    setShowAddPlayersSheet(true);
  }, [id, competitionData?.players?.length, checkCanAddPlayer]);

  const handleRemovePlayer = useCallback(
    (playerId: string, playerName: string) => {
      initiateRemovePlayer(playerId, playerName);
    },
    [initiateRemovePlayer]
  );

  const handleScoreRound = useCallback(
    (roundId: string, gameType: string, isTeamRound: boolean) => {
      if (gameType === 'match-play') {
        if (isTeamRound) {
          navigation.navigate('TeamMatchPlayScoring', {
            roundId,
            team1Id: undefined,
            team2Id: undefined,
          });
        } else {
          navigation.navigate('MatchPlayScoring', {
            roundId,
            player1Id: undefined,
            player2Id: undefined,
          });
        }
      } else {
        navigation.navigate('Scorecard', { roundId, competitionId: id });
      }
    },
    [navigation, id]
  );

  const handleViewRound = useCallback(
    (roundId: string) => {
      navigation.navigate('ViewRound', { roundId, competitionId: id });
    },
    [navigation, id]
  );

  const handleUpdateTeam = useCallback(
    (teamId: string, updates: { name?: string; color?: string }) => {
      updateTeamMutation(
        { teamId, competitionId: id, ...updates },
        {
          onError: (error) => {
            showAlert('Error', error.message || 'Failed to update team');
          },
        }
      );
    },
    [updateTeamMutation, id, showAlert]
  );

  const handleManageScoringPairs = useCallback(
    (roundId: string) => {
      navigation.navigate('ScoringPairs', { roundId, competitionId: id });
    },
    [navigation, id]
  );

  const handleRefresh = useCallback(() => {
    refetch();
    refetchLeaderboard();
    refetchTeams();
    refetchPrizePool();
  }, [refetch, refetchLeaderboard, refetchTeams, refetchPrizePool]);

  // Leaderboard entry press handlers
  const handleLeaderboardEntryPress = useCallback((entry: CompetitionLeaderboardEntry) => {
    setSelectedLeaderboardEntry(entry);
    setShowPointsBreakdown(true);
  }, []);

  const handleClosePointsBreakdown = useCallback(() => {
    setShowPointsBreakdown(false);
    setSelectedLeaderboardEntry(null);
  }, []);

  // Quick score handlers
  const handleQuickScore = useCallback((roundId: string) => {
    setQuickScoreRoundId(roundId);
  }, []);

  const handleQuickScorePlayerSelect = useCallback(
    (playerId: string) => {
      if (!quickScoreRoundId) return;
      navigation.navigate('QuickScoreEntry', {
        roundId: quickScoreRoundId,
        playerId,
        competitionId: id,
      });
      setQuickScoreRoundId(null);
    },
    [navigation, id, quickScoreRoundId]
  );

  const handleQuickScoreClose = useCallback(() => {
    setQuickScoreRoundId(null);
  }, []);

  return {
    // Dialog
    dialogConfig,
    showAlert,
    dismissDialog,
    // Upgrade prompts
    showRoundUpgradePrompt,
    setShowRoundUpgradePrompt,
    showPlayerUpgradePrompt,
    setShowPlayerUpgradePrompt,
    // Add players sheet
    showAddPlayersSheet,
    setShowAddPlayersSheet,
    // Points breakdown
    showPointsBreakdown,
    selectedLeaderboardEntry,
    handleLeaderboardEntryPress,
    handleClosePointsBreakdown,
    // Player removal
    removePlayerState,
    removePlayerDialogConfig,
    dismissRemovePlayerDialog,
    // Quick score
    quickScoreRoundId,
    handleQuickScore,
    handleQuickScorePlayerSelect,
    handleQuickScoreClose,
    // Navigation handlers
    handleBack,
    handleAddRound,
    handleAddPlayers,
    handleRemovePlayer,
    handleScoreRound,
    handleViewRound,
    handleUpdateTeam,
    handleManageScoringPairs,
    handleRefresh,
  };
}
