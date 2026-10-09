/**
 * Multi-Ball Scoring Slice
 *
 * Extracted from scorecardStore to keep multi-ball concerns isolated.
 * Each function receives Zustand `get` and `set` accessors so that
 * the main store can delegate to them without changing its public API.
 */

import { Scorecard, HoleScore, Hole } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import type { NineType } from '@/types/database/enums';
import { isHoleAfterEarlyEnd } from '@/utils/roundShape';
import { isMultiBallScore, type MultiBallHoleScore, type BallTotals } from '@/types/database/base';
import { captureRoundPersistenceSource, runRoundPersistence, RoundPersistenceSourceChangedError } from '@/services/offline/roundPersistenceBarrier';
import { saveScorecard } from '@/services/offline/database';
import type { LivePersistenceContext } from './scorecardPersistence';

import { calculateStablefordPointsNet, calculateNetScore, getStrokesReceived } from '@/utils/scoring';
import { storeLogger } from '@/utils/debugLogger';

// ---------------------------------------------------------------------------
// Minimal view of ScorecardState that the multi-ball functions need.
// Using an interface keeps this module decoupled from the full store type.
// ---------------------------------------------------------------------------
export interface MultiBallStateSlice {
  currentRoundId: string | null;
  groupScorecards: Map<string, Scorecard>;
  holes: Hole[];
  ballCount: BallCount;
  isMultiBall: boolean;
  nineType: NineType;
  holesPlayed: number | null;
}

type Get = () => MultiBallStateSlice;
type Set = (partial: Partial<MultiBallStateSlice>) => void;

/** Preserve each action's existing error policy while sharing bounded current-card rebase. */
async function persistMultiBallCard(card: Scorecard, persistence?: LivePersistenceContext): Promise<void> {
  const source = persistence?.source ?? captureRoundPersistenceSource(card.roundId);
  try {
    await runRoundPersistence(card.roundId, { source }, async (lease) => {
      if (persistence?.resolveCurrentScorecard && !persistence.resolveCurrentScorecard()) return;
      await saveScorecard(card, { lease });
    });
  } catch (error) {
    if (!(error instanceof RoundPersistenceSourceChangedError) || !persistence?.resolveCurrentScorecard) throw error;
    const current = persistence.resolveCurrentScorecard();
    if (!current || current.roundId !== card.roundId) return;
    await runRoundPersistence(card.roundId, { source: captureRoundPersistenceSource(card.roundId) }, async (lease) => {
      if (persistence.resolveCurrentScorecard!() !== current) return;
      await saveScorecard(current, { lease });
    });
  }
}

// ---------------------------------------------------------------------------
// setMultiBallConfig
// ---------------------------------------------------------------------------
export function setMultiBallConfig(set: Set, ballCount: BallCount): void {
  set({
    ballCount,
    isMultiBall: ballCount > 1,
  });
}

// ---------------------------------------------------------------------------
// setMultiBallScore
// ---------------------------------------------------------------------------
export async function setMultiBallScore(
  get: Get,
  set: Set,
  playerId: string,
  hole: number,
  ballIndex: number,
  strokes: number,
  persistence?: LivePersistenceContext,
): Promise<void> {
  const { groupScorecards, holes, ballCount, currentRoundId } = get();

  storeLogger.debug('Setting multi-ball score', {
    playerId: playerId.substring(0, 8) + '...',
    hole,
    ballIndex,
    strokes,
    ballCount,
  });

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

  // Round ended early: holes after N are closed (R17).
  const { nineType, holesPlayed } = get();
  if (isHoleAfterEarlyEnd(nineType, holesPlayed, hole)) {
    storeLogger.warn('Ignoring a multi-ball score after the last played hole', { hole, holesPlayed });
    return;
  }

  // Get or create multi-ball score structure
  const existingScore = scorecard.scores[hole];
  let multiBallScore: MultiBallHoleScore;

  if (isMultiBallScore(existingScore)) {
    multiBallScore = { ...existingScore };
  } else {
    multiBallScore = {
      balls: Array.from({ length: ballCount }, () => ({ strokes: 0 })),
    };
  }

  // Update the specific ball's score
  if (ballIndex >= 0 && ballIndex < multiBallScore.balls.length) {
    multiBallScore.balls[ballIndex] = {
      ...multiBallScore.balls[ballIndex],
      strokes,
    };
  }

  // Update the scorecard with type assertion for multi-ball compatibility
  const updatedScorecard = {
    ...scorecard,
    scores: {
      ...scorecard.scores,
      [hole]: multiBallScore,
    },
  } as Scorecard;

  // Update state
  const newMap = new Map(groupScorecards);
  newMap.set(playerId, updatedScorecard);
  set({ groupScorecards: newMap });

  // Save to offline storage (scorecard save handles the full scorecard including scores)
  if (currentRoundId) {
    await persistMultiBallCard(updatedScorecard, persistence);
  }
}

// ---------------------------------------------------------------------------
// updateMultiBallStats
// ---------------------------------------------------------------------------
export async function updateMultiBallStats(
  get: Get,
  set: Set,
  playerId: string,
  hole: number,
  ballIndex: number,
  updates: Partial<HoleScore>,
  persistence?: LivePersistenceContext,
): Promise<void> {
  const { groupScorecards, holes, ballCount, currentRoundId } = get();

  storeLogger.debug('Updating multi-ball stats', {
    playerId: playerId.substring(0, 8) + '...',
    hole,
    ballIndex,
    updates: Object.keys(updates),
  });

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

  // Round ended early: holes after N are closed (R17).
  const { nineType, holesPlayed } = get();
  if (isHoleAfterEarlyEnd(nineType, holesPlayed, hole)) {
    storeLogger.warn('Ignoring a multi-ball score after the last played hole', { hole, holesPlayed });
    return;
  }

  // Get or create multi-ball score structure
  const existingScore = scorecard.scores[hole];
  let multiBallScore: MultiBallHoleScore;

  if (isMultiBallScore(existingScore)) {
    multiBallScore = {
      balls: existingScore.balls.map((ball) => ({ ...ball })),
    };
  } else {
    multiBallScore = {
      balls: Array.from({ length: ballCount }, () => ({ strokes: 0 })),
    };
  }

  // Update the specific ball's stats (preserving existing values)
  if (ballIndex >= 0 && ballIndex < multiBallScore.balls.length) {
    multiBallScore.balls[ballIndex] = {
      ...multiBallScore.balls[ballIndex],
      ...updates,
    };
  }

  // Update the scorecard with type assertion for multi-ball compatibility
  const updatedScorecard = {
    ...scorecard,
    scores: {
      ...scorecard.scores,
      [hole]: multiBallScore,
    },
    updatedAt: new Date(),
  } as Scorecard;

  // Update state
  const newMap = new Map(groupScorecards);
  newMap.set(playerId, updatedScorecard);
  set({ groupScorecards: newMap });

  // Save to offline storage — sync is deferred to submission time
  if (currentRoundId) {
    try {
      await persistMultiBallCard(updatedScorecard, persistence);
    } catch (error) {
      storeLogger.error('Failed to save multi-ball stats', error, {
        playerId: playerId.substring(0, 8) + '...',
        hole,
        ballIndex,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// getMultiBallScores
// ---------------------------------------------------------------------------
export function getMultiBallScores(
  get: Get,
  playerId: string,
  hole: number,
): HoleScore[] {
  const { groupScorecards, ballCount } = get();
  const scorecard = groupScorecards.get(playerId);

  if (!scorecard) {
    return Array.from({ length: ballCount }, () => ({ strokes: 0 }));
  }

  const score = scorecard.scores[hole];

  if (isMultiBallScore(score)) {
    return score.balls;
  }

  // Return empty array of ball scores if not multi-ball format
  return Array.from({ length: ballCount }, () => ({ strokes: 0 }));
}

// ---------------------------------------------------------------------------
// getMultiBallTotals
// ---------------------------------------------------------------------------
export function getMultiBallTotals(
  get: Get,
  playerId: string,
): Record<string, BallTotals> {
  const { groupScorecards, holes, ballCount } = get();
  const scorecard = groupScorecards.get(playerId);
  const playerHandicap = scorecard?.player?.handicap || 0;

  const totals: Record<string, BallTotals> = {};

  for (let ballIdx = 0; ballIdx < ballCount; ballIdx++) {
    const ballNum = String(ballIdx + 1);
    totals[ballNum] = { gross: 0, net: 0, points: 0 };

    if (!scorecard) continue;

    for (const [holeNumStr, score] of Object.entries(scorecard.scores)) {
      const holeNum = parseInt(holeNumStr, 10);
      const holeData = holes.find((h) => h.number === holeNum);

      if (!holeData) continue;

      if (isMultiBallScore(score) && score.balls[ballIdx]) {
        const ballScore = score.balls[ballIdx];
        if (ballScore.strokes > 0 && ballScore.strokes < 10) { // Exclude pickup (10)
          totals[ballNum].gross += ballScore.strokes;
          const netScore = calculateNetScore(ballScore.strokes, playerHandicap, holeData);
          totals[ballNum].net += netScore;
          const strokesRcvd = getStrokesReceived(playerHandicap, holeData.strokeIndex);
          const points = calculateStablefordPointsNet(ballScore.strokes, holeData.par, strokesRcvd);
          totals[ballNum].points += points;
        }
      }
    }
  }

  return totals;
}
