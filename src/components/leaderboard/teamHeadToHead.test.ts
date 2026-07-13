import { mergeHeadToHeadRounds } from './teamHeadToHead';
import type { RoundBreakdownEntry } from './TeamLeaderboardTable';

const rb = (roundId: string, points: number, courseName?: string): RoundBreakdownEntry => ({
  roundId,
  roundLabel: 'ignored',
  courseName,
  position: 1,
  points,
});

describe('mergeHeadToHeadRounds', () => {
  const order = new Map<string, number>([['r1', 1], ['r2', 2], ['r3', 3]]);

  it('aligns both teams by round and orders positionally', () => {
    const left = [rb('r2', 6), rb('r1', 12, 'Old Course')];
    const right = [rb('r1', 8, 'Old Course'), rb('r2', 6)];
    const rows = mergeHeadToHeadRounds(left, right, order);
    expect(rows.map((r) => r.roundLabel)).toEqual(['R1', 'R2']);
    expect(rows[0]).toMatchObject({ roundId: 'r1', roundNumber: 1, courseName: 'Old Course', pointsLeft: 12, pointsRight: 8 });
    expect(rows[1]).toMatchObject({ roundId: 'r2', pointsLeft: 6, pointsRight: 6 });
  });

  it('fills 0 for a round only one team scored', () => {
    const left = [rb('r1', 10)];
    const right = [rb('r1', 4), rb('r3', 5)];
    const rows = mergeHeadToHeadRounds(left, right, order);
    expect(rows.map((r) => [r.roundLabel, r.pointsLeft, r.pointsRight])).toEqual([
      ['R1', 10, 4],
      ['R3', 0, 5],
    ]);
  });

  it('returns [] when both are empty/undefined', () => {
    expect(mergeHeadToHeadRounds(undefined, undefined, order)).toEqual([]);
    expect(mergeHeadToHeadRounds([], [], order)).toEqual([]);
  });
});
