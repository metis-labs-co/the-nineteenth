/**
 * initializeRoundSlice - Round initialization and offline loading for scorecardStore
 */

import { Scorecard, Player, Hole, GameType, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import { isSingleBallScore } from '@/types/database/base';
import {
  saveScorecard,
  getScorecardsByRound,
  saveHoles,
  getHoles,
} from '@/services/offline/database';
import { supabase } from '@/services/supabase/client';
import { storeLogger } from '@/utils/debugLogger';
import { isValidUUID } from './utils/scorecardCalculations';

type SetFn = (partial: Record<string, unknown>) => void;

export async function initializeRound(
  set: SetFn,
  initSyncListener: () => void,
  roundId: string,
  players: Player[],
  holes: Hole[],
  gameType: GameType = 'stableford',
  isStandalone = false,
  allowedPlayerIds: string[] = [],
  selectedTeeData: TeeBox | null = null,
  handicapSource: HandicapSource = 'profile',
  playerTeeMap: Map<string, TeeBox> = new Map(),
  nineType: NineType = 'full',
): Promise<void> {
  storeLogger.info('Initializing round', {
    roundId,
    playerCount: players.length,
    holeCount: holes.length,
    gameType,
    isStandalone,
    allowedPlayerCount: allowedPlayerIds.length,
    hasTeeData: !!selectedTeeData,
  });
  set({ isLoading: true, selectedTeeData });
  initSyncListener();

  try {
    storeLogger.debug('Saving holes to SQLite', { roundId, holeCount: holes.length });
    await saveHoles(roundId, holes);

    const newScorecards = new Map<string, Scorecard>();

    for (const player of players) {
      const scorecard: Scorecard = {
        id: `scorecard-${roundId}-${player.id}`,
        roundId,
        playerId: player.id,
        player,
        scores: {},
        totalGross: 0,
        totalNet: 0,
        status: 'in-progress',
        createdAt: new Date(),
        updatedAt: new Date(),
        isStandalone,
      };

      newScorecards.set(player.id, scorecard);

      storeLogger.debug('Saving scorecard to SQLite', {
        scorecardId: scorecard.id,
        playerId: player.id,
        playerName: player.name,
      });
      await saveScorecard(scorecard);
    }

    set({
      currentRoundId: roundId,
      currentPlayers: players,
      currentHole: 1,
      holes,
      gameType,
      handicapSource,
      groupScorecards: newScorecards,
      allowedPlayerIds,
      playerTeeMap,
      nineType,
      isLoading: false,
      isInitialized: true,
    });

    storeLogger.info('Round initialized successfully', {
      roundId,
      scorecardCount: newScorecards.size,
      allowedPlayers: allowedPlayerIds.length > 0 ? allowedPlayerIds.length : 'all',
    });
  } catch (error) {
    storeLogger.error('Failed to initialize round', error, { roundId });
    set({ isLoading: false });
    throw error;
  }
}

export async function loadFromOffline(
  set: SetFn,
  initSyncListener: () => void,
  roundId: string,
): Promise<boolean> {
  storeLogger.info('Loading round from offline storage', { roundId });
  set({ isLoading: true });
  initSyncListener();

  try {
    const scorecards = await getScorecardsByRound(roundId);
    storeLogger.debug('Loaded scorecards from SQLite', {
      roundId,
      scorecardCount: scorecards.length,
    });

    if (scorecards.length === 0) {
      storeLogger.info('No cached scorecards found', { roundId });
      set({ isLoading: false });
      return false;
    }

    const hasInvalidData = scorecards.some(
      (sc) => !isValidUUID(sc.playerId) || !isValidUUID(sc.roundId)
    );

    if (hasInvalidData) {
      storeLogger.warn('Cached data has invalid UUIDs (mock data), ignoring', { roundId });
      set({ isLoading: false });
      return false;
    }

    const holes = await getHoles(roundId);
    storeLogger.debug('Loaded holes from SQLite', { roundId, holeCount: holes.length });

    if (holes.length === 0) {
      storeLogger.warn('No cached holes found, will fetch from network', { roundId });
      set({ isLoading: false });
      return false;
    }

    const newScorecards = new Map<string, Scorecard>();
    const players: Player[] = [];

    for (const scorecard of scorecards) {
      newScorecards.set(scorecard.playerId, scorecard);
      if (scorecard.player) {
        players.push(scorecard.player);
      }
    }

    const holeNumbers = holes.map((h: any) => h.number ?? h.hole_number);
    let currentHole = holeNumbers[0] ?? 1;
    for (const h of holeNumbers) {
      const allComplete = players.every((player) => {
        const sc = newScorecards.get(player.id);
        const score = sc?.scores[h];
        return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
      });
      if (!allComplete) {
        currentHole = h;
        break;
      }
      if (h === holeNumbers[holeNumbers.length - 1]) {
        currentHole = h;
      }
    }

    // Restore tee + game context from persisted scorecard metadata +
    // a lightweight query to the rounds table. Without this, a mid-round
    // resume after an app kill would submit with teeData=null, causing
    // sync to skip the handicap snapshot (see calculateHandicapData).
    //
    // Strategy:
    //  1. Use the first scorecard's persisted teeData as the default
    //     selectedTeeData and build playerTeeMap from each scorecard.
    //  2. Fall back to rounds.selected_tee from Supabase if scorecards
    //     have no teeData yet (e.g. round was created but not submitted
    //     before the app was killed).
    //  3. Pull game_type / handicap_source / nine_type from the rounds
    //     row so stableford/par/stroke scoring uses the right calc.
    //
    // All supabase reads live behind a try/catch so offline-first
    // behaviour still works when there's no network — we just fall
    // back to sensible defaults.
    let selectedTeeData: TeeBox | null = null;
    const playerTeeMap = new Map<string, TeeBox>();
    for (const sc of scorecards) {
      if (sc.teeData) {
        playerTeeMap.set(sc.playerId, sc.teeData);
        if (!selectedTeeData) selectedTeeData = sc.teeData;
      }
    }

    let gameType: GameType = 'stableford';
    let handicapSource: HandicapSource = 'profile';
    let nineType: NineType = 'full';

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed query workaround
      const { data: roundData } = await (supabase.from('rounds') as any)
        .select('game_type, handicap_source, nine_type, selected_tee')
        .eq('id', roundId)
        .maybeSingle();

      if (roundData) {
        if (roundData.game_type) gameType = roundData.game_type as GameType;
        if (roundData.handicap_source) handicapSource = roundData.handicap_source as HandicapSource;
        if (roundData.nine_type) nineType = roundData.nine_type as NineType;
        // If no scorecard had persisted teeData, fall back to the round's default
        if (!selectedTeeData && roundData.selected_tee) {
          selectedTeeData = roundData.selected_tee as TeeBox;
        }
      }
    } catch (err) {
      storeLogger.warn('Could not fetch round metadata during offline load — using defaults', {
        roundId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    set({
      currentRoundId: roundId,
      currentPlayers: players,
      currentHole,
      holes,
      groupScorecards: newScorecards,
      selectedTeeData,
      playerTeeMap,
      gameType,
      handicapSource,
      nineType,
      isLoading: false,
      isInitialized: true,
    });

    storeLogger.info('Loaded from offline successfully', {
      roundId,
      playerCount: players.length,
      resumeAtHole: currentHole,
      hasTeeData: !!selectedTeeData,
      gameType,
      nineType,
    });
    return true;
  } catch (error) {
    storeLogger.error('Failed to load from offline', error, { roundId });
    set({ isLoading: false });
    return false;
  }
}
