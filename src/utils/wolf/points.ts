/**
 * Wolf Points Calculation Functions
 *
 * Functions for calculating points awarded to each player
 * based on the Wolf decision and hole outcome.
 */

import type {
  WolfPointValues,
  WolfPointsAwarded,
} from '@/types/database/wolf.types';
import { WOLF_POINTS } from '@/types/database/wolf.types';

/** Default Wolf point values */
export const DEFAULT_WOLF_POINT_VALUES: WolfPointValues = {
  partnerWin: WOLF_POINTS.PARTNER_WIN,
  partnerLoseOpponent: WOLF_POINTS.PARTNER_LOSE_OPPONENT,
  loneWolfWin: WOLF_POINTS.LONE_WOLF_WIN,
  loneWolfLoseOpponent: WOLF_POINTS.LONE_WOLF_LOSE_OPPONENT,
  blindWolfWin: WOLF_POINTS.BLIND_WOLF_WIN,
  blindWolfLoseOpponent: WOLF_POINTS.BLIND_WOLF_LOSE_OPPONENT,
};

/**
 * Calculate Wolf points awarded to each player for a hole.
 *
 * Point values:
 * - Partner Win: Wolf team each gets 2 points
 * - Partner Lose: Each opponent gets 3 points
 * - Lone Wolf Win: Wolf gets 4 points
 * - Lone Wolf Lose: Each opponent gets 1 point
 * - Blind Wolf Win: Wolf gets 6 points
 * - Blind Wolf Lose: Each opponent gets 2 points
 * - Tie: All players get 0 points (hole pushed)
 *
 * @param wolfId - Player ID of the Wolf
 * @param partnerId - Partner player ID, or null for lone wolf
 * @param participantIds - All player IDs in the game
 * @param wolfTeamWon - Whether the Wolf team won
 * @param isTie - Whether the hole was tied
 * @param isBlindWolf - Whether Wolf declared blind (before tee shots)
 * @param pointValues - Custom point values (optional)
 * @returns Points awarded to each player: { playerId: points }
 *
 * @example
 * // Lone Wolf wins (4 points)
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], true, false, false)
 * // { wolf: 4, p2: 0, p3: 0 }
 *
 * @example
 * // Lone Wolf loses (each opponent gets 1 point)
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], false, false, false)
 * // { wolf: 0, p2: 1, p3: 1 }
 *
 * @example
 * // Tie - hole pushed
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], false, true, false)
 * // { wolf: 0, p2: 0, p3: 0 }
 *
 * @example
 * // Blind Wolf wins (6 points)
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], true, false, true)
 * // { wolf: 6, p2: 0, p3: 0 }
 */
export function calculateWolfPoints(
  wolfId: string,
  partnerId: string | null,
  participantIds: string[],
  wolfTeamWon: boolean,
  isTie: boolean,
  isBlindWolf: boolean,
  pointValues: WolfPointValues = DEFAULT_WOLF_POINT_VALUES
): WolfPointsAwarded {
  const points: WolfPointsAwarded = {};

  // Initialize all players with 0 points
  for (const playerId of participantIds) {
    points[playerId] = 0;
  }

  // If tie, all players get 0 - hole is pushed
  if (isTie) {
    return points;
  }

  const isLoneWolf = partnerId === null;
  const wolfTeamIds = isLoneWolf ? [wolfId] : [wolfId, partnerId];
  const packIds = participantIds.filter((id) => !wolfTeamIds.includes(id));

  if (wolfTeamWon) {
    // Wolf team wins
    if (isBlindWolf) {
      // Blind Wolf wins - only Wolf gets points (6 default)
      points[wolfId] = pointValues.blindWolfWin;
    } else if (isLoneWolf) {
      // Lone Wolf wins - Wolf gets 4 points
      points[wolfId] = pointValues.loneWolfWin;
    } else {
      // Partner win - Wolf and partner each get 2 points
      points[wolfId] = pointValues.partnerWin;
      points[partnerId!] = pointValues.partnerWin;
    }
  } else {
    // Pack wins
    if (isBlindWolf) {
      // Blind Wolf loses - each opponent gets 2 points
      for (const packId of packIds) {
        points[packId] = pointValues.blindWolfLoseOpponent;
      }
    } else if (isLoneWolf) {
      // Lone Wolf loses - each opponent gets 1 point
      for (const packId of packIds) {
        points[packId] = pointValues.loneWolfLoseOpponent;
      }
    } else {
      // Partner loses - each opponent gets 3 points
      for (const packId of packIds) {
        points[packId] = pointValues.partnerLoseOpponent;
      }
    }
  }

  return points;
}
