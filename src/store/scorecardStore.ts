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
import type { AcceptedScorecardWrite, RoundScoringShape, PriorLocalShapes, RebuildRoundShapeCard } from '@/services/rounds/roundScoringWrite';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import { hasFrozenScoringContext } from '@/services/rounds/scorecardScoringMetadata';
import { createRoundScoringContext, type LiveRoundRepairContext } from '@/services/rounds/roundScoringContext';
import { lastPlayedHoleNumber } from '@/utils/roundShape';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { BallCount } from '@/types/multiball.types';
import type { MultiBallHoleScore, BallTotals } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';
import {
  saveScorecard,
  saveHoles,
  getFailedSyncCountForRound,
} from '@/services/offline/database';
import {
  queueScorecardSync,
  syncScorecard,
  subscribeSyncState,
  subscribeScorecardSynced,
  getIsOnline,
} from '@/services/offline/sync';
import { storeLogger } from '@/utils/debugLogger';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { calculatePlayerTotals } from './utils/scorecardCalculations';
import { captureRoundPersistenceSource, isRoundPersistenceSourceCurrent, withRoundPersistence, RoundPersistenceSourceChangedError } from '@/services/offline/roundPersistenceBarrier';
import { persistScorecardUpdate } from './scorecardPersistence';
import * as multiBall from './multiBallSlice';
import * as scoreUpdate from './scoreUpdateSlice';
import * as initSlice from './initializeRoundSlice';
import * as endEarly from './endRoundEarlySlice';

export interface RoundScoringSession {
  isCurrent(): boolean;
  getCards(): Scorecard[];
  hasLocalEnd(): boolean;
  getLiveContext(source: Scorecard): LiveRoundRepairContext | undefined;
  invalidateLiveContext(scorecardId: string): void;
  applyShape(shape: RoundScoringShape, priorLocalShapes: PriorLocalShapes, acceptedWrite?: AcceptedScorecardWrite, rebuild?: RebuildRoundShapeCard): boolean;
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
  /** Private generation proof also covers an originally absent remote-only session. */
  captureRoundScoringOperation: (roundId: string) => () => boolean;
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
  // Provenance belongs to this private session, never to an ID/status supplied
  // by historical loading or remote hydration.
  const liveScorecardOrigins = new Map<string, number>();
  // Match the tracked creation across SQLite/queue decoding without granting
  // eligibility to an older source that happens to reuse the same local ID.
  const sourceCreatedAt = (card: Scorecard) => {
    if (card.createdAt instanceof Date) return card.createdAt.getTime();
    return typeof card.createdAt === 'string' ? Date.parse(card.createdAt) : NaN;
  };
  let liveRoundSession = false;
  const registerLiveOrigins = (session: number, cards: readonly Scorecard[]) => {
    if (roundSession !== session) return;
    liveRoundSession = true;
    for (const card of cards) liveScorecardOrigins.set(card.id, sourceCreatedAt(card));
  };
  const captureLivePersistence = (playerId: string) => {
    const generation = roundSession;
    const roundId = get().currentRoundId;
    const card = get().groupScorecards.get(playerId);
    const source = card ? captureRoundPersistenceSource(card.roundId) : undefined;
    return {
      source,
      resolveCurrentScorecard: () => {
        const state = get();
        if (roundSession !== generation || state.currentRoundId !== roundId || state.isLoading) return undefined;
        const current = state.groupScorecards.get(playerId);
        return current?.id === card?.id ? current : undefined;
      },
    };
  };

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
      liveScorecardOrigins.clear();
      liveRoundSession = false;
      await initSlice.initializeRound(set, initSyncListener, roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole, holesPlayed, {
        getSessionGeneration: () => roundSession,
        onLiveCardsReady: cards => registerLiveOrigins(session, cards),
      });
      if (roundSession !== session) return;
      await refreshRoundFailedSyncCount();
    },

    loadFromOffline: async (roundId) => {
      const session = ++roundSession;
      liveScorecardOrigins.clear();
      liveRoundSession = false;
      const loaded = await initSlice.loadFromOffline(set, initSyncListener, roundId, {
        getSessionGeneration: () => roundSession,
        onLiveCardsReady: cards => registerLiveOrigins(session, cards),
      });
      if (roundSession !== session) return loaded;
      await refreshRoundFailedSyncCount();
      return loaded;
    },

    ensureTeamMemberScorecards: (teamMemberPlayers) => {
      const session = roundSession;
      return initSlice.ensureTeamMemberScorecards(
        set,
        get,
        teamMemberPlayers,
        {
          getSessionGeneration: () => roundSession,
          canUseLiveContext: () => roundSession === session && liveRoundSession,
          onLiveCardsReady: cards => {
            if (liveRoundSession) registerLiveOrigins(session, cards);
          },
        }
      );
    },

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
      const persistence = captureLivePersistence(playerId);
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
      const updatedScorecard: Scorecard = (scorecard.holesPlayed ?? get().holesPlayed) != null
        ? createRoundScoringContext(scorecard.roundId, {})(
            { ...scorecard, teeData: tee }, shapeHoleNumbers({ nine_type: nineType, holes_played: get().holesPlayed ?? scorecard.holesPlayed ?? null }),
            { nine_type: nineType, holes_played: get().holesPlayed ?? scorecard.holesPlayed ?? null })
        : {
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
        ...persistence,
      });
      storeLogger.info('Player tee switched', {
        playerId: playerId.substring(0, 8) + '...',
        tee: tee.name,
        slopeRating: tee.slopeRating,
      });
    },

    // Score updates (delegated to scoreUpdateSlice)
    setPlayerScore: (playerId, hole, strokes, scoredBy) =>
      scoreUpdate.setPlayerScore(get, set, playerId, hole, strokes, scoredBy, captureLivePersistence(playerId)),

    updatePlayerHoleScore: (playerId, hole, updates) =>
      scoreUpdate.updatePlayerHoleScore(get, set, playerId, hole, updates, captureLivePersistence(playerId)),

    updateShotContributions: (playerId, hole, contributions) =>
      scoreUpdate.updateShotContributions(get, set, playerId, hole, contributions, captureLivePersistence(playerId)),

    updateLocalScore: (roundId, playerId, holeNumber, strokes) =>
      scoreUpdate.updateLocalScore(get, set, roundId, playerId, holeNumber, strokes, captureLivePersistence(playerId)),

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
      if ((scorecard.holesPlayed ?? get().holesPlayed) != null) {
        const shape = { nine_type: nineType, holes_played: get().holesPlayed ?? scorecard.holesPlayed ?? null };
        const rebuilt = createRoundScoringContext(scorecard.roundId, {
          getLiveContext: get().captureRoundScoringSession(scorecard.roundId)?.getLiveContext,
        })(scorecard, shapeHoleNumbers(shape), shape);
        return { gross: rebuilt.totalGross, net: rebuilt.totalNet,
          points: rebuilt.syncGameType === 'stableford' ? rebuilt.totalNet : 0, parScore: rebuilt.total_par_score ?? 0 };
      }
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

    captureRoundScoringOperation: (roundId) => {
      const generation = roundSession;
      const active = get().currentRoundId === roundId;
      return () => roundSession === generation &&
        (get().currentRoundId === roundId) === active && !(active && get().isLoading);
    },

    captureRoundScoringSession: (roundId) => {
      const generation = roundSession;
      const isCurrent = () =>
        roundSession === generation && get().currentRoundId === roundId && !get().isLoading;
      if (!isCurrent()) return null;
      return {
        isCurrent,
        getCards: () => isCurrent() ? [...get().groupScorecards.values()] : [],
        hasLocalEnd: () => isCurrent() && (get().holesPlayed != null || [...get().groupScorecards.values()].some(card => card.holesPlayed != null)),
        invalidateLiveContext: scorecardId => {
          if (isCurrent()) liveScorecardOrigins.delete(scorecardId);
        },
        getLiveContext: (source) => {
          if (!isCurrent()) return undefined;
          const state = get();
          const current = state.groupScorecards.get(source.playerId);
          // Same local identity in this captured active session; never a closed/reload profile lookup.
          const origin = liveScorecardOrigins.get(source.id);
          if (origin == null || origin !== sourceCreatedAt(source) ||
            !current || current.id !== source.id || origin !== sourceCreatedAt(current) || !current.player ||
            source.status !== 'in-progress' || source.submittedAt || source.submittedBy ||
            current.status !== 'in-progress' || current.submittedAt || current.submittedBy) return undefined;
          return { player: current.player, handicapSource: state.handicapSource,
            nineType: state.nineType, holes: state.holes, gameType: state.gameType,
            teeData: state.playerTeeMap.get(source.playerId) ?? state.selectedTeeData };
        },
        applyShape: (shape, priorLocalShapes, acceptedWrite, rebuild) => {
          if (!isCurrent()) return false;
          const current = get();
          if (
            shape.holes_played === null &&
            (current.holesPlayed != null ||
              [...current.groupScorecards.values()].some((card) => card.holesPlayed != null) ||
              [...priorLocalShapes.values()].some((prior) => prior.holes_played != null))
          ) {
            throw new RoundScoringWriteError(
              'local_end_pending',
              roundId,
              'A final current-session local end is pending'
            );
          }
          if (shape.holes_played === null && !rebuild) {
            throw new RoundScoringWriteError(
              'context_missing',
              roundId,
              'Nullable shape repair requires proven scoring context'
            );
          }
          const plannedHoles = filterPlayableHoles(current.holes, shape.nine_type);
          const plannedNumbers = new Set<number>(plannedHoles.map((h) => h.number));
          const required = shapeHoleNumbers(shape);
          // holes is the declared planned course list, including physical-nine
          // courses whose legacy nine label is 'full'. Never fabricate holes.
          if (
            plannedHoles.length === 0 ||
            (shape.holes_played != null && [...required].some((h) => !plannedNumbers.has(h))) ||
            plannedHoles.some((h) => !h.par || !h.strokeIndex)
          ) {
            throw new Error('Missing planned context for authoritative scoring shape');
          }
          let keep = new Set([...shapeHoleNumbers(shape)].filter((h) => plannedNumbers.has(h)));
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
            const rebuilt = rebuild
              ? rebuild(card, cardKeep, shape)
              : endEarly.rebuildEndedScorecard(
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
              ...card,
              scores: Object.fromEntries(
                Object.entries(card.scores).filter(([h]) => cardKeep.has(Number(h)))
              ),
              holesPlayed: shape.holes_played,
              totalGross: rebuilt.totalGross,
              totalNet: rebuilt.totalNet,
              total_par_score: rebuilt.total_par_score,
              teeData: rebuilt.teeData,
              syncHoles: rebuilt.syncHoles ?? card.syncHoles,
              syncGameType: rebuilt.syncGameType ?? card.syncGameType,
              coursePar: rebuilt.coursePar ?? card.coursePar,
              playerHandicap: card.playerHandicap ?? rebuilt.playerHandicap,
              playerGender:
                card.playerGender === undefined ? rebuilt.playerGender : card.playerGender,
              syncHandicapSource: card.syncHandicapSource ?? rebuilt.syncHandicapSource,
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
              : shape.holes_played == null
                ? plannedHoles[0].number
                : lastPlayedHoleNumber(shape.nine_type, shape.holes_played),
          });
          return true;
        },
      };
    },

    endRoundEarly: (n) => {
      // Capture ownership synchronously, before coordinator/local persistence waits.
      const serverBacked = [...get().groupScorecards.values()].some(card => !card.isStandalone);
      const intent = serverBacked ? { userId: getSyncAuthUserId() ?? '' } : undefined;
      return endEarly.endRoundEarly(get, set, n, { getSessionGeneration: () => roundSession, intent });
    },

    submitScorecards: async (options) => {
      const initial = get();
      const currentRoundId = initial.currentRoundId;
      if (!currentRoundId) throw new Error('No round ID set');
      const generation = roundSession;
      const ownerId = getSyncAuthUserId();
      let source = captureRoundPersistenceSource(currentRoundId);
      const session = get().captureRoundScoringSession(currentRoundId);
      const assertSession = () => {
        if (generation !== roundSession || !session?.isCurrent() || getSyncAuthUserId() !== ownerId) throw new Error('Scoring session changed during submission');
      };
      const ids = [...initial.groupScorecards.keys()].filter(id => !options?.playerIds?.length || options.playerIds.includes(id));
      const submittedAt = new Date(); // Keep completion intent only across waits.
      let errorCount = 0;
      for (const playerId of ids) {
        try {
          const prepare = (requireTerminalContext = false) => {
            assertSession();
            const state = get();
            if (!state.holes.length) throw new Error('No holes data available for submission');
            const card = state.groupScorecards.get(playerId);
            if (!card) throw new Error('Scorecard missing during submission');
            const preserveContext = hasFrozenScoringContext(card) || state.holesPlayed != null;
            const shape = { nine_type: state.nineType, holes_played: state.holesPlayed ?? card.holesPlayed ?? null };
            const basis = (requireTerminalContext && preserveContext) || shape.holes_played != null
              ? createRoundScoringContext(currentRoundId, { getLiveContext: session!.getLiveContext })(card, shapeHoleNumbers(shape), shape)
              : card;
            return {
              ...basis,
              status: card.status === 'confirmed' ? 'confirmed' as const : 'completed' as const,
              submittedAt: card.submittedAt ?? submittedAt,
              updatedAt: new Date(),
              ...(preserveContext ? {} : {
                teeData: state.getPlayerTee(playerId), playerGender: card.player?.gender || null,
                playerHandicap: card.player?.handicap || null,
                coursePar: state.holes.reduce((sum, h) => sum + (h.par || 0), 0),
                syncHoles: state.holes, syncGameType: state.gameType, syncNineType: state.nineType,
              }),
              syncHandicapSource: preserveContext ? basis.syncHandicapSource : state.handicapSource,
            };
          };
          const persist = () => withRoundPersistence(source, async lease => {
            const wasTerminal = hasFrozenScoringContext(get().groupScorecards.get(playerId)!);
            const prepared = prepare();
            await saveScorecard(prepared, { lease });
            assertSession();
            if (!getIsOnline()) await queueScorecardSync(prepare(!wasTerminal), 'update', { lease });
            assertSession();
            // Capture CURRENT scoring context before applying completion intent.
            // A retained edit/revision notification may have replaced the active
            // object while save waited, without having captured a scoring bundle.
            const completed = prepare(!wasTerminal);
            const next = new Map(get().groupScorecards);
            next.set(playerId, completed);
            set({ groupScorecards: next });
            return completed;
          });
          let prepared: Scorecard;
          try { prepared = await persist(); }
          catch (error) {
            if (!(error instanceof RoundPersistenceSourceChangedError)) throw error;
            assertSession(); source = captureRoundPersistenceSource(currentRoundId);
            prepared = await persist();
          }
          // The local lease is released before any network/coordinator acquisition.
          if (getIsOnline()) {
            assertSession();
            if (!isRoundPersistenceSourceCurrent(source)) throw new RoundPersistenceSourceChangedError(currentRoundId);
            // Reprepare CURRENT retained edits before network; common post-network recovery is C4.
            prepared = prepare();
            await syncScorecard(prepared, {
              capture: { ownerId, source, session }, readCurrent: () => prepare(),
              adoptServerRevisionOnConflict: true, markSynced: true,
              onSynced: (uploaded, serverRevision) => {
                assertSession();
                const current = get().groupScorecards.get(playerId);
                if (current?.id === uploaded.id) {
                  const next = new Map(get().groupScorecards);
                  next.set(playerId, { ...current, serverRevision: Math.max(current.serverRevision ?? 0, serverRevision) });
                  set({ groupScorecards: next });
                }
              },
            });
          }
        } catch (error) {
          errorCount++;
          storeLogger.error('Failed to submit scorecard', error, { playerId, roundId: currentRoundId });
        }
      }
      if (errorCount) throw new Error(`Failed to submit ${errorCount} scorecard(s)`);
    },

    resetRound: () => {
      roundSession += 1;
      liveScorecardOrigins.clear();
      liveRoundSession = false;
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
      multiBall.setMultiBallScore(get, set, playerId, hole, ballIndex, strokes, captureLivePersistence(playerId)),
    updateMultiBallStats: (playerId, hole, ballIndex, updates) =>
      multiBall.updateMultiBallStats(get, set, playerId, hole, ballIndex, updates, captureLivePersistence(playerId)),
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
