/**
 * useRoundData Hook
 *
 * Fetches and manages round data including players, course, holes, and teams.
 * Supports scoring pairs - when enabled, only shows players the current user can score.
 * Separated from ScorecardEntryScreen for better maintainability.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore } from '@/store/scorecardStore';
import { getPlayersToScore, hasScoringPairs } from '@/services/scoringPairs';
import type { Player, Hole } from '@/types';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';

// Default holes (fallback if course has no hole data)
const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));

interface RoundDataState {
  courseName: string | null;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  teams: TeamWithMembers[];
  fetchError: string | null;
  isLoading: boolean;
  // Scoring pairs support
  scoringPairsEnabled: boolean;
  playersToScore: Player[];
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
 * Hook for fetching round data including players, course, and teams
 * Supports scoring pairs - when enabled, filters players to those the current user can score
 */
export function useRoundData({ roundId, competitionId, currentUserId }: UseRoundDataParams): UseRoundDataResult {
  const [state, setState] = useState<RoundDataState>({
    courseName: null,
    isTeamRound: false,
    teamFormat: null,
    teams: [],
    fetchError: null,
    isLoading: true,
    scoringPairsEnabled: false,
    playersToScore: [],
  });

  const {
    currentRoundId,
    currentPlayers,
    isInitialized,
    loadFromOffline,
    initializeRound,
    resetRound,
  } = useScorecardStore();

  const fetchRoundData = useCallback(async () => {
    // Skip if store is already initialized with THIS SPECIFIC round
    if (isInitialized && currentPlayers.length > 0 && currentRoundId === roundId) {
      console.log('[useRoundData] Store already initialized for this round, skipping load');
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // If store has data from a DIFFERENT round, reset it first
    if (isInitialized && currentRoundId && currentRoundId !== roundId) {
      console.log('[useRoundData] Resetting store - different round:', currentRoundId, '->', roundId);
      resetRound();
    }

    setState((prev) => ({ ...prev, isLoading: true, fetchError: null }));

    // Try to load from offline first
    const loaded = await loadFromOffline(roundId);

    if (loaded) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Fetch actual data from Supabase
    try {
      // Fetch competition players
      const { data: competitionPlayers, error: playersError } = await (
        supabase.from('competition_players') as any
      )
        .select(
          `
          player_id,
          players!player_id (
            id,
            name,
            email,
            phone,
            handicap
          )
        `
        )
        .eq('competition_id', competitionId)
        .eq('status', 'accepted');

      if (playersError) {
        console.error('[useRoundData] Failed to fetch players:', playersError);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          fetchError: `Failed to load players: ${playersError.message}`,
        }));
        return;
      }

      // Fetch round and course data to get holes (including team round and scoring pairs fields)
      const { data: roundData, error: roundError } = await (supabase.from('rounds') as any)
        .select(
          `
          id,
          game_type,
          is_team_round,
          team_format,
          scoring_pairs_required,
          courses!course_id (
            id,
            name,
            holes
          )
        `
        )
        .eq('id', roundId)
        .single();

      if (roundError) {
        console.error('[useRoundData] Failed to fetch round:', roundError);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          fetchError: `Failed to load round: ${roundError.message}`,
        }));
        return;
      }

      // Set team round state
      const roundIsTeamRound = roundData?.is_team_round ?? false;
      const roundTeamFormat = roundData?.team_format as TeamFormat | null;
      let fetchedTeams: TeamWithMembers[] = [];

      // Fetch teams if this is a team round
      if (roundIsTeamRound) {
        const { data: teamsData, error: teamsError } = await (supabase.from('teams') as any)
          .select(
            `
            id,
            competition_id,
            name,
            created_at,
            updated_at,
            team_members (
              team_id,
              player_id,
              joined_at,
              players!player_id (
                id,
                name,
                email,
                phone,
                handicap,
                photo_url
              )
            )
          `
          )
          .eq('competition_id', competitionId);

        if (teamsError) {
          console.error('[useRoundData] Failed to fetch teams:', teamsError);
          // Don't fail - just continue without team data
        } else if (teamsData) {
          // Transform to TeamWithMembers format
          fetchedTeams = teamsData.map((team: any) => ({
            id: team.id,
            competition_id: team.competition_id,
            name: team.name,
            created_at: team.created_at,
            updated_at: team.updated_at,
            members: (team.team_members || []).map((tm: any) => ({
              team_id: tm.team_id,
              player_id: tm.player_id,
              joined_at: tm.joined_at,
              player: tm.players
                ? {
                    id: tm.players.id,
                    name: tm.players.name,
                    email: tm.players.email,
                    phone: tm.players.phone,
                    handicap: tm.players.handicap ?? 0,
                    photo_url: tm.players.photo_url,
                  }
                : undefined,
            })),
          }));
          console.log('[useRoundData] Loaded', fetchedTeams.length, 'teams');
        }
      }

      // Transform players to our Player type
      const players: Player[] = (competitionPlayers || [])
        .filter((cp: any) => cp.players)
        .map((cp: any) => ({
          id: cp.players.id,
          name: cp.players.name || 'Unknown',
          email: cp.players.email || '',
          phone: cp.players.phone,
          handicap: cp.players.handicap || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      if (players.length === 0) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          fetchError: 'No players found for this competition. Make sure players have joined.',
        }));
        return;
      }

      // Handle scoring pairs
      const scoringPairsRequired = roundData?.scoring_pairs_required ?? false;
      let scoringPairsEnabled = false;
      let playersToScoreList: Player[] = [];
      let playersForScorecard = players;

      if (scoringPairsRequired) {
        // Check if scoring pairs are configured for this round
        const pairsExist = await hasScoringPairs(roundId);

        if (!pairsExist) {
          // Scoring pairs required but not configured - show error
          setState((prev) => ({
            ...prev,
            isLoading: false,
            fetchError: 'Scoring pairs not yet configured for this round',
            scoringPairsEnabled: true,
            playersToScore: [],
          }));
          return;
        }

        scoringPairsEnabled = true;

        // If we have a current user, fetch the players they can score
        if (currentUserId) {
          try {
            playersToScoreList = await getPlayersToScore(roundId, currentUserId);
            console.log(
              '[useRoundData] Scoring pairs enabled, user can score',
              playersToScoreList.length,
              'players'
            );

            // Filter competition players to only those in the user's scoring pairs
            const playerIdsToScore = new Set(playersToScoreList.map((p) => p.id));
            playersForScorecard = players.filter((p) => playerIdsToScore.has(p.id));

            if (playersForScorecard.length === 0) {
              // User is not assigned to score anyone
              setState((prev) => ({
                ...prev,
                isLoading: false,
                fetchError: 'You are not assigned to score any players in this round',
                scoringPairsEnabled: true,
                playersToScore: [],
              }));
              return;
            }
          } catch (scoringPairsError) {
            console.error('[useRoundData] Failed to fetch scoring pairs:', scoringPairsError);
            // Continue with all players if scoring pairs fetch fails
            playersForScorecard = players;
          }
        }
      }

      // Get holes from course or use defaults
      const holes: Hole[] = roundData?.courses?.holes || DEFAULT_HOLES;
      const gameType = roundData?.game_type || 'stableford';

      console.log('[useRoundData] Loaded', playersForScorecard.length, 'players and', holes.length, 'holes');

      // Determine which players to initialize scorecards for
      let playersToInitialize = playersForScorecard;

      // For team rounds with scoring pairs, ensure we initialize scorecards
      // for team members that are in the user's scoring pairs
      if (roundIsTeamRound && fetchedTeams.length > 0 && scoringPairsEnabled) {
        const allowedPlayerIds = new Set(playersForScorecard.map((p) => p.id));
        const teamMemberPlayers: Player[] = [];
        const seenIds = new Set<string>();

        fetchedTeams.forEach((team) => {
          (team.members || []).forEach((member) => {
            // Only include team members that are in the user's scoring pairs
            if (member.player && allowedPlayerIds.has(member.player_id) && !seenIds.has(member.player_id)) {
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
          console.log('[useRoundData] Team round with scoring pairs - initializing', teamMemberPlayers.length, 'team member scorecards');
          playersToInitialize = teamMemberPlayers;
        }
      }

      // Initialize round with appropriate players
      await initializeRound(roundId, playersToInitialize, holes, gameType);

      setState({
        courseName: roundData?.courses?.name || null,
        isTeamRound: roundIsTeamRound,
        teamFormat: roundTeamFormat,
        teams: fetchedTeams,
        fetchError: null,
        isLoading: false,
        scoringPairsEnabled,
        playersToScore: playersToScoreList,
      });
    } catch (error) {
      console.error('[useRoundData] Error initializing:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        fetchError: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  }, [
    roundId,
    competitionId,
    currentUserId,
    isInitialized,
    currentPlayers.length,
    currentRoundId,
    loadFromOffline,
    initializeRound,
    resetRound,
  ]);

  // Fetch data on mount
  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  const retryFetch = useCallback(() => {
    setState((prev) => ({ ...prev, fetchError: null }));
    fetchRoundData();
  }, [fetchRoundData]);

  return {
    ...state,
    retryFetch,
  };
}
