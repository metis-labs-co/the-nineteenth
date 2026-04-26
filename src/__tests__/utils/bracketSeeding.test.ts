/**
 * Bracket Seeding Tests
 *
 * Covers the Phase 3 additions to the knockout seeding path:
 *   - Adjacent bracket style pairs seeds (1,2), (3,4), (5,6), (7,8)
 *   - Standard bracket style keeps the classic (1,N), (2,N-1) ordering
 *   - generateSeedings honors a preOrdered list for method 'qualifying'
 *   - aggregateQualifyingStandings orders by the chosen metric
 */

import {
  generateSeedings,
  buildBracketStructure,
} from '@/utils/bracketGeneration';
import { aggregateQualifyingStandings } from '@/utils/knockoutSeeding';

// Small helper to grab first-round main-bracket pairings in position order.
function firstRoundPairs(slots: ReturnType<typeof buildBracketStructure>) {
  return slots
    .filter((s) => s.bracketType === 'main' && s.stage === 0)
    .sort((a, b) => a.bracketPosition - b.bracketPosition)
    .map((s) => [s.player1Seed, s.player2Seed] as [number | null, number | null]);
}

describe('buildBracketStructure — first round pairings', () => {
  describe('standard style (default)', () => {
    it('produces (1,4),(2,3) for 4 players', () => {
      const pairs = firstRoundPairs(buildBracketStructure(4));
      expect(pairs).toEqual([
        [1, 4],
        [2, 3],
      ]);
    });

    it('produces (1,8),(4,5),(2,7),(3,6) for 8 players', () => {
      const pairs = firstRoundPairs(buildBracketStructure(8, 'standard'));
      expect(pairs).toEqual([
        [1, 8],
        [4, 5],
        [2, 7],
        [3, 6],
      ]);
    });
  });

  describe('adjacent style', () => {
    it('pairs consecutive seeds for 4 players', () => {
      const pairs = firstRoundPairs(buildBracketStructure(4, 'adjacent'));
      expect(pairs).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('pairs consecutive seeds for 8 players (golf-trip setup)', () => {
      const pairs = firstRoundPairs(buildBracketStructure(8, 'adjacent'));
      expect(pairs).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ]);
    });

    it('pairs consecutive seeds for 16 players', () => {
      const pairs = firstRoundPairs(buildBracketStructure(16, 'adjacent'));
      expect(pairs).toHaveLength(8);
      for (let i = 0; i < 8; i++) {
        expect(pairs[i]).toEqual([i * 2 + 1, i * 2 + 2]);
      }
    });
  });

  it('keeps the bracket tree (next_match links) identical across styles', () => {
    const standard = buildBracketStructure(8, 'standard');
    const adjacent = buildBracketStructure(8, 'adjacent');
    // Only first-round player seeds should differ; advance links remain structural.
    const nextLinks = (slots: ReturnType<typeof buildBracketStructure>) =>
      slots.map((s) => `${s.bracketType}:${s.stage}:${s.bracketPosition}->${s.nextMatchPosition}:${s.nextMatchSlot}`);
    expect(nextLinks(standard)).toEqual(nextLinks(adjacent));
  });
});

describe('generateSeedings — qualifying method', () => {
  const players = [
    { id: 'p1', name: 'Ann', handicap: 10 },
    { id: 'p2', name: 'Bob', handicap: 4 },
    { id: 'p3', name: 'Cam', handicap: 18 },
    { id: 'p4', name: 'Dee', handicap: 2 },
  ];

  it('uses preOrdered list verbatim as seed order', () => {
    const preOrdered = [
      { id: 'p3', name: 'Cam', handicap: 18 }, // top qualifier (even though highest handicap)
      { id: 'p1', name: 'Ann', handicap: 10 },
      { id: 'p4', name: 'Dee', handicap: 2 },
      { id: 'p2', name: 'Bob', handicap: 4 },
    ];

    const seeds = generateSeedings(players, 'qualifying', preOrdered);

    expect(seeds.map((s) => s.playerId)).toEqual(['p3', 'p1', 'p4', 'p2']);
    expect(seeds.map((s) => s.seed)).toEqual([1, 2, 3, 4]);
  });

  it('falls back to handicap sort if preOrdered is empty/missing', () => {
    const seeds = generateSeedings(players, 'qualifying');
    // Lowest handicap first: p4(2), p2(4), p1(10), p3(18)
    expect(seeds.map((s) => s.playerId)).toEqual(['p4', 'p2', 'p1', 'p3']);
  });
});

describe('aggregateQualifyingStandings', () => {
  type Row = Parameters<typeof aggregateQualifyingStandings>[0][number];
  const row = (overrides: Partial<Row>): Row => ({
    round_id: 'r1',
    player_id: 'p1',
    is_team_result: false,
    raw_score: 0,
    raw_result_data: {},
    competition_points: 0,
    player: { id: 'p1', name: 'Ann', handicap: 10 },
    ...overrides,
  });

  it('sorts Stableford totals descending (higher is better)', () => {
    const rows = [
      row({ round_id: 'r1', player_id: 'p1', raw_result_data: { stableford_points: 30 }, player: { id: 'p1', name: 'Ann', handicap: 10 } }),
      row({ round_id: 'r2', player_id: 'p1', raw_result_data: { stableford_points: 28 }, player: { id: 'p1', name: 'Ann', handicap: 10 } }),
      row({ round_id: 'r1', player_id: 'p2', raw_result_data: { stableford_points: 40 }, player: { id: 'p2', name: 'Bob', handicap: 4 } }),
      row({ round_id: 'r2', player_id: 'p2', raw_result_data: { stableford_points: 32 }, player: { id: 'p2', name: 'Bob', handicap: 4 } }),
    ];

    const ranked = aggregateQualifyingStandings(rows, ['r1', 'r2'], 'stableford_points');

    expect(ranked.map((p) => p.id)).toEqual(['p2', 'p1']); // 72 > 58
    expect(ranked[0].total).toBe(72);
    expect(ranked[0].roundsPlayed).toBe(2);
  });

  it('sorts net strokes ascending (lower is better)', () => {
    const rows = [
      row({ round_id: 'r1', player_id: 'p1', raw_result_data: { net_score: 72 }, player: { id: 'p1', name: 'Ann', handicap: 10 } }),
      row({ round_id: 'r1', player_id: 'p2', raw_result_data: { net_score: 68 }, player: { id: 'p2', name: 'Bob', handicap: 4 } }),
    ];

    const ranked = aggregateQualifyingStandings(rows, ['r1'], 'net_strokes');

    expect(ranked.map((p) => p.id)).toEqual(['p2', 'p1']); // 68 < 72
  });

  it('uses competition_points when metric is competition_points', () => {
    const rows = [
      row({ round_id: 'r1', player_id: 'p1', competition_points: 10, player: { id: 'p1', name: 'Ann', handicap: 10 } }),
      row({ round_id: 'r1', player_id: 'p2', competition_points: 8, player: { id: 'p2', name: 'Bob', handicap: 4 } }),
      row({ round_id: 'r2', player_id: 'p1', competition_points: 5, player: { id: 'p1', name: 'Ann', handicap: 10 } }),
      row({ round_id: 'r2', player_id: 'p2', competition_points: 10, player: { id: 'p2', name: 'Bob', handicap: 4 } }),
    ];

    const ranked = aggregateQualifyingStandings(rows, ['r1', 'r2'], 'competition_points');

    expect(ranked.map((p) => p.id)).toEqual(['p2', 'p1']); // 18 > 15
  });

  it('ignores team results and out-of-scope rounds', () => {
    const rows = [
      row({ round_id: 'r1', player_id: 'p1', raw_result_data: { stableford_points: 30 } }),
      row({ round_id: 'r99', player_id: 'p1', raw_result_data: { stableford_points: 999 } }), // different round
      row({ round_id: 'r1', player_id: null, is_team_result: true, raw_score: 100 } as any), // team row
    ];

    const ranked = aggregateQualifyingStandings(rows, ['r1'], 'stableford_points');

    expect(ranked).toHaveLength(1);
    expect(ranked[0].total).toBe(30);
  });

  it('picks up player name/handicap from the join even if the first row lacks them', () => {
    const rows = [
      row({ round_id: 'r1', player_id: 'p1', raw_result_data: { stableford_points: 30 }, player: null }),
      row({ round_id: 'r2', player_id: 'p1', raw_result_data: { stableford_points: 28 }, player: { id: 'p1', name: 'Ann', handicap: 10 } }),
    ];

    const ranked = aggregateQualifyingStandings(rows, ['r1', 'r2'], 'stableford_points');

    expect(ranked).toHaveLength(1);
    expect(ranked[0].name).toBe('Ann');
    expect(ranked[0].handicap).toBe(10);
    expect(ranked[0].total).toBe(58);
  });
});
