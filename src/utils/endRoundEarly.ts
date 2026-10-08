/**
 * End round early — planning.
 *
 * N is the number of leading holes (in hole order, from the round's first
 * hole) on which EVERY player has a score. A pickup (strokes = PICKUP_SCORE)
 * counts as scored. Scores after hole N are removed when the round is ended.
 * An 18-hole round ended after 9 is an ordinary early end (no conversion to a
 * front 9).
 *
 * Pure: the store (src/store/endRoundEarlySlice.ts) applies the plan, and the
 * confirmation sheet shows it.
 */

import type { Hole, Scorecard } from '@/types';
import type { HoleScore, MultiBallHoleScore } from '@/types/database/base';
import { isMultiBallScore } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';
import { getHoleCount } from '@/constants/scoring';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import { firstHoleNumber, lastPlayedHoleNumber } from '@/utils/roundShape';

export interface EndRoundEarlyRemovedScore {
  playerId: string;
  playerName: string;
  holeNumber: number;
}

export interface EndRoundEarlyPlan {
  holesPlayed: number; // N
  plannedHoles: number; // getHoleCount(nineType)
  nineType: NineType;
  lastHoleNumber: number; // lastPlayedHoleNumber(nineType, N)
  removedScores: EndRoundEarlyRemovedScore[];
}

/** strokes > 0 (any ball for multi-ball). A pickup (10) is scored; 0 / didNotAttempt is not. */
export function isHoleScored(score: HoleScore | MultiBallHoleScore | null | undefined): boolean {
  if (!score) return false;
  if (isMultiBallScore(score)) {
    return score.balls.some((ball) => (ball?.strokes ?? 0) > 0);
  }
  return (score.strokes ?? 0) > 0;
}

/** null when no hole is complete for every player, or when every planned hole is complete. */
export function planEndRoundEarly(input: {
  holes: Hole[]; // planned holes (store `holes`)
  nineType: NineType;
  players: { id: string; name: string }[];
  scorecards: Map<string, { scores: Scorecard['scores'] }>;
}): EndRoundEarlyPlan | null {
  const { holes, nineType, players, scorecards } = input;
  const plannedHoles = [...filterHolesByNineType(holes, nineType)].sort((a, b) => a.number - b.number);
  if (plannedHoles.length === 0 || players.length === 0) return null;

  const scoreFor = (playerId: string, holeNumber: number) => scorecards.get(playerId)?.scores[holeNumber];

  let holesPlayed = 0;
  for (const hole of plannedHoles) {
    // Missing metadata must not let later holes extend the completed prefix.
    if (hole.number !== firstHoleNumber(nineType) + holesPlayed) break;
    const completeForEveryone = players.every((player) => isHoleScored(scoreFor(player.id, hole.number)));
    if (!completeForEveryone) break;
    holesPlayed += 1;
  }

  if (holesPlayed === 0 || holesPlayed >= plannedHoles.length) return null;

  const lastHoleNumber = lastPlayedHoleNumber(nineType, holesPlayed);
  const removedScores: EndRoundEarlyRemovedScore[] = [];
  for (const hole of plannedHoles) {
    if (hole.number <= lastHoleNumber) continue;
    for (const player of players) {
      if (isHoleScored(scoreFor(player.id, hole.number))) {
        removedScores.push({ playerId: player.id, playerName: player.name, holeNumber: hole.number });
      }
    }
  }

  return {
    holesPlayed,
    plannedHoles: getHoleCount(nineType),
    nineType,
    lastHoleNumber,
    removedScores,
  };
}
