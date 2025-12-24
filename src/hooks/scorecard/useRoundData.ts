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
import { roundDataLogger } from '@/utils/debugLogger';
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
    roundDataLogger.info('fetchRoundData called', {
      roundId: roundId?.substring(0, 8),
      competitionId: competitionId?.substring(0, 8),
      currentUserId: currentUserId?.substring(0, 8),
      isInitialized,
      currentRoundId: currentRoundId?.substring(0, 8),
      currentPlayersCount: currentPlayers.length,
    });

    // Skip full initialization if store is already initialized with THIS SPECIFIC round
    // But still fetch team and round metadata since it's not cached in the store
    if (isInitialized && currentPlayers.length > 0 && currentRoundId === roundId) {
      roundDataLogger.info('Store already initialized for this round, fetching metadata only');

      try {
        // Fetch round metadata (teams, team format, scoring pairs, etc.)
        const { data: roundData } = await (supabase.from('rounds') as any)
          .select(`
            id,
            game_type,
            is_team_round,
            team_format,
            scoring_pairs_required,
            courses!course_id (
              id,
              name
            )
          `)
          .eq('id', roundId)
          .single();

        const roundIsTeamRound = roundData?.is_team_round ?? false;
        const roundTeamFormat = roundData?.team_format as TeamFormat | null;
        let fetchedTeams: TeamWithMembers[] = [];

        // Fetch teams if this is a team round
        if (roundIsTeamRound) {
          const { data: teamsData } = await (supabase.from('teams') as any)
            .select(`
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
            `)
            .eq('competition_id', competitionId);

          if (teamsData) {
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
          }
        }

        // Handle scoring pairs for already-initialized rounds
        const scoringPairsRequired = roundData?.scoring_pairs_required ?? false;
        let scoringPairsEnabled = false;
        let playersToScoreList: Player[] = [];

        if (scoringPairsRequired && currentUserId) {
          const pairsExist = await hasScoringPairs(roundId);
          if (pairsExist) {
            scoringPairsEnabled = true;
            try {
              playersToScoreList = await getPlayersToScore(roundId, currentUserId);

              // For team rounds, also include the current user (you can always score yourself)
              if (roundIsTeamRound) {
                const currentUserPlayer = currentPlayers.find(p => p.id === currentUserId);
                if (currentUserPlayer && !playersToScoreList.some(p => p.id === currentUserId)) {
                  playersToScoreList = [currentUserPlayer, ...playersToScoreList];
                }
              }
            } catch (error) {
              roundDataLogger.warn('Failed to fetch scoring pairs for initialized round', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

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
        roundDataLogger.error('Failed to fetch metadata for initialized round', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
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

    setState((prev) => ({ ...prev, isLoading: true, fetchError: null }));

    // Try to load from offline first
    roundDataLogger.debug('Attempting to load from offline storage');
    const loaded = await loadFromOffline(roundId);

    if (loaded) {
      roundDataLogger.info('Loaded from offline successfully');
      // Even when loading from offline, we need to fetch team data from the server
      // because teams are not stored in the local SQLite database
      try {
        // Fetch round data to determine if this is a team round
        const { data: roundData } = await (supabase.from('rounds') as any)
          .select(`
            id,
            game_type,
            is_team_round,
            team_format,
            scoring_pairs_required,
            courses!course_id (
              id,
              name
            )
          `)
          .eq('id', roundId)
          .single();

        const roundIsTeamRound = roundData?.is_team_round ?? false;
        const roundTeamFormat = roundData?.team_format as TeamFormat | null;
        let fetchedTeams: TeamWithMembers[] = [];

        // Fetch teams if this is a team round
        if (roundIsTeamRound) {
          const { data: teamsData } = await (supabase.from('teams') as any)
            .select(`
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
            `)
            .eq('competition_id', competitionId);

          if (teamsData) {
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
            roundDataLogger.info('Loaded offline with teams', {
              teamCount: fetchedTeams.length,
              teams: fetchedTeams.map(t => ({ name: t.name, memberCount: t.members?.length || 0 })),
            });
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          courseName: roundData?.courses?.name || null,
          isTeamRound: roundIsTeamRound,
          teamFormat: roundTeamFormat,
          teams: fetchedTeams,
        }));
      } catch (error) {
        roundDataLogger.error('Failed to fetch team data for offline round', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      return;
    }

    roundDataLogger.info('No offline data found, fetching from Supabase');

    // Determine if this is a standalone round (no competition)
    const isStandaloneRound = competitionId === 'standalone' || !competitionId;

    // Fetch actual data from Supabase
    try {
      // Fetch players - different logic for standalone vs competition rounds
      let competitionPlayers: any[] = [];

      if (isStandaloneRound) {
        // For standalone rounds, fetch from round_players table
        roundDataLogger.info('Fetching players for standalone round');
        try {
          const { data: roundPlayersData, error: roundPlayersError } = await (
            supabase.from('round_players') as any
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
            .eq('round_id', roundId);

          if (roundPlayersError) {
            roundDataLogger.error('Failed to fetch round_players', roundPlayersError);
            setState((prev) => ({
              ...prev,
              isLoading: false,
              fetchError: `Failed to load players: ${roundPlayersError.message}`,
            }));
            return;
          }

          competitionPlayers = roundPlayersData || [];
          roundDataLogger.debug('Fetched standalone round players', {
            count: competitionPlayers.length,
          });
        } catch (err) {
          // round_players table might not exist - try to get player from round's user_id
          roundDataLogger.warn('round_players fetch failed, trying user lookup', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // For competition rounds, fetch from competition_players table
        const { data: compPlayers, error: playersError } = await (
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
          roundDataLogger.error('Failed to fetch players', playersError);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            fetchError: `Failed to load players: ${playersError.message}`,
          }));
          return;
        }

        competitionPlayers = compPlayers || [];
      }

      roundDataLogger.debug('Fetched players', {
        count: competitionPlayers?.length || 0,
        isStandalone: isStandaloneRound,
      });

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
        roundDataLogger.error('Failed to fetch round', roundError);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          fetchError: `Failed to load round: ${roundError.message}`,
        }));
        return;
      }

      roundDataLogger.debug('Fetched round data', {
        gameType: roundData?.game_type,
        isTeamRound: roundData?.is_team_round,
        teamFormat: roundData?.team_format,
        scoringPairsRequired: roundData?.scoring_pairs_required,
        courseName: roundData?.courses?.name,
        holesCount: roundData?.courses?.holes?.length || 'default',
      });

      // Set team round state
      const roundIsTeamRound = roundData?.is_team_round ?? false;
      const roundTeamFormat = roundData?.team_format as TeamFormat | null;
      let fetchedTeams: TeamWithMembers[] = [];

      // Fetch teams if this is a team round (and not a standalone round)
      if (roundIsTeamRound && !isStandaloneRound) {
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
          roundDataLogger.error('Failed to fetch teams', teamsError);
          // Don't fail - just continue without team data
        } else if (teamsData) {
          roundDataLogger.debug('Fetched teams from Supabase', { count: teamsData.length });
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
          roundDataLogger.info('Loaded teams', {
            teamCount: fetchedTeams.length,
            teams: fetchedTeams.map(t => ({ name: t.name, memberCount: t.members?.length || 0 })),
          });
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

      roundDataLogger.info('Transformed players', {
        count: players.length,
        players: players.map(p => ({ name: p.name, handicap: p.handicap })),
      });

      if (players.length === 0) {
        roundDataLogger.warn('No players found', { isStandalone: isStandaloneRound });
        setState((prev) => ({
          ...prev,
          isLoading: false,
          fetchError: isStandaloneRound
            ? 'No players found for this round. The round may not have been set up correctly.'
            : 'No players found for this competition. Make sure players have joined.',
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
          // Scoring pairs required but not configured - show user-friendly error
          setState((prev) => ({
            ...prev,
            isLoading: false,
            fetchError: 'Scoring pairs have not been configured for this round yet. Please ask the competition organiser to set up scoring pairs before you can enter scores.',
            scoringPairsEnabled: true,
            playersToScore: [],
          }));
          return;
        }

        scoringPairsEnabled = true;
        roundDataLogger.info('Scoring pairs required, fetching assignments');

        // If we have a current user, fetch the players they can score
        if (currentUserId) {
          try {
            playersToScoreList = await getPlayersToScore(roundId, currentUserId);

            // For team rounds, also include the current user (you can always score yourself)
            // This allows Best Ball to work properly - you see all scores but edit your own + assigned
            if (roundIsTeamRound) {
              const currentUserPlayer = players.find(p => p.id === currentUserId);
              if (currentUserPlayer && !playersToScoreList.some(p => p.id === currentUserId)) {
                playersToScoreList = [currentUserPlayer, ...playersToScoreList];
              }
            }

            roundDataLogger.info('Scoring pairs - user can score', {
              userCanScoreCount: playersToScoreList.length,
              players: playersToScoreList.map(p => p.name),
              isTeamRound: roundIsTeamRound,
              includedSelf: playersToScoreList.some(p => p.id === currentUserId),
            });

            // For team rounds, don't filter - show all players but control editability via playersToScore
            // For non-team rounds, filter to only show players user can score
            if (!roundIsTeamRound) {
              const playerIdsToScore = new Set(playersToScoreList.map((p) => p.id));
              playersForScorecard = players.filter((p) => playerIdsToScore.has(p.id));

              if (playersForScorecard.length === 0) {
                roundDataLogger.warn('User not assigned to score any players');
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
            }
          } catch (scoringPairsError) {
            roundDataLogger.error('Failed to fetch scoring pairs', scoringPairsError);
            // Continue with all players if scoring pairs fetch fails
            playersForScorecard = players;
          }
        }
      }

      // Get holes from course or use defaults (fallback if empty array)
      const courseHoles = roundData?.courses?.holes;
      const holes: Hole[] = courseHoles && courseHoles.length > 0 ? courseHoles : DEFAULT_HOLES;
      const gameType = roundData?.game_type || 'stableford';

      roundDataLogger.info('Round configuration loaded', {
        playerCount: playersForScorecard.length,
        holeCount: holes.length,
        gameType,
        isTeamRound: roundIsTeamRound,
        teamFormat: roundTeamFormat,
        teamsCount: fetchedTeams.length,
        teamMemberCounts: fetchedTeams.map(t => ({
          name: t.name,
          members: t.members?.length ?? 0
        })),
        scoringPairsRequired,
        scoringPairsEnabled,
      });

      // Determine which players to initialize scorecards for
      let playersToInitialize = playersForScorecard;

      // For team rounds, ensure we initialize scorecards for ALL team members
      // This is required because team scoring components need to read/write scores for all members
      if (roundIsTeamRound && fetchedTeams.length > 0) {
        const teamMemberPlayers: Player[] = [];
        const seenIds = new Set<string>();

        fetchedTeams.forEach((team) => {
          (team.members || []).forEach((member) => {
            // Include ALL team members - scorecards are needed for team scoring to work
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
            players: teamMemberPlayers.map(p => p.name),
          });
          playersToInitialize = teamMemberPlayers;
        }
      }

      // Initialize round with appropriate players
      roundDataLogger.info('Initializing round', {
        roundId: roundId?.substring(0, 8),
        playerCount: playersToInitialize.length,
        holeCount: holes.length,
        gameType,
      });
      await initializeRound(roundId, playersToInitialize, holes, gameType);

      roundDataLogger.info('Round initialization complete', {
        courseName: roundData?.courses?.name || 'Unknown',
        isTeamRound: roundIsTeamRound,
        teamFormat: roundTeamFormat,
        scoringPairsEnabled,
        playersToScoreCount: playersToScoreList.length,
      });

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
      roundDataLogger.error('Error initializing round data', error);
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
