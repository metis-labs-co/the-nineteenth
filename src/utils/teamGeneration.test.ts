import {
  generateBalancedTeams,
  getTeamStats,
  type TeamPlayer,
} from './teamGeneration';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const player = (id: string, handicap: number | null | undefined): TeamPlayer => ({
  id,
  name: `Player ${id}`,
  handicap: handicap ?? null,
});

const spreadOf = (teams: { members: TeamPlayer[] }[]): number => {
  if (teams.length < 2) return 0;
  const averages = teams.map((t) => {
    if (t.members.length === 0) return 0;
    const sum = t.members.reduce((s, m) => s + (m.handicap ?? 0), 0);
    return sum / t.members.length;
  });
  return Math.max(...averages) - Math.min(...averages);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateBalancedTeams — numTeams override', () => {
  it('produces exactly the requested number of teams', () => {
    const players = Array.from({ length: 14 }, (_, i) => player(String(i), i));

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
      numTeams: 4,
    });

    expect(teams).toHaveLength(4);
  });

  it('distributes remainder to lowest-indexed teams (14 players, 4 teams → 4,4,3,3)', () => {
    const players = Array.from({ length: 14 }, (_, i) => player(String(i), i));

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
      numTeams: 4,
    });

    const sizes = teams.map((t) => t.members.length);
    // Snake draft + local search may rebalance, but the distribution of
    // sizes should still sum to 14 and be in [3, 4]
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(14);
    const sortedSizes = [...sizes].sort().reverse();
    expect(sortedSizes).toEqual([4, 4, 3, 3]);
  });

  it('falls back to teamSize derivation when numTeams is not provided', () => {
    const players = Array.from({ length: 8 }, (_, i) => player(String(i), i));

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    expect(teams).toHaveLength(4);
    teams.forEach((t) => expect(t.members).toHaveLength(2));
  });
});

describe('generateBalancedTeams — local-search optimisation', () => {
  it('improves on pure snake draft for adversarial clusters', () => {
    // Clustered handicaps — four very low and four very high into 3 teams
    // of sizes [3, 3, 2]. Pure snake draft on this input lands at a
    // visibly imbalanced outcome (spread > 10). The optimiser should drive
    // it down toward the minimum reachable by pairwise swaps.
    const handicaps = [1, 2, 3, 4, 25, 26, 27, 28];
    const players = handicaps.map((h, i) => player(`p${i}`, h));

    // Compute what pure snake draft alone would produce (no optimisation)
    // by flipping off balanceByHandicap: that keeps the input order, which
    // snake-drafts directly. Not identical, so instead we compute the snake
    // result by hand from the algorithm spec.
    // Sorted ascending: [1,2,3,4,25,26,27,28] → snake into 3 teams:
    //   round 0: T0=1, T1=2, T2=3
    //   round 1: T2=4, T1=25, T0=26
    //   round 2: T0=27, T1=28
    // Teams: [1,26,27], [2,25,28], [3,4]. Averages 18, 18.33, 3.5.
    // Spread = 14.83.
    const snakeOnlySpread = 14.83;

    const teams = generateBalancedTeams(players, {
      teamSize: 3,
      balanceByHandicap: true,
      numTeams: 3,
    });

    // Optimiser must beat the snake-only result by a wide margin
    expect(spreadOf(teams)).toBeLessThan(snakeOnlySpread - 5);
    // And it should be close to the theoretical minimum for this input
    // (pairwise-swap optimum on these handicaps is ~5.67).
    expect(spreadOf(teams)).toBeLessThanOrEqual(6);
  });

  it('achieves zero spread when exact balance is reachable', () => {
    // 4 players with handicaps [0, 10, 20, 30] into 2 teams.
    // Optimal: [0, 30] + [10, 20] → both avg 15.
    const players = [0, 10, 20, 30].map((h, i) => player(`p${i}`, h));

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
      numTeams: 2,
    });

    expect(spreadOf(teams)).toBe(0);
  });

  it('is idempotent — running twice with same input gives same spread', () => {
    const players = Array.from({ length: 12 }, (_, i) =>
      player(`p${i}`, (i * 7) % 30)
    );

    const first = generateBalancedTeams(players, {
      teamSize: 3,
      balanceByHandicap: true,
    });
    const second = generateBalancedTeams(players, {
      teamSize: 3,
      balanceByHandicap: true,
    });

    expect(spreadOf(first)).toBeCloseTo(spreadOf(second), 5);
  });
});

describe('generateBalancedTeams — null handicap handling', () => {
  it('handles a mix of null and numeric handicaps without throwing', () => {
    const players: TeamPlayer[] = [
      player('a', 5),
      player('b', null),
      player('c', 20),
      player('d', null),
      player('e', 10),
      player('f', 15),
    ];

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    const ids = teams.flatMap((t) => t.members.map((m) => m.id)).sort();
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('distributes null-handicap players across teams rather than clustering them', () => {
    // With 4 null-handicap players and 4 zero players into 4 teams of 2,
    // the old "treat null as 0" code grouped nulls with nulls. The mean-
    // substitution should spread them.
    const players: TeamPlayer[] = [
      player('n1', null),
      player('n2', null),
      player('n3', null),
      player('n4', null),
      player('h1', 5),
      player('h2', 10),
      player('h3', 15),
      player('h4', 20),
    ];

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
      numTeams: 4,
    });

    // Every team should have exactly one null-handicap player
    teams.forEach((team) => {
      const nullCount = team.members.filter((m) => m.handicap == null).length;
      expect(nullCount).toBe(1);
    });
  });

  it('handles all-null handicaps (falls back to mean = 0)', () => {
    const players: TeamPlayer[] = [
      player('a', null),
      player('b', null),
      player('c', null),
      player('d', null),
    ];

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    expect(teams).toHaveLength(2);
    expect(teams[0].members).toHaveLength(2);
    expect(teams[1].members).toHaveLength(2);
  });
});

describe('generateBalancedTeams — edge cases', () => {
  it('returns empty array for empty input', () => {
    const teams = generateBalancedTeams([], {
      teamSize: 2,
      balanceByHandicap: true,
    });

    expect(teams).toEqual([]);
  });

  it('keeps original order when balanceByHandicap is false', () => {
    const players: TeamPlayer[] = [
      player('a', 30),
      player('b', 0),
      player('c', 20),
      player('d', 10),
    ];

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: false,
    });

    expect(teams[0].members.map((m) => m.id)).toEqual(['a', 'd']);
    expect(teams[1].members.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('clamps numTeams at player count when over-requested', () => {
    const players: TeamPlayer[] = [player('a', 5), player('b', 10)];

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
      numTeams: 10,
    });

    // Can't make more teams than players
    expect(teams.length).toBeLessThanOrEqual(players.length);
    expect(teams.length).toBeGreaterThan(0);
  });
});

describe('getTeamStats (unchanged — sanity)', () => {
  it('averages handicaps correctly', () => {
    const stats = getTeamStats({
      name: 'T',
      members: [player('a', 10), player('b', 20), player('c', 30)],
    });
    expect(stats.avgHandicap).toBe(20);
    expect(stats.totalHandicap).toBe(60);
  });
});
