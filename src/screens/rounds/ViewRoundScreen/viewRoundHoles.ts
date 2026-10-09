/**
 * Display-time hole lists for ViewRound; original course metadata stays intact.
 * Planned holes determine daily handicaps and match length (with holesPlayed).
 * Played holes determine rows and iteration, including physical back-nine numbers.
 */
import { filterHolesByNineType, filterPlayableHoles } from '@/utils/holeTransformers';
import type { Hole } from '@/types';
import type { NineType } from '@/types/database/enums';

export interface ViewRoundHoles {
  plannedHoles: Hole[];
  playedHoles: Hole[];
  /** Raw rounds.holes_played; null when absent. Filtering validates the marker. */
  holesPlayed: number | null;
}

export function getViewRoundHoles(round: {
  nine_type?: NineType | null;
  holes_played?: number | null;
  course?: { holes?: Hole[] | null } | null;
}): ViewRoundHoles {
  const courseHoles = round.course?.holes;
  const holes = Array.isArray(courseHoles) ? courseHoles : [];
  const nineType = round.nine_type ?? 'full';
  const holesPlayed = round.holes_played ?? null;
  return {
    plannedHoles: filterHolesByNineType(holes, nineType),
    playedHoles: filterPlayableHoles(holes, nineType, holesPlayed),
    holesPlayed,
  };
}
