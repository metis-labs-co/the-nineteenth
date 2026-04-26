/**
 * Scramble team scoring utility tests.
 *
 * Pins the `25% of sum_of_member_handicaps` formula and the
 * `gross - floor(team_handicap)` round-net approximation. Same math
 * used by ScrambleTeamLeaderboard (View Round) and the round-results
 * engine (competition leaderboard) — these tests guard against drift.
 */

import {
  calculateScrambleTeamHandicap,
  computeScrambleTeamRoundScore,
} from '@/utils/teamScoring/scramble';
import { createTestScorecard } from '@/__tests__/utils/testFixtures';

describe('calculateScrambleTeamHandicap', () => {
  it('returns 25% of sum, rounded to 1dp', () => {
    // 4 + 6 + 8 + 10 = 28 → 7.0
    expect(
      calculateScrambleTeamHandicap([
        { handicap: 4 },
        { handicap: 6 },
        { handicap: 8 },
        { handicap: 10 },
      ])
    ).toBe(7.0);
  });

  it('rounds half-strokes to 1dp', () => {
    // 1 + 2 + 8 + 8 = 19 → 4.75 → 4.8
    expect(
      calculateScrambleTeamHandicap([
        { handicap: 1 },
        { handicap: 2 },
        { handicap: 8 },
        { handicap: 8 },
      ])
    ).toBe(4.8);
  });

  it('treats null and undefined handicaps as 0', () => {
    // 4 + 0 + 0 + 0 = 4 → 1.0
    expect(
      calculateScrambleTeamHandicap([
        { handicap: 4 },
        { handicap: null },
        { handicap: null },
        { handicap: undefined },
      ])
    ).toBe(1.0);
  });

  it('returns 0 for empty member list', () => {
    expect(calculateScrambleTeamHandicap([])).toBe(0);
  });

  it('produces 1.5 for a 4-member team summing to 6 (the second-team case)', () => {
    // Matches the user-reported "Fnsjsjdjxjsbx" team handicap of 1.5
    // when only one member had a handicap recorded.
    expect(
      calculateScrambleTeamHandicap([
        { handicap: 6 },
        { handicap: null },
        { handicap: null },
        { handicap: null },
      ])
    ).toBe(1.5);
  });
});

describe('computeScrambleTeamRoundScore', () => {
  const members = [
    { player_id: 'a', handicap: 4 },
    { player_id: 'b', handicap: 6 },
    { player_id: 'c', handicap: 8 },
    { player_id: 'd', handicap: 10 },
  ];

  it('reads gross from the first scorecard and applies team handicap', () => {
    const scorecards = [
      createTestScorecard({ player_id: 'a', total_gross: 73 }),
      createTestScorecard({ player_id: 'b', total_gross: 73 }),
    ];
    const result = computeScrambleTeamRoundScore(scorecards, members);
    expect(result.teamHandicap).toBe(7.0);
    expect(result.teamHandicapStrokes).toBe(7); // floor(7.0)
    expect(result.teamGross).toBe(73);
    expect(result.teamNet).toBe(66); // 73 - 7
  });

  it('prefers a scorecard with per-hole scores over one with only total_gross', () => {
    const scorecards = [
      // First scorecard is empty (placeholder card)
      createTestScorecard({
        player_id: 'a',
        total_gross: 0,
        scores: {},
      }),
      // Second scorecard has both per-hole scores and total
      createTestScorecard({
        player_id: 'b',
        total_gross: 80,
        scores: { '1': { strokes: 4 } },
      }),
    ];
    const result = computeScrambleTeamRoundScore(scorecards, members);
    expect(result.teamGross).toBe(80);
    expect(result.holesCompleted).toBe(1);
  });

  it('returns zeros when no scorecard has any scoring data', () => {
    const scorecards = [
      createTestScorecard({ player_id: 'a', total_gross: 0, scores: {} }),
    ];
    const result = computeScrambleTeamRoundScore(scorecards, members);
    expect(result.teamGross).toBe(0);
    expect(result.teamNet).toBe(0);
    expect(result.holesCompleted).toBe(0);
    // Team handicap is still computed from members (independent of scoring).
    expect(result.teamHandicap).toBe(7.0);
  });

  it('caps team handicap strokes at 18 (defensive against very high HCs)', () => {
    // 80 + 80 + 80 + 80 = 320 → 80.0 team handicap → cap at 18 strokes.
    const highHcMembers = [
      { player_id: 'a', handicap: 80 },
      { player_id: 'b', handicap: 80 },
      { player_id: 'c', handicap: 80 },
      { player_id: 'd', handicap: 80 },
    ];
    const scorecards = [createTestScorecard({ player_id: 'a', total_gross: 100 })];
    const result = computeScrambleTeamRoundScore(scorecards, highHcMembers);
    expect(result.teamHandicapStrokes).toBe(18);
    expect(result.teamNet).toBe(82);
  });

  describe('DHC preference', () => {
    // Member raw `handicap` is the WHS Index from the player profile.
    // Each scorecard's `daily_handicap_used` is the DHC computed at scoring
    // time (using the round's tee slope/CR/par AND the configured handicap
    // source — profile vs calculated index). The team handicap formula
    // should sum DHCs, not raw indices, so it reflects the day's playing
    // conditions and the user's chosen handicap source. These tests pin
    // that preference.

    it('uses each scorecard\'s daily_handicap_used over the member\'s raw index', () => {
      // Members carry raw indices [4, 6, 8, 10] → if used directly, team HC
      // would be 25% × 28 = 7.0. But each scorecard captured a higher DHC
      // for this round (tougher tee), so the team HC should be larger.
      const members = [
        { player_id: 'a', handicap: 4 },
        { player_id: 'b', handicap: 6 },
        { player_id: 'c', handicap: 8 },
        { player_id: 'd', handicap: 10 },
      ];
      const scorecards = [
        createTestScorecard({
          player_id: 'a',
          total_gross: 80,
          daily_handicap_used: 6,
        }),
        createTestScorecard({
          player_id: 'b',
          total_gross: 80,
          daily_handicap_used: 8,
        }),
        createTestScorecard({
          player_id: 'c',
          total_gross: 80,
          daily_handicap_used: 10,
        }),
        createTestScorecard({
          player_id: 'd',
          total_gross: 80,
          daily_handicap_used: 12,
        }),
      ];

      const result = computeScrambleTeamRoundScore(scorecards, members);

      // 25% × (6 + 8 + 10 + 12) = 25% × 36 = 9.0 — NOT 7.0
      expect(result.teamHandicap).toBe(9.0);
      expect(result.teamHandicapStrokes).toBe(9);
      expect(result.teamNet).toBe(71); // 80 - 9
    });

    it('falls back to member raw handicap when a scorecard has no DHC captured yet', () => {
      // Only player 'a' has scored (their scorecard carries DHC); the rest
      // haven't, so we fall back to their raw indices for those members.
      const members = [
        { player_id: 'a', handicap: 4 }, // DHC 6 from scorecard
        { player_id: 'b', handicap: 6 }, // raw 6 (no scorecard)
        { player_id: 'c', handicap: 8 }, // raw 8 (no scorecard)
        { player_id: 'd', handicap: 10 }, // raw 10 (no scorecard)
      ];
      const scorecards = [
        createTestScorecard({
          player_id: 'a',
          total_gross: 80,
          daily_handicap_used: 6,
        }),
      ];

      const result = computeScrambleTeamRoundScore(scorecards, members);

      // 25% × (6 + 6 + 8 + 10) = 25% × 30 = 7.5
      expect(result.teamHandicap).toBe(7.5);
    });

    it('treats null daily_handicap_used as "not captured" and falls back to raw index', () => {
      const members = [
        { player_id: 'a', handicap: 4 },
        { player_id: 'b', handicap: 6 },
      ];
      const scorecards = [
        createTestScorecard({
          player_id: 'a',
          total_gross: 80,
          daily_handicap_used: null,
        }),
        createTestScorecard({
          player_id: 'b',
          total_gross: 80,
          daily_handicap_used: null,
        }),
      ];

      const result = computeScrambleTeamRoundScore(scorecards, members);

      // 25% × (4 + 6) = 2.5 — falls back to raw indices when DHC missing
      expect(result.teamHandicap).toBe(2.5);
    });
  });
});
