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
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';
import type { AcceptedScorecardWrite, PositiveRoundScoringShape, PriorLocalShapes } from '@/services/rounds/roundScoringWrite';
import { lastPlayedHoleNumber } from '@/utils/roundShape';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { BallCount } from '@/types/multiball.types';
import type { MultiBallHoleScore, BallTotals } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';
import {
  saveScorecard,
  saveHoles,
  markScorecardAsSynced,
  getFailedSyncCountForRound,
} from '@/services/offline/database';
import {
  queueScorecardSync,
  syncScorecard,
  subscribeSyncState,
  subscribeScorecardSynced,
  getIsOnline,
  ScorecardConflictError,
} from '@/services/offline/sync';
import { storeLogger, logScorecardSummary } from '@/utils/debugLogger';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { calculatePlayerTotals } from './utils/scorecardCalculations';
import { persistScorecardUpdate } from './scorecardPersistence';
import * as multiBall from './multiBallSlice';
import * as scoreUpdate from './scoreUpdateSlice';
import * as initSlice from './initializeRoundSlice';
import * as endEarly from './endRoundEarlySlice';

interface RoundScoringSession {
  isCurrent(): boolean;
  applyShape(shape: PositiveRoundScoringShape, priorLocalShapes: PriorLocalShapes, acceptedWrite?: AcceptedScorecardWrite): boolean;
}

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
  /** Holes played when the round was ended early, counted from the round's
   *  first hole. null = played as planned. `holes` stays the PLANNED list
   *  (daily handicap derives from Σpar of it); slice with getPlayedHoles(). */
  holesPlayed: number | null;
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
    startHole?: number,
    /** Server rounds.holes_played; local durable markers survive server NULL. */
    holesPlayed?: number | null
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
  /** filterPlayableHoles(holes, nineType, holesPlayed): the holes to render, validate and count. */
  getPlayedHoles: () => Hole[];
  /** Durably end after n holes locally; the caller tells the server. */
  endRoundEarly: (n: number) => Promise<void>;
  /** Internal passive adapter for durable authoritative adoption. */
  captureRoundScoringSession: (roundId: string) => RoundScoringSession | null;
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
  // Invalidates asynchronous end actions even when the same round is reopened.
  let roundSession = 0;

  // Subscribe to sync state changes
  let unsubscribe: (() => void) | null = null;

  /**
   * Recount retained sync failures for the round being scored.
   *
   * The sync service's `failedCount` is device-wide, which is the wrong number
   * for an on-course banner: one unrecoverable row left over from an earlier
   * round would raise a red "score changes not uploaded" strip on every
   * subsequent scorecard, including solo and local-only rounds. Device-wide
   * failures remain visible in Settings → Developer.
   */
  const refreshRoundFailedSyncCount = async () => {
    const roundId = get().currentRoundId;
    if (!roundId) {
      set({ failedSyncCount: 0 });
      return;
    }

    try {
      const count = await getFailedSyncCountForRound(roundId);
      // The round can change while the query is in flight.
      if (get().currentRoundId !== roundId) return;
      set({ failedSyncCount: count });
    } catch (error) {
      storeLogger.warn('Failed to read retained sync failures for round', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const initSyncListener = () => {
    if (unsubscribe) return;
    unsubscribe = subscribeSyncState((syncState) => {
      set({
        isOnline: getIsOnline(),
        isSyncing: syncState.status === 'syncing',
        pendingSyncCount: syncState.pendingCount,
        syncError: syncState.error,
      });
      void refreshRoundFailedSyncCount();
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
    holesPlayed: null,
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
    // The failure recount runs after the slice resolves: it is scoped to
    // `currentRoundId`, which the slice only sets once the round has loaded.
    initializeRound: async (roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole, holesPlayed) => {
      const session = ++roundSession;
      await initSlice.initializeRound(set, initSyncListener, roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole, holesPlayed, { getSessionGeneration: () => roundSession });
      if (roundSession !== session) return;
      await endEarly.reconcileEndedEarly(get, set, { getSessionGeneration: () => roundSession });
      await refreshRoundFailedSyncCount();
    },

    loadFromOffline: async (roundId) => {
      const session = ++roundSession;
      const loaded = await initSlice.loadFromOffline(set, initSyncListener, roundId, { getSessionGeneration: () => roundSession });
      if (roundSession !== session) return loaded;
      if (loaded) await endEarly.reconcileEndedEarly(get, set, { getSessionGeneration: () => roundSession });
      await refreshRoundFailedSyncCount();
      return loaded;
    },

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
      const { groupScorecards, playerTeeMap, holes, gameType, handicapSource, nineType } = get();
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
        nineType,
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
      const { groupScorecards, holes, gameType, playerTeeMap, selectedTeeData, handicapSource, nineType } = get();
      const scorecard = groupScorecards.get(playerId);
      if (!scorecard) return { gross: 0, net: 0, points: 0, parScore: 0 };
      const playerTee = playerTeeMap.get(playerId) ?? selectedTeeData;
      return calculatePlayerTotals(scorecard, holes, gameType, {
        selectedTee: playerTee,
        handicapSource,
        nineType,
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

    getPlayedHoles: () => {
      const { holes, nineType, holesPlayed } = get();
      return filterPlayableHoles(holes, nineType, holesPlayed);
    },

    captureRoundScoringSession: (roundId) => {
      const generation = roundSession;
      const isCurrent = () =>
        roundSession === generation && get().currentRoundId === roundId && !get().isLoading;
      if (!isCurrent()) return null;
      return {
        isCurrent,
        applyShape: (shape, priorLocalShapes, acceptedWrite) => {
          if (!isCurrent()) return false;
          const current = get();
          const plannedHoles = filterPlayableHoles(current.holes, shape.nine_type);
          const plannedNumbers = new Set<number>(plannedHoles.map((h) => h.number));
          const required = shapeHoleNumbers(shape);
          // holes is the declared planned course list, including physical-nine
          // courses whose legacy nine label is 'full'. Never fabricate holes.
          if (
            plannedHoles.length === 0 ||
            [...required].some((h) => !plannedNumbers.has(h)) ||
            plannedHoles.some((h) => !h.par || !h.strokeIndex)
          ) {
            throw new Error('Missing planned context for authoritative scoring shape');
          }
          let keep = shapeHoleNumbers(shape);
          for (const prior of priorLocalShapes.values()) {
            if (prior.holes_played == null) continue;
            const earlier = shapeHoleNumbers(prior);
            keep = new Set([...keep].filter((h) => earlier.has(h)));
          }
          const groupScorecards = new Map<string, Scorecard>();
          for (const [playerId, card] of current.groupScorecards) {
            let cardKeep = keep;
            if (card.holesPlayed != null) {
              const earlier = shapeHoleNumbers({
                nine_type: card.syncNineType ?? current.nineType,
                holes_played: card.holesPlayed,
              });
              cardKeep = new Set([...keep].filter((h) => earlier.has(h)));
            }
            const rebuilt = endEarly.rebuildEndedScorecard(
              card,
              cardKeep,
              shape.holes_played,
              plannedHoles,
              current.gameType,
              {
                selectedTee: current.playerTeeMap.get(playerId) ?? current.selectedTeeData,
                handicapSource: current.handicapSource,
                nineType: shape.nine_type,
              }
            );
            groupScorecards.set(playerId, {
              ...rebuilt,
              syncNineType: shape.nine_type,
              ...(acceptedWrite?.scorecardId === card.id && {
                serverRevision: Math.max(card.serverRevision ?? 0, acceptedWrite.serverRevision),
              }),
            });
          }
          const played = shapeHoleNumbers(shape);
          set({
            groupScorecards,
            holes: plannedHoles,
            holesPlayed: shape.holes_played,
            nineType: shape.nine_type,
            currentHole: played.has(current.currentHole)
              ? current.currentHole
              : lastPlayedHoleNumber(shape.nine_type, shape.holes_played),
          });
          return true;
        },
      };
    },

    endRoundEarly: (n) => endEarly.endRoundEarly(get, set, n, { getSessionGeneration: () => roundSession }),

    submitScorecards: async (options) => {
      const { groupScorecards, currentRoundId, selectedTeeData, holes, gameType, nineType, holesPlayed } = get();
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
          expectedHoles: filterPlayableHoles(safeHoles, nineType, holesPlayed).length,
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
            // Ended early: sync nets over the played holes (B4). The card
            // already carries it (endRoundEarly stamps it); restated so a card
            // created after the end (team backfill) carries it too.
            ...(holesPlayed != null && { holesPlayed }),
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
      roundSession += 1;
      set({
        currentRoundId: null,
        currentPlayers: [],
        currentHole: 1,
        holes: [],
        gameType: 'stableford',
        selectedTeeData: null,
        playerTeeMap: new Map(),
        nineType: 'full' as NineType,
        holesPlayed: null,
        startHole: 1,
        ballCount: 1,
        isMultiBall: false,
        groupScorecards: new Map(),
        allowedPlayerIds: [],
        isLoading: false,
        isInitialized: false,
        syncError: null,
        // Round-scoped, so it cannot outlive the round it belongs to.
        failedSyncCount: 0,
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
