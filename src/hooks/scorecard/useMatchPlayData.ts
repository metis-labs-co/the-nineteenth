/**
 * useMatchPlayData Hook
 *
 * Data fetching and store initialization for Match Play scoring.
 * Simplified version of useRoundData focused on 2-player match play.
 *
 * Features:
 * - Fetches round details and player data
 * - Initializes scorecard store for both players
 * - Supports offline resume via loadFromOffline
 * - Returns match-specific data (player1, player2, holes, course info)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { roundDataLogger } from '@/utils/debugLogger';
import { getDisplayName } from '@/utils/displayHelpers';
import { useRoundDetails, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useRoundCourse } from './useRoundCourse';
import type { Player, Hole, TeeBox } from '@/types';
import type { MatchPlayer } from '@/screens/scoring/MatchPlayScoringScreen/types';

interface UseMatchPlayDataParams {
  roundId: string;
  player1Id: string;
  player2Id: string;
  competitionId?: string;
}

interface UseMatchPlayDataResult {
  /** Player 1 data */
  player1: MatchPlayer;
  /** Player 2 data */
  player2: MatchPlayer;
  /** Course hole data */
  holes: Hole[];
  /** Course name */
  courseName: string | null;
  /** Selected tee box */
  selectedTee: TeeBox | undefined;
  /** Combined loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the scorecard store is initialized */
  isInitialized: boolean;
  /** Retry function */
  refetch: () => void;
}

/**
 * Hook for fetching match play data and initializing the scorecard store.
 * Follows the pattern from useRoundData but simplified for 2-player match play.
 */
export function useMatchPlayData({
  roundId,
  player1Id,
  player2Id,
  competitionId: _competitionId,
}: UseMatchPlayDataParams): UseMatchPlayDataResult {
  const [error, setError] = useState<string | null>(null);

  // Scorecard store
  const {
    currentRoundId,
    currentPlayers,
    isInitialized,
    loadFromOffline,
    initializeRound,
    resetRound,
  } = useScorecardStore();

  // Fetch round details
  const {
    data: roundData,
    isLoading: isRoundLoading,
    error: roundError,
  } = useRoundDetails(roundId);

  // Fetch players from competition or round_players
  const {
    data: playersData,
    isLoading: isPlayersLoading,
    error: playersError,
  } = useRoundPlayers(roundId);

  // Fetch course and hole data
  const courseHook = useRoundCourse(roundId);

  // Extract player data
  const player1: MatchPlayer = useMemo(() => {
    const playerData = playersData?.find((p) => p.id === player1Id);

    if (playerData) {
      return {
        id: playerData.id,
        name: getDisplayName(playerData.name, 'Player 1'),
        handicap: playerData.handicap ?? 0,
      };
    }

    // Fallback when no data - use first player from round
    if (playersData && playersData.length > 0) {
      const firstPlayer = playersData[0];
      return {
        id: firstPlayer.id,
        name: getDisplayName(firstPlayer.name, 'Player 1'),
        handicap: firstPlayer.handicap ?? 0,
      };
    }

    return {
      id: player1Id,
      name: 'Player 1',
      handicap: 0,
    };
  }, [player1Id, playersData]);

  const player2: MatchPlayer = useMemo(() => {
    const playerData = playersData?.find((p) => p.id === player2Id);

    if (playerData) {
      return {
        id: playerData.id,
        name: getDisplayName(playerData.name, 'Player 2'),
        handicap: playerData.handicap ?? 0,
      };
    }

    // Fallback when no data - use second player from round
    if (playersData && playersData.length > 1) {
      const secondPlayer = playersData[1];
      return {
        id: secondPlayer.id,
        name: getDisplayName(secondPlayer.name, 'Player 2'),
        handicap: secondPlayer.handicap ?? 0,
      };
    }

    return {
      id: player2Id,
      name: 'Player 2',
      handicap: 0,
    };
  }, [player2Id, playersData]);

  // Initialize the scorecard store
  const initializeMatchData = useCallback(async () => {
    roundDataLogger.info('useMatchPlayData: initializeMatchData called', {
      roundId: roundId?.substring(0, 8),
      player1Id: player1Id?.substring(0, 8),
      player2Id: player2Id?.substring(0, 8),
      isInitialized,
      currentRoundId: currentRoundId?.substring(0, 8),
      currentPlayersCount: currentPlayers.length,
    });

    // Skip if store is already initialized for this round
    if (isInitialized && currentPlayers.length > 0 && currentRoundId === roundId) {
      roundDataLogger.info('Store already initialized for this round');
      return;
    }

    // If store has data from a different round, reset it
    if (isInitialized && currentRoundId && currentRoundId !== roundId) {
      roundDataLogger.info('Resetting store - different round', {
        from: currentRoundId?.substring(0, 8),
        to: roundId?.substring(0, 8),
      });
      resetRound();
    }

    // Try to load from offline first
    roundDataLogger.debug('Attempting to load from offline storage');
    const loaded = await loadFromOffline(roundId);

    if (loaded) {
      roundDataLogger.info('Loaded from offline successfully');
      return;
    }

    // Wait for data hooks to finish loading
    if (isRoundLoading || isPlayersLoading || courseHook.isLoading) {
      return;
    }

    // Check for errors
    if (roundError || playersError || courseHook.error) {
      const errorMsg =
        roundError?.message || playersError?.message || courseHook.error || 'Unknown error';
      setError(errorMsg);
      return;
    }

    // Need hole data to initialize
    const holes = courseHook.holes;
    if (holes.length === 0) {
      roundDataLogger.warn('No holes data available');
      return;
    }

    // Create Player objects for the two match players
    const matchPlayers: Player[] = [
      {
        id: player1.id,
        name: player1.name,
        email: '',
        handicap: player1.handicap,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: player2.id,
        name: player2.name,
        email: '',
        handicap: player2.handicap,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Initialize round with match play game type
    roundDataLogger.info('Initializing match play round', {
      roundId: roundId?.substring(0, 8),
      player1: player1.name,
      player2: player2.name,
      holeCount: holes.length,
    });

    await initializeRound(roundId, matchPlayers, holes, 'match-play');
  }, [
    roundId,
    player1Id,
    player2Id,
    player1,
    player2,
    isInitialized,
    currentRoundId,
    currentPlayers.length,
    isRoundLoading,
    isPlayersLoading,
    courseHook.isLoading,
    courseHook.holes,
    courseHook.error,
    roundError,
    playersError,
    loadFromOffline,
    initializeRound,
    resetRound,
  ]);

  // Initialize when data is ready
  useEffect(() => {
    initializeMatchData();
  }, [initializeMatchData]);

  // Retry function
  const refetch = useCallback(() => {
    setError(null);
    courseHook.refetch();
    // Re-initialize after refetch
    initializeMatchData();
  }, [courseHook, initializeMatchData]);

  // Combined loading state
  const isLoading = isRoundLoading || isPlayersLoading || courseHook.isLoading;

  // Combined error state
  const combinedError =
    error || roundError?.message || playersError?.message || courseHook.error || null;

  // Get selected tee from round data
  const selectedTee: TeeBox | undefined = roundData?.selected_tee ?? undefined;

  return {
    player1,
    player2,
    holes: courseHook.holes,
    courseName: roundData?.course?.name || courseHook.course?.name || null,
    selectedTee,
    isLoading,
    error: combinedError,
    isInitialized,
    refetch,
  };
}
