/**
 * Scorecard Store - Zustand state management with offline support
 *
 * Manages the current scoring session including:
 * - Current hole being scored
 * - All player scorecards in the group
 * - Auto-save to SQLite for offline support
 * - Sync status tracking
 *
 * Score update logic is in ./scoreUpdateSlice.ts
 * Initialization logic is in ./initializeRoundSlice.ts
 * Multi-ball logic is in ./multiBallSlice.ts
 */

import { create } from 'zustand';
import { Scorecard, HoleScore, Player, Hole, GameType, TeeBox, HoleShotContributions } from '@/types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { BallCount } from '@/types/multiball.types';
import type { MultiBallHoleScore, BallTotals } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';
import { saveScorecard, saveHoles, markScorecardAsSynced } from '@/services/offline/database';
import {
  queueScorecardSync,
  syncScorecard,
  subscribeSyncState,
  subscribeScorecardSynced,
  getIsOnline,
  ScorecardConflictError,
} from '@/services/offline/sync';
import { storeLogger, logScorecardSummary } from '@/utils/debugLogger';
import { calculatePlayerTotals } from './utils/scorecardCalculations';
import { persistScorecardUpdate } from './scorecardPersistence';
import * as multiBall from './multiBallSlice';
import * as scoreUpdate from './scoreUpdateSlice';
import * as initSlice from './initializeRoundSlice';

interface ScorecardState {
  // Current round data
  currentRoundId: string | null;
  currentPlayers: Player[];
  currentHole: number;
  holes: Hole[];
  gameType: GameType;
  handicapSource: HandicapSource;
  selectedTeeData: TeeBox | null;
  playerTeeMap: Map<string, TeeBox>;
  nineType: NineType;
  /** Display offset for hole numbers (1 = standard 1..18). See
   *  displayHoleNumber() in src/utils/holeTransformers.ts. */
  startHole: number;

  // Multi-ball scoring (solo rounds only)
  ballCount: BallCount;
  isMultiBall: boolean;

  // All scorecards for current group (playerId -> Scorecard)
  groupScorecards: Map<string, Scorecard>;

  // Player validation
  allowedPlayerIds: string[];

  // Sync status
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
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
    allowedPlayerIds?: string[],
    selectedTeeData?: TeeBox | null,
    handicapSource?: HandicapSource,
    playerTeeMap?: Map<string, TeeBox>,
    nineType?: NineType,
    startHole?: number
  ) => Promise<void>;
  setAllowedPlayers: (playerIds: string[]) => void;
  setSelectedTeeData: (teeData: TeeBox | null) => void;
  setPlayerTee: (playerId: string, tee: TeeBox) => Promise<void>;
  loadFromOffline: (roundId: string) => Promise<boolean>;
  ensureTeamMemberScorecards: (teamMemberPlayers: Player[]) => Promise<void>;
  setCurrentHole: (hole: number) => void;
  setPlayerScore: (playerId: string, hole: number, strokes: number, scoredBy?: string) => Promise<void>;
  updatePlayerHoleScore: (playerId: string, hole: number, updates: Partial<HoleScore>) => Promise<void>;
  updateShotContributions: (playerId: string, hole: number, contributions: HoleShotContributions) => Promise<void>;
  updateLocalScore: (roundId: string, playerId: string, holeNumber: number, strokes: number) => Promise<void>;
  getPlayerScore: (playerId: string, hole: number) => HoleScore | MultiBallHoleScore | undefined;
  getPlayerTotals: (playerId: string) => { gross: number; net: number; points: number };
  getPlayerTee: (playerId: string) => TeeBox | null;
  getHoleInfo: (holeNumber: number) => Hole | undefined;
  isHoleComplete: (hole: number) => boolean;
  getCompletedHolesCount: () => number;
  submitScorecards: (options?: { bypassed?: boolean; playerIds?: string[] }) => Promise<void>;
  resetRound: () => void;

  // Multi-ball scoring functions
  setMultiBallConfig: (ballCount: BallCount) => void;
  setMultiBallScore: (playerId: string, hole: number, ballIndex: number, strokes: number) => Promise<void>;
  updateMultiBallStats: (playerId: string, hole: number, ballIndex: number, updates: Partial<HoleScore>) => Promise<void>;
  getMultiBallScores: (playerId: string, hole: number) => HoleScore[];
  getMultiBallTotals: (playerId: string) => Record<string, BallTotals>;

  // Super admin hole editing
  updateHoles: (holes: Hole[]) => Promise<void>;
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
        failedSyncCount: syncState.failedCount,
        syncError: syncState.error,
      });
    });

    // Keep the in-memory serverRevision in step with the server after every
    // successful background sync. markScorecardAsSynced only updates SQLite;
    // without this, later writes send a stale expected revision and are
    // falsely rejected as "changed on another device" conflicts.
    subscribeScorecardSynced(({ scorecardId, serverRevision }) => {
      const { groupScorecards } = get();
      for (const [playerId, scorecard] of groupScorecards) {
        if (scorecard.id !== scorecardId) continue;
        if ((scorecard.serverRevision ?? 0) >= serverRevision) return;
        const next = new Map(groupScorecards);
        next.set(playerId, { ...scorecard, serverRevision });
        set({ groupScorecards: next });
        return;
      }
    });
  };

  return {
    // Initial state
    currentRoundId: null,
    currentPlayers: [],
    currentHole: 1,
    holes: [],
    gameType: 'stableford',
    handicapSource: 'profile',
    selectedTeeData: null,
    playerTeeMap: new Map(),
    nineType: 'full' as NineType,
    startHole: 1,
    ballCount: 1,
    isMultiBall: false,
    groupScorecards: new Map(),
    allowedPlayerIds: [],
    isOnline: true,
    isSyncing: false,
    pendingSyncCount: 0,
    failedSyncCount: 0,
    syncError: null,
    isLoading: false,
    isInitialized: false,

    // Initialization (delegated to initializeRoundSlice)
    initializeRound: (roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole) =>
      initSlice.initializeRound(set, initSyncListener, roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole),

    loadFromOffline: (roundId) =>
      initSlice.loadFromOffline(set, initSyncListener, roundId),

    ensureTeamMemberScorecards: (teamMemberPlayers) =>
      initSlice.ensureTeamMemberScorecards(
        set,
        () => {
          const s = get();
          return {
            currentRoundId: s.currentRoundId,
            currentPlayers: s.currentPlayers,
            groupScorecards: s.groupScorecards,
          };
        },
        teamMemberPlayers
      ),

    // Simple setters
    setCurrentHole: (hole) => {
      const { holes } = get();
      const validNumbers = new Set(holes.map((h) => h.number));
      if (validNumbers.has(hole as any)) {
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

    setSelectedTeeData: (teeData) => {
      set({ selectedTeeData: teeData });
      storeLogger.info('Selected tee data updated', {
        hasData: !!teeData,
        slopeRating: teeData?.slopeRating,
        courseRating: teeData?.courseRating,
      });
    },

    setPlayerTee: async (playerId, tee) => {
      const { groupScorecards, playerTeeMap, holes, gameType, handicapSource } = get();
      const scorecard = groupScorecards.get(playerId);
      if (!scorecard) {
        storeLogger.warn('setPlayerTee: no scorecard for player', {
          playerId: playerId.substring(0, 8) + '...',
        });
        return;
      }

      const nextTeeMap = new Map(playerTeeMap);
      nextTeeMap.set(playerId, tee);

      const totals = calculatePlayerTotals(scorecard, holes, gameType, {
        selectedTee: tee,
        handicapSource,
      });
      const updatedScorecard: Scorecard = {
        ...scorecard,
        totalGross: totals.gross,
        totalNet: totals.net,
        total_par_score: totals.parScore,
        teeData: tee,
        updatedAt: new Date(),
      };

      const nextScorecards = new Map(groupScorecards);
      nextScorecards.set(playerId, updatedScorecard);
      // State is committed before persistence (fire-and-forget), matching the
      // store's score-update path: live scoring must stay responsive, and a
      // failed SQLite write is logged rather than blocking the UI.
      set({ playerTeeMap: nextTeeMap, groupScorecards: nextScorecards });

      await persistScorecardUpdate({
        scorecard: { scorecardId: updatedScorecard.id, scorecard: updatedScorecard },
        context: 'setPlayerTee',
      });
      storeLogger.info('Player tee switched', {
        playerId: playerId.substring(0, 8) + '...',
        tee: tee.name,
        slopeRating: tee.slopeRating,
      });
    },

    // Score updates (delegated to scoreUpdateSlice)
    setPlayerScore: (playerId, hole, strokes, scoredBy) =>
      scoreUpdate.setPlayerScore(get, set, playerId, hole, strokes, scoredBy),

    updatePlayerHoleScore: (playerId, hole, updates) =>
      scoreUpdate.updatePlayerHoleScore(get, set, playerId, hole, updates),

    updateShotContributions: (playerId, hole, contributions) =>
      scoreUpdate.updateShotContributions(get, set, playerId, hole, contributions),

    updateLocalScore: (roundId, playerId, holeNumber, strokes) =>
      scoreUpdate.updateLocalScore(get, set, roundId, playerId, holeNumber, strokes),

    // Getters
    getPlayerScore: (playerId, hole) => {
      const { groupScorecards } = get();
      const scorecard = groupScorecards.get(playerId);
      return scorecard?.scores[hole];
    },

    getPlayerTotals: (playerId) => {
      const { groupScorecards, holes, gameType, playerTeeMap, selectedTeeData, handicapSource } = get();
      const scorecard = groupScorecards.get(playerId);
      if (!scorecard) return { gross: 0, net: 0, points: 0, parScore: 0 };
      const playerTee = playerTeeMap.get(playerId) ?? selectedTeeData;
      return calculatePlayerTotals(scorecard, holes, gameType, {
        selectedTee: playerTee,
        handicapSource,
      });
    },

    getPlayerTee: (playerId) => {
      const { playerTeeMap, selectedTeeData } = get();
      return playerTeeMap.get(playerId) ?? selectedTeeData;
    },

    getHoleInfo: (holeNumber) => {
      const { holes } = get();
      return holes.find((h) => h.number === holeNumber);
    },

    isHoleComplete: (hole) => {
      const { groupScorecards, currentPlayers, allowedPlayerIds } = get();
      // When scoring pairs are active, completeness only covers the user's
      // assigned set (self + partner). Other players' scores are entered
      // on their own devices and would otherwise show as missing here.
      const playersToCheck = allowedPlayerIds.length > 0
        ? currentPlayers.filter((p) => allowedPlayerIds.includes(p.id))
        : currentPlayers;
      return playersToCheck.every((player) => {
        const scorecard = groupScorecards.get(player.id);
        const score = scorecard?.scores[hole];
        return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
      });
    },

    getCompletedHolesCount: () => {
      const { holes } = get();
      let count = 0;
      for (const hole of holes) {
        if (get().isHoleComplete(hole.number)) count++;
      }
      return count;
    },

    submitScorecards: async (options) => {
      const { groupScorecards, currentRoundId, selectedTeeData, holes, gameType, nineType } = get();
      const scopeIds = options?.playerIds;
      const targetIds =
        scopeIds && scopeIds.length > 0 ? new Set(scopeIds) : null;

      storeLogger.info('Submitting scorecards', {
        roundId: currentRoundId?.substring(0, 8) + '...',
        scorecardCount: groupScorecards.size,
        hasTeeData: !!selectedTeeData,
      });

      if (!currentRoundId) {
        storeLogger.error('Cannot submit - no round ID set');
        throw new Error('No round ID set');
      }

      const safeHoles = Array.isArray(holes) ? holes : [];

      if (safeHoles.length === 0) {
        storeLogger.error('Cannot submit - no holes data available');
        throw new Error('No holes data available for submission');
      }

      // Log hole count for each player's scorecard for diagnostics
      for (const [playerId, scorecard] of groupScorecards) {
        const scoredHoles = Object.values(scorecard.scores).filter(s => {
          if (!s) return false;
          if (isSingleBallScore(s)) return s.strokes != null && s.strokes > 0;
          return (s as { balls?: { strokes?: number }[] }).balls?.some(b => b.strokes != null && b.strokes > 0);
        }).length;

        storeLogger.info('Submission hole count check', {
          playerId: playerId.substring(0, 8) + '...',
          scoredHoles,
          expectedHoles: safeHoles.length,
        });
      }

      const coursePar = safeHoles.reduce((sum, h) => sum + (h.par || 0), 0);

      const now = new Date();
      const newScorecards = new Map(groupScorecards);
      let successCount = 0;
      let errorCount = 0;

      for (const [playerId, scorecard] of newScorecards) {
        if (targetIds && !targetIds.has(playerId)) {
          continue; // group-scoped submit: leave other groups' cards untouched
        }
        try {
          const updatedScorecard: Scorecard = {
            ...scorecard,
            status: 'completed',
            submittedAt: now,
            updatedAt: now,
            teeData: get().getPlayerTee(playerId),
            playerGender: scorecard.player?.gender || null,
            playerHandicap: scorecard.player?.handicap || null,
            coursePar,
            // Attach hole data and game type for correct Stableford points calculation during sync
            syncHoles: safeHoles,
            syncGameType: gameType,
            syncNineType: nineType,
          };

          storeLogger.debug('Submitting scorecard', logScorecardSummary(updatedScorecard));
          newScorecards.set(playerId, updatedScorecard);
          await saveScorecard(updatedScorecard);

          if (getIsOnline()) {
            // Push to Supabase synchronously and wait for confirmation. The
            // round status is set by a separate *direct* server write right
            // after submission resolves; if we only fired a background queue
            // sync (fire-and-forget), the round could be marked completed while
            // the scorecard never reaches the server — leaving it scoreless and
            // missing from handicap history / stats. Throwing on failure keeps
            // the round un-completed and therefore recoverable.
            let result;
            try {
              result = await syncScorecard(updatedScorecard);
            } catch (error) {
              if (!(error instanceof ScorecardConflictError)) throw error;
              // Stale expected revision. At explicit submission the scorer's
              // local card is authoritative, so adopt the server's revision
              // and retry once with the local snapshot. Without this, a card
              // whose tracked revision fell behind (e.g. a crash before the
              // revision was persisted) can never be submitted again.
              storeLogger.warn('Submit hit a stale revision conflict; retrying with server revision', {
                playerId: playerId.substring(0, 8) + '...',
                serverRevision: error.serverRevision,
              });
              result = await syncScorecard({
                ...updatedScorecard,
                serverRevision: error.serverRevision,
              });
            }
            updatedScorecard.serverRevision = result.serverRevision;
            newScorecards.set(playerId, updatedScorecard);
            await markScorecardAsSynced(updatedScorecard.id, result.serverRevision);
          } else {
            // Offline: queue for durable retry on reconnect. The submission
            // flow leaves the round status unchanged while offline, so no
            // round/scorecard divergence can occur.
            await queueScorecardSync(updatedScorecard, 'update');
          }
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
        selectedTeeData: null,
        playerTeeMap: new Map(),
        nineType: 'full' as NineType,
        startHole: 1,
        ballCount: 1,
        isMultiBall: false,
        groupScorecards: new Map(),
        allowedPlayerIds: [],
        isLoading: false,
        isInitialized: false,
        syncError: null,
      });
    },

    // Multi-ball scoring functions (delegated to multiBallSlice)
    setMultiBallConfig: (ballCount: BallCount) => multiBall.setMultiBallConfig(set, ballCount),
    setMultiBallScore: (playerId, hole, ballIndex, strokes) =>
      multiBall.setMultiBallScore(get, set, playerId, hole, ballIndex, strokes),
    updateMultiBallStats: (playerId, hole, ballIndex, updates) =>
      multiBall.updateMultiBallStats(get, set, playerId, hole, ballIndex, updates),
    getMultiBallScores: (playerId, hole) => multiBall.getMultiBallScores(get, playerId, hole),
    getMultiBallTotals: (playerId) => multiBall.getMultiBallTotals(get, playerId),

    // Super admin hole editing
    updateHoles: async (newHoles: Hole[]) => {
      const { currentRoundId } = get();

      storeLogger.info('Updating holes', {
        roundId: currentRoundId?.substring(0, 8) + '...',
        holeCount: newHoles.length,
      });

      set({ holes: newHoles });

      if (currentRoundId) {
        try {
          await saveHoles(currentRoundId, newHoles);
          storeLogger.debug('Holes saved to SQLite', {
            roundId: currentRoundId.substring(0, 8) + '...',
          });
        } catch (error) {
          storeLogger.error('Failed to save holes to SQLite', error, {
            roundId: currentRoundId?.substring(0, 8) + '...',
          });
        }
      }
    },
  };
});
