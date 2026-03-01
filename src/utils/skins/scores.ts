/**
 * Skins Score Preparation Functions
 *
 * Functions for preparing hole scores for individual participants.
 */

import type { Hole } from '@/types/database';
import type { SkinsHoleScores } from '@/types/database';
import { getStrokesReceived } from '../scoring';

/**
 * Participant info needed for score preparation
 */
export interface SkinsParticipantInfo {
  id: string;
  handicap: number | null;
}

/**
 * Scorecard data structure for a participant
 */
export interface SkinsScorecardData {
  [holeNumber: string]: { strokes: number } | number;
}

/**
 * Prepare hole scores for all participants on a specific hole.
 * Calculates gross, net, and strokes received for each player.
 *
 * @param participants - Array of participant info with id and handicap
 * @param scorecards - Map of player ID to their scorecard data
 * @param hole - Hole data with par and strokeIndex
 * @param holeNumber - The hole number (1-18)
 * @returns SkinsHoleScores record for database storage
 *
 * @example
 * const scores = prepareHoleScores(
 *   [{ id: 'p1', handicap: 18 }, { id: 'p2', handicap: 10 }],
 *   { p1: { '1': { strokes: 5 } }, p2: { '1': { strokes: 4 } } },
 *   { par: 4, strokeIndex: 5 },
 *   1
 * );
 * // Returns: { p1: { gross: 5, net: 4, strokes_received: 1 }, p2: { gross: 4, net: 4, strokes_received: 0 } }
 */
export function prepareHoleScores(
  participants: SkinsParticipantInfo[],
  scorecards: Record<string, SkinsScorecardData>,
  hole: Pick<Hole, 'par' | 'strokeIndex'>,
  holeNumber: number
): SkinsHoleScores {
  const holeScores: SkinsHoleScores = {};

  for (const participant of participants) {
    const scorecard = scorecards[participant.id];
    if (!scorecard) continue;

    const holeData = scorecard[String(holeNumber)];
    if (holeData === undefined) continue;

    const gross = typeof holeData === 'number' ? holeData : holeData.strokes;
    const handicap = participant.handicap ?? 0;
    const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
    const net = gross - strokesReceived;

    holeScores[participant.id] = {
      gross,
      net,
      strokes_received: strokesReceived,
    };
  }

  return holeScores;
}
