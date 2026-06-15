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
