/**
 * Hole list + navigation bounds for a team match.
 *
 * Team match play rounds can be front9 / back9; the hole list is the course's
 * holes (or the default card) narrowed to the round's nine, and the bounds
 * come from that list — back-9 runs 10..18.
 */

import { filterHolesByNineType } from '@/utils/holeTransformers';
import { getHoleRange } from '@/constants/scoring';
import type { Hole } from '@/types';
import type { NineType } from '@/types/database/enums';
import { DEFAULT_HOLES } from '../constants';

export interface MatchHoles {
  /** The round's planned holes for its nine. */
  holes: Hole[];
  firstHoleNumber: number;
  lastHoleNumber: number;
}

export function resolveMatchHoles(
  courseHoles: Hole[] | null | undefined,
  nineType: NineType
): MatchHoles {
  const source = Array.isArray(courseHoles) ? courseHoles : DEFAULT_HOLES;
  const holes = filterHolesByNineType(source, nineType);
  const range = getHoleRange(nineType);
  return {
    holes,
    firstHoleNumber: holes[0]?.number ?? range.start,
    lastHoleNumber: holes[holes.length - 1]?.number ?? range.end,
  };
}
