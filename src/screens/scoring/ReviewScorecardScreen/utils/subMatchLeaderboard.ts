import type { GameType, TeamFormat, Hole } from '@/types';
import { calculateTeamMatchData } from '@/components/scorecard/TeamMatchPlayScorecardTable/utils';
import { calculateMatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import { getStrokesReceived, calculateStablefordPoints } from '@/utils/scoring';
import { computeAltShotTeamRoundScore } from '@/utils/teamScoring/altShot';
import type { AltShotTeamMember } from '@/utils/teamScoring/altShot';
import type { Scorecard } from '@/types/database/scorecard.types';
import { isSingleBallScore } from '@/types/database/base';
import type { HoleScore, MultiBallHoleScore } from '@/types/database/base';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';
import { formatMatchMargin } from '@/utils/matchMargin';

/** A raw hole-score value as stored on a scorecard (single- or multi-ball). */
export type RawHoleScore = HoleScore | MultiBallHoleScore;

/** Extract gross strokes from a raw hole-score value; undefined when unscored. */
export function extractStrokes(raw: RawHoleScore | undefined): number | undefined {
  if (!raw) return undefined;
  return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
}

/**
 * Build a {@link GetStrokes} that reads a player's gross strokes from the local
 * in-progress store first — so the current scorer's own (possibly unsynced)
 * edits always win — and falls back to the round's server scorecards for
 * players in *other* groups.
 *
 * The Review-screen scoring store only holds the current scorer's own playing
 * group, so a sub-match leaderboard fed solely from it can only ever update the
 * user's own match. Merging in `useRoundScorecards` lets every sub-match update
 * live as other groups' scores sync to the server, matching the ViewRound and
 * competition leaderboards.
 */
export function createMergedGetStrokes(
  getLocalRaw: (playerId: string, holeNumber: number) => RawHoleScore | undefined,
  serverScorecards: Pick<Scorecard, 'player_id' | 'scores'>[] | undefined
): GetStrokes {
  return (playerId, holeNumber) => {
    const local = extractStrokes(getLocalRaw(playerId, holeNumber));
    if (local !== undefined) return local;
    const sc = serverScorecards?.find((s) => s.player_id === playerId);
    return extractStrokes(sc?.scores?.[String(holeNumber)]);
  };
}

/** Which scoring model a sub-match round uses for its per-match display. */
export type SubMatchModel = 'match-play' | 'alt-shot' | 'aggregate' | 'best-ball';

/** A player on one side of a sub-match, with their *playing* handicap. */
export interface SubMatchPlayer {
  id: string;
  name: string;
  handicap: number;
}

/** The two sides of a sub-match. `a` = team_a_player_ids, `b` = team_b_player_ids. */
export interface SubMatchSides {
  a: SubMatchPlayer[];
  b: SubMatchPlayer[];
}

/** Reads a player's gross strokes for a hole from the in-progress store. */
export type GetStrokes = (playerId: string, holeNumber: number) => number | undefined;

/**
 * Resolve the per-sub-match scoring model from the round's game type and team
 * format. Match play wins regardless of team_format (covers singles and
 * Ryder-Cup singles). Otherwise team_format selects net vs. points.
 */
export function resolveSubMatchModel(
  gameType: GameType,
  teamFormat: TeamFormat | null | undefined
): SubMatchModel {
  if (gameType === 'match-play') return 'match-play';
  if (teamFormat === 'match-play-team') return 'match-play';
  if (teamFormat === 'alt-shot') return 'alt-shot';
  if (teamFormat === 'best-ball') return 'best-ball';
  return 'aggregate';
}

export interface MatchPlayRowData {
  /** Centered status: 'A/S' | '2 UP' | '3&2'. */
  statusText: string;
  /** Side currently ahead (colours the status); null when level. */
  leaderSide: 'a' | 'b' | null;
  isComplete: boolean;
  /** True once at least one hole has been decided. */
  hasScores: boolean;
}

function toMatchSide(players: SubMatchPlayer[], id: string): MatchTeam {
  return {
    id,
    name: id,
    handicap: 0,
    members: players.map((p) => ({
      id: p.id,
      name: p.name,
      handicap: p.handicap,
      score: null,
      pickedUp: false,
    })),
  };
}

/** Normalise the engine's margin string to the compact display form. */
function normaliseMargin(margin: string): string {
  if (margin === 'All Square') return 'A/S';
  if (margin.includes('&')) return margin.replace(/\s+/g, ''); // '3 & 2' -> '3&2'
  if (margin.toLowerCase().endsWith('up')) return `${margin.split(' ')[0]} UP`; // '2 up' -> '2 UP'
  return margin;
}

export function computeMatchPlaySubMatch(
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): MatchPlayRowData {
  const team1 = toMatchSide(sides.a, 'a');
  const team2 = toMatchSide(sides.b, 'b');
  const calc = calculateTeamMatchData(holes, team1, team2, getStrokes);
  // Pass holes.length as totalHoles so dormie/close-out is detected for the
  // round's actual hole count (the engine otherwise defaults to 18).
  const status = calculateMatchStatus(calc.holeResults, holes.length);
  const hasScores = Object.values(calc.holeResults).some((r) => r.winner !== null);

  if (status.status === 'complete') {
    if (status.winner === 'halved') {
      return { statusText: 'A/S', leaderSide: null, isComplete: true, hasScores };
    }
    return {
      statusText: normaliseMargin(status.margin),
      leaderSide: status.winner === 'player1' ? 'a' : 'b',
      isComplete: true,
      hasScores,
    };
  }

  if (status.leader === null) {
    return { statusText: 'A/S', leaderSide: null, isComplete: false, hasScores };
  }
  return {
    statusText: `${status.holesUp} UP`,
    leaderSide: status.leader === 'player1' ? 'a' : 'b',
    isComplete: false,
    hasScores,
  };
}

/** Match-row display data derived from a sub-match's PERSISTED result (manual or
 *  scored). Returns null when there is no decisive persisted result to show, so
 *  the caller falls back to live score computation. Forfeits are handled
 *  separately via `forfeitWinner`. */
export function persistedMatchData(sm: {
  status: string;
  result: string | null;
  final_differential: number | null;
  final_holes_remaining: number | null;
  manual_result?: boolean;
}): { holesUpDown: string; leaderSide: 'a' | 'b' | null; hasScores: boolean; isManual: boolean } | null {
  if (sm.status !== 'completed') return null;
  const isManual = sm.manual_result === true;
  if (sm.result === 'halved') {
    return { holesUpDown: formatMatchMargin(0, 0, true), leaderSide: null, hasScores: true, isManual };
  }
  if (sm.result === 'a-wins' || sm.result === 'b-wins') {
    const up = sm.final_differential ?? 0;
    const rem = sm.final_holes_remaining ?? 0;
    return {
      holesUpDown: formatMatchMargin(up, rem, false),
      leaderSide: sm.result === 'a-wins' ? 'a' : 'b',
      hasScores: true,
      isManual,
    };
  }
  return null;
}

/**
 * Picks the authoritative source for a match-play row display.
 *
 * A manually-entered result (`persisted.isManual`) wins outright — an organiser
 * override takes precedence over hole-by-hole scores. Otherwise the live
 * computation wins when the match engine has reached a decided result
 * (`live.isComplete`), and the persisted result is used only as a fallback when
 * live has not yet decided (no/partial scores).
 */
export function selectMatchSource(
  live: MatchPlayRowData,
  persisted: ReturnType<typeof persistedMatchData>
): MatchPlayRowData {
  // A manually-entered result is authoritative — it overrides hole scores even
  // when the live engine has reached a decided result.
  if (persisted?.isManual) {
    return {
      statusText: persisted.holesUpDown,
      leaderSide: persisted.leaderSide,
      isComplete: true,
      hasScores: persisted.hasScores,
    };
  }
  if (live.isComplete) return live;
  if (persisted) {
    return {
      statusText: persisted.holesUpDown,
      leaderSide: persisted.leaderSide,
      isComplete: true,
      hasScores: persisted.hasScores,
    };
  }
  return live;
}

/**
 * Reproduces the live tally's per-sub-match decision as a finalize-time
 * `SideOutcome`, so persisting round results agrees with what the sub-match
 * leaderboard is currently showing. Composes the same three building blocks
 * the display row uses — `computeMatchPlaySubMatch` (live), `persistedMatchData`
 * (stored), `selectMatchSource` (precedence: manual > live-when-complete >
 * persisted > live) — and maps the resolved `leaderSide`/`hasScores` onto the
 * outcome shape `finalizePairResults` expects.
 */
/**
 * Extract the numeric holes-up magnitude from a `calculateMatchStatus` margin
 * string ("3 & 2" -> 3, "2 up" -> 2, "All Square" -> 0). `parseInt` naturally
 * stops at the first non-digit character for both formats, so a single call
 * covers them; a non-numeric/unexpected string falls back to 0 rather than
 * throwing.
 */
function parseMarginMagnitude(margin: string): number {
  const n = parseInt(margin, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Live signed holes-up margin for a match-play sub-match, from side A's
 * perspective (positive = A ahead, negative = B ahead, 0 = level). Uses the
 * SAME engine (`calculateTeamMatchData` + `calculateMatchStatus`) as
 * `computeMatchPlaySubMatch` / `resolveMatchPlaySubMatchOutcome`, so a caller
 * that recomputes the outcome live (e.g. `finalizePairResults`'s combined
 * margin bonus) can source the magnitude from the same place instead of a
 * possibly-stale persisted `final_differential`.
 *
 * Returns null when no hole has a decided winner yet (nothing to report).
 */
export function computeMatchPlaySignedMargin(
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): number | null {
  const team1 = toMatchSide(sides.a, 'a');
  const team2 = toMatchSide(sides.b, 'b');
  const calc = calculateTeamMatchData(holes, team1, team2, getStrokes);
  const hasScores = Object.values(calc.holeResults).some((r) => r.winner !== null);
  if (!hasScores) return null;

  const status = calculateMatchStatus(calc.holeResults, holes.length);
  if (status.status === 'complete') {
    if (status.winner === 'halved') return 0;
    const magnitude = parseMarginMagnitude(status.margin);
    return status.winner === 'player1' ? magnitude : -magnitude;
  }
  if (status.leader === null) return 0;
  return status.leader === 'player1' ? status.holesUp : -status.holesUp;
}

export function resolveMatchPlaySubMatchOutcome(params: {
  sm: {
    status: string;
    result: string | null;
    final_differential: number | null;
    final_holes_remaining: number | null;
    manual_result?: boolean;
  };
  sides: SubMatchSides;
  holes: Hole[];
  getStrokes: GetStrokes;
}): 'a-wins' | 'b-wins' | 'halved' | null {
  const { sm, sides, holes, getStrokes } = params;
  const live = computeMatchPlaySubMatch(sides, holes, getStrokes);
  const persisted = persistedMatchData(sm);
  const data = selectMatchSource(live, persisted);
  if (!data.hasScores) return null;
  if (data.leaderSide === 'a') return 'a-wins';
  if (data.leaderSide === 'b') return 'b-wins';
  return 'halved';
}

export interface NetCardData {
  /** Side A's net (alt-shot/aggregate) or points (best-ball); null if unscored. */
  valueA: number | null;
  valueB: number | null;
  /** '' for net strokes, ' pts' for best-ball stableford. */
  unit: '' | ' pts';
  leaderSide: 'a' | 'b' | null;
  /** Absolute lead magnitude (0 until both sides have scores). */
  diff: number;
  hasScores: boolean;
}

interface SideValue {
  value: number;
  hasScores: boolean;
}

/** Alt-shot pair net via the canonical engine (synthetic in-progress cards). */
function altShotSideNet(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  const scores: Record<string, { strokes: number }> = {};
  let holesScored = 0;
  // Both partners share one ball; read from the first member.
  const ballPlayerId = players[0]?.id;
  for (const h of holes) {
    const s = ballPlayerId ? getStrokes(ballPlayerId, h.number) : undefined;
    if (typeof s === 'number' && s > 0) {
      scores[String(h.number)] = { strokes: s };
      holesScored++;
    }
  }
  const synthetic = players.map(
    (p) =>
      ({ player_id: p.id, daily_handicap_used: p.handicap, scores, total_gross: 0 } as unknown as Scorecard)
  );
  const members: AltShotTeamMember[] = players.map((p) => ({ player_id: p.id, handicap: p.handicap }));
  const result = computeAltShotTeamRoundScore(synthetic, members);
  return { value: result.teamNet, hasScores: holesScored > 0 };
}

/** Aggregate net: sum of each member's per-hole net across scored holes. */
function aggregateSideNet(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  let total = 0;
  let scored = false;
  for (const p of players) {
    for (const h of holes) {
      const s = getStrokes(p.id, h.number);
      if (typeof s === 'number' && s > 0) {
        total += s - getStrokesReceived(p.handicap, h.strokeIndex);
        scored = true;
      }
    }
  }
  return { value: total, hasScores: scored };
}

/** Best-ball: sum of the best stableford points among the side per hole. */
function bestBallSidePoints(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  let total = 0;
  let scored = false;
  for (const h of holes) {
    let best: number | null = null;
    for (const p of players) {
      const s = getStrokes(p.id, h.number);
      if (typeof s === 'number' && s > 0) {
        const pts = calculateStablefordPoints(s, p.handicap, h);
        if (best === null || pts > best) best = pts;
      }
    }
    if (best !== null) {
      total += best;
      scored = true;
    }
  }
  return { value: total, hasScores: scored };
}

function finalise(a: SideValue, b: SideValue, higherWins: boolean, unit: '' | ' pts'): NetCardData {
  let leaderSide: 'a' | 'b' | null = null;
  let diff = 0;
  if (a.hasScores && b.hasScores && a.value !== b.value) {
    const aLeads = higherWins ? a.value > b.value : a.value < b.value;
    leaderSide = aLeads ? 'a' : 'b';
    diff = Math.abs(a.value - b.value);
  }
  return {
    valueA: a.hasScores ? a.value : null,
    valueB: b.hasScores ? b.value : null,
    unit,
    leaderSide,
    diff,
    hasScores: a.hasScores || b.hasScores,
  };
}

export function computeNetSubMatch(
  model: Exclude<SubMatchModel, 'match-play'>,
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): NetCardData {
  if (model === 'best-ball') {
    return finalise(
      bestBallSidePoints(sides.a, holes, getStrokes),
      bestBallSidePoints(sides.b, holes, getStrokes),
      true,
      ' pts'
    );
  }
  const sideNet = model === 'alt-shot' ? altShotSideNet : aggregateSideNet;
  return finalise(sideNet(sides.a, holes, getStrokes), sideNet(sides.b, holes, getStrokes), false, '');
}

export interface SubMatchLeader {
  leaderSide: 'a' | 'b' | null;
  hasScores: boolean;
}

/** A decided sub-match with its two sides resolved to competition team names. */
export interface TeamMatchLeader {
  teamA: string | null;
  teamB: string | null;
  leaderSide: 'a' | 'b' | null;
  hasScores: boolean;
}

/**
 * Tally sub-match wins by resolved competition team rather than by positional
 * A/B side. Ryder-cup singles alternate which team is side A, so summing by
 * side mis-attributes (e.g. side B winning all four reads as 4-0). The winning
 * team earns `points.win`; a started-but-level match splits `points.tie` to
 * each side; an unstarted match contributes nothing. The defaults reproduce the
 * flat 1 / 0.5 tally.
 *
 * Note: this is a DISPLAY tally and intentionally awards win/tie only — it does
 * not credit `loss` points to the losing side. `finalizePairResults` (which
 * persists the round's competition points) does add `pair_points.loss`, so with
 * a config where loss > 0 this header total can differ from the round's
 * persisted standings contribution. Every current config uses loss: 0, where
 * the two agree.
 */
export function tallyByTeam(
  leaders: TeamMatchLeader[],
  points: { win: number; tie: number } = { win: 1, tie: 0.5 }
): Map<string, number> {
  const tally = new Map<string, number>();
  const add = (team: string | null, n: number) => {
    if (!team) return;
    tally.set(team, (tally.get(team) ?? 0) + n);
  };
  for (const r of leaders) {
    if (!r.hasScores) continue;
    if (r.leaderSide === 'a') add(r.teamA, points.win);
    else if (r.leaderSide === 'b') add(r.teamB, points.win);
    else {
      add(r.teamA, points.tie);
      add(r.teamB, points.tie);
    }
  }
  return tally;
}

/**
 * Per-match display points for a split sub-match round. Split rounds are scored
 * per match via `pair_points`; legacy singles match-play rounds stored the value
 * under `team_points` (the points editor wrote there when no pair_points seed
 * existed), so fall back to it. Non-split rounds use the flat 1 / 0.5 tally.
 */
export function resolveSplitMatchDisplayPoints(round: {
  round_format?: string | null;
  rules_override?: RoundRulesOverride | null;
}): { win: number; tie: number } {
  if (round.round_format !== 'split') return { win: 1, tie: 0.5 };
  const pts = round.rules_override?.pair_points ?? round.rules_override?.team_points;
  if (!pts) return { win: 1, tie: 0.5 };
  return { win: pts.win, tie: pts.tie };
}

/**
 * Live projected Team A vs Team B tally: the side currently ahead in a
 * sub-match earns 1 point, a level-but-started sub-match splits 0.5/0.5, and an
 * unstarted sub-match contributes nothing.
 */
export function tallyOverall(results: SubMatchLeader[]): { pointsA: number; pointsB: number } {
  let pointsA = 0;
  let pointsB = 0;
  for (const r of results) {
    if (!r.hasScores) continue;
    if (r.leaderSide === 'a') pointsA += 1;
    else if (r.leaderSide === 'b') pointsB += 1;
    else {
      pointsA += 0.5;
      pointsB += 0.5;
    }
  }
  return { pointsA, pointsB };
}
