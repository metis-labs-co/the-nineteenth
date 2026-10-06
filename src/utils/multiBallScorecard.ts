/**
 * Multi-Ball Scorecard Derivation
 *
 * Shared helpers that turn a scorecard's `scores` record into per-ball rows and
 * totals for solo practice rounds. Consumed by both the live review screen and
 * the read-only player scorecard so the two stay in step.
 *
 * Note: totals exclude pickups, matching how a picked-up ball is displayed
 * everywhere else — it scores no points and contributes no gross.
 */

import { PICKUP_SCORE } from '@/constants/scoring';
import { isMultiBallScore } from '@/types/database/base';
import { calculateStablefordPointsNet, getStrokesReceived } from '@/utils/scoring';
import type { ScoresRecord } from '@/utils/scorecardCalculations';
import type { BallCount } from '@/types/multiball.types';
import type { Hole, HoleScore } from '@/types';

export interface BallScoreData {
  strokes: number | undefined;
  stablefordPoints: number;
  isPickup: boolean;
  fairwayHit: boolean | undefined;
  greenInRegulation: boolean | undefined;
}

export interface MultiBallHoleRowData {
  hole: Hole;
  strokesReceived: number;
  balls: BallScoreData[];
}

export interface MultiBallStats {
  /** Per-ball stats indexed by ball number (1-based) */
  ballStats: {
    [ballNumber: number]: {
      front9Gross: number;
      back9Gross: number;
      front9Stableford: number;
      back9Stableford: number;
      totalGross: number;
      totalStableford: number;
    };
  };
  front9Par: number;
  back9Par: number;
  totalPar: number;
}

const MAX_BALL_COUNT = 4;

function emptyBall(): BallScoreData {
  return {
    strokes: undefined,
    stablefordPoints: 0,
    isPickup: false,
    fairwayHit: undefined,
    greenInRegulation: undefined,
  };
}

/** True when any hole in the record holds a multi-ball score. */
export function hasMultiBallScores(scores: ScoresRecord | null | undefined): boolean {
  if (!scores) return false;
  return Object.values(scores).some((score) => isMultiBallScore(score));
}

/**
 * Widest ball array across all holes, clamped to the supported range. Used to
 * recover the ball count from stored scores when the round config isn't loaded.
 */
export function detectBallCount(scores: ScoresRecord | null | undefined): BallCount {
  if (!scores) return 1;

  let widest = 1;
  for (const score of Object.values(scores)) {
    if (isMultiBallScore(score)) {
      widest = Math.max(widest, score.balls.length);
    }
  }

  return Math.min(widest, MAX_BALL_COUNT) as BallCount;
}

interface BuildMultiBallHoleDataArgs {
  holes: Hole[];
  scores: ScoresRecord | null | undefined;
  dailyHandicap: number;
  ballCount: BallCount;
}

/** One row per hole, each carrying exactly `ballCount` ball entries. */
export function buildMultiBallHoleData({
  holes,
  scores,
  dailyHandicap,
  ballCount,
}: BuildMultiBallHoleDataArgs): MultiBallHoleRowData[] {
  return holes.map((hole) => {
    const score = scores?.[String(hole.number)];
    const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
    const balls: BallScoreData[] = [];

    for (let i = 0; i < ballCount; i++) {
      if (!score || !isMultiBallScore(score)) {
        balls.push(emptyBall());
        continue;
      }

      const ballScore = score.balls[i] as HoleScore | undefined;
      const strokes = ballScore?.strokes;
      const isPickup = strokes !== undefined && strokes >= PICKUP_SCORE;

      balls.push({
        strokes,
        stablefordPoints:
          strokes && strokes > 0 && !isPickup
            ? calculateStablefordPointsNet(strokes, hole.par, strokesReceived)
            : 0,
        isPickup,
        fairwayHit: ballScore?.fairwayHit,
        greenInRegulation: ballScore?.greenInRegulation,
      });
    }

    return { hole, strokesReceived, balls };
  });
}

/** Front/back/total gross and stableford, accumulated independently per ball. */
export function buildMultiBallStats(
  holeData: MultiBallHoleRowData[],
  ballCount: BallCount
): MultiBallStats {
  const ballStats: MultiBallStats['ballStats'] = {};

  for (let ball = 1; ball <= ballCount; ball++) {
    ballStats[ball] = {
      front9Gross: 0,
      back9Gross: 0,
      front9Stableford: 0,
      back9Stableford: 0,
      totalGross: 0,
      totalStableford: 0,
    };
  }

  let front9Par = 0;
  let back9Par = 0;

  for (const { hole, balls } of holeData) {
    const isFront9 = hole.number <= 9;

    if (isFront9) {
      front9Par += hole.par;
    } else {
      back9Par += hole.par;
    }

    balls.forEach((ball, index) => {
      const stats = ballStats[index + 1];
      if (!stats || !ball.strokes || ball.isPickup) return;

      if (isFront9) {
        stats.front9Gross += ball.strokes;
        stats.front9Stableford += ball.stablefordPoints;
      } else {
        stats.back9Gross += ball.strokes;
        stats.back9Stableford += ball.stablefordPoints;
      }
    });
  }

  for (let ball = 1; ball <= ballCount; ball++) {
    const stats = ballStats[ball];
    stats.totalGross = stats.front9Gross + stats.back9Gross;
    stats.totalStableford = stats.front9Stableford + stats.back9Stableford;
  }

  return { ballStats, front9Par, back9Par, totalPar: front9Par + back9Par };
}
