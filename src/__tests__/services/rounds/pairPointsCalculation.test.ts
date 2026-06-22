/**
 * pairPointsCalculation tests
 *
 * Pure helpers backing live pair-points finalization for split rounds.
 */

import {
  sideBestBallTotal,
  resolveSubMatchOutcomeFromScores,
  deriveSideTeamIds,
  computeAltShotHolesUpMargin,
} from '@/services/rounds/pairPointsCalculation';
import type { Hole } from '@/types/database.types';

const holes: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 },
  { number: 2, par: 4, strokeIndex: 2 },
  { number: 3, par: 3, strokeIndex: 3 },
];

/** Build a getHoleValue closure from a {playerId: {holeNumber: value}} map. */
function valueLookup(
  table: Record<string, Record<number, number>>
): (playerId: string, hole: Hole) => number | null {
  return (playerId, hole) => {
    const v = table[playerId]?.[hole.number];
    return v === undefined ? null : v;
  };
}

describe('sideBestBallTotal', () => {
  it('sums the best (max) per-hole value across the pair when higher is better', () => {
    // p1: 2,2,2  p2: 0,3,1  → best per hole: 2,3,2 = 7
    const get = valueLookup({
      p1: { 1: 2, 2: 2, 3: 2 },
      p2: { 1: 0, 2: 3, 3: 1 },
    });
    expect(sideBestBallTotal(['p1', 'p2'], holes, get, true)).toBe(7);
  });

  it('takes the min per hole when lower is better (stroke)', () => {
    // p1 net: 4,5,3  p2 net: 5,4,4 → best (min): 4,4,3 = 11
    const get = valueLookup({
      p1: { 1: 4, 2: 5, 3: 3 },
      p2: { 1: 5, 2: 4, 3: 4 },
    });
    expect(sideBestBallTotal(['p1', 'p2'], holes, get, false)).toBe(11);
  });

  it('skips holes where no pair member has a score', () => {
    // Only hole 1 and 3 scored → 2 + 4 = 6
    const get = valueLookup({
      p1: { 1: 2, 3: 4 },
      p2: {},
    });
    expect(sideBestBallTotal(['p1', 'p2'], holes, get, true)).toBe(6);
  });

  it('returns null when the side has no usable scores at all', () => {
    const get = valueLookup({});
    expect(sideBestBallTotal(['p1', 'p2'], holes, get, true)).toBeNull();
  });
});

describe('resolveSubMatchOutcomeFromScores', () => {
  it('returns a-wins when side A best-ball beats side B (higher better)', () => {
    const get = valueLookup({
      a1: { 1: 3, 2: 2, 3: 2 }, // best A: 3+2+2 = 7
      a2: { 1: 1, 2: 1, 3: 1 },
      b1: { 1: 2, 2: 2, 3: 2 }, // best B: 2+2+2 = 6
      b2: { 1: 0, 2: 0, 3: 0 },
    });
    expect(
      resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: ['a1', 'a2'],
        teamBPlayerIds: ['b1', 'b2'],
        holes,
        getHoleValue: get,
        higherIsBetter: true,
      })
    ).toBe('a-wins');
  });

  it('returns b-wins when side B best-ball beats side A (higher better)', () => {
    const get = valueLookup({
      a1: { 1: 2, 2: 2, 3: 2 }, // best A: 6
      b1: { 1: 3, 2: 3, 3: 3 }, // best B: 9
    });
    expect(
      resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: ['a1'],
        teamBPlayerIds: ['b1'],
        holes,
        getHoleValue: get,
        higherIsBetter: true,
      })
    ).toBe('b-wins');
  });

  it('returns halved when both sides tie', () => {
    const get = valueLookup({
      a1: { 1: 2, 2: 2, 3: 2 },
      b1: { 1: 2, 2: 2, 3: 2 },
    });
    expect(
      resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: ['a1'],
        teamBPlayerIds: ['b1'],
        holes,
        getHoleValue: get,
        higherIsBetter: true,
      })
    ).toBe('halved');
  });

  it('respects lower-is-better (stroke): the lower net total wins', () => {
    const get = valueLookup({
      a1: { 1: 4, 2: 4, 3: 3 }, // A total 11
      b1: { 1: 5, 2: 5, 3: 4 }, // B total 14
    });
    expect(
      resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: ['a1'],
        teamBPlayerIds: ['b1'],
        holes,
        getHoleValue: get,
        higherIsBetter: false,
      })
    ).toBe('a-wins');
  });

  it('returns null when one side has no scores (sub-match not playable)', () => {
    const get = valueLookup({ a1: { 1: 2, 2: 2, 3: 2 } });
    expect(
      resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: ['a1'],
        teamBPlayerIds: ['b1'],
        holes,
        getHoleValue: get,
        higherIsBetter: true,
      })
    ).toBeNull();
  });
});

describe('deriveSideTeamIds', () => {
  const teams = [
    { id: 'team-x', memberIds: ['a1', 'a2', 'a3', 'a4'] },
    { id: 'team-y', memberIds: ['b1', 'b2', 'b3', 'b4'] },
  ];

  it('maps each side to the competition team that owns its players', () => {
    expect(
      deriveSideTeamIds({
        teamAPlayerIds: ['a1', 'a2'],
        teamBPlayerIds: ['b1', 'b2'],
        teams,
      })
    ).toEqual({ sideATeamId: 'team-x', sideBTeamId: 'team-y' });
  });

  it('returns null when a side spans two teams (mis-configured)', () => {
    expect(
      deriveSideTeamIds({
        teamAPlayerIds: ['a1', 'b1'],
        teamBPlayerIds: ['b2', 'a2'],
        teams,
      })
    ).toBeNull();
  });

  it('returns null when both sides resolve to the same team', () => {
    expect(
      deriveSideTeamIds({
        teamAPlayerIds: ['a1'],
        teamBPlayerIds: ['a2'],
        teams,
      })
    ).toBeNull();
  });

  it('returns null when a player belongs to no known team', () => {
    expect(
      deriveSideTeamIds({
        teamAPlayerIds: ['a1'],
        teamBPlayerIds: ['unknown'],
        teams,
      })
    ).toBeNull();
  });
});

describe('computeAltShotHolesUpMargin', () => {
  const HOLES: Hole[] = [
    { number: 1, par: 4, strokeIndex: 1 },
    { number: 2, par: 4, strokeIndex: 2 },
    { number: 3, par: 4, strokeIndex: 3 },
  ];

  // gross lookup from { playerId: [h1, h2, h3] }; missing player/hole → null.
  function grossFn(table: Record<string, (number | null)[]>) {
    return (playerId: string, hole: Hole): number | null => {
      const row = table[playerId];
      if (!row) return null;
      const v = row[hole.number - 1];
      return v == null ? null : v;
    };
  }

  const levelHc = new Map<string, number>([
    ['a1', 0], ['a2', 0], ['b1', 0], ['b2', 0],
  ]);

  it('returns +holes when side A wins more holes (level handicaps)', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4], b1: [5, 5, 5] }),
      dailyHandicaps: levelHc,
    });
    expect(margin).toBe(3); // A wins all 3 holes
  });

  it('returns -holes when side B wins more holes', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [5, 5, 5], b1: [4, 4, 4] }),
      dailyHandicaps: levelHc,
    });
    expect(margin).toBe(-3);
  });

  it('counts halved holes as 0', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      // h1 4=4 halve; h2 A5>B4 → B; h3 A4<B5 → A  → 1 - 1 = 0
      getGross: grossFn({ a1: [4, 5, 4], b1: [4, 4, 5] }),
      dailyHandicaps: levelHc,
    });
    expect(margin).toBe(0);
  });

  it('applies a handicap stroke by stroke index, flipping a hole', () => {
    // Side A team handicap = (2 + 0) * 0.5 = 1 → receives 1 stroke on SI 1 (hole 1).
    // Equal gross everywhere; only hole 1 flips to A on net. → margin +1.
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4], b1: [4, 4, 4] }),
      dailyHandicaps: new Map([['a1', 2], ['a2', 0], ['b1', 0], ['b2', 0]]),
    });
    expect(margin).toBe(1);
  });

  it('returns null when no hole is comparable (incomplete)', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4] }), // side B has no scores
      dailyHandicaps: levelHc,
    });
    expect(margin).toBeNull();
  });
});
