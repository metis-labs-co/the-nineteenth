/**
 * Scorecard Store - Zustand state management with offline support
 *
 * Manages the current scoring session including:
 * - Current hole being scored
 * - All player scorecards in the group
 * - Auto-save to SQLite for offline support
 * - Sync status tracking
 */

import { create } from 'zustand';
import { Scorecard, HoleScore, Player, Hole, GameType } from '@/types';
import {
  saveScorecard,
  saveHoleScore,
  getScorecardsByRound,
  saveHoles,
  getHoles,
} from '@/services/offline/database';
import { queueScorecardSync, subscribeSyncState, getSyncState, getIsOnline } from '@/services/offline/sync';
import { calculateStablefordPoints, calculateNetScore, getStrokesOnHole } from '@/utils/scoring';
import { storeLogger, logScorecardSummary } from '@/utils/debugLogger';

interface ScorecardState {
  // Current round data
  currentRoundId: string | null;
  currentPlayers: Player[];
  currentHole: number;
  holes: Hole[];
  gameType: GameType;

  // All scorecards for current group (playerId -> Scorecard)
  groupScorecards: Map<string, Scorecard>;

  // Player validation - if non-empty, only these players can have scores updated
  allowedPlayerIds: string[];

  // Sync status
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  syncError: string | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initializeRound: (
    roundId: string,
    players: Player[],
    holes: Hole[],
    gameType?: GameType,
    isStandalone?: boolean,
    allowedPlayerIds?: string[]
  ) => Promise<void>;
  setAllowedPlayers: (playerIds: string[]) => void;
  loadFromOffline: (roundId: string) => Promise<boolean>;
  setCurrentHole: (hole: number) => void;
  setPlayerScore: (playerId: string, hole: number, strokes: number) => Promise<void>;
  updatePlayerHoleScore: (playerId: string, hole: number, updates: Partial<HoleScore>) => Promise<void>;
  getPlayerScore: (playerId: string, hole: number) => HoleScore | undefined;
  getPlayerTotals: (playerId: string) => { gross: number; net: number; points: number };
  getHoleInfo: (holeNumber: number) => Hole | undefined;
  isHoleComplete: (hole: number) => boolean;
  getCompletedHolesCount: () => number;
  submitScorecards: () => Promise<void>;
  resetRound: () => void;
}

export const useScorecardStore = create<ScorecardState>((set, get) => {
  // Subscribe to sync state changes
  let unsubscribe: (() => void) | null = null;

  const initSyncListener = () => {
    if (unsubscribe) return;

    unsubscribe = subscribeSyncState((syncState) => {
      set({
        isOnline: getIsOnline(),
        isSyncing: syncState.status === 'syncing',
        pendingSyncCount: syncState.pendingCount,
        syncError: syncState.error,
      });
    });
  };

  return {
    // Initial state
    currentRoundId: null,
    currentPlayers: [],
    currentHole: 1,
    holes: [],
    gameType: 'stableford',
    groupScorecards: new Map(),
    allowedPlayerIds: [], // Empty = all players allowed
    isOnline: true,
    isSyncing: false,
    pendingSyncCount: 0,
    syncError: null,
    isLoading: false,
    isInitialized: false,

    initializeRound: async (roundId, players, holes, gameType = 'stableford', isStandalone = false, allowedPlayerIds = []) => {
      storeLogger.info('Initializing round', {
        roundId,
        playerCount: players.length,
        holeCount: holes.length,
        gameType,
        isStandalone,
        allowedPlayerCount: allowedPlayerIds.length,
      });
      set({ isLoading: true });
      initSyncListener();

      try {
        // Save holes to SQLite for offline access
        storeLogger.debug('Saving holes to SQLite', { roundId, holeCount: holes.length });
        await saveHoles(roundId, holes);

        // Create scorecards for each player
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

          // Save to SQLite
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
          groupScorecards: newScorecards,
          allowedPlayerIds,
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
    },

    loadFromOffline: async (roundId) => {
      storeLogger.info('Loading round from offline storage', { roundId });
      set({ isLoading: true });
      initSyncListener();

      // Helper to validate UUID format
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      try {
        // Load scorecards from SQLite
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

        // Validate that the data has valid UUIDs (not mock data)
        // Check if any player ID is not a valid UUID - if so, reject cached data
        const hasInvalidData = scorecards.some(
          (sc) => !isValidUUID(sc.playerId) || !isValidUUID(sc.roundId)
        );

        if (hasInvalidData) {
          storeLogger.warn('Cached data has invalid UUIDs (mock data), ignoring', { roundId });
          set({ isLoading: false });
          return false;
        }

        // Load holes
        const holes = await getHoles(roundId);
        storeLogger.debug('Loaded holes from SQLite', { roundId, holeCount: holes.length });

        // Convert to Map
        const newScorecards = new Map<string, Scorecard>();
        const players: Player[] = [];

        for (const scorecard of scorecards) {
          newScorecards.set(scorecard.playerId, scorecard);
          if (scorecard.player) {
            players.push(scorecard.player);
          }
        }

        // Find the first incomplete hole
        let currentHole = 1;
        for (let h = 1; h <= 18; h++) {
          const allComplete = players.every((player) => {
            const sc = newScorecards.get(player.id);
            return sc?.scores[h]?.strokes !== undefined;
          });
          if (!allComplete) {
            currentHole = h;
            break;
          }
          if (h === 18) {
            currentHole = 18;
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
    },

    setCurrentHole: (hole) => {
      if (hole >= 1 && hole <= 18) {
        set({ currentHole: hole });
      }
    },

    setAllowedPlayers: (playerIds) => {
      set({ allowedPlayerIds: playerIds });
      storeLogger.info('Allowed players updated', {
        playerCount: playerIds.length,
        allowed: playerIds.length > 0 ? 'specific' : 'all',
      });
    },

    setPlayerScore: async (playerId, hole, strokes) => {
      const { groupScorecards, holes, gameType, allowedPlayerIds, currentRoundId } = get();

      storeLogger.debug('Setting player score', {
        playerId: playerId.substring(0, 8) + '...',
        hole,
        strokes,
        roundId: currentRoundId?.substring(0, 8) + '...',
      });

      // Validate player is allowed to be scored (defensive check)
      if (allowedPlayerIds.length > 0 && !allowedPlayerIds.includes(playerId)) {
        storeLogger.warn('Player not in allowed list, rejecting score', {
          playerId: playerId.substring(0, 8) + '...',
          allowedCount: allowedPlayerIds.length,
        });
        return;
      }

      const scorecard = groupScorecards.get(playerId);

      if (!scorecard) {
        storeLogger.warn('Scorecard not found for player', { playerId });
        return;
      }

      const holeData = holes.find((h) => h.number === hole);
      if (!holeData) {
        storeLogger.warn('Hole data not found', { hole });
        return;
      }

      // Get existing score to preserve stats (putts, FIR, GIR)
      const existingScore = scorecard.scores[hole];

      // Create the score entry, preserving existing stats
      const holeScore: HoleScore = {
        strokes,
        putts: existingScore?.putts,
        fairwayHit: existingScore?.fairwayHit,
        greenInRegulation: existingScore?.greenInRegulation,
        penalties: existingScore?.penalties ?? 0,
      };

      // Update the scorecard
      const updatedScorecard: Scorecard = {
        ...scorecard,
        scores: {
          ...scorecard.scores,
          [hole]: holeScore,
        },
        updatedAt: new Date(),
      };

      // Calculate totals
      const totals = calculatePlayerTotals(updatedScorecard, holes, gameType);
      updatedScorecard.totalGross = totals.gross;
      updatedScorecard.totalNet = totals.net;

      // Update state
      const newScorecards = new Map(groupScorecards);
      newScorecards.set(playerId, updatedScorecard);
      set({ groupScorecards: newScorecards });

      // Save to SQLite and queue sync
      try {
        storeLogger.debug('Saving hole score to SQLite', {
          scorecardId: scorecard.id.substring(0, 20) + '...',
          hole,
          strokes,
        });
        await saveHoleScore(scorecard.id, hole, holeScore);
        await saveScorecard(updatedScorecard);

        // Queue for sync
        storeLogger.debug('Queuing scorecard for sync', {
          scorecardId: scorecard.id.substring(0, 20) + '...',
          isStandalone: scorecard.isStandalone,
        });
        await queueScorecardSync(updatedScorecard, 'update');
      } catch (error) {
        storeLogger.error('Failed to save score', error, {
          playerId: playerId.substring(0, 8) + '...',
          hole,
          strokes,
        });
      }
    },

    updatePlayerHoleScore: async (playerId, hole, updates) => {
      const { groupScorecards, holes, gameType, allowedPlayerIds } = get();

      // Validate player is allowed to be scored (defensive check)
      if (allowedPlayerIds.length > 0 && !allowedPlayerIds.includes(playerId)) {
        console.warn('[ScorecardStore] Player not in allowed list, rejecting hole score update:', playerId);
        return;
      }

      const scorecard = groupScorecards.get(playerId);

      if (!scorecard) {
        console.warn('[ScorecardStore] Scorecard not found for player:', playerId);
        return;
      }

      const existingScore = scorecard.scores[hole] || { strokes: 0 };

      // Merge updates with existing score
      const holeScore: HoleScore = {
        ...existingScore,
        ...updates,
      };

      // Update the scorecard
      const updatedScorecard: Scorecard = {
        ...scorecard,
        scores: {
          ...scorecard.scores,
          [hole]: holeScore,
        },
        updatedAt: new Date(),
      };

      // Calculate totals
      const totals = calculatePlayerTotals(updatedScorecard, holes, gameType);
      updatedScorecard.totalGross = totals.gross;
      updatedScorecard.totalNet = totals.net;

      // Update state
      const newScorecards = new Map(groupScorecards);
      newScorecards.set(playerId, updatedScorecard);
      set({ groupScorecards: newScorecards });

      // Save to SQLite (async, don't await)
      try {
        await saveHoleScore(scorecard.id, hole, holeScore);
        await saveScorecard(updatedScorecard);

        // Queue for sync
        await queueScorecardSync(updatedScorecard, 'update');
      } catch (error) {
        console.error('[ScorecardStore] Failed to save hole score:', error);
      }
    },

    getPlayerScore: (playerId, hole) => {
      const { groupScorecards } = get();
      const scorecard = groupScorecards.get(playerId);
      return scorecard?.scores[hole];
    },

    getPlayerTotals: (playerId) => {
      const { groupScorecards, holes, gameType } = get();
      const scorecard = groupScorecards.get(playerId);

      if (!scorecard) {
        return { gross: 0, net: 0, points: 0 };
      }

      return calculatePlayerTotals(scorecard, holes, gameType);
    },

    getHoleInfo: (holeNumber) => {
      const { holes } = get();
      return holes.find((h) => h.number === holeNumber);
    },

    isHoleComplete: (hole) => {
      const { groupScorecards, currentPlayers } = get();

      return currentPlayers.every((player) => {
        const scorecard = groupScorecards.get(player.id);
        return scorecard?.scores[hole]?.strokes !== undefined;
      });
    },

    getCompletedHolesCount: () => {
      const { holes } = get();
      let count = 0;

      for (let h = 1; h <= 18; h++) {
        if (get().isHoleComplete(h)) {
          count++;
        }
      }

      return count;
    },

    submitScorecards: async () => {
      const { groupScorecards, currentRoundId } = get();

      storeLogger.info('Submitting scorecards', {
        roundId: currentRoundId?.substring(0, 8) + '...',
        scorecardCount: groupScorecards.size,
      });

      if (!currentRoundId) {
        storeLogger.error('Cannot submit - no round ID set');
        throw new Error('No round ID set');
      }

      const now = new Date();
      const newScorecards = new Map(groupScorecards);
      let successCount = 0;
      let errorCount = 0;

      for (const [playerId, scorecard] of newScorecards) {
        try {
          const updatedScorecard: Scorecard = {
            ...scorecard,
            status: 'completed',
            submittedAt: now,
            updatedAt: now,
          };

          storeLogger.debug('Submitting scorecard', logScorecardSummary(updatedScorecard));

          newScorecards.set(playerId, updatedScorecard);

          // Save to SQLite
          await saveScorecard(updatedScorecard);
          storeLogger.debug('Scorecard saved to SQLite', {
            playerId: playerId.substring(0, 8) + '...',
          });

          // Queue for sync
          await queueScorecardSync(updatedScorecard, 'update');
          storeLogger.debug('Scorecard queued for sync', {
            playerId: playerId.substring(0, 8) + '...',
            isStandalone: updatedScorecard.isStandalone,
          });

          successCount++;
        } catch (error) {
          errorCount++;
          storeLogger.error('Failed to submit scorecard', error, {
            playerId: playerId.substring(0, 8) + '...',
            roundId: currentRoundId.substring(0, 8) + '...',
          });
        }
      }

      set({ groupScorecards: newScorecards });

      storeLogger.info('Scorecards submission complete', {
        roundId: currentRoundId.substring(0, 8) + '...',
        successCount,
        errorCount,
        totalCount: groupScorecards.size,
      });

      if (errorCount > 0) {
        throw new Error(`Failed to submit ${errorCount} scorecard(s)`);
      }
    },

    resetRound: () => {
      set({
        currentRoundId: null,
        currentPlayers: [],
        currentHole: 1,
        holes: [],
        gameType: 'stableford',
        groupScorecards: new Map(),
        allowedPlayerIds: [],
        isLoading: false,
        isInitialized: false,
        syncError: null,
      });
    },
  };
});

/**
 * Calculate player totals based on game type
 */
function calculatePlayerTotals(
  scorecard: Scorecard,
  holes: Hole[],
  gameType: GameType
): { gross: number; net: number; points: number } {
  const playerHandicap = scorecard.player?.handicap || 0;

  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;

  for (const hole of holes) {
    const holeScore = scorecard.scores[hole.number];
    if (!holeScore?.strokes) continue;

    totalGross += holeScore.strokes;

    if (gameType === 'stableford') {
      totalPoints += calculateStablefordPoints(holeScore.strokes, playerHandicap, hole);
      totalNet = totalPoints; // For stableford, net = points
    } else if (gameType === 'stroke') {
      totalNet += calculateNetScore(holeScore.strokes, playerHandicap, hole);
    }
  }

  return { gross: totalGross, net: totalNet, points: totalPoints };
}
