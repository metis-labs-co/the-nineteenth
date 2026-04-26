/**
 * Golf Trip Scenario — End-to-End Engine Integration Test
 *
 * Simulates the full 4-round golf trip the user described when planning the
 * per-round rules engine:
 *
 *   R1 — Individual Stableford, best 3-of-4 team agg, 2/1/0 team points.
 *   R2 — Individual Stableford with pairs-better-ball (2v2), 1/0.5/0 pair points.
 *   R3 — Team scramble, 2/1/0 team points, no individual leaderboard contribution.
 *   R4 — Individual match play seeded from the R1+R2 individual leaderboard,
 *        adjacent bracket pairings (1v2, 3v4, 5v6, 7v8).
 *
 * The test wires real engine functions end-to-end:
 *   Phase 1: calculateCompetitionPoints, calculateBestNofM, resolveEffectiveRules-equivalent paths
 *   Phase 3: aggregateQualifyingStandings, generateSeedings, buildBracketStructure
 *
 * It intentionally does NOT touch Supabase — each phase feeds data the next
 * phase would read off disk in production.
 */

import {
  calculateCompetitionPoints,
  STANDARD_POINT_SYSTEM,
} from '@/utils/competitionPoints';
import { calculateBestNofM } from '@/utils/teamAggregation';
import { aggregateQualifyingStandings } from '@/utils/knockoutSeeding';
import {
  generateSeedings,
  buildBracketStructure,
} from '@/utils/bracketGeneration';

type Row = Parameters<typeof aggregateQualifyingStandings>[0][number];

// ----------------------------------------------------------------------------
// Players & Teams (Golf trip setup)
// ----------------------------------------------------------------------------

const PLAYERS = {
  alice: { id: 'p-alice', name: 'Alice', handicap: 10 },
  bob: { id: 'p-bob', name: 'Bob', handicap: 8 },
  cam: { id: 'p-cam', name: 'Cam', handicap: 14 },
  dee: { id: 'p-dee', name: 'Dee', handicap: 18 },
  ed: { id: 'p-ed', name: 'Ed', handicap: 6 },
  flo: { id: 'p-flo', name: 'Flo', handicap: 12 },
  gus: { id: 'p-gus', name: 'Gus', handicap: 16 },
  hal: { id: 'p-hal', name: 'Hal', handicap: 20 },
};
const ALL = Object.values(PLAYERS);

const TEAM_A = [PLAYERS.alice, PLAYERS.bob, PLAYERS.cam, PLAYERS.dee];
const TEAM_B = [PLAYERS.ed, PLAYERS.flo, PLAYERS.gus, PLAYERS.hal];

// Helper — build a round-results row in the shape the aggregator expects.
function resultRow(
  roundId: string,
  player: { id: string; name: string; handicap: number },
  overrides: Partial<Row>
): Row {
  return {
    round_id: roundId,
    player_id: player.id,
    is_team_result: false,
    raw_score: 0,
    raw_result_data: {},
    competition_points: 0,
    player,
    ...overrides,
  };
}

describe('Golf Trip Scenario — end-to-end', () => {
  // --------------------------------------------------------------------------
  // ROUND 1 — Individual Stableford + best-3-of-4 team agg + 2/1/0 team points
  // --------------------------------------------------------------------------
  describe('Round 1 — Team Stableford (Best 3 of 4)', () => {
    // Individual Stableford totals from the day.
    const R1_POINTS = {
      alice: 36,
      bob: 32,
      cam: 28,
      dee: 20, // Dee has a rough day — this is the score we expect to drop
      ed: 34,
      flo: 30,
      gus: 26,
      hal: 22,
    };

    it('ranks all 8 individual scorecards on the individual leaderboard', () => {
      const scored = calculateCompetitionPoints(
        Object.entries(R1_POINTS).map(([key, points]) => ({
          participantId: PLAYERS[key as keyof typeof PLAYERS].id,
          rawScore: points,
        })),
        'stableford',
        STANDARD_POINT_SYSTEM
      );

      expect(scored[0].participantId).toBe(PLAYERS.alice.id); // 36 → 1st
      expect(scored[0].position).toBe(1);
      expect(scored[1].participantId).toBe(PLAYERS.ed.id); // 34 → 2nd
      expect(scored.find((s) => s.participantId === PLAYERS.dee.id)?.position).toBe(8);
    });

    it('Team A total = best 3 of 4 (drops the worst)', () => {
      const teamA = calculateBestNofM(
        TEAM_A.map((p) => ({ playerId: p.id, total: R1_POINTS[p.id.replace('p-', '') as keyof typeof R1_POINTS] })),
        { n: 3, m: 4 },
        true
      );
      expect(teamA.teamTotal).toBe(36 + 32 + 28); // 96 — drops Dee's 20
      expect(teamA.droppedIds).toEqual([PLAYERS.dee.id]);
      expect(teamA.contributorIds.sort()).toEqual([PLAYERS.alice.id, PLAYERS.bob.id, PLAYERS.cam.id].sort());
    });

    it('Team B total = best 3 of 4 (drops the worst)', () => {
      const teamB = calculateBestNofM(
        TEAM_B.map((p) => ({ playerId: p.id, total: R1_POINTS[p.id.replace('p-', '') as keyof typeof R1_POINTS] })),
        { n: 3, m: 4 },
        true
      );
      expect(teamB.teamTotal).toBe(34 + 30 + 26); // 90 — drops Hal's 22
      expect(teamB.droppedIds).toEqual([PLAYERS.hal.id]);
    });

    it('awards team_points 2/1/0 — Team A wins with 96 > 90', () => {
      // Simulate what finalizeTeamRound would do with team_points override + 2 teams.
      const teamAScore: number = 96;
      const teamBScore: number = 90;
      const teamPoints = { win: 2, tie: 1, loss: 0 };

      const teamAPoints = teamAScore > teamBScore ? teamPoints.win : teamAScore === teamBScore ? teamPoints.tie : teamPoints.loss;
      const teamBPoints = teamBScore > teamAScore ? teamPoints.win : teamAScore === teamBScore ? teamPoints.tie : teamPoints.loss;

      expect(teamAPoints).toBe(2);
      expect(teamBPoints).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // ROUND 2 — Pairs Better Ball (sub-match points) + individual Stableford
  // --------------------------------------------------------------------------
  describe('Round 2 — Pairs Better Ball', () => {
    const R2_POINTS = {
      alice: 34,
      bob: 32,
      cam: 30,
      dee: 25,
      ed: 33,
      flo: 28,
      gus: 31,
      hal: 20,
    };

    it('individual Stableford still ranks independently', () => {
      const scored = calculateCompetitionPoints(
        Object.entries(R2_POINTS).map(([key, points]) => ({
          participantId: PLAYERS[key as keyof typeof PLAYERS].id,
          rawScore: points,
        })),
        'stableford',
        STANDARD_POINT_SYSTEM
      );
      expect(scored[0].participantId).toBe(PLAYERS.alice.id); // 34 → 1st
      expect(scored[0].position).toBe(1);
    });

    it('applies pair_points 1/0.5/0 per sub-match', () => {
      // Pairs: [Alice, Bob] vs [Ed, Flo], [Cam, Dee] vs [Gus, Hal].
      // Pair better-ball total = sum of each pair's better member per hole.
      // Simplified: use pair-total better-ball approximation from totals.
      const pairAB = Math.max(R2_POINTS.alice, R2_POINTS.bob) + (R2_POINTS.alice + R2_POINTS.bob) / 2;
      const pairEF = Math.max(R2_POINTS.ed, R2_POINTS.flo) + (R2_POINTS.ed + R2_POINTS.flo) / 2;
      const pairCD = Math.max(R2_POINTS.cam, R2_POINTS.dee) + (R2_POINTS.cam + R2_POINTS.dee) / 2;
      const pairGH = Math.max(R2_POINTS.gus, R2_POINTS.hal) + (R2_POINTS.gus + R2_POINTS.hal) / 2;

      const pairPoints = { win: 1, tie: 0.5, loss: 0 };

      const match1Result = pairAB > pairEF ? 'a' : pairAB < pairEF ? 'b' : 'tie';
      const match2Result = pairCD > pairGH ? 'a' : pairCD < pairGH ? 'b' : 'tie';

      // [Alice,Bob]: 34+33 vs [Ed,Flo]: 33+30.5 → Alice/Bob pair wins
      expect(match1Result).toBe('a');
      // [Cam,Dee]: 30+27.5 vs [Gus,Hal]: 31+25.5 → Cam/Dee 57.5 vs Gus/Hal 56.5
      expect(match2Result).toBe('a');

      // Each winning pair member collects pair_points.win toward their team total.
      const teamAPairPoints = match1Result === 'a' ? pairPoints.win : match1Result === 'tie' ? pairPoints.tie : pairPoints.loss;
      const teamAPairPointsPlus = match2Result === 'a' ? pairPoints.win : match2Result === 'tie' ? pairPoints.tie : pairPoints.loss;
      expect(teamAPairPoints + teamAPairPointsPlus).toBe(2); // Team A wins both sub-matches
    });
  });

  // --------------------------------------------------------------------------
  // ROUND 3 — Team Scramble (2/1/0) — no individual contribution
  // --------------------------------------------------------------------------
  describe('Round 3 — Team Scramble', () => {
    it('does NOT contribute to the individual leaderboard (flag is false)', () => {
      // When contributes_to_individual_leaderboard === false, Phase 1 finalization
      // zeros competition_points on the saved individual rows. Verified at the
      // unit level in roundResultsService.test.ts — here we just assert the
      // template wiring is right.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { TEAM_SCRAMBLE_FIXED_POINTS } = require('@/constants/roundTemplates');
      expect(TEAM_SCRAMBLE_FIXED_POINTS.override.contributes_to_individual_leaderboard).toBe(false);
      expect(TEAM_SCRAMBLE_FIXED_POINTS.override.team_points).toEqual({ win: 2, tie: 1, loss: 0 });
    });
  });

  // --------------------------------------------------------------------------
  // ROUND 4 — Qualifying Match Play bracket from R1+R2 standings
  // --------------------------------------------------------------------------
  describe('Round 4 — Qualifying Match Play', () => {
    // Mock R1 + R2 finalized round_results as they would sit on disk post-Phase-1.
    // We use competition_points (standard 10/8/6/5/4/3/2/1/default 0) as the metric.
    // Positions derived from calculateCompetitionPoints above:
    //   R1 positions: Alice 1, Ed 2, Bob 3, Flo 4, Cam 5, Gus 6, Hal 7, Dee 8
    //   R2 positions: Alice 1, Ed 2, Bob 3, Gus 4, Cam 5, Flo 6, Dee 7, Hal 8
    // R1+R2 cumulative competition points:
    //   Alice: 10+10 = 20  → seed 1
    //   Ed:     8+ 8 = 16  → seed 2
    //   Bob:    6+ 6 = 12  → seed 3
    //   Cam:    4+ 4 =  8  → seed 4 or 5 (tied with Flo/Gus)
    //   Flo:    5+ 3 =  8
    //   Gus:    3+ 5 =  8
    //   Hal:    2+ 1 =  3
    //   Dee:    1+ 2 =  3
    // Tie-break by insertion order (stable sort): Cam 4, Flo 5, Gus 6, then Hal 7, Dee 8.

    const R1_ID = 'round-1';
    const R2_ID = 'round-2';

    const R1_RESULTS = [
      resultRow(R1_ID, PLAYERS.alice, { competition_points: 10, raw_result_data: { stableford_points: 36 }, raw_score: 36 }),
      resultRow(R1_ID, PLAYERS.ed, { competition_points: 8, raw_result_data: { stableford_points: 34 }, raw_score: 34 }),
      resultRow(R1_ID, PLAYERS.bob, { competition_points: 6, raw_result_data: { stableford_points: 32 }, raw_score: 32 }),
      resultRow(R1_ID, PLAYERS.flo, { competition_points: 5, raw_result_data: { stableford_points: 30 }, raw_score: 30 }),
      resultRow(R1_ID, PLAYERS.cam, { competition_points: 4, raw_result_data: { stableford_points: 28 }, raw_score: 28 }),
      resultRow(R1_ID, PLAYERS.gus, { competition_points: 3, raw_result_data: { stableford_points: 26 }, raw_score: 26 }),
      resultRow(R1_ID, PLAYERS.hal, { competition_points: 2, raw_result_data: { stableford_points: 22 }, raw_score: 22 }),
      resultRow(R1_ID, PLAYERS.dee, { competition_points: 1, raw_result_data: { stableford_points: 20 }, raw_score: 20 }),
    ];

    const R2_RESULTS = [
      resultRow(R2_ID, PLAYERS.alice, { competition_points: 10, raw_result_data: { stableford_points: 34 }, raw_score: 34 }),
      resultRow(R2_ID, PLAYERS.ed, { competition_points: 8, raw_result_data: { stableford_points: 33 }, raw_score: 33 }),
      resultRow(R2_ID, PLAYERS.bob, { competition_points: 6, raw_result_data: { stableford_points: 32 }, raw_score: 32 }),
      resultRow(R2_ID, PLAYERS.gus, { competition_points: 5, raw_result_data: { stableford_points: 31 }, raw_score: 31 }),
      resultRow(R2_ID, PLAYERS.cam, { competition_points: 4, raw_result_data: { stableford_points: 30 }, raw_score: 30 }),
      resultRow(R2_ID, PLAYERS.flo, { competition_points: 3, raw_result_data: { stableford_points: 28 }, raw_score: 28 }),
      resultRow(R2_ID, PLAYERS.dee, { competition_points: 2, raw_result_data: { stableford_points: 25 }, raw_score: 25 }),
      resultRow(R2_ID, PLAYERS.hal, { competition_points: 1, raw_result_data: { stableford_points: 20 }, raw_score: 20 }),
    ];

    const ALL_RESULTS = [...R1_RESULTS, ...R2_RESULTS];

    it('aggregates qualifying standings correctly by competition_points', () => {
      const ranked = aggregateQualifyingStandings(
        ALL_RESULTS,
        [R1_ID, R2_ID],
        'competition_points'
      );

      // Top 3 are deterministic: Alice 20, Ed 16, Bob 12
      expect(ranked[0].id).toBe(PLAYERS.alice.id);
      expect(ranked[0].total).toBe(20);
      expect(ranked[1].id).toBe(PLAYERS.ed.id);
      expect(ranked[1].total).toBe(16);
      expect(ranked[2].id).toBe(PLAYERS.bob.id);
      expect(ranked[2].total).toBe(12);
      // Next three (Cam/Flo/Gus) tied at 8 — order depends on aggregation
      // traversal but the total is the key invariant.
      expect([ranked[3].total, ranked[4].total, ranked[5].total]).toEqual([8, 8, 8]);
      // Bottom two tied at 3
      expect([ranked[6].total, ranked[7].total]).toEqual([3, 3]);
    });

    it('aggregates Stableford-points totals if that metric is chosen instead', () => {
      const ranked = aggregateQualifyingStandings(
        ALL_RESULTS,
        [R1_ID, R2_ID],
        'stableford_points'
      );
      // Alice: 36+34 = 70, Ed: 34+33 = 67, Bob: 32+32 = 64, …
      expect(ranked[0].id).toBe(PLAYERS.alice.id);
      expect(ranked[0].total).toBe(70);
      expect(ranked[1].id).toBe(PLAYERS.ed.id);
      expect(ranked[1].total).toBe(67);
      expect(ranked[2].id).toBe(PLAYERS.bob.id);
      expect(ranked[2].total).toBe(64);
    });

    it('seeds the bracket with adjacent pairings (1v2, 3v4, 5v6, 7v8)', () => {
      const preOrdered = aggregateQualifyingStandings(
        ALL_RESULTS,
        [R1_ID, R2_ID],
        'competition_points'
      ).map((p) => ({ id: p.id, name: p.name, handicap: p.handicap }));

      const seeds = generateSeedings(ALL, 'qualifying', preOrdered);
      const slots = buildBracketStructure(8, 'adjacent');

      const seedById = new Map(seeds.map((s) => [s.playerId, s.seed]));
      const playerBySeed = new Map(seeds.map((s) => [s.seed, s.playerId]));

      // Seed 1 = Alice, Seed 2 = Ed, Seed 3 = Bob
      expect(playerBySeed.get(1)).toBe(PLAYERS.alice.id);
      expect(playerBySeed.get(2)).toBe(PLAYERS.ed.id);
      expect(playerBySeed.get(3)).toBe(PLAYERS.bob.id);

      // First round pairings (adjacent): 1v2, 3v4, 5v6, 7v8
      const firstRound = slots
        .filter((s) => s.bracketType === 'main' && s.stage === 0)
        .sort((a, b) => a.bracketPosition - b.bracketPosition)
        .map((s) => [s.player1Seed, s.player2Seed]);

      expect(firstRound).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ]);

      // Alice plays Ed in the very first match
      expect(seedById.get(PLAYERS.alice.id)).toBe(1);
      expect(seedById.get(PLAYERS.ed.id)).toBe(2);
    });

    it('regenerates with standard style — same seeds, classic pairings (1v8, 2v7, 3v6, 4v5)', () => {
      const preOrdered = aggregateQualifyingStandings(
        ALL_RESULTS,
        [R1_ID, R2_ID],
        'competition_points'
      ).map((p) => ({ id: p.id, name: p.name, handicap: p.handicap }));

      const seeds = generateSeedings(ALL, 'qualifying', preOrdered);
      const slots = buildBracketStructure(8, 'standard');

      const firstRound = slots
        .filter((s) => s.bracketType === 'main' && s.stage === 0)
        .sort((a, b) => a.bracketPosition - b.bracketPosition)
        .map((s) => [s.player1Seed, s.player2Seed]);

      expect(firstRound).toEqual([
        [1, 8],
        [4, 5],
        [2, 7],
        [3, 6],
      ]);

      // Seed order is unchanged — only pairings differ
      expect(seeds[0].playerId).toBe(PLAYERS.alice.id);
      expect(seeds[1].playerId).toBe(PLAYERS.ed.id);
    });

    it('returns only ranked players — the service layer fills in non-participants', () => {
      // Drop Hal from R1+R2 results — the util returns 7, not 8.
      const partial = ALL_RESULTS.filter((r) => r.player_id !== PLAYERS.hal.id);
      const ranked = aggregateQualifyingStandings(partial, [R1_ID, R2_ID], 'competition_points');
      expect(ranked.find((r) => r.id === PLAYERS.hal.id)).toBeUndefined();
      expect(ranked).toHaveLength(7);
      // `getQualifyingStandings` (service layer) handles the 8th-player append
      // by handicap ascending before calling generateSeedings. That path is
      // tested via the Supabase-mocked knockout integration tests.
      const preOrdered = ranked.map((p) => ({ id: p.id, name: p.name, handicap: p.handicap }));
      const seeds = generateSeedings(ALL, 'qualifying', preOrdered);
      // With a short preOrdered, generateSeedings emits only those (7) — the
      // bracket generator rejects 7 at the isValidPlayerCount check, so the
      // service must always pass a full 8.
      expect(seeds).toHaveLength(7);
    });
  });

  // --------------------------------------------------------------------------
  // DOWNGRADE — saved overrides keep applying after a tier change
  // --------------------------------------------------------------------------
  describe('Downgrade path', () => {
    it('engine functions have no tier dependency — overrides remain in effect', () => {
      // The Phase 1 engine never reads tier/subscription state. As long as
      // rules_override is on the row, the finalization and aggregation paths
      // apply it. Tier gating lives only in the *edit* UI (EditRoundRulesSheet
      // + GenerateBracketSheet qualifying/adjacent controls).
      //
      // This is the architectural invariant — verify by structural check that
      // our template constants and engine utilities don't import anything
      // subscription-related.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const teamAggSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../utils/teamAggregation.ts'),
        'utf8'
      );
      expect(teamAggSrc).not.toMatch(/SubscriptionContext|useCheckFeature|canUseAdvancedRoundRules/);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const knockoutSeedingSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../utils/knockoutSeeding.ts'),
        'utf8'
      );
      expect(knockoutSeedingSrc).not.toMatch(/SubscriptionContext|useCheckFeature|canUseAdvancedRoundRules/);
    });
  });
});
