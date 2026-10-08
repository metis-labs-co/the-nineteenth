/**
 * Standalone (social) match-play result — the round-list winner row and the
 * "You: Won 4&3" pill.
 *
 * Walks the holes in order using the difference method (`getMatchPlayStrokes`,
 * invariant I1) on each scorecard's stored `daily_handicap_used`, and stops at
 * the first close-out. Margins are the canonical compact tokens from
 * `formatMatchMargin`: "N&M" (closed out), "N UP" (no holes left — I10),
 * "A/S" (halved). Self-contained so the round list can run it without the
 * full scoring engine + course/tee context.
 */

import { getMatchPlayStrokes } from '@/utils/scoring';
import { formatMatchMargin } from '@/utils/matchMargin';
import { filterHolesByNineType, filterPlayableHoles } from '@/utils/holeTransformers';
import { isSingleBallScore } from '@/types/database/base';
import type { Hole, HoleScore, MultiBallHoleScore } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';

/**
 * Minimal scorecard shape the match-play result needs. Match play is decided
 * hole by hole rather than from totals, so it keeps its own slice of the row.
 */
export interface ScorecardForMatchPlay {
  player_id: string;
  scores: Record<string, HoleScore | MultiBallHoleScore> | null;
  daily_handicap_used: number | null;
  player: { id: string; name: string } | null;
}

export interface StandaloneMatchResult {
  /** Winner's player id; null when halved. */
  winnerId: string | null;
  /** Winner's name, or 'Halved'. */
  winnerName: string;
  /** Compact margin token. */
  margin: string;
}

/**
 * The holes a standalone match is played over: the course card narrowed to
 * the round's nine. `nineType` comes from an untyped list row, so anything
 * other than 'front9' / 'back9' (including null) means the full 18.
 */
export function standaloneMatchHoles(
  courseHoles: Hole[],
  nineType: string | null | undefined
): Hole[] {
  const nine: NineType = nineType === 'front9' || nineType === 'back9' ? nineType : 'full';
  return filterHolesByNineType(courseHoles, nine);
}

/**
 * The ended-early hole count to honour, or null when the round was played as
 * planned. Only a positive whole number below the planned holes counts —
 * `holesPlayed` ≥ planned is just a normal finish.
 */
export function resolveEndedAfter(
  plannedHoles: number,
  holesPlayed?: number | null
): number | null {
  if (holesPlayed == null || !Number.isInteger(holesPlayed)) return null;
  if (holesPlayed <= 0 || holesPlayed >= plannedHoles) return null;
  return holesPlayed;
}

/**
 * Compute a two-player match result from raw scorecards and the round's
 * planned (nine-filtered) holes. Returns null when no hole has a score from
 * both players.
 *
 * `holesPlayed` set means the round ended early after that many holes: only
 * the first `holesPlayed` holes are walked, a close-out against the planned
 * hole count still stands, and otherwise the leader wins "N UP" (level "A/S").
 * Fewer than N decided retained holes returns null unless a real planned-count
 * close-out was reached.
 *
 * A card with holes left unscored and no close-out, not ended early (legacy /
 * incomplete data), still reports "N&M" against the unplayed holes.
 */
export function computeStandaloneMatchResult(
  p1: ScorecardForMatchPlay,
  p2: ScorecardForMatchPlay,
  holes: Hole[],
  holesPlayed?: number | null
): StandaloneMatchResult | null {
  const dhc1 = p1.daily_handicap_used ?? 0;
  const dhc2 = p2.daily_handicap_used ?? 0;

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
  const totalHoles = sortedHoles.length;
  // The holes are already the round's nine, so 'full' applies only the
  // played cut (the first N holes) when the round ended early.
  const endedAfter = resolveEndedAfter(totalHoles, holesPlayed);
  const walkedHoles = filterPlayableHoles(sortedHoles, 'full', endedAfter);

  let player1Up = 0;
  let decidedHoles = 0;

  for (const hole of walkedHoles) {
    const score1 = p1.scores?.[String(hole.number)];
    const score2 = p2.scores?.[String(hole.number)];
    const gross1 =
      score1 && isSingleBallScore(score1) && score1.strokes > 0
        ? score1.strokes
        : null;
    const gross2 =
      score2 && isSingleBallScore(score2) && score2.strokes > 0
        ? score2.strokes
        : null;
    if (gross1 == null || gross2 == null) continue;

    // Difference method: the lower-DHC player plays off scratch and the
    // higher-DHC player receives the difference on this hole.
    const { a: strokes1, b: strokes2 } = getMatchPlayStrokes(
      dhc1,
      dhc2,
      hole.strokeIndex
    );

    const net1 = gross1 - strokes1;
    const net2 = gross2 - strokes2;

    decidedHoles++;
    if (net1 < net2) player1Up++;
    else if (net2 < net1) player1Up--;

    // Early finish — decided when the lead beats the PLANNED holes left. On
    // the last planned hole (0 remaining) toResult formats it "N UP".
    const holesRemaining = totalHoles - decidedHoles;
    if (Math.abs(player1Up) > holesRemaining) {
      return toResult(p1, p2, player1Up, holesRemaining);
    }
  }

  if (decidedHoles === 0 || (endedAfter !== null && decidedHoles < endedAfter)) return null;
  // An ended-early round has nothing left to play: the leader wins "N UP".
  const holesRemaining = endedAfter !== null ? 0 : totalHoles - decidedHoles;
  return toResult(p1, p2, player1Up, holesRemaining);
}

/** Winner + compact margin for a final `player1Up` lead with `holesRemaining` unplayed. */
function toResult(
  p1: ScorecardForMatchPlay,
  p2: ScorecardForMatchPlay,
  player1Up: number,
  holesRemaining: number
): StandaloneMatchResult {
  if (player1Up === 0) {
    return { winnerId: null, winnerName: 'Halved', margin: formatMatchMargin(0, 0, true) };
  }
  const leader = player1Up > 0 ? p1 : p2;
  return {
    winnerId: leader.player_id,
    winnerName: leader.player?.name ?? 'Unknown',
    margin: formatMatchMargin(Math.abs(player1Up), holesRemaining, false),
  };
}
