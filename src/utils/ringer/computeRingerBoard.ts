// src/utils/ringer/computeRingerBoard.ts
import { getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import { isSingleBallScore } from '@/types/database/base';
import type { Hole, DBScorecard } from '@/types';
import type {
  ComputeRingerBoardInput,
  RingerBoardResult,
  RingerEntry,
  RingerHole,
  RingerRoundInput,
} from './types';

/**
 * Stableford points a player scored on one hole, or null if the hole was not
 * played. Pickups (stored as PICKUP_SCORE strokes) resolve to 0 via the engine.
 */
export function holeStablefordPoints(scorecard: DBScorecard, hole: Hole): number | null {
  const raw = scorecard.scores[String(hole.number)];
  if (!isSingleBallScore(raw)) return null;
  const strokes = raw.strokes;
  if (!strokes || strokes <= 0) return null;
  const handicap = scorecard.daily_handicap_used ?? 0;
  const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
  return calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
}

interface RoundCtx {
  round: RingerRoundInput;
  holeByNumber: Map<number, Hole>;
  cardByPlayer: Map<string, DBScorecard>;
}

function buildRoundCtx(round: RingerRoundInput): RoundCtx {
  const holeByNumber = new Map<number, Hole>();
  round.holes.forEach((h) => holeByNumber.set(h.number, h));
  const cardByPlayer = new Map<string, DBScorecard>();
  round.scorecards.forEach((sc) => cardByPlayer.set(sc.player_id, sc));
  return { round, holeByNumber, cardByPlayer };
}

function pointsForPlayer(ctx: RoundCtx, playerId: string, holeNumber: number): number | null {
  const sc = ctx.cardByPlayer.get(playerId);
  if (!sc) return null;
  const hole = ctx.holeByNumber.get(holeNumber);
  if (!hole) return null;
  return holeStablefordPoints(sc, hole);
}

/** Sort entries by total desc and assign shared positions + tie flags in place. */
function assignPositions(entries: RingerEntry[]): void {
  entries.sort((a, b) => b.total - a.total);

  let position = 0;
  let previousTotal: number | null = null;
  entries.forEach((entry, index) => {
    if (previousTotal === null || entry.total !== previousTotal) {
      position = index + 1;
      previousTotal = entry.total;
    }
    entry.position = position;
  });

  const counts = new Map<number, number>();
  entries.forEach((e) => counts.set(e.total, (counts.get(e.total) ?? 0) + 1));
  entries.forEach((e) => {
    e.tied = (counts.get(e.total) ?? 0) > 1;
  });
}

/**
 * Build the individual and team ringer boards: for each hole, the best
 * Stableford points over the relevant pool (a player's rounds, or all of a
 * team's members across all rounds).
 */
export function computeRingerBoard(input: ComputeRingerBoardInput): RingerBoardResult {
  const { rounds, players, teams } = input;
  const roundCtxs = rounds.map(buildRoundCtx);

  const holeSet = new Set<number>();
  rounds.forEach((r) => r.holes.forEach((h) => holeSet.add(h.number)));
  const holeNumbers = Array.from(holeSet).sort((a, b) => a - b);

  const individuals: RingerEntry[] = players.map((player) => {
    const holes: RingerHole[] = holeNumbers.map((holeNumber) => {
      let best: number | null = null;
      let sourceRoundLabel: string | null = null;
      for (const ctx of roundCtxs) {
        const pts = pointsForPlayer(ctx, player.playerId, holeNumber);
        if (pts !== null && (best === null || pts > best)) {
          best = pts;
          sourceRoundLabel = ctx.round.roundLabel;
        }
      }
      return {
        hole: holeNumber,
        points: best ?? 0,
        sourceRoundLabel,
        sourcePlayerId: sourceRoundLabel ? player.playerId : null,
      };
    });
    return {
      participantId: player.playerId,
      participantName: player.name,
      isTeam: false,
      color: null,
      holes,
      total: holes.reduce((sum, h) => sum + h.points, 0),
      position: 0,
      tied: false,
    };
  });

  const teamEntries: RingerEntry[] = teams.map((team) => {
    const holes: RingerHole[] = holeNumbers.map((holeNumber) => {
      let best: number | null = null;
      let sourceRoundLabel: string | null = null;
      let sourcePlayerId: string | null = null;
      for (const ctx of roundCtxs) {
        for (const memberId of team.memberPlayerIds) {
          const pts = pointsForPlayer(ctx, memberId, holeNumber);
          if (pts !== null && (best === null || pts > best)) {
            best = pts;
            sourceRoundLabel = ctx.round.roundLabel;
            sourcePlayerId = memberId;
          }
        }
      }
      return { hole: holeNumber, points: best ?? 0, sourceRoundLabel, sourcePlayerId };
    });
    return {
      participantId: team.teamId,
      participantName: team.name,
      isTeam: true,
      color: team.color,
      holes,
      total: holes.reduce((sum, h) => sum + h.points, 0),
      position: 0,
      tied: false,
    };
  });

  assignPositions(individuals);
  assignPositions(teamEntries);

  return {
    individuals,
    teams: teamEntries,
    includedRoundLabels: rounds.map((r) => r.roundLabel),
    holeNumbers,
  };
}
