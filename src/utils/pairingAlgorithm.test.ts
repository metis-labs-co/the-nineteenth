/**
 * pairingAlgorithm — generateSubMatches tests
 *
 * The legacy generateSnakeDraftPairings has been in production for a while;
 * these tests focus on the newer generateSubMatches helper that powers the
 * Ryder-Cup-style split team round.
 */

import {
  generateSnakeDraftPairings,
  generateSubMatches,
  divisorsOf,
  generateTeamBalancedGroups,
  generateTeamTogetherGroups,
  pickGroupingStrategy,
} from './pairingAlgorithm';
import type { PairingPlayer } from '@/types';

function player(id: string, handicap: number, name = id): PairingPlayer {
  return { id, name, handicap };
}

describe('generateSubMatches', () => {
  const baseOpts = {
    startTime: '08:00',
    intervalMinutes: 8,
  };

  it('produces 2 even 2v2 sub-matches from a 4v4 team setup', () => {
    const teamA = [player('a1', 5), player('a2', 12), player('a3', 18), player('a4', 24)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 20), player('b4', 28)];

    const result = generateSubMatches({
      ...baseOpts,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: 2,
    });

    expect(result.warnings).toEqual([]);
    expect(result.subMatches).toHaveLength(2);
    result.subMatches.forEach((sm) => {
      expect(sm.teamAPlayerIds).toHaveLength(2);
      expect(sm.teamBPlayerIds).toHaveLength(2);
    });

    // Tee times should be 8 minutes apart and sorted.
    expect(result.subMatches[0].teeTime).toBe('08:00');
    expect(result.subMatches[1].teeTime).toBe('08:08');
  });

  it('flags an uneven remainder as a warning (5v5 with 2v2 size)', () => {
    const teamA = [player('a1', 5), player('a2', 10), player('a3', 14), player('a4', 20), player('a5', 26)];
    const teamB = [player('b1', 4), player('b2', 9), player('b3', 15), player('b4', 22), player('b5', 30)];

    const result = generateSubMatches({
      ...baseOpts,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: 2,
    });

    expect(result.subMatches).toHaveLength(3);
    // First two should be 2v2, last should be 1v1
    expect(result.subMatches[0].teamAPlayerIds).toHaveLength(2);
    expect(result.subMatches[0].teamBPlayerIds).toHaveLength(2);
    expect(result.subMatches[2].teamAPlayerIds).toHaveLength(1);
    expect(result.subMatches[2].teamBPlayerIds).toHaveLength(1);

    // At least one warning explaining the smaller final sub-match.
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('produces three 1v1 matches for a 3v3 with size 1', () => {
    const teamA = [player('a1', 8), player('a2', 15), player('a3', 22)];
    const teamB = [player('b1', 10), player('b2', 14), player('b3', 24)];

    const result = generateSubMatches({
      ...baseOpts,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: 1,
    });

    expect(result.warnings).toEqual([]);
    expect(result.subMatches).toHaveLength(3);
    result.subMatches.forEach((sm) => {
      expect(sm.teamAPlayerIds).toHaveLength(1);
      expect(sm.teamBPlayerIds).toHaveLength(1);
    });
  });

  it('snake-draft balances handicaps across sub-teams', () => {
    // Sorted: a1(1), a2(5), a3(10), a4(25). With 2v2 snake-draft, sub-team 1
    // should get the lowest + highest (1 + 25 = 26) and sub-team 2 should get
    // (5 + 10 = 15). The spread is larger than any naive "first N + next N"
    // split, which is the whole point of snake drafting.
    const teamA = [player('a1', 1), player('a2', 5), player('a3', 10), player('a4', 25)];
    const teamB = [player('b1', 2), player('b2', 6), player('b3', 11), player('b4', 26)];

    const result = generateSubMatches({
      ...baseOpts,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: 2,
    });

    const subTeamATotals = result.subMatches.map((sm) =>
      sm.teamAPlayers.reduce((sum, p) => sum + (p.handicap ?? 0), 0)
    );
    // Both sub-teams should be closer to the mean (41/2 = 20.5) than the
    // naive split (1+5=6 vs 10+25=35).
    subTeamATotals.forEach((total) => {
      expect(Math.abs(total - 20.5)).toBeLessThanOrEqual(6); // within 6 strokes of mean
    });
  });

  it('returns no sub-matches when either side has zero players', () => {
    const result = generateSubMatches({
      ...baseOpts,
      teamAPlayers: [],
      teamBPlayers: [player('b1', 10)],
      subMatchSize: 1,
    });

    expect(result.subMatches).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('assigns unique sort orders and staggered tee times', () => {
    const teamA = [player('a1', 5), player('a2', 15), player('a3', 25)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 22)];

    const result = generateSubMatches({
      ...baseOpts,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: 1,
    });

    expect(result.subMatches.map((sm) => sm.sortOrder)).toEqual([0, 1, 2]);
    expect(result.subMatches.map((sm) => sm.teeTime)).toEqual(['08:00', '08:08', '08:16']);
  });

  describe('with preOrderedTeamA / preOrderedTeamB (standings-driven pairing)', () => {
    it('honours the supplied order instead of handicap snake-draft', () => {
      // Players are listed in low-to-high handicap order so handicap snake-draft
      // would pair (a1+a4) vs (a2+a3) — but the pre-ordered list overrides that
      // and buckets them in the supplied order: (a1,a2) vs (a3,a4).
      const teamA = [player('a1', 1), player('a2', 5), player('a3', 10), player('a4', 25)];
      const teamB = [player('b1', 2), player('b2', 6), player('b3', 11), player('b4', 26)];

      const result = generateSubMatches({
        ...baseOpts,
        teamAPlayers: teamA,
        teamBPlayers: teamB,
        subMatchSize: 2,
        preOrderedTeamA: ['a1', 'a2', 'a3', 'a4'],
        preOrderedTeamB: ['b1', 'b2', 'b3', 'b4'],
      });

      expect(result.subMatches).toHaveLength(2);
      expect(result.subMatches[0].teamAPlayerIds).toEqual(['a1', 'a2']);
      expect(result.subMatches[0].teamBPlayerIds).toEqual(['b1', 'b2']);
      expect(result.subMatches[1].teamAPlayerIds).toEqual(['a3', 'a4']);
      expect(result.subMatches[1].teamBPlayerIds).toEqual(['b3', 'b4']);
    });

    it('falls back to snake-draft when the pre-ordered list is incomplete', () => {
      const teamA = [player('a1', 5), player('a2', 15)];
      const teamB = [player('b1', 6), player('b2', 14)];

      const result = generateSubMatches({
        ...baseOpts,
        teamAPlayers: teamA,
        teamBPlayers: teamB,
        subMatchSize: 1,
        // Missing a2 — fallback path engages.
        preOrderedTeamA: ['a1'],
        preOrderedTeamB: ['b1', 'b2'],
      });

      expect(result.subMatches).toHaveLength(2);
    });

    it('produces 1v1 sub-matches in standings rank order for ryder_cup_singles', () => {
      const teamA = [player('a1', 5), player('a2', 15), player('a3', 25)];
      const teamB = [player('b1', 6), player('b2', 14), player('b3', 22)];

      const result = generateSubMatches({
        ...baseOpts,
        teamAPlayers: teamA,
        teamBPlayers: teamB,
        subMatchSize: 1,
        preOrderedTeamA: ['a3', 'a1', 'a2'], // a3 is the team's top qualifier
        preOrderedTeamB: ['b2', 'b3', 'b1'],
      });

      expect(result.subMatches.map((sm) => sm.teamAPlayerIds)).toEqual([
        ['a3'],
        ['a1'],
        ['a2'],
      ]);
      expect(result.subMatches.map((sm) => sm.teamBPlayerIds)).toEqual([
        ['b2'],
        ['b3'],
        ['b1'],
      ]);
    });
  });
});

describe('generateTeamBalancedGroups', () => {
  const baseOpts = { startTime: '08:00', intervalMinutes: 8, groupSize: 4 };

  it('splits two teams of 4 into two 2+2 foursomes', () => {
    const teamA = [player('a1', 5), player('a2', 12), player('a3', 18), player('a4', 24)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 20), player('b4', 28)];

    const result = generateTeamBalancedGroups({
      ...baseOpts,
      teamPlayers: [teamA, teamB],
    });

    expect(result.groups).toHaveLength(2);
    expect(result.warnings).toEqual([]);
    for (const g of result.groups) {
      expect(g.playerIds).toHaveLength(4);
      const aCount = g.playerIds.filter((id) => id.startsWith('a')).length;
      const bCount = g.playerIds.filter((id) => id.startsWith('b')).length;
      expect(aCount).toBe(2);
      expect(bCount).toBe(2);
    }
    expect(result.groups.map((g) => g.teeTime)).toEqual(['08:00', '08:08']);
  });

  it('handles uneven teams (3v3 into groupSize 4)', () => {
    const teamA = [player('a1', 5), player('a2', 15), player('a3', 25)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 22)];

    const result = generateTeamBalancedGroups({
      ...baseOpts,
      teamPlayers: [teamA, teamB],
    });

    // 6 players, groupSize 4 → 2 groups. Team A snake-drafts into [2, 1]
    // buckets, team B into [1, 2] (alternating direction), so groups are
    // (2+1) = 3 and (1+2) = 3. Even sizes, no warning.
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].playerIds).toHaveLength(3);
    expect(result.groups[1].playerIds).toHaveLength(3);
    expect(result.warnings).toEqual([]);
  });

  it('produces a smaller final group when players do not divide evenly', () => {
    const teamA = [
      player('a1', 5),
      player('a2', 10),
      player('a3', 15),
      player('a4', 20),
      player('a5', 25),
    ];
    const teamB = [
      player('b1', 6),
      player('b2', 12),
      player('b3', 18),
      player('b4', 24),
      player('b5', 30),
    ];

    const result = generateTeamBalancedGroups({
      ...baseOpts,
      teamPlayers: [teamA, teamB],
    });

    // 10 players, groupSize 4 → 3 groups. Snake-draft spreads them evenly
    // so sizes are (3, 3, 4) — the largest group gets the remainder.
    expect(result.groups).toHaveLength(3);
    const sizes = result.groups.map((g) => g.playerIds.length);
    expect(sizes.sort()).toEqual([3, 3, 4]);
    // Every group should still be cross-team (at least one from each side).
    for (const g of result.groups) {
      const aCount = g.playerIds.filter((id) => id.startsWith('a')).length;
      const bCount = g.playerIds.filter((id) => id.startsWith('b')).length;
      expect(aCount).toBeGreaterThan(0);
      expect(bCount).toBeGreaterThan(0);
    }
  });

  it('returns no groups and a warning when fewer than two teams have players', () => {
    const teamA = [player('a1', 5), player('a2', 12)];

    const result = generateTeamBalancedGroups({
      ...baseOpts,
      teamPlayers: [teamA, []],
    });

    expect(result.groups).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('produces different arrangements on successive calls while preserving team mix', () => {
    // 2×4 players × 20 runs — probability all runs produce identical group
    // compositions is (1/binomial)^19, effectively zero with distinct handicaps.
    // Every run must still put 2A + 2B in each group (the balance invariant).
    const teamA = [player('a1', 5), player('a2', 12), player('a3', 18), player('a4', 24)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 20), player('b4', 28)];

    const arrangements = new Set<string>();
    for (let run = 0; run < 20; run += 1) {
      const result = generateTeamBalancedGroups({
        ...baseOpts,
        teamPlayers: [teamA, teamB],
      });
      // Each group's id set is sorted for stable comparison.
      const key = result.groups
        .map((g) => [...g.playerIds].sort().join(','))
        .join('|');
      arrangements.add(key);
      for (const g of result.groups) {
        const aCount = g.playerIds.filter((id) => id.startsWith('a')).length;
        const bCount = g.playerIds.filter((id) => id.startsWith('b')).length;
        expect(aCount).toBe(2);
        expect(bCount).toBe(2);
      }
    }
    // At least two distinct arrangements across 20 runs — the shuffle is
    // working. Tighter bounds would risk flaky tests; this is enough to
    // catch "shuffle is fully deterministic" regressions.
    expect(arrangements.size).toBeGreaterThan(1);
  });
});

describe('generateSnakeDraftPairings', () => {
  const baseOpts = { startTime: '08:00', intervalMinutes: 8, groupSize: 4 as const };

  it('produces different arrangements on successive calls with distinct handicaps', () => {
    // 12 players with distinct handicaps split into 3 groups. Each group
    // must still receive one player from each of the 3 handicap tiers
    // (best/mid/worst), but which specific player varies per shuffle.
    const players = Array.from({ length: 12 }, (_, i) => player(`p${i}`, i + 1));

    const arrangements = new Set<string>();
    for (let run = 0; run < 20; run += 1) {
      const result = generateSnakeDraftPairings({ ...baseOpts, players });
      const key = result.groups
        .map((g) => [...g.playerIds].sort().join(','))
        .join('|');
      arrangements.add(key);
      expect(result.groups).toHaveLength(3);
      for (const g of result.groups) {
        expect(g.playerIds).toHaveLength(4);
      }
    }
    expect(arrangements.size).toBeGreaterThan(1);
  });

  it('preserves skill balance across groups (best/mid/worst tier mix)', () => {
    // 8 players → 2 groups. Sorted handicaps 1..8, tier size 4 (numGroups=2
    // groups × 2 rounds per tier? actually numGroups=2, so tiers of 2).
    // Each group should contain one from each adjacent-handicap pair.
    const players = Array.from({ length: 8 }, (_, i) => player(`p${i + 1}`, i + 1));

    for (let run = 0; run < 10; run += 1) {
      const result = generateSnakeDraftPairings({ ...baseOpts, players });
      expect(result.groups).toHaveLength(2);
      for (const g of result.groups) {
        // Tier invariant: each group must contain exactly one player from
        // each pair (p1|p2), (p3|p4), (p5|p6), (p7|p8).
        for (let pair = 0; pair < 4; pair += 1) {
          const a = `p${pair * 2 + 1}`;
          const b = `p${pair * 2 + 2}`;
          const count =
            (g.playerIds.includes(a) ? 1 : 0) + (g.playerIds.includes(b) ? 1 : 0);
          expect(count).toBe(1);
        }
      }
    }
  });
});

describe('generateTeamTogetherGroups', () => {
  const baseOpts = { startTime: '08:00', intervalMinutes: 8 };

  it('keeps each 4-player team in its own group (2 teams → 2 groups of 4)', () => {
    const teamA = [player('a1', 5), player('a2', 12), player('a3', 18), player('a4', 24)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 20), player('b4', 28)];

    const result = generateTeamTogetherGroups({
      ...baseOpts,
      teamPlayers: [teamA, teamB],
    });

    expect(result.warnings).toEqual([]);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].playerIds).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(result.groups[1].playerIds).toEqual(['b1', 'b2', 'b3', 'b4']);
    expect(result.groups.map((g) => g.teeTime)).toEqual(['08:00', '08:08']);
    expect(result.groups.map((g) => g.slotIndex)).toEqual([0, 1]);
  });

  it('handles uneven teams (3+3) by keeping each team together', () => {
    const teamA = [player('a1', 5), player('a2', 15), player('a3', 25)];
    const teamB = [player('b1', 6), player('b2', 14), player('b3', 22)];

    const result = generateTeamTogetherGroups({
      ...baseOpts,
      teamPlayers: [teamA, teamB],
    });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].playerIds).toEqual(['a1', 'a2', 'a3']);
    expect(result.groups[1].playerIds).toEqual(['b1', 'b2', 'b3']);
    expect(result.warnings).toEqual([]);
  });

  it('splits a team larger than maxGroupSize and warns', () => {
    const teamA = [
      player('a1', 5),
      player('a2', 10),
      player('a3', 15),
      player('a4', 20),
      player('a5', 25),
    ];
    const teamB = [player('b1', 6), player('b2', 14)];

    const result = generateTeamTogetherGroups({
      ...baseOpts,
      teamPlayers: [teamA, teamB],
    });

    // Team A (5 players) splits into 4 + 1; Team B fits in one group.
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0].playerIds).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(result.groups[1].playerIds).toEqual(['a5']);
    expect(result.groups[2].playerIds).toEqual(['b1', 'b2']);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/Team 1/);
  });

  it('skips empty teams without erroring', () => {
    const teamA = [player('a1', 5), player('a2', 12)];

    const result = generateTeamTogetherGroups({
      ...baseOpts,
      teamPlayers: [teamA, []],
    });

    // One team with players → one group. No error — team-together is valid
    // for single-team configurations (e.g. solo standalone team round).
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].playerIds).toEqual(['a1', 'a2']);
  });

  it('returns no groups when every team is empty', () => {
    const result = generateTeamTogetherGroups({
      ...baseOpts,
      teamPlayers: [[], []],
    });

    expect(result.groups).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('divisorsOf', () => {
  it('returns all positive divisors in ascending order', () => {
    expect(divisorsOf(1)).toEqual([1]);
    expect(divisorsOf(2)).toEqual([1, 2]);
    expect(divisorsOf(3)).toEqual([1, 3]);
    expect(divisorsOf(4)).toEqual([1, 2, 4]);
    expect(divisorsOf(5)).toEqual([1, 5]);
    expect(divisorsOf(6)).toEqual([1, 2, 3, 6]);
    expect(divisorsOf(8)).toEqual([1, 2, 4, 8]);
  });

  it('returns an empty array for non-positive or non-finite input', () => {
    expect(divisorsOf(0)).toEqual([]);
    expect(divisorsOf(-1)).toEqual([]);
    expect(divisorsOf(Number.NaN)).toEqual([]);
    expect(divisorsOf(Number.POSITIVE_INFINITY)).toEqual([]);
  });
});

describe('pickGroupingStrategy', () => {
  it('maps scramble to team-together for team competitions', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: 'scramble',
        isSplitRound: false,
        isTeamRound: true,
        teamCount: 2,
      })
    ).toBe('team-together');
  });

  it('maps a multi-team round to team-balanced', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: 'best-ball',
        isSplitRound: false,
        isTeamRound: true,
        teamCount: 2,
      })
    ).toBe('team-balanced');
  });

  it('maps a non-team round to snake-draft', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: null,
        isSplitRound: false,
        isTeamRound: false,
        teamCount: 0,
      })
    ).toBe('snake-draft');
  });

  it('maps split rounds to none', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: 'scramble',
        isSplitRound: true,
        isTeamRound: true,
        teamCount: 2,
      })
    ).toBe('none');
  });

  // Individual competitions (team_mode 'none') must ignore any stray team
  // config left on a round (e.g. a team preset applied by mistake) and fall
  // back to random groups of four — otherwise the Groups tab tries the
  // team-together generator and errors with "no teams with players".
  it('forces snake-draft for individual competitions even when the round carries a scramble team format', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: 'scramble',
        isSplitRound: false,
        isTeamRound: true,
        teamCount: 0,
        isIndividualCompetition: true,
      })
    ).toBe('snake-draft');
  });

  it('forces snake-draft for individual competitions even when flagged as a multi-team round', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: 'best-ball',
        isSplitRound: false,
        isTeamRound: true,
        teamCount: 2,
        isIndividualCompetition: true,
      })
    ).toBe('snake-draft');
  });

  it('still defers to sub-matches for a split round in an individual competition', () => {
    expect(
      pickGroupingStrategy({
        teamFormat: null,
        isSplitRound: true,
        isTeamRound: false,
        teamCount: 0,
        isIndividualCompetition: true,
      })
    ).toBe('none');
  });
});
