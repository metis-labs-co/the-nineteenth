/**
 * Match Play Scoring Engine
 *
 * Implements match play scoring where two players compete hole-by-hole.
 * Each hole is won, lost, or halved based on net scores.
 */

import type { IScoringEngine } from './IScoringEngine';
import type {
  ScoringResult,
  LeaderboardEntry,
  ScorecardWithHandicap,
  CourseHoleData,
  EngineConfig,
  MatchResult,
  MatchHoleResult,
  HoleScore,
} from '../types';
import { DEFAULT_ENGINE_CONFIG } from '../types';
import { getPlayingHandicap, calculateStrokesForHole } from '../utils/handicapUtils';
import { calculateNetScore } from '../utils/netScoreUtils';
import { assignPositions, createLeaderboardEntry } from '../utils/leaderboardUtils';
import { formatMatchMargin } from '@/utils/matchMargin';

/**
 * Match Play scoring engine.
 *
 * In match play, two players compete hole-by-hole.
 * The player with the lower net score wins the hole.
 * The match is won when a player is up by more holes than remain.
 *
 * Results are expressed as:
 * - "3&2" (won 3 up with 2 holes remaining)
 * - "1UP" (won 1 up on the 18th)
 * - "A/S" (All Square / Halved)
 */
export class MatchPlayEngine implements IScoringEngine {
  readonly gameType = 'match-play';
  readonly higherIsBetter = true; // Higher "holes up" is better

  /**
   * Calculate match play result for a single scorecard
   *
   * Note: Match play requires both players' scorecards to determine result.
   * This method calculates a "points won" total based on holes won vs lost.
   */
  calculateScore(
    { scorecard }: ScorecardWithHandicap,
    _courseData: CourseHoleData,
    _config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): ScoringResult {
    // For individual scorecard, we can't calculate match result
    // Return the holes won from stored match data if available
    const matchData = this.extractMatchData(scorecard.scores);

    if (matchData) {
      return {
        rawScore: matchData.holesUp,
        resultData: {
          match_result: matchData.result,
          final_margin: matchData.margin,
          holes_won: matchData.holesWon,
          holes_lost: matchData.holesLost,
          holes_halved: matchData.holesHalved,
        },
        grossScore: 0,
        netScore: 0,
      };
    }

    // No match data available
    return {
      rawScore: 0,
      resultData: {},
      grossScore: 0,
      netScore: 0,
    };
  }

  /**
   * Calculate leaderboard from match play results
   *
   * For match play, the leaderboard is based on match outcomes:
   * - Win = 3 points (or configured)
   * - Halved = 1 point
   * - Loss = 0 points
   */
  calculateLeaderboard(
    scorecards: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): LeaderboardEntry[] {
    if (scorecards.length === 0) {
      return [];
    }

    // Calculate scores for all players
    const entries: LeaderboardEntry[] = scorecards.map((sc) => {
      const result = this.calculateScore(sc, courseData, config);
      return createLeaderboardEntry(sc.scorecard.player_id, result, false);
    });

    // Sort by match points (wins/halves)
    entries.sort((a, b) => {
      // First by result type (win > halved > loss)
      const resultA = a.resultData.match_result as string | undefined;
      const resultB = b.resultData.match_result as string | undefined;

      const pointsA = this.getMatchPoints(resultA);
      const pointsB = this.getMatchPoints(resultB);

      if (pointsA !== pointsB) {
        return pointsB - pointsA;
      }

      // Then by margin if both won
      return b.rawScore - a.rawScore;
    });

    return assignPositions(entries);
  }

  /**
   * Calculate a full match result between two players
   */
  calculateMatch(
    player1: ScorecardWithHandicap,
    player2: ScorecardWithHandicap,
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): MatchResult {
    // Get playing handicaps
    const handicap1 = config.useHandicap
      ? getPlayingHandicap(
          player1.handicap,
          courseData.slopeRating,
          courseData.courseRating,
          courseData.par,
          'match-play'
        )
      : 0;

    const handicap2 = config.useHandicap
      ? getPlayingHandicap(
          player2.handicap,
          courseData.slopeRating,
          courseData.courseRating,
          courseData.par,
          'match-play'
        )
      : 0;

    // In match play, difference in handicaps determines strokes given
    const handicapDiff = Math.abs(handicap1 - handicap2);
    const player1GivesStrokes = handicap1 < handicap2;

    // Parse scores
    const scores1 = this.parseScores(player1.scorecard.scores);
    const scores2 = this.parseScores(player2.scorecard.scores);

    // Calculate hole-by-hole results
    const holeResults: MatchHoleResult[] = [];
    let player1Up = 0;
    let player2Up = 0;
    let holesPlayed = 0;

    // Iterate the round's actual holes — back-9 / combo rounds carry numbers
    // 10..18 (or 10..27), not 1..18.
    for (const hole of courseData.holes) {
      const holeNum = hole.number;

      const score1 = scores1.find((s) => s.holeNumber === holeNum);
      const score2 = scores2.find((s) => s.holeNumber === holeNum);

      // Calculate strokes received on this hole
      let strokes1 = 0;
      let strokes2 = 0;

      if (handicapDiff > 0) {
        const receivingPlayer = player1GivesStrokes ? 2 : 1;
        const strokesReceived = calculateStrokesForHole(
          handicapDiff,
          hole.strokeIndex
        );

        if (receivingPlayer === 1) {
          strokes1 = strokesReceived;
        } else {
          strokes2 = strokesReceived;
        }
      }

      const gross1 = score1?.strokes ?? null;
      const gross2 = score2?.strokes ?? null;

      const net1 = gross1 !== null ? calculateNetScore(gross1, strokes1) : null;
      const net2 = gross2 !== null ? calculateNetScore(gross2, strokes2) : null;

      let result: MatchHoleResult['result'] = 'incomplete';

      if (net1 !== null && net2 !== null) {
        holesPlayed++;

        if (net1 < net2) {
          result = 'player1';
          player1Up++;
        } else if (net2 < net1) {
          result = 'player2';
          player2Up++;
        } else {
          result = 'halved';
        }
      }

      holeResults.push({
        holeNumber: holeNum,
        player1Score: gross1,
        player2Score: gross2,
        player1NetScore: net1,
        player2NetScore: net2,
        result,
      });

      // Check if match is dormie or won
      const holesRemaining = 18 - holeNum;
      const currentMargin = Math.abs(player1Up - player2Up);

      if (currentMargin > holesRemaining) {
        // Match is over
        break;
      }
    }

    // Determine final result
    const netUp = player1Up - player2Up;
    const holesRemaining = 18 - holesPlayed;

    let result: MatchResult['result'];
    let margin: string | undefined;

    if (netUp > 0) {
      result = 'player1';
      margin = formatMatchMargin(netUp, holesRemaining, false);
    } else if (netUp < 0) {
      result = 'player2';
      margin = formatMatchMargin(Math.abs(netUp), holesRemaining, false);
    } else if (holesPlayed === 18) {
      result = 'halved';
      margin = formatMatchMargin(0, 0, true);
    } else {
      result = 'incomplete';
    }

    return {
      player1Id: player1.scorecard.player_id,
      player2Id: player2.scorecard.player_id,
      result,
      margin,
      holesPlayed,
      player1Up,
      player2Up,
      holeResults,
    };
  }

  /**
   * Get match points for a result
   */
  private getMatchPoints(result?: string): number {
    switch (result) {
      case 'win':
        return 3;
      case 'halved':
        return 1;
      case 'loss':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Extract match data from scorecard scores
   */
  private extractMatchData(scores: Record<string, unknown> | null): {
    result: 'win' | 'loss' | 'halved';
    margin?: string;
    holesUp: number;
    holesWon: number;
    holesLost: number;
    holesHalved: number;
  } | null {
    if (!scores || typeof scores !== 'object') {
      return null;
    }

    // Look for match play specific data
    const matchKey = 'match';
    const matchData = (scores as Record<string, unknown>)[matchKey];

    if (matchData && typeof matchData === 'object') {
      const data = matchData as Record<string, unknown>;
      const result = data.result as 'win' | 'loss' | 'halved' | undefined;

      if (!result) {
        return null;
      }

      return {
        result,
        margin: data.margin as string | undefined,
        holesUp:
          result === 'win'
            ? (data.holes_won as number) || 0
            : result === 'loss'
              ? -((data.holes_lost as number) || 0)
              : 0,
        holesWon: (data.holes_won as number) || 0,
        holesLost: (data.holes_lost as number) || 0,
        holesHalved: (data.holes_halved as number) || 0,
      };
    }

    return null;
  }

  /**
   * Parse scores from scorecard JSON
   */
  private parseScores(scores: Record<string, unknown> | null): HoleScore[] {
    if (!scores) {
      return [];
    }

    const result: HoleScore[] = [];

    for (const [key, value] of Object.entries(scores)) {
      const holeNumber = parseInt(key, 10);
      if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) {
        continue;
      }

      if (typeof value === 'number') {
        result.push({
          holeNumber,
          strokes: value,
        });
      } else if (typeof value === 'object' && value !== null) {
        const scoreObj = value as Record<string, unknown>;
        const strokes = scoreObj.strokes ?? scoreObj.score;
        if (typeof strokes === 'number') {
          result.push({
            holeNumber,
            strokes,
          });
        }
      }
    }

    return result;
  }
}

/**
 * Create a new Match Play engine instance
 */
export function createMatchPlayEngine(): MatchPlayEngine {
  return new MatchPlayEngine();
}
