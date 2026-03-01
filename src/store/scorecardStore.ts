/**
 * Scorecard Store - Zustand state management with offline support
 *
 * Manages the current scoring session including:
 * - Current hole being scored
 * - All player scorecards in the group
 * - Auto-save to SQLite for offline support
 * - Sync status tracking
 *
 * Note: Uses getIsOnline from sync service for consistency with sync operations.
 * The sync service maintains its own online status cache for performance.
 */

import { create } from 'zustand';
import { Scorecard, HoleScore, Player, Hole, GameType, TeeBox, HoleShotContributions } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import { isMultiBallScore, isSingleBallScore, type MultiBallHoleScore, type BallTotals } from '@/types/database/base';
import {
  saveScorecard,
  getScorecardsByRound,
  saveHoles,
  getHoles,
} from '@/services/offline/database';
import { queueScorecardSync, subscribeSyncState, getIsOnline } from '@/services/offline/sync';
import { saveScoreEntry } from '@/services/scoreMismatch';
import { calculateStablefordPoints, calculateNetScore, calculateParScore, getStrokesOnHole } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import { storeLogger, logScorecardSummary } from '@/utils/debugLogger';
import { persistScorecardUpdate } from './scorecardPersistence';
import * as multiBall from './multiBallSlice';

interface ScorecardState {
  // Current round data
  currentRoundId: string | null;
  currentPlayers: Player[];
  currentHole: number;
  holes: Hole[];
  gameType: GameType;
  selectedTeeData: TeeBox | null; // For daily handicap calculation

  // Multi-ball scoring (solo rounds only)
  ballCount: BallCount;
  isMultiBall: boolean;

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
    allowedPlayerIds?: string[],
    selectedTeeData?: TeeBox | null
  ) => Promise<void>;
  setAllowedPlayers: (playerIds: string[]) => void;
  setSelectedTeeData: (teeData: TeeBox | null) => void;
  loadFromOffline: (roundId: string) => Promise<boolean>;
  setCurrentHole: (hole: number) => void;
  setPlayerScore: (playerId: string, hole: number, strokes: number, scoredBy?: string) => Promise<void>;
  updatePlayerHoleScore: (playerId: string, hole: number, updates: Partial<HoleScore>) => Promise<void>;
  updateShotContributions: (playerId: string, hole: number, contributions: HoleShotContributions) => Promise<void>;
  updateLocalScore: (roundId: string, playerId: string, holeNumber: number, strokes: number) => Promise<void>;
  getPlayerScore: (playerId: string, hole: number) => HoleScore | MultiBallHoleScore | undefined;
  getPlayerTotals: (playerId: string) => { gross: number; net: number; points: number };
  getHoleInfo: (holeNumber: number) => Hole | undefined;
  isHoleComplete: (hole: number) => boolean;
  getCompletedHolesCount: () => number;
  submitScorecards: () => Promise<void>;
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
    selectedTeeData: null,
    ballCount: 1,
    isMultiBall: false,
    groupScorecards: new Map(),
    allowedPlayerIds: [], // Empty = all players allowed
    isOnline: true,
    isSyncing: false,
    pendingSyncCount: 0,
    syncError: null,
    isLoading: false,
    isInitialized: false,

    initializeRound: async (roundId, players, holes, gameType = 'stableford', isStandalone = false, allowedPlayerIds = [], selectedTeeData = null) => {
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

        // If no holes found in cache, don't use cached data - let network fetch handle it
        if (holes.length === 0) {
          storeLogger.warn('No cached holes found, will fetch from network', { roundId });
          set({ isLoading: false });
          return false;
        }

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
            const score = sc?.scores[h];
            // Check if single-ball score has strokes, or if multi-ball score has at least one ball
            return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
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

    setSelectedTeeData: (teeData) => {
      set({ selectedTeeData: teeData });
      storeLogger.info('Selected tee data updated', {
        hasData: !!teeData,
        slopeRating: teeData?.slopeRating,
        courseRating: teeData?.courseRating,
      });
    },

    setPlayerScore: async (playerId, hole, strokes, scoredBy) => {
      const { groupScorecards, holes, gameType, allowedPlayerIds, currentRoundId } = get();

      storeLogger.debug('Setting player score', {
        playerId: playerId.substring(0, 8) + '...',
        hole,
        strokes,
        roundId: currentRoundId?.substring(0, 8) + '...',
        scoredBy: scoredBy?.substring(0, 8) + '...',
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

      // Get existing score to preserve stats (putts, FIR, GIR, shotContributions)
      const existingScore = scorecard.scores[hole];
      const existingSingleBall = existingScore && isSingleBallScore(existingScore) ? existingScore : undefined;

      // Create the score entry, preserving existing stats and adding attribution
      const holeScore: HoleScore = {
        strokes,
        putts: existingSingleBall?.putts,
        fairwayHit: existingSingleBall?.fairwayHit,
        greenInRegulation: existingSingleBall?.greenInRegulation,
        penalties: existingSingleBall?.penalties ?? 0,
        scoredBy: scoredBy ?? existingSingleBall?.scoredBy,
        shotContributions: existingSingleBall?.shotContributions,
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
      updatedScorecard.total_par_score = totals.parScore;

      // Update state
      const newScorecards = new Map(groupScorecards);
      newScorecards.set(playerId, updatedScorecard);
      set({ groupScorecards: newScorecards });

      // Save to SQLite and queue sync
      await persistScorecardUpdate({
        holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: holeScore },
        scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
        sync: { scorecard: updatedScorecard },
        context: 'setPlayerScore',
      });

      // Also save to score_entries for mismatch detection (if scoredBy provided and not standalone)
      if (scoredBy && currentRoundId && !scorecard.isStandalone) {
        try {
          await saveScoreEntry(currentRoundId, playerId, hole, scoredBy, holeScore);
          storeLogger.debug('Score entry saved for mismatch detection', {
            roundId: currentRoundId.substring(0, 8) + '...',
            playerId: playerId.substring(0, 8) + '...',
            hole,
            scoredBy: scoredBy.substring(0, 8) + '...',
          });
        } catch (entryError) {
          // Non-critical - log but don't fail the score save
          storeLogger.warn('Failed to save score entry for mismatch detection', {
            error: entryError instanceof Error ? entryError.message : 'Unknown error',
          });
        }
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

      const rawExistingScore = scorecard.scores[hole];
      const existingScore: HoleScore = rawExistingScore && isSingleBallScore(rawExistingScore)
        ? rawExistingScore
        : { strokes: 0 };

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
      updatedScorecard.total_par_score = totals.parScore;

      // Update state
      const newScorecards = new Map(groupScorecards);
      newScorecards.set(playerId, updatedScorecard);
      set({ groupScorecards: newScorecards });

      // Save to SQLite and queue sync
      await persistScorecardUpdate({
        holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: holeScore },
        scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
        sync: { scorecard: updatedScorecard },
        context: 'updatePlayerHoleScore',
      });
    },

    updateShotContributions: async (playerId, hole, contributions) => {
      const { groupScorecards, holes, gameType } = get();

      storeLogger.debug('Updating shot contributions', {
        playerId: playerId.substring(0, 8) + '...',
        hole,
        contributions,
      });

      const scorecard = groupScorecards.get(playerId);
      if (!scorecard) {
        storeLogger.warn('Scorecard not found for player', { playerId });
        return;
      }

      const rawExistingScore = scorecard.scores[hole];
      const existingScore: HoleScore = rawExistingScore && isSingleBallScore(rawExistingScore)
        ? rawExistingScore
        : { strokes: 0 };

      // Merge contributions with existing score
      const holeScore: HoleScore = {
        ...existingScore,
        shotContributions: contributions,
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
      updatedScorecard.total_par_score = totals.parScore;

      // Update state
      const newScorecards = new Map(groupScorecards);
      newScorecards.set(playerId, updatedScorecard);
      set({ groupScorecards: newScorecards });

      // Save to SQLite and queue sync
      const saved = await persistScorecardUpdate({
        holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: holeScore },
        scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
        sync: { scorecard: updatedScorecard },
        context: 'updateShotContributions',
      });

      if (saved) {
        storeLogger.debug('Shot contributions saved', {
          playerId: playerId.substring(0, 8) + '...',
          hole,
        });
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
        return { gross: 0, net: 0, points: 0, parScore: 0 };
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
        const score = scorecard?.scores[hole];
        // Check if single-ball score has strokes, or if multi-ball score has at least one ball
        return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
      });
    },

    getCompletedHolesCount: () => {
      const { holes: _holes } = get();
      let count = 0;

      for (let h = 1; h <= 18; h++) {
        if (get().isHoleComplete(h)) {
          count++;
        }
      }

      return count;
    },

    submitScorecards: async () => {
      const { groupScorecards, currentRoundId, selectedTeeData, holes } = get();

      storeLogger.info('Submitting scorecards', {
        roundId: currentRoundId?.substring(0, 8) + '...',
        scorecardCount: groupScorecards.size,
        hasTeeData: !!selectedTeeData,
      });

      if (!currentRoundId) {
        storeLogger.error('Cannot submit - no round ID set');
        throw new Error('No round ID set');
      }

      // Calculate course par from holes for handicap differential calculation
      const safeHoles = Array.isArray(holes) ? holes : [];
      const coursePar = safeHoles.reduce((sum, h) => sum + (h.par || 0), 0);

      const now = new Date();
      const newScorecards = new Map(groupScorecards);
      let successCount = 0;
      let errorCount = 0;

      for (const [playerId, scorecard] of newScorecards) {
        try {
          // Attach sync metadata for handicap differential calculation
          // This data is used by the sync service to calculate the differential
          const updatedScorecard: Scorecard = {
            ...scorecard,
            status: 'completed',
            submittedAt: now,
            updatedAt: now,
            // Attach tee data for handicap calculation
            teeData: selectedTeeData,
            playerGender: scorecard.player?.gender || null,
            playerHandicap: scorecard.player?.handicap || null,
            coursePar,
          };

          storeLogger.debug('Submitting scorecard', logScorecardSummary(updatedScorecard));

          newScorecards.set(playerId, updatedScorecard);

          // Save to SQLite
          await saveScorecard(updatedScorecard);
          storeLogger.debug('Scorecard saved to SQLite', {
            playerId: playerId.substring(0, 8) + '...',
          });

          // Queue for sync (with metadata attached for differential calculation)
          await queueScorecardSync(updatedScorecard, 'update');
          storeLogger.debug('Scorecard queued for sync', {
            playerId: playerId.substring(0, 8) + '...',
            isStandalone: updatedScorecard.isStandalone,
            hasTeeData: !!updatedScorecard.teeData,
            playerGender: updatedScorecard.playerGender,
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
        selectedTeeData: null,
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

    // Super admin hole editing - update holes and persist to SQLite
    updateHoles: async (newHoles: Hole[]) => {
      const { currentRoundId } = get();

      storeLogger.info('Updating holes', {
        roundId: currentRoundId?.substring(0, 8) + '...',
        holeCount: newHoles.length,
      });

      // Update state immediately
      set({ holes: newHoles });

      // Persist to SQLite for offline access
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

    // Update local SQLite score after mismatch resolution
    // This ensures local state matches the resolved score from the server
    updateLocalScore: async (roundId, playerId, holeNumber, strokes) => {
      const { groupScorecards, holes, gameType } = get();

      storeLogger.debug('Updating local score after resolution', {
        roundId: roundId.substring(0, 8) + '...',
        playerId: playerId.substring(0, 8) + '...',
        holeNumber,
        strokes,
      });

      const scorecard = groupScorecards.get(playerId);
      if (!scorecard) {
        storeLogger.warn('Scorecard not found for player during local update', { playerId });
        return;
      }

      // Get existing score to preserve stats
      const existingScore = scorecard.scores[holeNumber];
      const existingSingleBall = existingScore && isSingleBallScore(existingScore) ? existingScore : undefined;

      // Update just the strokes, preserve everything else
      const holeScore: HoleScore = {
        strokes,
        putts: existingSingleBall?.putts,
        fairwayHit: existingSingleBall?.fairwayHit,
        greenInRegulation: existingSingleBall?.greenInRegulation,
        penalties: existingSingleBall?.penalties ?? 0,
        scoredBy: existingSingleBall?.scoredBy,
      };

      // Update the scorecard
      const updatedScorecard: Scorecard = {
        ...scorecard,
        scores: {
          ...scorecard.scores,
          [holeNumber]: holeScore,
        },
        updatedAt: new Date(),
      };

      // Calculate totals
      const totals = calculatePlayerTotals(updatedScorecard, holes, gameType);
      updatedScorecard.totalGross = totals.gross;
      updatedScorecard.totalNet = totals.net;
      updatedScorecard.total_par_score = totals.parScore;

      // Update state
      const newScorecards = new Map(groupScorecards);
      newScorecards.set(playerId, updatedScorecard);
      set({ groupScorecards: newScorecards });

      // Save to SQLite (no sync queue - this is a local resolution update)
      const saved = await persistScorecardUpdate({
        holeScore: { scorecardId: scorecard.id, holeNumber, score: holeScore },
        scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
        context: 'updateLocalScore',
      });

      if (saved) {
        storeLogger.debug('Local score updated after resolution', {
          playerId: playerId.substring(0, 8) + '...',
          holeNumber,
          strokes,
        });
      }
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
): { gross: number; net: number; points: number; parScore: number } {
  const playerHandicap = scorecard.player?.handicap || 0;

  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;
  let totalParScore = 0;

  for (const hole of holes) {
    const rawHoleScore = scorecard.scores[hole.number];
    if (!rawHoleScore) continue;

    // Get strokes based on score type
    const strokes = isSingleBallScore(rawHoleScore)
      ? rawHoleScore.strokes
      : rawHoleScore.balls?.[0]?.strokes; // Use first ball for multi-ball

    if (!strokes || strokes <= 0 || strokes === PICKUP_SCORE) continue;

    totalGross += strokes;

    if (gameType === 'stableford') {
      totalPoints += calculateStablefordPoints(strokes, playerHandicap, hole);
      totalNet = totalPoints; // For stableford, net = points
    } else if (gameType === 'stroke') {
      totalNet += calculateNetScore(strokes, playerHandicap, hole);
    } else if (gameType === 'par') {
      const strokesReceived = getStrokesOnHole(playerHandicap, hole);
      totalParScore += calculateParScore(strokes, hole.par, strokesReceived);
      totalNet += calculateNetScore(strokes, playerHandicap, hole);
    }
  }

  return { gross: totalGross, net: totalNet, points: totalPoints, parScore: totalParScore };
}
