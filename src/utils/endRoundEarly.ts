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
import { compactMatchMargin } from '@/utils/matchMargin';
// Match status comes from the shared engines, never re-implemented here.
// (utils → screens import; hooks/scorecard/useMatchPlayScoring imports the same module.)
import { calculateMatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import { calculateTeamMatchStatus } from '@/screens/scoring/TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations';
import type { HoleResult } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { TeamHoleResult } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

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

// =====================================================
// RESULT PREVIEW (End round early confirmation)
// =====================================================

/** Live match state a match-play scoring screen hands to the preview. */
export type EndEarlyMatchContext =
  | { kind: 'singles'; holeResults: Record<number, HoleResult>; names: [string, string] }
  | { kind: 'team'; holeResults: Record<number, TeamHoleResult>; names: [string, string] };

/** Per-player totals the stroke / stableford / par preview ranks on (a PlayerStats subset). */
export interface EndRoundEarlyStatsRow {
  playerName: string;
  totalNet: number;
  totalStableford: number;
  totalParScore: number;
}

export type EndRoundEarlyResultInput =
  | (EndEarlyMatchContext & {
      /** Hole numbers that will count: the first N of the round's nine (10–15 on a back 9). */
      playedHoleNumbers: number[];
      /**
       * Planned hole count the match is measured against: the round's holes
       * for its nine, `filterHolesByNineType(holes, nineType).length` — the
       * same `totalHoles` the match views pass (9 on a 9-hole course even when
       * nine_type is 'full'). Not getHoleCount(nineType).
       */
      plannedHoles: number;
      /** N — the round ends after this many holes. */
      holesPlayed: number;
    })
  | { kind: 'stableford' | 'stroke' | 'par'; stats: EndRoundEarlyStatsRow[] };

type MatchOutcome = { winner: 'side1' | 'side2' | 'halved'; margin: string };

/** Keep only the played holes — a decided result on a removed hole must never count. */
function pickPlayedResults<T>(holeResults: Record<number, T>, playedHoleNumbers: number[]): Record<number, T> {
  const played: Record<number, T> = {};
  for (const holeNumber of playedHoleNumbers) {
    const result = holeResults[holeNumber];
    if (result !== undefined) played[holeNumber] = result;
  }
  return played;
}

function resolveMatchOutcome(
  input: Extract<EndRoundEarlyResultInput, { kind: 'singles' | 'team' }>
): MatchOutcome | null {
  if (input.kind === 'singles') {
    const status = calculateMatchStatus(
      pickPlayedResults(input.holeResults, input.playedHoleNumbers),
      input.plannedHoles,
      input.holesPlayed
    );
    if (status.status !== 'complete') return null;
    const winner =
      status.winner === 'player1' ? 'side1' : status.winner === 'player2' ? 'side2' : 'halved';
    return { winner, margin: status.margin };
  }

  const status = calculateTeamMatchStatus(
    pickPlayedResults(input.holeResults, input.playedHoleNumbers),
    input.plannedHoles,
    input.holesPlayed
  );
  if (status.status !== 'complete') return null;
  const winner =
    status.winner === 'team1' ? 'side1' : status.winner === 'team2' ? 'side2' : 'halved';
  return { winner, margin: status.margin };
}

function formatNet(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatParScore(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function describeLeader(kind: 'stableford' | 'stroke' | 'par', stats: EndRoundEarlyStatsRow[]): string | null {
  if (stats.length === 0) return null;

  const valueOf = (entry: EndRoundEarlyStatsRow): number =>
    kind === 'stableford' ? entry.totalStableford : kind === 'par' ? entry.totalParScore : entry.totalNet;
  // Stroke: lowest net wins. Stableford and Par: highest wins.
  const ranked = [...stats].sort((a, b) =>
    kind === 'stroke' ? valueOf(a) - valueOf(b) : valueOf(b) - valueOf(a)
  );
  const best = valueOf(ranked[0]);
  const label =
    kind === 'stableford' ? `${best} pts` : kind === 'par' ? formatParScore(best) : `net ${formatNet(best)}`;

  if (stats.length === 1) return `${ranked[0].playerName}: ${label}`;
  const tied = ranked.filter((entry) => valueOf(entry) === best).length > 1;
  return tied ? `Tied on ${label}` : `${ranked[0].playerName} leads on ${label}`;
}

/**
 * One-line result for the End-round-early confirmation, e.g. "Dave wins 2 UP",
 * "Dave wins 5&4", "Halved A/S", "Sam leads on 31 pts".
 *
 * Pure. Match status comes from calculateMatchStatus / calculateTeamMatchStatus
 * over the played holes (planned count + holesPlayed: a real close-out stands,
 * otherwise the final lead wins "N UP"), formatted with compactMatchMargin.
 * Totals come from the caller (calculatePlayerStats with { holesPlayed }).
 * Returns null when there is nothing meaningful to show.
 */
export function describeEndRoundEarlyResult(input: EndRoundEarlyResultInput): string | null {
  if (input.kind === 'singles' || input.kind === 'team') {
    const outcome = resolveMatchOutcome(input);
    if (!outcome) return null;
    const margin = compactMatchMargin(outcome.margin);
    if (outcome.winner === 'halved') return `Halved ${margin}`;
    const winnerName = outcome.winner === 'side1' ? input.names[0] : input.names[1];
    return `${winnerName} wins ${margin}`;
  }
  return describeLeader(input.kind, input.stats);
}
