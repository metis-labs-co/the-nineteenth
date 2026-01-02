/**
 * Leaderboard Utils Tests
 *
 * Tests for leaderboard sorting, position assignment, and tiebreaker logic.
 */

import {
  sortByScore,
  assignPositions,
  applyBackNineTiebreaker,
  applyHandicapTiebreaker,
  createLeaderboardEntry,
  getCompetitionPoints,
  getAverageTiedPoints,
} from '@/services/scoring/utils/leaderboardUtils';
import type { ScoringResult } from '@/services/scoring/types';

describe('leaderboardUtils', () => {
  // ============================================================================
  // sortByScore
  // ============================================================================
  describe('sortByScore', () => {
    it('sorts by rawScore descending when higherIsBetter is true', () => {
      const entries = [
        { rawScore: 30 },
        { rawScore: 45 },
        { rawScore: 36 },
        { rawScore: 42 },
      ];

      const sorted = sortByScore(entries, { higherIsBetter: true });

      expect(sorted.map((e) => e.rawScore)).toEqual([45, 42, 36, 30]);
    });

    it('sorts by rawScore ascending when higherIsBetter is false', () => {
      const entries = [
        { rawScore: 72 },
        { rawScore: 68 },
        { rawScore: 75 },
        { rawScore: 70 },
      ];

      const sorted = sortByScore(entries, { higherIsBetter: false });

      expect(sorted.map((e) => e.rawScore)).toEqual([68, 70, 72, 75]);
    });

    it('does not mutate the original array', () => {
      const entries = [{ rawScore: 30 }, { rawScore: 40 }];
      const original = [...entries];

      sortByScore(entries, { higherIsBetter: true });

      expect(entries).toEqual(original);
    });

    it('handles empty array', () => {
      const sorted = sortByScore([], { higherIsBetter: true });
      expect(sorted).toEqual([]);
    });

    it('handles single entry', () => {
      const entries = [{ rawScore: 36 }];
      const sorted = sortByScore(entries, { higherIsBetter: true });
      expect(sorted).toEqual([{ rawScore: 36 }]);
    });

    it('maintains stability for equal scores', () => {
      const entries = [
        { rawScore: 36, id: 'a' },
        { rawScore: 36, id: 'b' },
        { rawScore: 36, id: 'c' },
      ];

      const sorted = sortByScore(entries, { higherIsBetter: true });

      // All have same score, order should be maintained
      expect(sorted.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });
  });

  // ============================================================================
  // assignPositions
  // ============================================================================
  describe('assignPositions', () => {
    it('assigns sequential positions for unique scores', () => {
      const entries = [
        { rawScore: 45 },
        { rawScore: 42 },
        { rawScore: 36 },
        { rawScore: 30 },
      ];

      const result = assignPositions(entries);

      expect(result[0].position).toBe(1);
      expect(result[0].tied).toBe(false);
      expect(result[1].position).toBe(2);
      expect(result[2].position).toBe(3);
      expect(result[3].position).toBe(4);
    });

    it('assigns same position for tied scores', () => {
      const entries = [
        { rawScore: 42 },
        { rawScore: 42 },
        { rawScore: 36 },
        { rawScore: 30 },
      ];

      const result = assignPositions(entries);

      expect(result[0].position).toBe(1);
      expect(result[0].tied).toBe(true);
      expect(result[1].position).toBe(1);
      expect(result[1].tied).toBe(true);
      expect(result[2].position).toBe(3); // Skips 2
      expect(result[2].tied).toBe(false);
      expect(result[3].position).toBe(4);
    });

    it('handles three-way tie', () => {
      const entries = [
        { rawScore: 36 },
        { rawScore: 36 },
        { rawScore: 36 },
        { rawScore: 30 },
      ];

      const result = assignPositions(entries);

      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(1);
      expect(result[3].position).toBe(4); // Skips 2 and 3
    });

    it('handles all tied', () => {
      const entries = [
        { rawScore: 36 },
        { rawScore: 36 },
        { rawScore: 36 },
      ];

      const result = assignPositions(entries);

      result.forEach((entry) => {
        expect(entry.position).toBe(1);
        expect(entry.tied).toBe(true);
      });
    });

    it('handles empty array', () => {
      const result = assignPositions([]);
      expect(result).toEqual([]);
    });

    it('handles multiple tie groups', () => {
      const entries = [
        { rawScore: 45 }, // 1st
        { rawScore: 45 }, // T1
        { rawScore: 36 }, // 3rd
        { rawScore: 36 }, // T3
        { rawScore: 30 }, // 5th
      ];

      const result = assignPositions(entries);

      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(3);
      expect(result[3].position).toBe(3);
      expect(result[4].position).toBe(5);
    });
  });

  // ============================================================================
  // applyBackNineTiebreaker
  // ============================================================================
  describe('applyBackNineTiebreaker', () => {
    it('returns single entry unchanged', () => {
      const entries = [{ participantId: 'p1', rawScore: 36 }];
      const holeScores = new Map([['p1', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]]]);

      const result = applyBackNineTiebreaker(entries, holeScores, true);

      expect(result).toEqual(entries);
    });

    it('breaks tie using back 9 when higherIsBetter', () => {
      const entries = [
        { participantId: 'p1', rawScore: 36 },
        { participantId: 'p2', rawScore: 36 },
      ];

      // p1: back 9 = 18, p2: back 9 = 20
      const holeScores = new Map([
        ['p1', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]], // back 9 = 18
        ['p2', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4]], // back 9 = 20
      ]);

      const result = applyBackNineTiebreaker(entries, holeScores, true);

      // Higher back 9 wins when higherIsBetter
      expect(result[0].participantId).toBe('p2');
      expect(result[1].participantId).toBe('p1');
    });

    it('breaks tie using back 9 when lowerIsBetter (Stroke)', () => {
      const entries = [
        { participantId: 'p1', rawScore: 72 },
        { participantId: 'p2', rawScore: 72 },
      ];

      // p1: back 9 = 38, p2: back 9 = 34
      const holeScores = new Map([
        ['p1', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5]], // back 9 = 38
        ['p2', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 4]], // back 9 = 34
      ]);

      const result = applyBackNineTiebreaker(entries, holeScores, false);

      // Lower back 9 wins when lowerIsBetter
      expect(result[0].participantId).toBe('p2');
      expect(result[1].participantId).toBe('p1');
    });

    it('falls back to back 6 when back 9 is tied', () => {
      const entries = [
        { participantId: 'p1', rawScore: 36 },
        { participantId: 'p2', rawScore: 36 },
      ];

      // Both have back 9 = 18, but different back 6
      const holeScores = new Map([
        ['p1', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]], // back 6 = 12
        ['p2', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2]], // back 6 = 14
      ]);

      const result = applyBackNineTiebreaker(entries, holeScores, true);

      // p2 has higher back 6 (14 vs 12)
      expect(result[0].participantId).toBe('p2');
    });

    it('falls back to back 3 when back 6 is tied', () => {
      const entries = [
        { participantId: 'p1', rawScore: 36 },
        { participantId: 'p2', rawScore: 36 },
      ];

      // Both have same back 9 and back 6, different back 3
      const holeScores = new Map([
        ['p1', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]], // back 3 = 6
        ['p2', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4]], // back 3 = 8
      ]);

      const result = applyBackNineTiebreaker(entries, holeScores, true);

      // p2 has higher back 3
      expect(result[0].participantId).toBe('p2');
    });

    it('handles missing hole scores gracefully', () => {
      const entries = [
        { participantId: 'p1', rawScore: 36 },
        { participantId: 'p2', rawScore: 36 },
      ];

      const holeScores = new Map([
        ['p1', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]],
        // p2 has no scores
      ]);

      const result = applyBackNineTiebreaker(entries, holeScores, true);

      // p1 should win (any score > 0)
      expect(result[0].participantId).toBe('p1');
    });
  });

  // ============================================================================
  // applyHandicapTiebreaker
  // ============================================================================
  describe('applyHandicapTiebreaker', () => {
    it('returns single entry unchanged', () => {
      const entries = [{ participantId: 'p1', rawScore: 36 }];
      const handicaps = new Map([['p1', 10]]);

      const result = applyHandicapTiebreaker(entries, handicaps);

      expect(result).toEqual(entries);
    });

    it('sorts by handicap (lower handicap wins)', () => {
      const entries = [
        { participantId: 'p1', rawScore: 36 },
        { participantId: 'p2', rawScore: 36 },
        { participantId: 'p3', rawScore: 36 },
      ];

      const handicaps = new Map([
        ['p1', 18],
        ['p2', 10],
        ['p3', 24],
      ]);

      const result = applyHandicapTiebreaker(entries, handicaps);

      expect(result[0].participantId).toBe('p2'); // 10
      expect(result[1].participantId).toBe('p1'); // 18
      expect(result[2].participantId).toBe('p3'); // 24
    });

    it('uses default 36 handicap for missing entries', () => {
      const entries = [
        { participantId: 'p1', rawScore: 36 },
        { participantId: 'p2', rawScore: 36 },
      ];

      const handicaps = new Map([['p1', 20]]);

      const result = applyHandicapTiebreaker(entries, handicaps);

      expect(result[0].participantId).toBe('p1'); // 20 < 36 (default)
    });
  });

  // ============================================================================
  // createLeaderboardEntry
  // ============================================================================
  describe('createLeaderboardEntry', () => {
    it('creates entry for individual player', () => {
      const result: ScoringResult = {
        rawScore: 36,
        grossScore: 90,
        netScore: 72,
        stablefordPoints: 36,
        resultData: { stableford_points: 36 },
      };

      const entry = createLeaderboardEntry('player-1', result, false);

      expect(entry.participantId).toBe('player-1');
      expect(entry.playerId).toBe('player-1');
      expect(entry.teamId).toBeUndefined();
      expect(entry.rawScore).toBe(36);
      expect(entry.position).toBe(0); // To be assigned later
      expect(entry.tied).toBe(false);
      expect(entry.isTeamResult).toBe(false);
    });

    it('creates entry for team', () => {
      const result: ScoringResult = {
        rawScore: 42,
        grossScore: 150,
        netScore: 130,
        resultData: { total_strokes: 130 },
      };

      const entry = createLeaderboardEntry('team-1', result, true);

      expect(entry.participantId).toBe('team-1');
      expect(entry.playerId).toBeUndefined();
      expect(entry.teamId).toBe('team-1');
      expect(entry.isTeamResult).toBe(true);
    });
  });

  // ============================================================================
  // getCompetitionPoints
  // ============================================================================
  describe('getCompetitionPoints', () => {
    const positionPoints = [10, 8, 6, 4, 3, 2];

    it('returns correct points for positions within array', () => {
      expect(getCompetitionPoints(1, positionPoints)).toBe(10);
      expect(getCompetitionPoints(2, positionPoints)).toBe(8);
      expect(getCompetitionPoints(3, positionPoints)).toBe(6);
      expect(getCompetitionPoints(6, positionPoints)).toBe(2);
    });

    it('returns default points for positions beyond array', () => {
      expect(getCompetitionPoints(7, positionPoints)).toBe(1); // default
      expect(getCompetitionPoints(10, positionPoints)).toBe(1);
      expect(getCompetitionPoints(100, positionPoints)).toBe(1);
    });

    it('uses custom default points', () => {
      expect(getCompetitionPoints(10, positionPoints, 0)).toBe(0);
      expect(getCompetitionPoints(10, positionPoints, 5)).toBe(5);
    });
  });

  // ============================================================================
  // getAverageTiedPoints
  // ============================================================================
  describe('getAverageTiedPoints', () => {
    const positionPoints = [10, 8, 6, 4, 3, 2];

    it('calculates average for 2-way tie', () => {
      // T1: (10 + 8) / 2 = 9
      const avg = getAverageTiedPoints(1, 2, positionPoints);
      expect(avg).toBe(9);
    });

    it('calculates average for 3-way tie', () => {
      // T1: (10 + 8 + 6) / 3 = 8
      const avg = getAverageTiedPoints(1, 3, positionPoints);
      expect(avg).toBe(8);
    });

    it('calculates average for tie extending beyond array', () => {
      // T5: (3 + 2 + 1) / 3 = 2
      const avg = getAverageTiedPoints(5, 3, positionPoints);
      expect(avg).toBe(2);
    });

    it('rounds to nearest integer', () => {
      // T2: (8 + 6) / 2 = 7
      const avg = getAverageTiedPoints(2, 2, positionPoints);
      expect(avg).toBe(7);
    });

    it('handles all positions beyond array', () => {
      // T10: (1 + 1 + 1) / 3 = 1
      const avg = getAverageTiedPoints(10, 3, positionPoints);
      expect(avg).toBe(1);
    });
  });
});
