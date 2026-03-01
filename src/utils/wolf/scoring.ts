/**
 * Wolf Scoring Functions
 *
 * Functions for calculating net scores and determining hole results
 * in the Wolf game.
 */

import type {
  WolfHoleScores,
  WolfScoringType,
  WolfHoleResult,
} from '@/types/database/wolf.types';
import { calculateNetScoreFromStrokes } from '../scoring';

/** Minimum players for Wolf (3 players) */
const MIN_WOLF_PLAYERS = 3;

/**
 * Calculate net score from gross score and strokes received.
 * Simple wrapper for clarity in Wolf context.
 *
 * @param grossScore - Player's gross score on the hole
 * @param strokesReceived - Handicap strokes received on this hole
 * @returns Net score for the hole
 *
 * @example
 * calculateNetScore(5, 1) // 4 (gross 5 minus 1 stroke)
 * calculateNetScore(4, 0) // 4 (no strokes received)
 */
export function calculateNetScore(
  grossScore: number,
  strokesReceived: number
): number {
  return calculateNetScoreFromStrokes(grossScore, strokesReceived);
}

/**
 * Get the effective score for a player based on scoring type.
 *
 * @param grossScore - Player's gross score
 * @param handicapStrokes - Strokes received on this hole (for net scoring)
 * @param scoringType - 'gross' or 'net'
 * @returns The score to use for comparison
 */
function getEffectiveScore(
  grossScore: number,
  handicapStrokes: number,
  scoringType: WolfScoringType
): number {
  if (scoringType === 'net') {
    return grossScore - handicapStrokes;
  }
  return grossScore;
}

/**
 * Determine the result of a Wolf hole.
 *
 * Wolf team wins if:
 * - Lone Wolf: Wolf's score is strictly better (lower) than ALL other players
 * - With Partner: Best of Wolf/Partner is strictly better than best of others
 *
 * Tie occurs if best scores are equal - no points awarded (hole is "pushed").
 *
 * @param wolfId - Player ID of the Wolf
 * @param partnerId - Partner player ID, or null for lone wolf
 * @param holeScores - Gross scores for all players: { playerId: grossScore }
 * @param scoringType - 'gross' or 'net'
 * @param handicapStrokes - Strokes received per player (required for net scoring)
 * @returns Result with wolfTeamWon and isTie flags
 *
 * @example
 * // Lone Wolf wins
 * determineWolfHoleResult('wolf', null, { wolf: 4, p2: 5, p3: 5 }, 'gross')
 * // { wolfTeamWon: true, isTie: false }
 *
 * @example
 * // Pack wins against Lone Wolf
 * determineWolfHoleResult('wolf', null, { wolf: 5, p2: 4, p3: 5 }, 'gross')
 * // { wolfTeamWon: false, isTie: false }
 *
 * @example
 * // Tie - hole pushed
 * determineWolfHoleResult('wolf', null, { wolf: 4, p2: 4, p3: 5 }, 'gross')
 * // { wolfTeamWon: false, isTie: true }
 *
 * @example
 * // Wolf with partner wins
 * determineWolfHoleResult('wolf', 'p2', { wolf: 5, p2: 3, p3: 4 }, 'gross')
 * // { wolfTeamWon: true, isTie: false } (partner p2 has best score)
 */
export function determineWolfHoleResult(
  wolfId: string,
  partnerId: string | null,
  holeScores: WolfHoleScores,
  scoringType: WolfScoringType,
  handicapStrokes?: Record<string, number>
): WolfHoleResult {
  const playerIds = Object.keys(holeScores);

  if (playerIds.length < MIN_WOLF_PLAYERS) {
    throw new Error(`Wolf requires at least ${MIN_WOLF_PLAYERS} players`);
  }

  // Calculate effective scores (gross or net)
  const effectiveScores: Record<string, number> = {};
  for (const playerId of playerIds) {
    const grossScore = holeScores[playerId];
    const strokes = handicapStrokes?.[playerId] ?? 0;
    effectiveScores[playerId] = getEffectiveScore(grossScore, strokes, scoringType);
  }

  // Determine Wolf team and Pack
  const isLoneWolf = partnerId === null;
  const wolfTeamIds = isLoneWolf ? [wolfId] : [wolfId, partnerId];
  const packIds = playerIds.filter((id) => !wolfTeamIds.includes(id));

  // Find best score for each team
  const wolfTeamBestScore = Math.min(
    ...wolfTeamIds.map((id) => effectiveScores[id])
  );
  const packBestScore = Math.min(
    ...packIds.map((id) => effectiveScores[id])
  );

  // Determine result
  if (wolfTeamBestScore === packBestScore) {
    // Tie - hole is pushed, no points awarded
    return { wolfTeamWon: false, isTie: true };
  }

  // Wolf team wins if their best score is strictly lower
  const wolfTeamWon = wolfTeamBestScore < packBestScore;

  return { wolfTeamWon, isTie: false };
}
