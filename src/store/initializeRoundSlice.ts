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

    set({
      currentRoundId: roundId,
      currentPlayers: players,
      currentHole,
      holes,
      groupScorecards: newScorecards,
      isLoading: false,
      isInitialized: true,
    });

    storeLogger.info('Loaded from offline successfully', {
      roundId,
      playerCount: players.length,
      resumeAtHole: currentHole,
    });
    return true;
  } catch (error) {
    storeLogger.error('Failed to load from offline', error, { roundId });
    set({ isLoading: false });
    return false;
  }
}
