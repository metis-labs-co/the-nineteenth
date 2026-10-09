/**
 * Per-round hole metadata for the Rounds list.
 *
 * The list re-runs calculatePlayerStats and the match-play pill for completed
 * rounds so its totals match the scorecard view.
 *
 * - plannedHoles: the course narrowed to the round's nine_type. The match pill
 *   is decided against these (a 9-hole match fed 18 holes reads unfinished).
 * - statsHoles: what calculatePlayerStats receives. For a round played as
 *   planned this is the raw course holes, exactly as before (the daily-handicap
 *   fallback derives Σpar from them; nine-aware DHC is out of scope). For a
 *   round ended early it is plannedHoles, because calculatePlayerStats with
 *   { holesPlayed } totals the FIRST N holes of the list it is given — on raw
 *   holes a back-9 round would be scored on holes 1–N.
 * - holesPlayed: rounds.holes_played, set when a social round was ended early.
 */

import { standaloneMatchHoles } from '@/utils/matchPlayResult';
import { isEndedEarly } from '@/utils/roundShape';
import type { Hole, TeeBox } from '@/types/database/base';
import type { HandicapSource } from '@/types/database/enums';

export interface RoundListMeta {
  /** The course's holes as stored. */
  courseHoles: Hole[];
  /** Planned holes: the course narrowed to the round's nine_type. */
  plannedHoles: Hole[];
  /** Holes handed to calculatePlayerStats (see the file header). */
  statsHoles: Hole[];
  selectedTee: TeeBox | null;
  handicapSource: HandicapSource;
  /** rounds.holes_played — set when the round was ended early, else null. */
  holesPlayed: number | null;
}

/** The slice of a rounds row (with its course) the list selects. */
export interface RoundListMetaSource {
  nine_type: string | null;
  holes_played?: number | null;
  handicap_source: HandicapSource | null;
  selected_tee: TeeBox | null;
  courses: { holes: unknown[] | null } | null;
}

export function buildRoundListMeta(round: RoundListMetaSource): RoundListMeta {
  const courseHoles = Array.isArray(round.courses?.holes)
    ? (round.courses!.holes as Hole[])
    : [];
  // A1b's helper: the course narrowed to the round's nine; anything other
  // than 'front9' / 'back9' (including null) means the full card.
  const plannedHoles = standaloneMatchHoles(courseHoles, round.nine_type);
  const holesPlayed = round.holes_played ?? null;
  return {
    courseHoles,
    plannedHoles,
    statsHoles: isEndedEarly(round) ? plannedHoles : courseHoles,
    selectedTee: round.selected_tee,
    handicapSource: round.handicap_source ?? 'profile',
    holesPlayed,
  };
}
