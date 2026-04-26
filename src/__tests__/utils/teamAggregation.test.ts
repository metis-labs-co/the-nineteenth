/**
 * Team Aggregation Engine Tests
 *
 * Covers the per-round-rules team aggregation paths:
 *   - best_n_of_m — core new functionality (e.g. best 3 of 4 Stableford)
 *   - sum
 *   - best_ball fallback
 *   - dispatcher defaults for pairs_better_ball / scramble (sum fallback)
 */

import {
  aggregateTeamTotal,
  calculateBestNofM,
  calculateBestBallAggregation,
  calculateScrambleAggregation,
  calculateSumAggregation,
  type PlayerTotal,
} from '@/utils/teamAggregation';

const players = (totals: number[]): PlayerTotal[] =>
  totals.map((total, i) => ({ playerId: `p${i + 1}`, total }));

describe('teamAggregation', () => {
  describe('calculateBestNofM (higher is better - Stableford)', () => {
    it('sums the top N scores when N < M', () => {
      const result = calculateBestNofM(players([30, 25, 28, 20]), { n: 3, m: 4 }, true);

      expect(result.teamTotal).toBe(83); // 30 + 28 + 25
      expect(result.contributorIds).toEqual(['p1', 'p3', 'p2']);
      expect(result.droppedIds).toEqual(['p4']);
    });

    it('sums all players when N >= team size', () => {
      const result = calculateBestNofM(players([30, 25]), { n: 3, m: 4 }, true);

      expect(result.teamTotal).toBe(55);
      expect(result.droppedIds).toEqual([]);
    });

    it('defaults N to team size when config.n is undefined', () => {
      const result = calculateBestNofM(players([30, 25, 28]), {}, true);

      expect(result.teamTotal).toBe(83);
      expect(result.droppedIds).toEqual([]);
    });

    it('clamps N >= 1 when a zero is passed', () => {
      const result = calculateBestNofM(players([30, 25]), { n: 0 }, true);

      expect(result.contributorIds).toHaveLength(1);
      expect(result.teamTotal).toBe(30); // best single score
    });

    it('handles ties deterministically (stable sort by total)', () => {
      const result = calculateBestNofM(
        [
          { playerId: 'a', total: 30 },
          { playerId: 'b', total: 30 },
          { playerId: 'c', total: 25 },
          { playerId: 'd', total: 20 },
        ],
        { n: 3, m: 4 },
        true
      );

      expect(result.teamTotal).toBe(85); // 30 + 30 + 25
      expect(result.droppedIds).toEqual(['d']);
    });
  });

  describe('calculateBestNofM (lower is better - Stroke)', () => {
    it('sums the lowest N stroke totals', () => {
      const result = calculateBestNofM(players([72, 80, 75, 85]), { n: 3, m: 4 }, false);

      expect(result.teamTotal).toBe(227); // 72 + 75 + 80
      expect(result.droppedIds).toEqual(['p4']);
    });
  });

  describe('calculateSumAggregation', () => {
    it('sums all player totals', () => {
      const result = calculateSumAggregation(players([30, 25, 28, 20]));

      expect(result.teamTotal).toBe(103);
      expect(result.contributorIds).toHaveLength(4);
      expect(result.droppedIds).toEqual([]);
    });

    it('returns 0 for empty team', () => {
      expect(calculateSumAggregation([])).toEqual({
        teamTotal: 0,
        contributorIds: [],
        droppedIds: [],
      });
    });
  });

  describe('calculateBestBallAggregation', () => {
    it('picks the single highest score when higherIsBetter', () => {
      const result = calculateBestBallAggregation(players([30, 25, 35, 20]), true);

      expect(result.teamTotal).toBe(35);
      expect(result.contributorIds).toEqual(['p3']);
      expect(result.droppedIds.sort()).toEqual(['p1', 'p2', 'p4']);
    });

    it('picks the single lowest score when lower is better', () => {
      const result = calculateBestBallAggregation(players([72, 75, 70, 80]), false);

      expect(result.teamTotal).toBe(70);
      expect(result.contributorIds).toEqual(['p3']);
    });

    it('returns zero result for empty team', () => {
      expect(calculateBestBallAggregation([], true)).toEqual({
        teamTotal: 0,
        contributorIds: [],
        droppedIds: [],
      });
    });
  });

  describe('calculateScrambleAggregation', () => {
    it('returns the first member\'s total (all members have identical strokes)', () => {
      // In a scramble every team member records the same per-hole strokes,
      // so each player's total is the team total. Summing would multiply
      // the team's score by the member count.
      const result = calculateScrambleAggregation(players([72, 72, 72, 72]));

      expect(result.teamTotal).toBe(72);
      expect(result.contributorIds).toHaveLength(4);
      expect(result.droppedIds).toEqual([]);
    });

    it('uses the first-listed member even when totals diverge (defensive)', () => {
      // If totals diverge it means the scorecards aren't truly identical
      // (a data-entry bug), but the engine should still produce a single
      // sane team total rather than quadrupling it.
      const result = calculateScrambleAggregation(players([72, 80, 75, 85]));
      expect(result.teamTotal).toBe(72);
    });

    it('returns zero for empty team', () => {
      expect(calculateScrambleAggregation([])).toEqual({
        teamTotal: 0,
        contributorIds: [],
        droppedIds: [],
      });
    });
  });

  describe('aggregateTeamTotal (dispatcher)', () => {
    const team = players([30, 25, 28, 20]);

    it('routes best_n_of_m to calculateBestNofM', () => {
      const result = aggregateTeamTotal('best_n_of_m', team, { n: 3 }, true);
      expect(result.teamTotal).toBe(83);
    });

    it('routes sum to calculateSumAggregation', () => {
      const result = aggregateTeamTotal('sum', team, undefined, true);
      expect(result.teamTotal).toBe(103);
    });

    it('routes best_ball to calculateBestBallAggregation', () => {
      const result = aggregateTeamTotal('best_ball', team, undefined, true);
      expect(result.teamTotal).toBe(30);
    });

    it('routes scramble to calculateScrambleAggregation (first member\'s total)', () => {
      const result = aggregateTeamTotal('scramble', team, undefined, true);
      expect(result.teamTotal).toBe(30);
    });

    it('falls back to sum for pairs_better_ball (per-sub-match path owns the calc)', () => {
      const result = aggregateTeamTotal('pairs_better_ball', team, undefined, true);
      expect(result.teamTotal).toBe(103);
    });
  });
});
