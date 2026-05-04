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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { getOfflinePlayersForRound } from '@/store/initializeRoundSlice';
import { supabase } from '@/services/supabase/client';
import { saveScorecard } from '@/services/offline/database';
import { roundDataLogger } from '@/utils/debugLogger';
import { pushDiagnostic } from '@/services/diagnostics';
import { getDisplayName } from '@/utils/displayHelpers';
import type { Player, Scorecard, TeamWithMembers } from '@/types';
import type { HoleScore } from '@/types/database/base';
import type { TeamFormat, GameType } from '@/types/database.types';
import type { RoundFormat } from '@/types/database/enums';
import type { BallCount } from '@/types/multiball.types';
import { useRoundMetadata } from './useRoundMetadata';
import { useRoundPlayers } from './useRoundPlayers';
import { useRoundCourse } from './useRoundCourse';
import { useRoundTeams } from './useRoundTeams';
import { useRoundScoringPairs } from './useRoundScoringPairs';
import type { TeeBox } from '@/types';

interface RoundDataState {
  courseName: string | null;
  /** Club (venue) the course belongs to, when known. */
  clubName: string | null;
  courseId: string | null;
  courseTees: TeeBox[];
  selectedTee: string | null;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  /** Round-level aggregation: 'split' surfaces sub-matches; 'combined' is one team match. */
  roundFormat: RoundFormat;
  gameType: GameType;
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
    clubName: null,
    courseId: null,
    courseTees: [],
    selectedTee: null,
    isTeamRound: false,
    teamFormat: null,
    roundFormat: 'combined',
    gameType: 'stableford',
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
    holes: storeHoles,
    isInitialized,
    loadFromOffline,
    initializeRound,
    ensureTeamMemberScorecards,
    resetRound,
    updateHoles,
    setAllowedPlayers,
  } = useScorecardStore();

  // Track if we've already updated the round status to avoid duplicate calls
  const statusUpdatedRef = useRef<string | null>(null);

  // Track if we've already hydrated from Supabase for this round
  const hydratedRoundRef = useRef<string | null>(null);

  // Use focused hooks
  const metadata = useRoundMetadata(roundId);
  const playersHook = useRoundPlayers(roundId, competitionId);
  const courseHook = useRoundCourse(roundId);
  const teamsHook = useRoundTeams(
    competitionId,
    metadata.data?.isTeamRound ?? false,
    roundId
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
    pushDiagnostic('round_data.initialize_called', {
      roundId,
      competitionId,
      isInitialized,
      currentRoundId,
      currentPlayersCount: currentPlayers.length,
    });

    // Skip full initialization if store is already initialized with THIS SPECIFIC round
    if (isInitialized && currentPlayers.length > 0 && currentRoundId === roundId) {
      roundDataLogger.info('Store already initialized for this round, using hook data');
      pushDiagnostic('round_data.already_initialized', { roundId });
      return;
    }

    // If store has data from a DIFFERENT round, reset it first
    if (isInitialized && currentRoundId && currentRoundId !== roundId) {
      roundDataLogger.info('Resetting store - different round', {
        from: currentRoundId?.substring(0, 8),
        to: roundId?.substring(0, 8),
      });
      pushDiagnostic('round_data.reset_different_round', {
        from: currentRoundId,
        to: roundId,
      });
      resetRound();
    }

    // Try to load from offline first
    roundDataLogger.debug('Attempting to load from offline storage');
    pushDiagnostic('round_data.attempting_offline_load', { roundId });
    const loaded = await loadFromOffline(roundId);

    if (loaded) {
      roundDataLogger.info('Loaded from offline successfully');
      pushDiagnostic('round_data.offline_load_success', { roundId });
      return;
    }
    pushDiagnostic('round_data.offline_load_failed_or_empty', {
      roundId,
      metadataLoading: metadata.isLoading,
      playersLoading: playersHook.isLoading,
      courseLoading: courseHook.isLoading,
      metadataError: metadata.error,
      playersError: playersHook.error,
      courseError: courseHook.error,
    });

    // Wait for hooks to load data
    if (metadata.isLoading || playersHook.isLoading || courseHook.isLoading) {
      pushDiagnostic('round_data.waiting_for_hooks', {
        metadataLoading: metadata.isLoading,
        playersLoading: playersHook.isLoading,
        courseLoading: courseHook.isLoading,
      });
      return;
    }

    // Check for errors
    if (metadata.error || playersHook.error || courseHook.error) {
      pushDiagnostic('round_data.hook_errors', {
        metadataError: metadata.error,
        playersError: playersHook.error,
        courseError: courseHook.error,
      }, 'error');
      return;
    }

    // Need players and course data to initialize
    let players = playersHook.players;
    const holes = courseHook.holes;
    const gameType = metadata.data?.gameType || 'stableford';

    pushDiagnostic('round_data.proceeding_post_loading', {
      networkPlayerCount: players.length,
      holeCount: holes.length,
      gameType,
      isTeamRound: metadata.data?.isTeamRound ?? false,
      scoringPairsEnabled: scoringPairsHook.scoringPairsEnabled,
      teamCount: teamsHook.teams.length,
    });

    // Recovery fallback: when the network player query returns 0 but local
    // SQLite has scorecards from a prior successful init, derive the player
    // list from those cached scorecards. This unsticks resumed rounds where
    // round_players is missing or RLS-filtered on the server but the client
    // still has everything it needs to render and score offline.
    if (players.length === 0) {
      pushDiagnostic('round_data.network_players_empty', { roundId });
      const cachedPlayers = await getOfflinePlayersForRound(roundId);
      pushDiagnostic('round_data.cached_player_fallback', {
        cachedPlayerCount: cachedPlayers.length,
      });
      if (cachedPlayers.length === 0) {
        roundDataLogger.warn('No players found (network and cache both empty)');
        pushDiagnostic('round_data.no_players_anywhere', { roundId }, 'error');
        return;
      }
      players = cachedPlayers;
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
              name: getDisplayName(member.player.name, 'Unknown'),
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
        pushDiagnostic('round_data.scoring_pairs_no_match', {
          roundId,
          playersToScoreCount: scoringPairsHook.playersToScore.length,
        }, 'error');
        return;
      }
    }

    // Initialize round with appropriate players
    roundDataLogger.info('Initializing round', {
      roundId: roundId?.substring(0, 8),
      playerCount: playersToInitialize.length,
      holeCount: holes.length,
      gameType,
      hasTeeData: !!metadata.data?.selectedTeeData,
    });
    pushDiagnostic('round_data.calling_initialize_round', {
      roundId,
      playerCount: playersToInitialize.length,
      holeCount: holes.length,
      gameType,
    });
    await initializeRound(
      roundId,
      playersToInitialize,
      holes,
      gameType as GameType,
      false, // isStandalone
      [], // allowedPlayerIds
      metadata.data?.selectedTeeData ?? null, // selectedTeeData for daily handicap
      metadata.data?.handicapSource ?? 'profile', // handicapSource
      metadata.data?.playerTeeMap ?? new Map(), // per-player tee overrides
      metadata.data?.nineType ?? 'full', // nine_type — slice filters holes accordingly
    );
    pushDiagnostic('round_data.initialize_round_returned', { roundId });
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

  // Init failsafe: if `isInitialized` hasn't flipped within 20 seconds we're
  // either stuck on a hung query or silently bailing on a server data gap
  // (e.g. round_players empty, scoring pairs misconfigured). Surface a real
  // error so the user can back out and retry instead of staring at the
  // spinner forever. Triggered once per roundId.
  const initFailsafeFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!roundId) return;
    if (initFailsafeFiredRef.current === roundId) return;
    if (isInitialized && currentRoundId === roundId) return;

    const timer = setTimeout(() => {
      // Read latest store state to avoid a stale closure deciding to fire.
      const latest = useScorecardStore.getState();
      if (latest.isInitialized && latest.currentRoundId === roundId) return;
      if (initFailsafeFiredRef.current === roundId) return;
      initFailsafeFiredRef.current = roundId;
      pushDiagnostic('round_data.init_failsafe_fired', {
        roundId,
        latestInitialized: latest.isInitialized,
        latestRoundId: latest.currentRoundId,
      }, 'error');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        fetchError:
          prev.fetchError ??
          "Couldn't load this round. The round may be missing data on the server, or your connection may be unstable. Try going back and reopening it.",
      }));
    }, 20_000);

    return () => clearTimeout(timer);
  }, [roundId, isInitialized, currentRoundId]);

  // Sync the store's allowedPlayerIds to the user's scoring-pair scope.
  // Without this, completion checks (isHoleComplete, validateScores) iterate
  // every player in currentPlayers — which on team rounds with pairs is the
  // whole team, not just self+partner — and falsely flag the partner pairs'
  // unscored holes as missing on submit.
  useEffect(() => {
    if (!isInitialized || currentRoundId !== roundId) return;

    if (
      scoringPairsHook.scoringPairsEnabled &&
      scoringPairsHook.playersToScore.length > 0
    ) {
      setAllowedPlayers(scoringPairsHook.playersToScore.map((p) => p.id));
    } else {
      setAllowedPlayers([]);
    }
  }, [
    isInitialized,
    currentRoundId,
    roundId,
    scoringPairsHook.scoringPairsEnabled,
    scoringPairsHook.playersToScore,
    setAllowedPlayers,
  ]);

  // Idempotent backfill: ensure every current team member has a scorecard,
  // even if they were added to the team after the round was first opened
  // for scoring. Without this, a late-added player has no scorecard row,
  // is missing from the round leaderboard's team member list, and can't
  // be picked as the team's contributing scorer.
  useEffect(() => {
    if (
      !isInitialized ||
      currentRoundId !== roundId ||
      !metadata.data?.isTeamRound ||
      teamsHook.teams.length === 0
    ) {
      return;
    }

    const seen = new Set<string>();
    const teamMemberPlayers: Player[] = [];
    teamsHook.teams.forEach((team) => {
      (team.members || []).forEach((member) => {
        if (member.player && !seen.has(member.player_id)) {
          seen.add(member.player_id);
          teamMemberPlayers.push({
            id: member.player.id,
            name: getDisplayName(member.player.name, 'Unknown'),
            email: member.player.email || '',
            phone: member.player.phone ?? undefined,
            handicap: member.player.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });
    });

    if (teamMemberPlayers.length === 0) return;

    // Fire-and-forget: ensureTeamMemberScorecards is idempotent and
    // exits early when nothing's missing. Errors are logged inside.
    void ensureTeamMemberScorecards(teamMemberPlayers);
  }, [
    isInitialized,
    currentRoundId,
    roundId,
    metadata.data?.isTeamRound,
    teamsHook.teams,
    ensureTeamMemberScorecards,
  ]);

  // Update store holes when fresh course data has yardages that the cached data is missing
  // This handles the case where offline data was loaded but lacks yardages from the tees table
  useEffect(() => {
    if (!isInitialized || courseHook.isLoading || !courseHook.holes.length) {
      return;
    }

    // Check if fresh data has yardages
    const freshHasYardages = courseHook.holes.some(
      (h) => h.yardages && Object.keys(h.yardages).length > 0
    );

    // Check if store data is missing yardages
    const storeNeedsYardages = storeHoles.length > 0 && !storeHoles.some(
      (h) => h.yardages && Object.keys(h.yardages).length > 1 // More than just a placeholder
    );

    if (freshHasYardages && storeNeedsYardages) {
      roundDataLogger.info('Updating store holes with fresh yardage data', {
        freshYardageKeys: courseHook.holes[0]?.yardages ? Object.keys(courseHook.holes[0].yardages) : [],
        storeYardageKeys: storeHoles[0]?.yardages ? Object.keys(storeHoles[0].yardages) : [],
      });
      updateHoles(courseHook.holes);
    }
  }, [isInitialized, courseHook.isLoading, courseHook.holes, storeHoles, updateHoles]);

  // Hydrate store from Supabase: merge any completed scorecards (e.g. from QuickScore)
  // that exist in Supabase but not in the local SQLite store
  useEffect(() => {
    const hydrateFromSupabase = async () => {
      if (!isInitialized || !roundId || hydratedRoundRef.current === roundId) {
        return;
      }

      hydratedRoundRef.current = roundId;

      try {
        // Fetch scorecards from Supabase for this round
        interface RemoteScorecard {
          player_id: string;
          scores: Record<string, { strokes?: number }> | null;
          total_gross: number | null;
          total_net: number | null;
          total_points: number | null;
          status: string;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
        const { data: remoteScorecards, error } = await (supabase.from('scorecards') as any)
          .select('player_id, scores, total_gross, total_net, total_points, status')
          .eq('round_id', roundId)
          .eq('status', 'completed') as { data: RemoteScorecard[] | null; error: { message: string } | null };

        if (error || !remoteScorecards?.length) return;

        const { groupScorecards } = useScorecardStore.getState();
        let merged = false;

        for (const remote of remoteScorecards) {
          const localScorecard = groupScorecards.get(remote.player_id);
          if (!localScorecard) continue;

          // Only merge if the local scorecard has no scores entered
          const localHasScores = Object.keys(localScorecard.scores).length > 0 &&
            Object.values(localScorecard.scores).some(
              (s) => s && ('strokes' in s ? s.strokes !== undefined : true)
            );
          if (localHasScores) continue;

          const remoteScores = remote.scores;
          if (!remoteScores || Object.keys(remoteScores).length === 0) continue;

          // Convert string-keyed Supabase scores to number-keyed store format
          const convertedScores: { [holeNumber: number]: HoleScore } = {};
          for (const [holeStr, scoreData] of Object.entries(remoteScores)) {
            const holeNum = parseInt(holeStr, 10);
            if (!isNaN(holeNum) && scoreData?.strokes != null) {
              convertedScores[holeNum] = { ...scoreData, strokes: scoreData.strokes! } as HoleScore;
            }
          }

          if (Object.keys(convertedScores).length === 0) continue;

          // Update the local scorecard with remote data
          const updatedScorecard: Scorecard = {
            ...localScorecard,
            scores: convertedScores,
            totalGross: remote.total_gross ?? 0,
            totalNet: remote.total_net ?? 0,
            status: 'completed',
            updatedAt: new Date(),
          };

          groupScorecards.set(remote.player_id, updatedScorecard);
          merged = true;

          // Persist to SQLite so future offline loads pick it up
          try {
            await saveScorecard(updatedScorecard);
          } catch {
            // Non-critical: store is already updated
          }

          roundDataLogger.info('Hydrated scorecard from Supabase', {
            playerId: remote.player_id.substring(0, 8),
            holesHydrated: Object.keys(convertedScores).length,
          });
        }

        if (merged) {
          // Trigger store update so UI re-renders with hydrated data
          useScorecardStore.setState({ groupScorecards: new Map(groupScorecards) });
        }
      } catch (err) {
        roundDataLogger.warn('Failed to hydrate from Supabase', { error: err });
      }
    };

    hydrateFromSupabase();
  }, [isInitialized, roundId]);

  // Update round status to 'in-progress' when scoring begins
  // This runs separately from initialization to ensure it happens even if
  // the round was already initialized or loaded from offline
  useEffect(() => {
    const updateRoundStatus = async () => {
      // Only update if:
      // 1. Round ID exists
      // 2. Metadata is loaded
      // 3. Current status is 'upcoming'
      // 4. We haven't already updated this round's status
      if (
        !roundId ||
        metadata.isLoading ||
        metadata.data?.roundStatus !== 'upcoming' ||
        statusUpdatedRef.current === roundId
      ) {
        return;
      }

      statusUpdatedRef.current = roundId;
      roundDataLogger.info('Updating round status to in-progress', {
        roundId: roundId?.substring(0, 8),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error: statusError } = await (supabase.from('rounds') as any)
        .update({ status: 'in-progress' })
        .eq('id', roundId);

      if (statusError) {
        roundDataLogger.error('Failed to update round status', statusError, {
          roundId: roundId?.substring(0, 8),
        });
        // Reset ref so we can retry
        statusUpdatedRef.current = null;
      } else {
        roundDataLogger.info('Round status updated successfully');
        // Refetch metadata to get updated status
        metadata.refetch();
      }
    };

    updateRoundStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- individual metadata properties are listed; adding the object would cause infinite loops
  }, [roundId, metadata.isLoading, metadata.data?.roundStatus, metadata.refetch]);

  // Update state from focused hooks
  useEffect(() => {
    const isLoading =
      metadata.isLoading ||
      playersHook.isLoading ||
      courseHook.isLoading ||
      teamsHook.isLoading ||
      scoringPairsHook.isLoading;

    // Don't surface hook errors as fetchError if the store is already initialized
    // from offline data — the hooks fail when offline but the round is still usable
    const fetchError = (isInitialized && currentRoundId === roundId)
      ? null
      : (metadata.error ||
         playersHook.error ||
         courseHook.error ||
         teamsHook.error ||
         scoringPairsHook.error);

    // Determine if this is a solo round
    const playerCount = currentPlayers.length || playersHook.players.length;
    const isTeamRound = metadata.data?.isTeamRound ?? false;
    const isSoloRound = playerCount === 1 && !isTeamRound;

    // Determine teams to use
    let teams: TeamWithMembers[] = teamsHook.teams;

    // For standalone team rounds (scramble, shamble, best-ball), create teams from team_config or create implicit team
    const isStandaloneRound = competitionId === 'standalone' || !competitionId;
    const teamFormats = ['scramble', 'shamble', 'best-ball'];
    const isTeamFormatRound = teamFormats.includes(metadata.data?.teamFormat || '') ||
                              teamFormats.includes(metadata.data?.gameType || '');

    if (isStandaloneRound && isTeamRound && isTeamFormatRound && teams.length === 0) {
      const players = currentPlayers.length > 0 ? currentPlayers : playersHook.players;
      const teamConfig = metadata.data?.teamConfig;

      // Helper to convert Player to DBPlayer format for team members
      const playerToDBPlayer = (p: Player): import('@/types/database.types').Player => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: p.phone ?? null,
        handicap: p.handicap ?? null,
        gender: null,
        photo_url: null,
        golf_id: null,
        handicap_updated_at: null,
        handicap_index: null,
        handicap_index_updated_at: null,
        home_club_id: null,
        is_placeholder: false,
        created_by: null,
        linked_player_id: null,
        push_enabled: false,
        push_competition_updates: false,
        push_friend_requests: false,
        push_scorecard_updates: false,
        push_league_updates: false,
        equipped_badge_id: null,
        equipped_frame_id: null,
        equipped_title_id: null,
        created_at: '',
        updated_at: '',
      });

      if (teamConfig?.teams && teamConfig.teams.length > 0) {
        // Use team_config from database (user split into teams)
        roundDataLogger.info('Creating teams from team_config', {
          teamCount: teamConfig.teams.length,
          teamFormat: metadata.data?.teamFormat,
        });
        teams = teamConfig.teams.map((t) => ({
          id: t.id,
          competition_id: '',
          name: t.name,
          color: null,
          created_at: '',
          updated_at: '',
          members: t.memberIds.map((memberId) => {
            const player = players.find((p) => p.id === memberId);
            return {
              team_id: t.id,
              player_id: memberId,
              joined_at: '',
              player: player ? playerToDBPlayer(player) : undefined,
            };
          }),
        }));
      } else if (players.length > 0) {
        // Create implicit single team with all players (default team format behavior)
        roundDataLogger.info('Creating implicit single team for team format', {
          playerCount: players.length,
          teamFormat: metadata.data?.teamFormat,
        });
        teams = [{
          id: 'implicit-team-1',
          competition_id: '',
          name: 'Team',
          color: null,
          created_at: '',
          updated_at: '',
          members: players.map((p) => ({
            team_id: 'implicit-team-1',
            player_id: p.id,
            joined_at: '',
            player: playerToDBPlayer(p),
          })),
        }];
      }
    }

    setState({
      courseName: metadata.data?.courseName || courseHook.course?.name || null,
      clubName: metadata.data?.clubName || null,
      courseId: metadata.data?.courseId || courseHook.course?.id || null,
      courseTees: metadata.data?.courseTees || courseHook.course?.tees || [],
      selectedTee: metadata.data?.selectedTee || null,
      isTeamRound,
      teamFormat: metadata.data?.teamFormat || null,
      roundFormat: metadata.data?.roundFormat || 'combined',
      gameType: (metadata.data?.gameType as GameType) || 'stableford',
      teams,
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
    currentPlayers,
    competitionId,
    isInitialized,
    currentRoundId,
    roundId,
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
