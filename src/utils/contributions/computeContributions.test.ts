import { computeContributions } from './computeContributions';
import type { ComputeContributionsInput, ContributionRoundInput } from './types';
import type { Hole } from '@/types';

// 3 holes, all par 4, stroke index 1..3, scratch players so net = gross.
const HOLES: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 } as Hole,
  { number: 2, par: 4, strokeIndex: 2 } as Hole,
  { number: 3, par: 4, strokeIndex: 3 } as Hole,
];

function bestBallRound(overrides: Partial<ContributionRoundInput> = {}): ContributionRoundInput {
  return {
    roundId: 'r1',
    roundLabel: 'R1',
    format: 'best-ball',
    gameType: 'stroke',
    holes: HOLES,
    teams: [
      {
        teamId: 't1',
        teamName: 'Eagles',
        color: 'avatar-green',
        members: [
          { playerId: 'a', playerName: 'Ann', handicap: 0 },
          { playerId: 'b', playerName: 'Bob', handicap: 0 },
        ],
        strokesByPlayerHole: {
          // Ann wins holes 1 & 2 (lower net), tie on hole 3.
          a: { 1: 3, 2: 4, 3: 4 },
          b: { 1: 5, 2: 5, 3: 4 },
        },
      },
    ],
    ...overrides,
  };
}

describe('computeContributions — best-ball', () => {
  it('counts holes won and splits ties 0.5 each', () => {
    const input: ComputeContributionsInput = { rounds: [bestBallRound()] };
    const board = computeContributions(input);

    const team = board.rounds[0].teams[0];
    const ann = team.players.find((p) => p.playerId === 'a')!;
    const bob = team.players.find((p) => p.playerId === 'b')!;

    // Ann: holes 1, 2 outright + 0.5 of hole 3 = 2.5. Bob: 0.5 of hole 3.
    expect(ann.value).toBe(2.5);
    expect(bob.value).toBe(0.5);
    expect(ann.share).toBeCloseTo(2.5 / 3);
    expect(bob.share).toBeCloseTo(0.5 / 3);
    expect(ann.isMvp).toBe(true);
    expect(bob.isMvp).toBe(false);
    expect(board.rounds[0].metricLabel).toBe('holes won');
    expect(board.rounds[0].dataMissing).toBe(false);
  });

  it('uses stableford points (higher wins) for stableford rounds', () => {
    const input: ComputeContributionsInput = {
      rounds: [bestBallRound({ gameType: 'stableford' })],
    };
    const board = computeContributions(input);
    const ann = board.rounds[0].teams[0].players.find((p) => p.playerId === 'a')!;
    // Ann still wins holes 1 & 2 (more points), tie on 3 → 2.5.
    expect(ann.value).toBe(2.5);
  });
});

describe('computeContributions — aggregate', () => {
  it('shares stableford points across both members', () => {
    const round: ContributionRoundInput = {
      ...bestBallRound(),
      format: 'aggregate',
      gameType: 'stableford',
    };
    const board = computeContributions({ rounds: [round] });
    const team = board.rounds[0].teams[0];
    const totalShare = team.players.reduce((s, p) => s + p.share, 0);
    expect(totalShare).toBeCloseTo(1);
    expect(board.rounds[0].metricLabel).toBe('points');
  });
});

describe('computeContributions — scramble', () => {
  it('counts shot slots and breaks down by type', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Ann', handicap: 0 },
                { playerId: 'b', playerName: 'Bob', handicap: 0 },
              ],
              strokesByPlayerHole: {},
              shotContributionsByHole: {
                1: { teeShot: 'a', approach: 'a', putt: 'b' },
                2: { teeShot: 'a', approach: 'b', putt: 'b' },
                3: { teeShot: 'b', approach: 'a', putt: 'a' },
              },
            },
          ],
        },
      ],
    });

    const team = board.rounds[0].teams[0];
    const ann = team.players.find((p) => p.playerId === 'a')!;
    const bob = team.players.find((p) => p.playerId === 'b')!;
    // Ann: tee 2, approach 2, putt 1 = 5. Bob: tee 1, approach 1, putt 2 = 4.
    expect(ann.value).toBe(5);
    expect(bob.value).toBe(4);
    expect(ann.shotBreakdown).toEqual({ drives: 2, approaches: 2, putts: 1 });
    expect(ann.share).toBeCloseTo(5 / 9);
    expect(board.rounds[0].dataMissing).toBe(false);
  });

  it('flags dataMissing when no shot contributions exist', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [{ playerId: 'a', playerName: 'Ann', handicap: 0 }],
              strokesByPlayerHole: {},
              shotContributionsByHole: {},
            },
          ],
        },
      ],
    });
    expect(board.rounds[0].dataMissing).toBe(true);
  });
});

describe('computeContributions — rollup', () => {
  it('averages each player share across played rounds, excluding missing rounds', () => {
    const mk = (id: string, format: 'best-ball'): ContributionRoundInput => ({
      roundId: id,
      roundLabel: id.toUpperCase(),
      format,
      gameType: 'stroke',
      holes: HOLES,
      teams: [
        {
          teamId: 't1',
          teamName: 'Eagles',
          color: null,
          members: [
            { playerId: 'a', playerName: 'Ann', handicap: 0 },
            { playerId: 'b', playerName: 'Bob', handicap: 0 },
          ],
          strokesByPlayerHole: {
            a: { 1: 3, 2: 3, 3: 3 }, // Ann wins all 3 → share 1
            b: { 1: 5, 2: 5, 3: 5 }, // Bob share 0
          },
        },
      ],
    });

    // Round 2 is a scramble with no shot data → excluded from rollup.
    const missing: ContributionRoundInput = {
      roundId: 'r2',
      roundLabel: 'R2',
      format: 'scramble',
      gameType: 'stroke',
      holes: HOLES,
      teams: [
        {
          teamId: 't1',
          teamName: 'Eagles',
          color: null,
          members: [{ playerId: 'a', playerName: 'Ann', handicap: 0 }],
          strokesByPlayerHole: {},
          shotContributionsByHole: {},
        },
      ],
    };

    const board = computeContributions({ rounds: [mk('r1', 'best-ball'), missing] });
    const ann = board.rollup.find((r) => r.playerId === 'a')!;
    const bob = board.rollup.find((r) => r.playerId === 'b')!;
    // Ann won all 3 holes on a 2-player team: share 1 × team size 2 = index 2.
    // Bob: share 0 × 2 = index 0. The team's indices average to 1.0.
    expect(ann.weightIndex).toBeCloseTo(2);
    expect(bob.weightIndex).toBeCloseTo(0);
    expect(ann.roundsCounted).toBe(1); // missing round excluded
    expect(ann.isMvp).toBe(true);
    expect(board.rollup[0].playerId).toBe('a'); // sorted desc
    expect(board.isEmpty).toBe(false);
  });

  it('marks isEmpty when every round is data-missing', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [{ playerId: 'a', playerName: 'Ann', handicap: 0 }],
              strokesByPlayerHole: {},
              shotContributionsByHole: {},
            },
          ],
        },
      ],
    });
    expect(board.rollup).toHaveLength(0);
    expect(board.isEmpty).toBe(true);
  });
});

describe('computeContributions — alt-shot (scramble format)', () => {
  it('alt-shot one-ball contributions count shots per player', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble', // alt-shot maps to this internally
          gameType: 'alt-shot',
          holes: [{ number: 1, par: 4, strokeIndex: 1 } as never],
          teams: [
            {
              teamId: 't1',
              teamName: 'Sam & Alex',
              color: null,
              members: [
                { playerId: 'p1', playerName: 'Sam', handicap: 9 },
                { playerId: 'p2', playerName: 'Alex', handicap: 11 },
              ],
              strokesByPlayerHole: { p1: { 1: 4 }, p2: { 1: 4 } },
              // Sam: teeShot + putt = 2. Alex: approach = 1.
              shotContributionsByHole: { 1: { teeShot: 'p1', approach: 'p2', putt: 'p1' } },
            },
          ],
        },
      ],
    });
    const team = board.rounds[0].teams[0];
    const sam = team.players.find((p) => p.playerId === 'p1')!;
    const alex = team.players.find((p) => p.playerId === 'p2')!;
    expect(sam.value).toBe(2);  // teeShot + putt
    expect(alex.value).toBe(1); // approach
    expect(board.rounds[0].metricLabel).toBe('shots used');
    expect(board.rounds[0].dataMissing).toBe(false);
  });
});

describe('computeContributions — shamble', () => {
  it('averages drives-used and holes-won shares', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'shamble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Ann', handicap: 0 },
                { playerId: 'b', playerName: 'Bob', handicap: 0 },
              ],
              // Ann wins all 3 holes on own ball.
              strokesByPlayerHole: {
                a: { 1: 3, 2: 3, 3: 3 },
                b: { 1: 5, 2: 5, 3: 5 },
              },
              // Drives: Ann 1, Bob 2.
              shotContributionsByHole: {
                1: { teeShot: 'b' },
                2: { teeShot: 'b' },
                3: { teeShot: 'a' },
              },
            },
          ],
        },
      ],
    });
    const ann = board.rounds[0].teams[0].players.find((p) => p.playerId === 'a')!;
    // drives share Ann = 1/3; holes-won share Ann = 3/3 = 1. avg = (1/3 + 1)/2 = 2/3.
    expect(ann.share).toBeCloseTo((1 / 3 + 1) / 2);
    expect(board.rounds[0].drivesMissing).toBe(false);
  });

  it('falls back to holes-won only when drives are missing', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'shamble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Ann', handicap: 0 },
                { playerId: 'b', playerName: 'Bob', handicap: 0 },
              ],
              strokesByPlayerHole: {
                a: { 1: 3, 2: 3, 3: 3 },
                b: { 1: 5, 2: 5, 3: 5 },
              },
              shotContributionsByHole: {},
            },
          ],
        },
      ],
    });
    const ann = board.rounds[0].teams[0].players.find((p) => p.playerId === 'a')!;
    expect(ann.share).toBeCloseTo(1); // holes-won only
    expect(board.rounds[0].drivesMissing).toBe(true);
    expect(board.rounds[0].dataMissing).toBe(false); // own-ball data present
  });
});
