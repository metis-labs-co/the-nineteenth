/**
 * standingsPairing — unit tests
 *
 * Covers the invariants documented in the function doc comments:
 *   - Standard pairs top seed with bottom seed; adjacent pairs neighbours.
 *   - Throws on odd / too-few player counts.
 *   - Cross-team standard goes top-vs-bottom across teams; adjacent goes
 *     rank-vs-rank.
 *   - Cross-team throws on uneven rosters or empty teams.
 */

import {
  pairCrossTeamFromStandings,
  pairFromStandings,
} from './standingsPairing';

describe('pairFromStandings', () => {
  describe('standard style', () => {
    it('pairs top seed with bottom seed for 4 players', () => {
      const pairs = pairFromStandings(['p1', 'p2', 'p3', 'p4'], 'standard');
      expect(pairs).toEqual([
        ['p1', 'p4'],
        ['p2', 'p3'],
      ]);
    });

    it('pairs every standard slot for 8 players', () => {
      const pairs = pairFromStandings(
        ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'],
        'standard'
      );
      expect(pairs).toEqual([
        ['s1', 's8'],
        ['s2', 's7'],
        ['s3', 's6'],
        ['s4', 's5'],
      ]);
    });

    it('handles 2 players (single match)', () => {
      const pairs = pairFromStandings(['a', 'b'], 'standard');
      expect(pairs).toEqual([['a', 'b']]);
    });

    it('works for non-power-of-2 even counts (6 players)', () => {
      const pairs = pairFromStandings(
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
        'standard'
      );
      expect(pairs).toEqual([
        ['p1', 'p6'],
        ['p2', 'p5'],
        ['p3', 'p4'],
      ]);
    });
  });

  describe('adjacent style', () => {
    it('pairs neighbours for 4 players', () => {
      const pairs = pairFromStandings(['p1', 'p2', 'p3', 'p4'], 'adjacent');
      expect(pairs).toEqual([
        ['p1', 'p2'],
        ['p3', 'p4'],
      ]);
    });

    it('pairs every neighbour slot for 8 players', () => {
      const pairs = pairFromStandings(
        ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'],
        'adjacent'
      );
      expect(pairs).toEqual([
        ['s1', 's2'],
        ['s3', 's4'],
        ['s5', 's6'],
        ['s7', 's8'],
      ]);
    });
  });

  describe('error cases', () => {
    it('throws on empty list', () => {
      expect(() => pairFromStandings([], 'standard')).toThrow(/at least 2/);
    });

    it('throws on a single player', () => {
      expect(() => pairFromStandings(['solo'], 'standard')).toThrow(/at least 2/);
    });

    it('throws on odd count', () => {
      expect(() => pairFromStandings(['a', 'b', 'c'], 'standard')).toThrow(
        /even number/
      );
      expect(() =>
        pairFromStandings(['a', 'b', 'c', 'd', 'e'], 'adjacent')
      ).toThrow(/even number/);
    });
  });
});

describe('pairCrossTeamFromStandings', () => {
  describe('standard style (top vs bottom across teams)', () => {
    it('pairs A0 vs B(N-1) for 1v1 cross-team', () => {
      const pairs = pairCrossTeamFromStandings(
        ['a1', 'a2', 'a3', 'a4'],
        ['b1', 'b2', 'b3', 'b4'],
        'standard'
      );
      // A's #1 plays B's last seed, A's #2 plays B's second-last, etc.
      expect(pairs).toEqual([
        ['a1', 'b4'],
        ['a2', 'b3'],
        ['a3', 'b2'],
        ['a4', 'b1'],
      ]);
    });

    it('handles 2-vs-2', () => {
      const pairs = pairCrossTeamFromStandings(
        ['a1', 'a2'],
        ['b1', 'b2'],
        'standard'
      );
      expect(pairs).toEqual([
        ['a1', 'b2'],
        ['a2', 'b1'],
      ]);
    });
  });

  describe('adjacent style (rank vs rank)', () => {
    it('pairs A[i] vs B[i] across teams', () => {
      const pairs = pairCrossTeamFromStandings(
        ['a1', 'a2', 'a3'],
        ['b1', 'b2', 'b3'],
        'adjacent'
      );
      expect(pairs).toEqual([
        ['a1', 'b1'],
        ['a2', 'b2'],
        ['a3', 'b3'],
      ]);
    });
  });

  describe('error cases', () => {
    it('throws when team A is empty', () => {
      expect(() =>
        pairCrossTeamFromStandings([], ['b1'], 'standard')
      ).toThrow(/both teams to have players/);
    });

    it('throws when team B is empty', () => {
      expect(() =>
        pairCrossTeamFromStandings(['a1'], [], 'adjacent')
      ).toThrow(/both teams to have players/);
    });

    it('throws on uneven team sizes', () => {
      expect(() =>
        pairCrossTeamFromStandings(['a1', 'a2', 'a3'], ['b1', 'b2'], 'standard')
      ).toThrow(/equal size/);
    });
  });
});
