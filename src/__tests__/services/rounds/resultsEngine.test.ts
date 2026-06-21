/**
 * resultsEngine tests
 *
 * Validates the per-game-type engine specs that drive finalization shape.
 * The engine is the contract that says "Scramble produces team rows only,
 * Stableford produces individual rows only" — these tests pin that contract
 * so a future change to the spec is forced to surface here.
 */

import {
  ROUND_ENGINES,
  TEAM_ONLY_GAME_TYPES,
  getEngine,
  isTeamOnlyGameType,
} from '@/services/rounds/resultsEngine';
import type { GameType } from '@/types/database/enums';
import { createTestScorecard } from '../../utils/testFixtures';

describe('resultsEngine', () => {
  describe('shape per game type', () => {
    const expectedShapes: Record<GameType, 'individual' | 'team-only'> = {
      stableford: 'individual',
      stroke: 'individual',
      par: 'individual',
      'match-play': 'individual',
      scramble: 'team-only',
      'best-ball': 'team-only',
      shamble: 'team-only',
      'alt-shot': 'team-only',
    };

    it.each(Object.entries(expectedShapes))(
      '%s has shape %s',
      (gameType, shape) => {
        expect(ROUND_ENGINES[gameType as GameType].shape).toBe(shape);
      }
    );
  });

  describe('TEAM_ONLY_GAME_TYPES exposes the expected set', () => {
    it('includes scramble, best-ball, shamble, alt-shot', () => {
      expect(TEAM_ONLY_GAME_TYPES.sort()).toEqual(
        ['best-ball', 'scramble', 'shamble', 'alt-shot'].sort()
      );
    });

    it('does not include stableford / stroke / par / match-play', () => {
      expect(TEAM_ONLY_GAME_TYPES).not.toContain('stableford');
      expect(TEAM_ONLY_GAME_TYPES).not.toContain('stroke');
      expect(TEAM_ONLY_GAME_TYPES).not.toContain('par');
      expect(TEAM_ONLY_GAME_TYPES).not.toContain('match-play');
    });
  });

  describe('isTeamOnlyGameType', () => {
    it.each(['scramble', 'best-ball', 'shamble', 'alt-shot'])(
      'returns true for %s',
      (gameType) => {
        expect(isTeamOnlyGameType(gameType)).toBe(true);
      }
    );

    it.each(['stableford', 'stroke', 'par', 'match-play'])(
      'returns false for %s',
      (gameType) => {
        expect(isTeamOnlyGameType(gameType)).toBe(false);
      }
    );

    it('returns false for null / undefined / empty string', () => {
      expect(isTeamOnlyGameType(null)).toBe(false);
      expect(isTeamOnlyGameType(undefined)).toBe(false);
      expect(isTeamOnlyGameType('')).toBe(false);
    });
  });

  describe('betterDirection', () => {
    it('stableford / par / best-ball / shamble are higher-better', () => {
      expect(getEngine('stableford').betterDirection).toBe('higher');
      expect(getEngine('par').betterDirection).toBe('higher');
      expect(getEngine('best-ball').betterDirection).toBe('higher');
      expect(getEngine('shamble').betterDirection).toBe('higher');
    });

    it('stroke and scramble are lower-better', () => {
      expect(getEngine('stroke').betterDirection).toBe('lower');
      // Scramble is stroke-scored — lower team net wins.
      expect(getEngine('scramble').betterDirection).toBe('lower');
    });
  });

  describe('pickIndividualRawScore', () => {
    it('stableford uses total_points', () => {
      const sc = createTestScorecard({ total_points: 36, total_net: 70, total_gross: 88 });
      const picked = getEngine('stableford').pickIndividualRawScore(sc);
      expect(picked.rawScore).toBe(36);
      expect(picked.rawResultData).toEqual({ stableford_points: 36 });
    });

    it('stroke uses total_net', () => {
      const sc = createTestScorecard({ total_points: 36, total_net: 70, total_gross: 88 });
      const picked = getEngine('stroke').pickIndividualRawScore(sc);
      expect(picked.rawScore).toBe(70);
      expect(picked.rawResultData).toEqual({ gross_score: 88, net_score: 70 });
    });

    it('par uses total_par_score', () => {
      const sc = createTestScorecard({
        total_par_score: 5,
        total_gross: 80,
        total_net: 72,
      });
      const picked = getEngine('par').pickIndividualRawScore(sc);
      expect(picked.rawScore).toBe(5);
      expect(picked.rawResultData).toMatchObject({
        par_score: 5,
        gross_score: 80,
        net_score: 72,
      });
    });
  });

  describe('pickTeamRawScore', () => {
    // Scramble uses team_handicap math: 25% of sum_of_member_handicaps,
    // rounded to 1 dp. Round-total net = team_gross - floor(team_handicap).
    it('scramble computes team_net from team_gross minus team handicap', () => {
      // Members handicaps: 4, 6, 8, 10 → sum 28 → 25% = 7.0 team handicap.
      // floor(7.0) = 7 strokes received.
      const members = [
        { player_id: 'a', handicap: 4 },
        { player_id: 'b', handicap: 6 },
        { player_id: 'c', handicap: 8 },
        { player_id: 'd', handicap: 10 },
      ];
      // total_gross 73 with hole-by-hole scores so the gross sum aligns.
      const cards = [
        createTestScorecard({
          player_id: 'a',
          total_points: 0,
          total_net: 65,
          total_gross: 73,
          scores: { '1': { strokes: 4 }, '2': { strokes: 4 } },
        }),
        createTestScorecard({ player_id: 'b', total_points: 0, total_net: 65, total_gross: 73 }),
      ];
      const picked = getEngine('scramble').pickTeamRawScore(cards, members);
      expect(picked.rawResultData.team_handicap).toBe(7.0);
      expect(picked.rawResultData.gross_score).toBe(73);
      // 73 - floor(7.0) = 66
      expect(picked.rawScore).toBe(66);
      expect(picked.rawResultData.team_score).toBe(66);
      expect(picked.rawResultData.net_score).toBe(66);
    });

    it('scramble: team handicap with fractional sum rounds to 1 dp', () => {
      // Members 1, 2, 8, 8 → sum 19 → 25% = 4.75 → rounds to 4.8.
      // floor(4.8) = 4 strokes received.
      const members = [
        { player_id: 'a', handicap: 1 },
        { player_id: 'b', handicap: 2 },
        { player_id: 'c', handicap: 8 },
        { player_id: 'd', handicap: 8 },
      ];
      const cards = [
        createTestScorecard({
          player_id: 'a',
          total_gross: 60,
          scores: { '1': { strokes: 4 } },
        }),
      ];
      const picked = getEngine('scramble').pickTeamRawScore(cards, members);
      expect(picked.rawResultData.team_handicap).toBe(4.8);
      expect(picked.rawScore).toBe(56); // 60 - 4
    });

    it('scramble: handles members with null handicaps as 0', () => {
      // 4 + 0 + 0 + 0 = 4 → 25% = 1.0 → rounds to 1.0.
      const members = [
        { player_id: 'a', handicap: 4 },
        { player_id: 'b', handicap: null },
        { player_id: 'c', handicap: null },
        { player_id: 'd', handicap: undefined },
      ];
      const cards = [
        createTestScorecard({
          player_id: 'a',
          total_gross: 75,
          scores: { '1': { strokes: 4 } },
        }),
      ];
      const picked = getEngine('scramble').pickTeamRawScore(cards, members);
      expect(picked.rawResultData.team_handicap).toBe(1.0);
      expect(picked.rawScore).toBe(74); // 75 - 1
    });

    it('best-ball uses scorecard total directly (legacy approach)', () => {
      const cards = [
        createTestScorecard({ player_id: 'a', total_points: 42, total_net: 0, total_gross: 0 }),
      ];
      const picked = getEngine('best-ball').pickTeamRawScore(cards, []);
      expect(picked.rawScore).toBe(42);
    });

    it('shamble uses scorecard total directly (legacy approach)', () => {
      const cards = [
        createTestScorecard({ player_id: 'a', total_points: 80, total_net: 0, total_gross: 0 }),
      ];
      const picked = getEngine('shamble').pickTeamRawScore(cards, []);
      expect(picked.rawScore).toBe(80);
    });

    it('throws if called with empty array (defensive — should never happen)', () => {
      expect(() => getEngine('scramble').pickTeamRawScore([], [])).toThrow();
      expect(() => getEngine('best-ball').pickTeamRawScore([], [])).toThrow();
    });
  });

  describe('getEngine', () => {
    it('throws for unknown game type', () => {
      expect(() => getEngine('mystery-format' as GameType)).toThrow(
        /No results engine configured/
      );
    });
  });
});
