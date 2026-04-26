/**
 * Par Game Scoring Engine
 *
 * Par game (also known as "Bogey" in some regions) scores each hole as
 * win (+1), square (0), or loss (-1) versus net par. Round total is the
 * sum across played holes; higher is better. Reuses
 * `calculateParScore` from `@/utils/scoring` so per-hole scoring stays
 * identical to the inline scorecard renderers (no duplicate formula).
 */

import type { IScoringEngine } from './IScoringEngine';
import type {
  ScoringResult,
  LeaderboardEntry,
  ScorecardWithHandicap,
  CourseHoleData,
  EngineConfig,
  HoleScore,
} from '../types';
import { DEFAULT_ENGINE_CONFIG } from '../types';
import { getPlayingHandicap, calculateStrokesForHole } from '../utils/handicapUtils';
import { calculateNetScore } from '../utils/netScoreUtils';
import {
  sortByScore,
  assignPositions,
  createLeaderboardEntry,
} from '../utils/leaderboardUtils';
import { calculateParScore } from '@/utils/scoring';

export class ParEngine implements IScoringEngine {
  readonly gameType = 'par';
  readonly higherIsBetter = true;

  calculateScore(
    { scorecard, handicap }: ScorecardWithHandicap,
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): ScoringResult {
    const playingHandicap = config.useHandicap
      ? getPlayingHandicap(
          handicap,
          courseData.slopeRating,
          courseData.courseRating,
          courseData.par,
          'par'
        )
      : 0;

    const scores = this.parseScores(scorecard.scores);
    const holeMap = new Map(courseData.holes.map((h) => [h.number, h]));

    let totalParScore = 0;
    let totalGross = 0;
    let totalNet = 0;

    for (const score of scores) {
      const hole = holeMap.get(score.holeNumber);
      if (!hole || score.strokes === null || score.strokes === undefined) {
        continue;
      }

      const gross = score.strokes;
      totalGross += gross;

      const strokesReceived = calculateStrokesForHole(
        playingHandicap,
        hole.strokeIndex
      );
      totalNet += calculateNetScore(gross, strokesReceived);

      totalParScore += calculateParScore(gross, hole.par, strokesReceived);
    }

    return {
      rawScore: totalParScore,
      resultData: {
        par_score: totalParScore,
        gross_score: totalGross,
        net_score: totalNet,
      },
      grossScore: totalGross,
      netScore: totalNet,
    };
  }

  calculateLeaderboard(
    scorecards: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): LeaderboardEntry[] {
    if (scorecards.length === 0) {
      return [];
    }

    const entries: LeaderboardEntry[] = scorecards.map((sc) => {
      const result = this.calculateScore(sc, courseData, config);
      return createLeaderboardEntry(sc.scorecard.player_id, result, false);
    });

    const sorted = sortByScore(entries, { higherIsBetter: true });
    return assignPositions(sorted);
  }

  private parseScores(scores: Record<string, unknown> | null): HoleScore[] {
    if (!scores) return [];

    const result: HoleScore[] = [];

    for (const [key, value] of Object.entries(scores)) {
      const holeNumber = parseInt(key, 10);
      if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) {
        continue;
      }

      if (typeof value === 'number') {
        result.push({ holeNumber, strokes: value });
      } else if (typeof value === 'object' && value !== null) {
        const scoreObj = value as Record<string, unknown>;
        const strokes = scoreObj.strokes ?? scoreObj.score;
        if (typeof strokes === 'number') {
          result.push({
            holeNumber,
            strokes,
            putts: typeof scoreObj.putts === 'number' ? scoreObj.putts : undefined,
          });
        }
      }
    }

    return result;
  }
}

export function createParEngine(): ParEngine {
  return new ParEngine();
}
