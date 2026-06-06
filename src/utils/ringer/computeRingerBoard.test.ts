// src/utils/ringer/computeRingerBoard.test.ts
import { holeStablefordPoints, computeRingerBoard } from './computeRingerBoard';
import type { Hole, DBScorecard } from '@/types';
import type { RingerRoundInput } from './types';

function hole(number: number, par: 3 | 4 | 5, strokeIndex: number): Hole {
  return { number, par, strokeIndex } as Hole;
}

/** Build a minimal scorecard with the fields the ringer reads. */
function card(
  playerId: string,
  dailyHandicap: number,
  scores: Record<string, { strokes: number }>
): DBScorecard {
  return {
    player_id: playerId,
    daily_handicap_used: dailyHandicap,
    scores,
  } as unknown as DBScorecard;
}

describe('holeStablefordPoints', () => {
  it('scores a net par as 2 points', () => {
    const sc = card('p1', 0, { '1': { strokes: 4 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBe(2);
  });

  it('applies a received stroke (handicap) to raise points', () => {
    const sc = card('p1', 18, { '1': { strokes: 4 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBe(3);
  });

  it('returns 0 for a pickup (blow-up) hole', () => {
    const sc = card('p1', 0, { '1': { strokes: 10 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBe(0);
  });

  it('returns null when the hole was not played', () => {
    const sc = card('p1', 0, { '2': { strokes: 4 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBeNull();
  });
});

function holes18(): Hole[] {
  return Array.from({ length: 18 }, (_, i) => hole(i + 1, 4, i + 1));
}

function flatRound(
  roundId: string,
  roundLabel: string,
  grossByPlayer: Record<string, number>
): RingerRoundInput {
  const scorecards = Object.entries(grossByPlayer).map(([playerId, gross]) => {
    const scores: Record<string, { strokes: number }> = {};
    for (let h = 1; h <= 18; h++) scores[String(h)] = { strokes: gross };
    return card(playerId, 0, scores);
  });
  return { roundId, roundLabel, holes: holes18(), scorecards };
}

describe('computeRingerBoard - individuals', () => {
  it('takes the best points per hole across rounds and tags the source round', () => {
    const board = computeRingerBoard({
      rounds: [
        flatRound('r1', 'R1', { p1: 4 }),
        flatRound('r2', 'R2', { p1: 3 }),
      ],
      players: [{ playerId: 'p1', name: 'Pat' }],
      teams: [],
    });

    const pat = board.individuals[0];
    expect(pat.total).toBe(18 * 3);
    expect(pat.holes[0].points).toBe(3);
    expect(pat.holes[0].sourceRoundLabel).toBe('R2');
    expect(pat.holes[0].sourcePlayerId).toBe('p1');
    expect(board.includedRoundLabels).toEqual(['R1', 'R2']);
    expect(board.holeNumbers).toHaveLength(18);
  });

  it('falls back to a played round when a player missed a round', () => {
    const board = computeRingerBoard({
      rounds: [flatRound('r1', 'R1', { p1: 4 }), flatRound('r2', 'R2', { p2: 3 })],
      players: [{ playerId: 'p1', name: 'Pat' }],
      teams: [],
    });
    expect(board.individuals[0].total).toBe(18 * 2);
    expect(board.individuals[0].holes[0].sourceRoundLabel).toBe('R1');
  });

  it('ranks players by total and flags ties', () => {
    const board = computeRingerBoard({
      rounds: [flatRound('r1', 'R1', { p1: 3, p2: 3, p3: 4 })],
      players: [
        { playerId: 'p1', name: 'Pat' },
        { playerId: 'p2', name: 'Sam' },
        { playerId: 'p3', name: 'Lee' },
      ],
      teams: [],
    });
    const byId = Object.fromEntries(board.individuals.map((e) => [e.participantId, e]));
    expect(byId.p1.position).toBe(1);
    expect(byId.p2.position).toBe(1);
    expect(byId.p1.tied).toBe(true);
    expect(byId.p3.position).toBe(3);
    expect(byId.p3.tied).toBe(false);
  });
});

describe('computeRingerBoard - teams', () => {
  it('takes the single best across all members and all rounds, tagging the member', () => {
    const board = computeRingerBoard({
      rounds: [
        flatRound('r1', 'R1', { p1: 4, p2: 3 }),
        flatRound('r2', 'R2', { p1: 2, p2: 4 }),
      ],
      players: [
        { playerId: 'p1', name: 'Pat' },
        { playerId: 'p2', name: 'Sam' },
      ],
      teams: [{ teamId: 't1', name: 'Team A', color: 'avatar-green', memberPlayerIds: ['p1', 'p2'] }],
    });
    const team = board.teams[0];
    expect(team.holes[0].points).toBe(4);
    expect(team.holes[0].sourceRoundLabel).toBe('R2');
    expect(team.holes[0].sourcePlayerId).toBe('p1');
    expect(team.total).toBe(18 * 4);
    expect(team.isTeam).toBe(true);
    expect(team.color).toBe('avatar-green');
  });
});
