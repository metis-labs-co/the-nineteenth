/**
 * scoreUpdateSlice - Score update actions for scorecardStore
 *
 * All score update methods follow the same pattern:
 * 1. Validate player/scorecard exists
 * 2. Build updated hole score
 * 3. Calculate totals
 * 4. Update state
 * 5. Persist to SQLite
 */

import { Scorecard, HoleScore, Hole, GameType, HoleShotContributions, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import { isSingleBallScore } from '@/types/database/base';
import { storeLogger } from '@/utils/debugLogger';
import { isHoleAfterEarlyEnd } from '@/utils/roundShape';
import { captureRoundPersistenceSource } from '@/services/offline/roundPersistenceBarrier';
import { persistScorecardUpdate, type LivePersistenceContext } from './scorecardPersistence';
import { debouncedQueueScorecardSync } from './scorecardSyncDebounce';
import { calculatePlayerTotals } from './utils/scorecardCalculations';

interface StoreState {
  groupScorecards: Map<string, Scorecard>;
  holes: Hole[];
  gameType: GameType;
  allowedPlayerIds: string[];
  currentRoundId: string | null;
  selectedTeeData: TeeBox | null;
  playerTeeMap: Map<string, TeeBox>;
  handicapSource: HandicapSource;
  nineType: NineType;
  /** Set once the round is ended early; null otherwise. */
  holesPlayed: number | null;
}

type GetFn = () => StoreState;
type SetFn = (partial: { groupScorecards: Map<string, Scorecard> }) => void;

/**
 * Common pattern: update scorecard with new hole score, recalculate totals, persist.
 *
 * Returns null without changing state for an unplanned hole or one after an
 * early end (R17). Every single-ball write funnels through here; callers must
 * stop on null before persistence or sync.
 */
function applyScoreUpdate(
  scorecard: Scorecard,
  playerId: string,
  hole: number,
  holeScore: HoleScore,
  groupScorecards: Map<string, Scorecard>,
  holes: Hole[],
  gameType: GameType,
  set: SetFn,
  state: Pick<StoreState, 'selectedTeeData' | 'playerTeeMap' | 'handicapSource' | 'nineType' | 'holesPlayed'>,
): Scorecard | null {
  if (!holes.some((h) => h.number === hole) || isHoleAfterEarlyEnd(state.nineType, state.holesPlayed, hole)) {
    storeLogger.warn('Ignoring a score for a closed or unknown hole', {
      playerId: playerId.substring(0, 8) + '...',
      hole,
      holesPlayed: state.holesPlayed,
    });
    return null;
  }

  const updatedScorecard: Scorecard = {
    ...scorecard,
    scores: {
      ...scorecard.scores,
      [hole]: holeScore,
    },
    updatedAt: new Date(),
  };

  // Resolve the player's effective tee (per-player override ∨ round default)
  // so the totals calc can compute WHS DHC instead of using raw profile HC.
  const playerTee = state.playerTeeMap.get(playerId) ?? state.selectedTeeData;
  const totals = calculatePlayerTotals(updatedScorecard, holes, gameType, {
    selectedTee: playerTee,
    handicapSource: state.handicapSource,
    nineType: state.nineType,
  });
  updatedScorecard.totalGross = totals.gross;
  updatedScorecard.totalNet = totals.net;
  updatedScorecard.total_par_score = totals.parScore;

  const newScorecards = new Map(groupScorecards);
  newScorecards.set(playerId, updatedScorecard);
  set({ groupScorecards: newScorecards });

  return updatedScorecard;
}

export async function setPlayerScore(
  get: GetFn,
  set: SetFn,
  playerId: string,
  hole: number,
  strokes: number,
  scoredBy?: string,
  persistence?: LivePersistenceContext,
): Promise<void> {
  const {
    groupScorecards,
    holes,
    gameType,
    allowedPlayerIds,
    currentRoundId,
    selectedTeeData,
    playerTeeMap,
    handicapSource,
    nineType,
    holesPlayed,
  } = get();

  storeLogger.debug('Setting player score', {
    playerId: playerId.substring(0, 8) + '...',
    hole,
    strokes,
    roundId: currentRoundId?.substring(0, 8) + '...',
    scoredBy: scoredBy?.substring(0, 8) + '...',
  });

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

  const existingScore = scorecard.scores[hole];
  const existingSingleBall = existingScore && isSingleBallScore(existingScore) ? existingScore : undefined;

  const holeScore: HoleScore = {
    strokes,
    putts: existingSingleBall?.putts,
    fairwayHit: existingSingleBall?.fairwayHit,
    greenInRegulation: existingSingleBall?.greenInRegulation,
    penalties: existingSingleBall?.penalties ?? 0,
    scoredBy: scoredBy ?? existingSingleBall?.scoredBy,
    shotContributions: existingSingleBall?.shotContributions,
  };

  const updatedScorecard = applyScoreUpdate(scorecard, playerId, hole, holeScore, groupScorecards, holes, gameType, set, {
    selectedTeeData,
    playerTeeMap,
    handicapSource,
    nineType,
    holesPlayed,
  });
  if (!updatedScorecard) return;
  const proof = persistence ?? { source: captureRoundPersistenceSource(scorecard.roundId) };

  // Persist to SQLite synchronously, then debounce a Supabase sync so other
  // devices viewing the round (organisers, other players) see live in-progress
  // scoring. The debounce coalesces rapid taps; the server-side completeness
  // check in scorecardSync.ts skips upserts whose local copy has fewer holes
  // than the server already has, mitigating the original race condition that
  // led this sync to be deferred to submission time.
  //
  // Score entries for mismatch detection (score_entries table) are NOT written
  // here per-keystroke. That immediate write used to race the debounced sync's
  // own score_entries write on the same rows, causing row-lock contention and
  // 8s statement timeouts. The debounced scorecard sync (syncScoreEntries) is
  // now the single writer, batching all of this player's entries into one
  // upsert ~2s after the last tap.
  await persistScorecardUpdate({
    ...proof,
    holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: holeScore },
    scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
    context: 'setPlayerScore',
  });

  const getCurrentScorecard = persistence?.resolveCurrentScorecard ?? (() => get().groupScorecards.get(playerId));
  // A cancelled old session must not replace a new session's timer for the same card ID.
  if (currentRoundId && !scorecard.isStandalone && getCurrentScorecard()) {
    debouncedQueueScorecardSync(scorecard.id, getCurrentScorecard);
  }
}

export async function updatePlayerHoleScore(
  get: GetFn,
  set: SetFn,
  playerId: string,
  hole: number,
  updates: Partial<HoleScore>,
  persistence?: LivePersistenceContext,
): Promise<void> {
  const { groupScorecards, holes, gameType, allowedPlayerIds, selectedTeeData, playerTeeMap, handicapSource, nineType, holesPlayed } = get();

  if (allowedPlayerIds.length > 0 && !allowedPlayerIds.includes(playerId)) {
    storeLogger.warn('Player not in allowed list, rejecting hole score update', { playerId });
    return;
  }

  const scorecard = groupScorecards.get(playerId);
  if (!scorecard) {
    storeLogger.warn('Scorecard not found for player', { playerId });
    return;
  }

  const rawExistingScore = scorecard.scores[hole];
  const existingScore: HoleScore = rawExistingScore && isSingleBallScore(rawExistingScore)
    ? rawExistingScore
    : { strokes: 0 };

  const holeScore: HoleScore = {
    ...existingScore,
    ...updates,
  };

  const updatedScorecard = applyScoreUpdate(scorecard, playerId, hole, holeScore, groupScorecards, holes, gameType, set, {
    selectedTeeData,
    playerTeeMap,
    handicapSource,
    nineType,
    holesPlayed,
  });
  if (!updatedScorecard) return;
  const proof = persistence ?? { source: captureRoundPersistenceSource(scorecard.roundId) };

  await persistScorecardUpdate({
    ...proof,
    holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: holeScore },
    scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
    context: 'updatePlayerHoleScore',
  });
}

export async function updateShotContributions(
  get: GetFn,
  set: SetFn,
  playerId: string,
  hole: number,
  contributions: HoleShotContributions,
  persistence?: LivePersistenceContext,
): Promise<void> {
  const { groupScorecards, holes, gameType, selectedTeeData, playerTeeMap, handicapSource, nineType, holesPlayed } = get();

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

  const holeScore: HoleScore = {
    ...existingScore,
    shotContributions: contributions,
  };

  const updatedScorecard = applyScoreUpdate(scorecard, playerId, hole, holeScore, groupScorecards, holes, gameType, set, {
    selectedTeeData,
    playerTeeMap,
    handicapSource,
    nineType,
    holesPlayed,
  });
  if (!updatedScorecard) return;
  const proof = persistence ?? { source: captureRoundPersistenceSource(scorecard.roundId) };

  const saved = await persistScorecardUpdate({
    ...proof,
    holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: holeScore },
    scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
    context: 'updateShotContributions',
  });

  if (saved) {
    storeLogger.debug('Shot contributions saved', {
      playerId: playerId.substring(0, 8) + '...',
      hole,
    });
  }
}

export async function updateLocalScore(
  get: GetFn,
  set: SetFn,
  roundId: string,
  playerId: string,
  holeNumber: number,
  strokes: number,
  persistence?: LivePersistenceContext,
): Promise<void> {
  const { groupScorecards, holes, gameType, selectedTeeData, playerTeeMap, handicapSource, nineType, holesPlayed } = get();

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

  const existingScore = scorecard.scores[holeNumber];
  const existingSingleBall = existingScore && isSingleBallScore(existingScore) ? existingScore : undefined;

  const holeScore: HoleScore = {
    strokes,
    putts: existingSingleBall?.putts,
    fairwayHit: existingSingleBall?.fairwayHit,
    greenInRegulation: existingSingleBall?.greenInRegulation,
    penalties: existingSingleBall?.penalties ?? 0,
    scoredBy: existingSingleBall?.scoredBy,
  };

  const updatedScorecard = applyScoreUpdate(scorecard, playerId, holeNumber, holeScore, groupScorecards, holes, gameType, set, {
    selectedTeeData,
    playerTeeMap,
    handicapSource,
    nineType,
    holesPlayed,
  });
  if (!updatedScorecard) return;
  const proof = persistence ?? { source: captureRoundPersistenceSource(scorecard.roundId) };

  const saved = await persistScorecardUpdate({
    ...proof,
    holeScore: { scorecardId: scorecard.id, holeNumber, score: holeScore },
    scorecard: { scorecardId: scorecard.id, scorecard: updatedScorecard },
    context: 'updateLocalScore',
  });

  const getCurrentScorecard = persistence?.resolveCurrentScorecard ?? (() => get().groupScorecards.get(playerId));
  if (!scorecard.isStandalone && getCurrentScorecard()) {
    debouncedQueueScorecardSync(scorecard.id, getCurrentScorecard);
  }

  if (saved) {
    storeLogger.debug('Local score updated after resolution', {
      playerId: playerId.substring(0, 8) + '...',
      holeNumber,
      strokes,
    });
  }
}
