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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { supabase } from '@/services/supabase/client';
import { saveScorecard } from '@/services/offline/database';
import { roundDataLogger } from '@/utils/debugLogger';
import { getDisplayName } from '@/utils/displayHelpers';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import { useRoundDetails, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useRoundCourse } from './useRoundCourse';
import type { Player, Scorecard, Hole, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { HoleScore } from '@/types/database/base';
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
  /** Course id (for distance-to-pin / map sheet). */
  courseId: string | null;
  /** Course name */
  courseName: string | null;
  /** Club (venue) name, when known. */
  clubName: string | null;
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
    holes: storeHoles,
    nineType: storeNineType,
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

  // The round's nine_type from the server (null until metadata resolves).
  // Match play rounds can be front9/back9; using the raw 18-hole course
  // array without this filter was the cause of 9-hole rounds resuming as
  // 18-hole matches with a permanently-blocked submit gate.
  const roundNineType: NineType | null =
    (roundData?.nine_type as NineType | undefined) ?? null;

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

  // One-shot guard so a nine_type divergence only triggers a single reset
  // per (round, nine_type) — prevents reset loops if re-init fails.
  const nineTypeResetRef = useRef<string | null>(null);

  // Initialize the scorecard store
  const initializeMatchData = useCallback(async () => {
    roundDataLogger.info('useMatchPlayData: initializeMatchData called', {
      roundId: roundId?.substring(0, 8),
      player1Id: player1Id?.substring(0, 8),
      player2Id: player2Id?.substring(0, 8),
      isInitialized,
      currentRoundId: currentRoundId?.substring(0, 8),
      currentPlayersCount: currentPlayers.length,
      roundNineType,
      storeNineType,
    });

    const initializedForRound =
      isInitialized && currentPlayers.length > 0 && currentRoundId === roundId;

    // If the store's nine_type diverges from the round's (poisoned resume
    // state, or the user changed nine_type in EditNineTypeSheet), reset and
    // rebuild. loadFromOffline below re-filters holes to the round's current
    // nine_type while preserving locally-scored scorecards.
    const nineTypeDiverged =
      initializedForRound && roundNineType !== null && storeNineType !== roundNineType;

    if (initializedForRound && !nineTypeDiverged) {
      roundDataLogger.info('Store already initialized for this round');
      return;
    }

    if (nineTypeDiverged) {
      const resetKey = `${roundId}:${roundNineType}`;
      if (nineTypeResetRef.current === resetKey) {
        return; // already attempted recovery for this nine_type
      }
      nineTypeResetRef.current = resetKey;
      roundDataLogger.info('Resetting store - nine_type diverged from round', {
        roundId: roundId?.substring(0, 8),
        storeNineType,
        roundNineType,
      });
      resetRound();
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

    // Never initialize with an unknown nine_type: defaulting to 'full' here
    // would rebuild a front9/back9 round as 18 holes AND overwrite the SQLite
    // scorecards with blanks. Wait for metadata (React Query retries).
    if (roundNineType === null) {
      roundDataLogger.warn('nine_type not yet known - deferring init');
      return;
    }

    // Need hole data to initialize (filtered to the round's nine_type)
    const holes = filterHolesByNineType(courseHook.holes, roundNineType);
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

    // Initialize round with match play game type, carrying the round's real
    // config (nine_type, tee, handicap source) so a resume matches creation.
    roundDataLogger.info('Initializing match play round', {
      roundId: roundId?.substring(0, 8),
      player1: player1.name,
      player2: player2.name,
      holeCount: holes.length,
      nineType: roundNineType,
    });

    await initializeRound(
      roundId,
      matchPlayers,
      holes,
      'match-play',
      false,
      [],
      roundData?.selected_tee ?? null,
      (roundData?.handicap_source as HandicapSource | undefined) ?? 'profile',
      new Map(),
      roundNineType
    );
  }, [
    roundId,
    player1Id,
    player2Id,
    player1,
    player2,
    isInitialized,
    currentRoundId,
    currentPlayers.length,
    roundNineType,
    storeNineType,
    roundData?.selected_tee,
    roundData?.handicap_source,
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

  // Hydrate store from Supabase: merge any completed scorecards (e.g. from QuickScore)
  // that exist in Supabase but not in the local SQLite store
  const hydratedRoundRef = useRef<string | null>(null);

  useEffect(() => {
    const hydrateFromSupabase = async () => {
      if (!isInitialized || !roundId || hydratedRoundRef.current === roundId) {
        return;
      }

      hydratedRoundRef.current = roundId;

      try {
        interface RemoteScorecard {
          player_id: string;
          scores: Record<string, { strokes?: number }> | null;
          total_gross: number | null;
          total_net: number | null;
          status: string;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
        const { data: remoteScorecards, error: fetchError } = await (supabase.from('scorecards') as any)
          .select('player_id, scores, total_gross, total_net, status')
          .eq('round_id', roundId)
          .eq('status', 'completed') as { data: RemoteScorecard[] | null; error: { message: string } | null };

        if (fetchError || !remoteScorecards?.length) return;

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

          try {
            await saveScorecard(updatedScorecard);
          } catch {
            // Non-critical: store is already updated
          }

          roundDataLogger.info('Hydrated match play scorecard from Supabase', {
            playerId: remote.player_id.substring(0, 8),
            holesHydrated: Object.keys(convertedScores).length,
          });
        }

        if (merged) {
          useScorecardStore.setState({ groupScorecards: new Map(groupScorecards) });
        }
      } catch (err) {
        roundDataLogger.warn('Failed to hydrate from Supabase', { error: err });
      }
    };

    hydrateFromSupabase();
  }, [isInitialized, roundId]);

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

  // Holes for the match: the store's (already nine-filtered) holes are the
  // source of truth once initialized for this round; before that, filter the
  // raw course holes by the round's nine_type. Returning the raw 18-hole
  // array here made every completion/submit gate compare against 18 for
  // front9/back9 rounds.
  const matchHoles: Hole[] = useMemo(() => {
    if (isInitialized && currentRoundId === roundId && storeHoles.length > 0) {
      return storeHoles;
    }
    if (roundNineType !== null) {
      return filterHolesByNineType(courseHook.holes, roundNineType);
    }
    return courseHook.holes;
  }, [isInitialized, currentRoundId, roundId, storeHoles, roundNineType, courseHook.holes]);

  return {
    player1,
    player2,
    holes: matchHoles,
    courseId: roundData?.course?.id ?? courseHook.course?.id ?? null,
    courseName: roundData?.course?.name || courseHook.course?.name || null,
    clubName: roundData?.course?.club?.name || null,
    selectedTee,
    isLoading,
    error: combinedError,
    isInitialized,
    refetch,
  };
}
