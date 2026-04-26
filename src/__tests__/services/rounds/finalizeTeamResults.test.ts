/**
 * finalizeTeamResults tests
 *
 * Covers the Phase 5 orchestrator that persists team rows into round_results
 * after individual finalization. The orchestrator is a pure dispatcher over
 * aggregateTeamTotal + finalizeTeamRound, so the tests focus on:
 *   - It wires the right aggregation + team_points for R1's best-3-of-4 case.
 *   - It skips unsupported aggregations (pairs_better_ball, scramble) without
 *     throwing.
 *   - It gracefully no-ops when the round has no teams or no individual data.
 */

import {
  finalizeTeamResults,
  finalizeTeamOnlyRound,
} from '@/services/rounds/finalizeTeamResults';
import * as roundResultsService from '@/services/rounds/roundResultsService';
import type { RoundResultWithParticipant } from '@/services/rounds/roundResultsService';
import type {
  PointSystemConfig,
  Scorecard,
  TeamWithMembers,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';
import { createTestScorecard } from '../../utils/testFixtures';

// Minimal PointSystemConfig; only matchPlay matters for competitive points,
// and best-N-of-M rounds don't use it.
const POINT_SYSTEM: PointSystemConfig = {
  type: 'position',
  rules: { '1': 10, '2': 8, default: 0 },
  matchPlay: { win: 2, draw: 1, loss: 0 },
};

// Golf-trip setup: Team A vs Team B, 4 players each.
const TEAM_A: TeamWithMembers = {
  id: 'team-a',
  competition_id: 'comp-1',
  name: 'Team A',
  color: null,
  created_at: '2026-04-24T00:00:00Z',
  updated_at: '2026-04-24T00:00:00Z',
  members: [
    { team_id: 'team-a', player_id: 'alice', joined_at: '', player: undefined },
    { team_id: 'team-a', player_id: 'bob', joined_at: '', player: undefined },
    { team_id: 'team-a', player_id: 'cam', joined_at: '', player: undefined },
    { team_id: 'team-a', player_id: 'dee', joined_at: '', player: undefined },
  ],
};

const TEAM_B: TeamWithMembers = {
  id: 'team-b',
  competition_id: 'comp-1',
  name: 'Team B',
  color: null,
  created_at: '2026-04-24T00:00:00Z',
  updated_at: '2026-04-24T00:00:00Z',
  members: [
    { team_id: 'team-b', player_id: 'ed', joined_at: '', player: undefined },
    { team_id: 'team-b', player_id: 'flo', joined_at: '', player: undefined },
    { team_id: 'team-b', player_id: 'gus', joined_at: '', player: undefined },
    { team_id: 'team-b', player_id: 'hal', joined_at: '', player: undefined },
  ],
};

function individualRow(playerId: string, rawScore: number): RoundResultWithParticipant {
  return {
    id: `res-${playerId}`,
    round_id: 'round-1',
    player_id: playerId,
    team_id: null,
    raw_score: rawScore,
    raw_result_data: { stableford_points: rawScore },
    position: 0,
    competition_points: 0,
    is_team_result: false,
    created_at: '',
    updated_at: '',
  };
}

describe('finalizeTeamResults', () => {
  let finalizeTeamRoundSpy: jest.SpyInstance;

  beforeEach(() => {
    finalizeTeamRoundSpy = jest
      .spyOn(roundResultsService, 'finalizeTeamRound')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Round 1 — Team Stableford Best 3 of 4', () => {
    const override: RoundRulesOverride = {
      template_id: 'team_stableford_best_n_of_m',
      team_aggregation: 'best_n_of_m',
      team_aggregation_config: { n: 3, m: 4 },
      team_points: { win: 2, tie: 1, loss: 0 },
    };

    it('writes 2 team rows with best-3-of-4 totals — 96 vs 90', async () => {
      const results: RoundResultWithParticipant[] = [
        individualRow('alice', 36),
        individualRow('bob', 32),
        individualRow('cam', 28),
        individualRow('dee', 20), // dropped (worst on Team A)
        individualRow('ed', 34),
        individualRow('flo', 30),
        individualRow('gus', 26),
        individualRow('hal', 22), // dropped (worst on Team B)
      ];

      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(2);
      expect(finalizeTeamRoundSpy).toHaveBeenCalledTimes(1);

      const [, teamScores, gameType, , passedOverride] =
        finalizeTeamRoundSpy.mock.calls[0];

      expect(gameType).toBe('stableford');
      expect(passedOverride).toBe(override);

      const byTeam = Object.fromEntries(
        teamScores.map((ts: { teamId: string; rawScore: number }) => [ts.teamId, ts.rawScore])
      );
      expect(byTeam['team-a']).toBe(96); // 36 + 32 + 28
      expect(byTeam['team-b']).toBe(90); // 34 + 30 + 26
    });

    it('handles a tied team total (both teams post the same best-3-of-4)', async () => {
      const results: RoundResultWithParticipant[] = [
        individualRow('alice', 30),
        individualRow('bob', 30),
        individualRow('cam', 30),
        individualRow('dee', 10),
        individualRow('ed', 30),
        individualRow('flo', 30),
        individualRow('gus', 30),
        individualRow('hal', 10),
      ];

      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(2);
      const teamScores = finalizeTeamRoundSpy.mock.calls[0][1];
      expect(teamScores.every((ts: { rawScore: number }) => ts.rawScore === 90)).toBe(true);
      // finalizeTeamRound internally applies team_points.tie for a tied two-team round.
    });

    it('skips teams with zero participating members', async () => {
      const results: RoundResultWithParticipant[] = [
        individualRow('alice', 36),
        individualRow('bob', 32),
        individualRow('cam', 28),
        individualRow('dee', 20),
        // No Team B players posted
      ];

      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
      });

      // Only one team has data → no-op (need ≥ 2 teams for a comparison).
      expect(count).toBe(0);
      expect(finalizeTeamRoundSpy).not.toHaveBeenCalled();
    });
  });

  describe('Round 3 — Team Scramble', () => {
    const override: RoundRulesOverride = {
      template_id: 'team_scramble_fixed_points',
      team_aggregation: 'scramble',
      team_points: { win: 2, tie: 1, loss: 0 },
      contributes_to_individual_leaderboard: false,
    };

    it('writes team rows using one member total per team (scramble = one ball)', async () => {
      // In a scramble every member's scorecard is the same — stroke counts
      // are identical. finalizeRound still emits one row per player because
      // that's the engine's shape; here we take a single team total.
      const results = [
        individualRow('alice', 72),
        individualRow('bob', 72),
        individualRow('cam', 72),
        individualRow('dee', 72),
        individualRow('ed', 75),
        individualRow('flo', 75),
        individualRow('gus', 75),
        individualRow('hal', 75),
      ];

      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stroke',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(2);
      const teamScores = finalizeTeamRoundSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        teamScores.map((ts: { teamId: string; rawScore: number }) => [ts.teamId, ts.rawScore])
      );
      // NOT 4x — scramble shouldn't multiply the team score by member count.
      expect(byTeam['team-a']).toBe(72);
      expect(byTeam['team-b']).toBe(75);
    });
  });

  describe('pairs_better_ball is deferred to finalizePairResults', () => {
    it('skips the round-total path when aggregation is pairs_better_ball', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: {
          template_id: 'pairs_better_ball',
          team_aggregation: 'pairs_better_ball',
          pair_points: { win: 1, tie: 0.5, loss: 0 },
        },
        individualResults: [individualRow('alice', 34)],
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(0);
      expect(finalizeTeamRoundSpy).not.toHaveBeenCalled();
    });
  });

  describe('perRoundRulesEnabled mode flag (Phase 6)', () => {
    const override: RoundRulesOverride = {
      template_id: 'team_stableford_best_n_of_m',
      team_aggregation: 'best_n_of_m',
      team_aggregation_config: { n: 3, m: 4 },
      team_points: { win: 2, tie: 1, loss: 0 },
    };

    const results = [
      individualRow('alice', 36),
      individualRow('bob', 32),
      individualRow('cam', 28),
      individualRow('dee', 20),
      individualRow('ed', 34),
      individualRow('flo', 30),
      individualRow('gus', 26),
      individualRow('hal', 22),
    ];

    it('no-ops when perRoundRulesEnabled=false', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        perRoundRulesEnabled: false,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(0);
      expect(finalizeTeamRoundSpy).not.toHaveBeenCalled();
    });

    it('persists team rows when perRoundRulesEnabled=true', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        perRoundRulesEnabled: true,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(2);
      expect(finalizeTeamRoundSpy).toHaveBeenCalledTimes(1);
      // 6th arg is the perRoundRulesEnabled flag — threaded through to finalizeTeamRound
      expect(finalizeTeamRoundSpy.mock.calls[0][5]).toBe(true);
    });

    it('treats undefined as legacy "honour override" (back-compat)', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        individualResults: results,
        teams: [TEAM_A, TEAM_B],
        // perRoundRulesEnabled intentionally omitted
      });
      expect(count).toBe(2);
    });
  });

  describe('guard rails', () => {
    it('returns 0 when override is missing', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: null,
        individualResults: [individualRow('alice', 30)],
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(0);
    });

    it('returns 0 when team_points is missing (supported agg but no allocation)', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: {
          team_aggregation: 'best_n_of_m',
          team_aggregation_config: { n: 3, m: 4 },
        },
        individualResults: [individualRow('alice', 30)],
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(0);
    });

    it('returns 0 when competition has fewer than 2 teams', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: {
          team_aggregation: 'best_n_of_m',
          team_aggregation_config: { n: 3, m: 4 },
          team_points: { win: 2, tie: 1, loss: 0 },
        },
        individualResults: [individualRow('alice', 30)],
        teams: [TEAM_A],
      });
      expect(count).toBe(0);
    });

    it('returns 0 when there are no individual results yet', async () => {
      const count = await finalizeTeamResults({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'stableford',
        pointSystem: POINT_SYSTEM,
        rulesOverride: {
          team_aggregation: 'best_n_of_m',
          team_aggregation_config: { n: 3, m: 4 },
          team_points: { win: 2, tie: 1, loss: 0 },
        },
        individualResults: [],
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(0);
    });
  });
});

// =====================================================
// finalizeTeamOnlyRound — used for Scramble / Best Ball / Shamble
// =====================================================

/**
 * Build a scorecard for a scramble team member.
 * Uses `total_gross` since the new scramble engine computes team_net as
 * `gross - floor(team_handicap)` rather than reading total_points/net
 * (those are per-individual values and don't represent a team total).
 */
function teamScorecard(playerId: string, totalGross: number): Scorecard {
  return createTestScorecard({
    id: `sc-${playerId}`,
    player_id: playerId,
    round_id: 'round-1',
    total_gross: totalGross,
    total_points: 0,
    total_net: 0,
    status: 'completed',
  });
}

describe('finalizeTeamOnlyRound', () => {
  let finalizeTeamRoundSpy: jest.SpyInstance;

  beforeEach(() => {
    finalizeTeamRoundSpy = jest
      .spyOn(roundResultsService, 'finalizeTeamRound')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Scramble — happy path with team_points override', () => {
    const override: RoundRulesOverride = {
      template_id: 'team_scramble_fixed_points',
      team_aggregation: 'scramble',
      team_points: { win: 2, tie: 1, loss: 0 },
      contributes_to_individual_leaderboard: false,
    };

    it('writes 2 team rows with team_net = gross - floor(team_handicap)', async () => {
      // 4v4 scramble. Team A's gross was 58, Team B's gross was 60.
      // Both teams' members have no handicap data attached in TEAM_A/B
      // fixtures (player: undefined) — so team_handicap = 0 and
      // team_net = team_gross. That gives us distinct rawScores for
      // ranking. Team handicap math is exercised in resultsEngine tests.
      const scorecards = [
        teamScorecard('alice', 58),
        teamScorecard('bob', 58),
        teamScorecard('ed', 60),
        teamScorecard('flo', 60),
      ];

      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards,
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        perRoundRulesEnabled: true,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(2);
      expect(finalizeTeamRoundSpy).toHaveBeenCalledTimes(1);

      const teamScores = finalizeTeamRoundSpy.mock.calls[0][1] as Array<{
        teamId: string;
        rawScore: number;
        rawResultData: { team_handicap?: number; gross_score?: number };
      }>;
      const byTeam = Object.fromEntries(teamScores.map((ts) => [ts.teamId, ts]));
      expect(byTeam['team-a'].rawScore).toBe(58);
      expect(byTeam['team-b'].rawScore).toBe(60);
      // team_handicap persisted in raw_result_data so the round leaderboard
      // HC column shows the team handicap, not avg of member handicaps.
      expect(byTeam['team-a'].rawResultData.team_handicap).toBe(0);
      expect(byTeam['team-a'].rawResultData.gross_score).toBe(58);

      // Override threaded through so finalizeTeamRound applies win/tie/loss.
      expect(finalizeTeamRoundSpy.mock.calls[0][4]).toBe(override);
    });

    it('uses one scorecard per team — duplicates from the same team don’t multiply', async () => {
      const scorecards = [
        teamScorecard('alice', 58),
        teamScorecard('bob', 58),
        teamScorecard('cam', 58),
        teamScorecard('dee', 58),
        teamScorecard('ed', 60),
      ];

      await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards,
        pointSystem: POINT_SYSTEM,
        rulesOverride: override,
        perRoundRulesEnabled: true,
        teams: [TEAM_A, TEAM_B],
      });

      const teamScores = finalizeTeamRoundSpy.mock.calls[0][1] as Array<{
        teamId: string;
        rawScore: number;
      }>;
      const teamA = teamScores.find((t) => t.teamId === 'team-a');
      // Not 4*58 — engine takes one scorecard per team (single-ball).
      expect(teamA?.rawScore).toBe(58);
    });
  });

  describe('Scramble — fallback to point_system when no team_points override', () => {
    it('writes team rows; finalizeTeamRound falls back to position-based points', async () => {
      const scorecards = [
        teamScorecard('alice', 40),
        teamScorecard('ed', 30),
      ];

      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards,
        pointSystem: POINT_SYSTEM,
        rulesOverride: null, // <— no override at all
        perRoundRulesEnabled: true,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(2);
      // Override is null/undefined; finalizeTeamRound will use point_system
      // position-based scoring (1st = POINT_SYSTEM.rules['1'] = 10).
      expect(finalizeTeamRoundSpy.mock.calls[0][4]).toBeNull();
    });

    it('also fallback when override exists but lacks team_points', async () => {
      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards: [teamScorecard('alice', 40), teamScorecard('ed', 30)],
        pointSystem: POINT_SYSTEM,
        rulesOverride: { team_aggregation: 'scramble' }, // no team_points key
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(2);
    });
  });

  describe('Defensive — fewer than 2 teams have scorecards', () => {
    it('returns 0 when only one team posted any scorecards', async () => {
      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards: [teamScorecard('alice', 38), teamScorecard('bob', 38)],
        pointSystem: POINT_SYSTEM,
        rulesOverride: null,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(0);
      expect(finalizeTeamRoundSpy).not.toHaveBeenCalled();
    });

    it('returns 0 when scorecards list is empty', async () => {
      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards: [],
        pointSystem: POINT_SYSTEM,
        rulesOverride: null,
        teams: [TEAM_A, TEAM_B],
      });
      expect(count).toBe(0);
      expect(finalizeTeamRoundSpy).not.toHaveBeenCalled();
    });

    it('returns 0 when competition has fewer than 2 teams', async () => {
      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards: [teamScorecard('alice', 38)],
        pointSystem: POINT_SYSTEM,
        rulesOverride: null,
        teams: [TEAM_A],
      });
      expect(count).toBe(0);
    });

    it('skips orphan scorecards — players whose team isn’t in the teams list', async () => {
      const count = await finalizeTeamOnlyRound({
        roundId: 'round-1',
        competitionId: 'comp-1',
        gameType: 'scramble',
        scorecards: [
          teamScorecard('alice', 38),         // Team A
          teamScorecard('orphan', 99),        // not on any team
          teamScorecard('ed', 30),            // Team B
        ],
        pointSystem: POINT_SYSTEM,
        rulesOverride: null,
        teams: [TEAM_A, TEAM_B],
      });

      expect(count).toBe(2);
      const teamScores = finalizeTeamRoundSpy.mock.calls[0][1] as Array<{
        teamId: string;
      }>;
      // Orphan player didn't create a third team row.
      expect(teamScores.map((t) => t.teamId).sort()).toEqual(['team-a', 'team-b']);
    });
  });

  describe('Best Ball + Shamble — same shape as Scramble', () => {
    it.each(['best-ball', 'shamble'] as const)(
      '%s writes team rows from team scorecards',
      async (gameType) => {
        const count = await finalizeTeamOnlyRound({
          roundId: 'round-1',
          competitionId: 'comp-1',
          gameType,
          scorecards: [teamScorecard('alice', 42), teamScorecard('ed', 38)],
          pointSystem: POINT_SYSTEM,
          rulesOverride: null,
          teams: [TEAM_A, TEAM_B],
        });
        expect(count).toBe(2);
        expect(finalizeTeamRoundSpy.mock.calls[0][2]).toBe(gameType);
      }
    );
  });

  describe('Defensive guards', () => {
    it('throws when called with a non-team-only game type', async () => {
      await expect(
        finalizeTeamOnlyRound({
          roundId: 'round-1',
          competitionId: 'comp-1',
          gameType: 'stableford',
          scorecards: [teamScorecard('alice', 38)],
          pointSystem: POINT_SYSTEM,
          rulesOverride: null,
          teams: [TEAM_A, TEAM_B],
        })
      ).rejects.toThrow(/non-team-only game type/);
    });
  });
});
