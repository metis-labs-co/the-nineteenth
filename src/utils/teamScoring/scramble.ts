/**
 * Scramble Team Scoring
 *
 * Shared math for scramble (Ambrose) team format. Used by both:
 *   - ScrambleTeamLeaderboard (View Round, dynamic per-render computation)
 *   - finalizeTeamOnlyRound (persisted round_results rows)
 *
 * Keeping a single source of truth prevents View Round and the competition
 * leaderboard's Round Results card from drifting on team handicap, gross,
 * or net values.
 *
 * Conventions (matches the GA / WHS scramble guidance most clubs apply):
 *   - Team handicap = 25% of the sum of member handicaps, rounded to 1 dp.
 *     Members with null/undefined handicap contribute 0.
 *   - The "member handicap" we sum is the player's Daily Handicap (DHC)
 *     for the round, not their raw WHS Handicap Index. The scorecard's
 *     `daily_handicap_used` field is captured at scoring time using the
 *     round's tee slope/CR/par and the configured handicap source
 *     (profile vs calculated index). When a member has a scorecard, we
 *     read DHC from there. When they don't (rare — happens before they've
 *     submitted), we fall back to their raw `handicap` so we still produce
 *     a number; the value will refresh the next time the team is scored.
 *   - Per-hole handicap strokes: use floor(team_handicap) for whole-stroke
 *     allocation, distributed across holes by stroke index. For round-total
 *     net we approximate as floor(team_handicap) total strokes — exact
 *     enough for ranking, off by ≤1 stroke vs per-hole allocation.
 *   - All team members record identical strokes (one ball played), so
 *     gross is read from any one team member's scorecard.
 */

import type { Scorecard } from '@/types/database/scorecard.types';

export interface ScrambleTeamMember {
  player_id: string;
  /** Individual handicap; null/undefined treated as 0. */
  handicap: number | null | undefined;
}

/**
 * Minimal shape `calculateScrambleTeamHandicap` reads — accepts both
 * `Player` (where `handicap` is optional) and the engine's member shape
 * (where it can be null/undefined). Only handicap is needed for the
 * formula.
 */
interface HandicapOnly {
  handicap?: number | null | undefined;
}

export interface ScrambleTeamScore {
  /** Sum of strokes for the team's single ball across all completed holes. */
  teamGross: number;
  /** Team handicap, rounded to 1 dp (e.g. 5.0, 1.5). */
  teamHandicap: number;
  /** Whole strokes the team receives over the round (= floor(teamHandicap)). */
  teamHandicapStrokes: number;
  /** teamGross - teamHandicapStrokes. */
  teamNet: number;
  /** Number of holes with at least one recorded stroke (for partial rounds). */
  holesCompleted: number;
}

/**
 * Compute team handicap for a scramble team.
 * 25% of the sum of member handicaps, rounded to 1 decimal place.
 * Mirrors `calculateScrambleTeamHandicap` in ScrambleTeamLeaderboard.
 */
export function calculateScrambleTeamHandicap(
  members: HandicapOnly[]
): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, m) => acc + (m.handicap ?? 0), 0);
  return Math.round(sum * 0.25 * 10) / 10;
}

interface SingleBallStrokes {
  strokes: number;
}

function readStrokes(score: unknown): number {
  if (!score || typeof score !== 'object') return 0;
  const s = score as Partial<SingleBallStrokes>;
  return typeof s.strokes === 'number' && s.strokes > 0 ? s.strokes : 0;
}

/**
 * For each member, prefer the DHC captured on their scorecard
 * (`daily_handicap_used`) over the raw `handicap` index from the player
 * record. The scorecard's DHC reflects the configured handicap source
 * and the round's tee at scoring time, which is what the team handicap
 * formula should be summing — see file header.
 */
function resolveMemberDailyHandicaps(
  teamScorecards: Scorecard[],
  members: ScrambleTeamMember[]
): { handicap: number | null | undefined }[] {
  const dhcByPlayer = new Map<string, number>();
  for (const sc of teamScorecards) {
    if (typeof sc.daily_handicap_used === 'number') {
      dhcByPlayer.set(sc.player_id, sc.daily_handicap_used);
    }
  }
  return members.map((m) => ({
    handicap: dhcByPlayer.get(m.player_id) ?? m.handicap,
  }));
}

/**
 * Compute the team's round-total gross/net from any one team member's
 * scorecard. Caller passes `scorecards` filtered to a single team — we
 * read the first one with at least one recorded hole.
 *
 * Why "any one scorecard": in scramble all team members record identical
 * per-hole strokes (single ball). If only one member's card was filled
 * (common when there's a designated scorer), that one is the source of
 * truth. If multiple cards exist, they should agree — we read the first
 * non-empty one.
 */
export function computeScrambleTeamRoundScore(
  teamScorecards: Scorecard[],
  members: ScrambleTeamMember[]
): ScrambleTeamScore {
  const memberHandicaps = resolveMemberDailyHandicaps(teamScorecards, members);
  const teamHandicap = calculateScrambleTeamHandicap(memberHandicaps);
  // floor() matches ScrambleTeamLeaderboard's per-hole allocation (lines
  // 80-89 of that file): a team with HC 1.5 gets 1 whole stroke, HC 5.0
  // gets 5. For round-total ranking this is exact for any team handicap
  // < 18, and the rare > 18 case is already broken in the View Round
  // leaderboard too — fixing it is its own change.
  const teamHandicapStrokes = Math.min(Math.floor(teamHandicap), 18);

  // Pick the first scorecard with recorded data. Prefer one with
  // per-hole `scores` populated; fall back to one with `total_gross > 0`
  // when scores aren't there (test fixtures, partial sync).
  let withScores: Scorecard | undefined;
  let withTotal: Scorecard | undefined;
  for (const sc of teamScorecards) {
    if (!withScores && sc.scores && Object.keys(sc.scores).length > 0) {
      withScores = sc;
    }
    if (!withTotal && (sc.total_gross ?? 0) > 0) {
      withTotal = sc;
    }
  }

  const chosen = withScores ?? withTotal;
  if (!chosen) {
    return {
      teamGross: 0,
      teamHandicap,
      teamHandicapStrokes,
      teamNet: 0,
      holesCompleted: 0,
    };
  }

  let perHoleGross = 0;
  let holesCompleted = 0;
  if (chosen.scores) {
    for (const score of Object.values(chosen.scores)) {
      const strokes = readStrokes(score);
      if (strokes > 0) {
        perHoleGross += strokes;
        holesCompleted++;
      }
    }
  }

  // total_gross is canonical when present; fall back to per-hole sum.
  const fromTotal = chosen.total_gross ?? 0;
  const teamGross = fromTotal > 0 ? fromTotal : perHoleGross;

  return {
    teamGross,
    teamHandicap,
    teamHandicapStrokes,
    teamNet: teamGross - teamHandicapStrokes,
    holesCompleted,
  };
}
