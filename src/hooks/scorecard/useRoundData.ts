/**
 * useRoundData Hook
 *
 * Main orchestrator hook for fetching round data including players, course, holes, and teams.
 * Supports scoring pairs - when enabled, only shows players the current user can score.
 * Composes focused hooks for clean separation of concerns.
 *
 * This hook maintains backward compatibility with the original API while delegating
 * to specialized hooks for each concern.
 */

import { useState, useEffect, useCallback } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { roundDataLogger } from '@/utils/debugLogger';
import type { Player, TeamWithMembers } from '@/types';
import type { TeamFormat, GameType } from '@/types/database.types';
import type { BallCount } from '@/types/multiball.types';
import { useRoundMetadata } from './useRoundMetadata';
import { useRoundPlayers } from './useRoundPlayers';
import { useRoundCourse } from './useRoundCourse';
import { useRoundTeams } from './useRoundTeams';
import { useRoundScoringPairs } from './useRoundScoringPairs';
import type { TeeBox } from '@/types';

interface RoundDataState {
  courseName: string | null;
  courseId: string | null;
  courseTees: TeeBox[];
  selectedTee: string | null;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  teams: TeamWithMembers[];
  fetchError: string | null;
  isLoading: boolean;
  scoringPairsEnabled: boolean;
  playersToScore: Player[];
  ballCount: BallCount;
  isSoloRound: boolean;
}

interface UseRoundDataParams {
  roundId: string;
  competitionId: string;
  currentUserId?: string;
}

interface UseRoundDataResult extends RoundDataState {
  retryFetch: () => void;
}

/**
 * Hook for fetching round data including players, course, and teams.
 * Supports scoring pairs - when enabled, filters players to those the current user can score.
 */
export function useRoundData({
  roundId,
  competitionId,
  currentUserId,
}: UseRoundDataParams): UseRoundDataResult {
  const [state, setState] = useState<RoundDataState>({
    courseName: null,
    courseId: null,
    courseTees: [],
    selectedTee: null,
    isTeamRound: false,
    teamFormat: null,
    teams: [],
    fetchError: null,
    isLoading: true,
    scoringPairsEnabled: false,
    playersToScore: [],
    ballCount: 1,
    isSoloRound: false,
  });

  const {
    currentRoundId,
    currentPlayers,
    isInitialized,
    loadFromOffline,
    initializeRound,
    resetRound,
  } = useScorecardStore();

  // Use focused hooks
  const metadata = useRoundMetadata(roundId);
  const playersHook = useRoundPlayers(roundId, competitionId);
  const courseHook = useRoundCourse(roundId);
  const teamsHook = useRoundTeams(
    competitionId,
    metadata.data?.isTeamRound ?? false
  );
  const scoringPairsHook = useRoundScoringPairs(
    roundId,
    currentUserId,
    metadata.data?.scoringPairsRequired ?? false,
    metadata.data?.isTeamRound ?? false,
    playersHook.players
  );

  const initializeRoundData = useCallback(async () => {
    roundDataLogger.info('useRoundData: initializeRoundData called', {
      roundId: roundId?.substring(0, 8),
      competitionId: competitionId?.substring(0, 8),
      currentUserId: currentUserId?.substring(0, 8),
      isInitialized,
      currentRoundId: currentRoundId?.substring(0, 8),
      currentPlayersCount: currentPlayers.length,
    });

    // Skip full initialization if store is already initialized with THIS SPECIFIC round
    if (isInitialized && currentPlayers.length > 0 && currentRoundId === roundId) {
      roundDataLogger.info('Store already initialized for this round, using hook data');
      return;
    }

    // If store has data from a DIFFERENT round, reset it first
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

    // Wait for hooks to load data
    if (metadata.isLoading || playersHook.isLoading || courseHook.isLoading) {
      return;
    }

    // Check for errors
    if (metadata.error || playersHook.error || courseHook.error) {
      return;
    }

    // Need players and course data to initialize
    const players = playersHook.players;
    const holes = courseHook.holes;
    const gameType = metadata.data?.gameType || 'stableford';

    if (players.length === 0) {
      roundDataLogger.warn('No players found');
      return;
    }

    // Determine which players to initialize scorecards for
    let playersToInitialize = players;

    // For team rounds, ensure we initialize scorecards for ALL team members
    if (metadata.data?.isTeamRound && teamsHook.teams.length > 0) {
      const teamMemberPlayers: Player[] = [];
      const seenIds = new Set<string>();

      teamsHook.teams.forEach((team) => {
        (team.members || []).forEach((member) => {
          if (member.player && !seenIds.has(member.player_id)) {
            seenIds.add(member.player_id);
            teamMemberPlayers.push({
              id: member.player.id,
              name: member.player.name,
              email: member.player.email || '',
              phone: member.player.phone ?? undefined,
              handicap: member.player.handicap ?? 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });
      });

      if (teamMemberPlayers.length > 0) {
        roundDataLogger.info('Team round - initializing scorecards for team members', {
          teamMemberCount: teamMemberPlayers.length,
          players: teamMemberPlayers.map((p) => p.name),
        });
        playersToInitialize = teamMemberPlayers;
      }
    }

    // Handle scoring pairs filtering for non-team rounds
    if (
      scoringPairsHook.scoringPairsEnabled &&
      !metadata.data?.isTeamRound &&
      scoringPairsHook.playersToScore.length > 0
    ) {
      const playerIdsToScore = new Set(scoringPairsHook.playersToScore.map((p) => p.id));
      playersToInitialize = players.filter((p) => playerIdsToScore.has(p.id));

      if (playersToInitialize.length === 0) {
        roundDataLogger.warn('User not assigned to score any players');
        return;
      }
    }

    // Initialize round with appropriate players
    roundDataLogger.info('Initializing round', {
      roundId: roundId?.substring(0, 8),
      playerCount: playersToInitialize.length,
      holeCount: holes.length,
      gameType,
    });
    await initializeRound(roundId, playersToInitialize, holes, gameType as GameType);
  }, [
    roundId,
    competitionId,
    currentUserId,
    isInitialized,
    currentRoundId,
    currentPlayers.length,
    metadata.data,
    metadata.isLoading,
    metadata.error,
    playersHook.players,
    playersHook.isLoading,
    playersHook.error,
    courseHook.holes,
    courseHook.isLoading,
    courseHook.error,
    teamsHook.teams,
    scoringPairsHook.scoringPairsEnabled,
    scoringPairsHook.playersToScore,
    loadFromOffline,
    initializeRound,
    resetRound,
  ]);

  // Initialize round when data is ready
  useEffect(() => {
    initializeRoundData();
  }, [initializeRoundData]);

  // Update state from focused hooks
  useEffect(() => {
    const isLoading =
      metadata.isLoading ||
      playersHook.isLoading ||
      courseHook.isLoading ||
      teamsHook.isLoading ||
      scoringPairsHook.isLoading;

    const fetchError =
      metadata.error ||
      playersHook.error ||
      courseHook.error ||
      teamsHook.error ||
      scoringPairsHook.error;

    // Determine if this is a solo round
    const playerCount = currentPlayers.length || playersHook.players.length;
    const isTeamRound = metadata.data?.isTeamRound ?? false;
    const isSoloRound = playerCount === 1 && !isTeamRound;

    setState({
      courseName: metadata.data?.courseName || courseHook.course?.name || null,
      courseId: metadata.data?.courseId || courseHook.course?.id || null,
      courseTees: metadata.data?.courseTees || courseHook.course?.tees || [],
      selectedTee: metadata.data?.selectedTee || null,
      isTeamRound,
      teamFormat: metadata.data?.teamFormat || null,
      teams: teamsHook.teams,
      fetchError,
      isLoading,
      scoringPairsEnabled: scoringPairsHook.scoringPairsEnabled,
      playersToScore: scoringPairsHook.playersToScore,
      ballCount: metadata.data?.ballCount || 1,
      isSoloRound,
    });
  }, [
    metadata.data,
    metadata.isLoading,
    metadata.error,
    playersHook.players,
    playersHook.isLoading,
    playersHook.error,
    courseHook.course,
    courseHook.isLoading,
    courseHook.error,
    teamsHook.teams,
    teamsHook.isLoading,
    teamsHook.error,
    scoringPairsHook.scoringPairsEnabled,
    scoringPairsHook.playersToScore,
    scoringPairsHook.isLoading,
    scoringPairsHook.error,
    currentPlayers.length,
  ]);

  const retryFetch = useCallback(() => {
    setState((prev) => ({ ...prev, fetchError: null, isLoading: true }));
    metadata.refetch();
    playersHook.refetch();
    courseHook.refetch();
    teamsHook.refetch();
    scoringPairsHook.refetch();
  }, [metadata, playersHook, courseHook, teamsHook, scoringPairsHook]);

  return {
    ...state,
    retryFetch,
  };
}
