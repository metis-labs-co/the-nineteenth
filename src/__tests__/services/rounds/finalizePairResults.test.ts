/**
 * finalizePairResults tests
 *
 * Covers R2 pair-points persistence for split (Ryder-Cup-style) rounds.
 */

import { finalizePairResults, isPairPointsOverride } from '@/services/rounds/finalizePairResults';
import * as roundResultsService from '@/services/rounds/roundResultsService';
import type {
  Hole,
  Scorecard,
  SubMatch,
  TeamWithMembers,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

const OVERRIDE: RoundRulesOverride = {
  template_id: 'pairs_better_ball',
  team_aggregation: 'pairs_better_ball',
  pair_points: { win: 1, tie: 0.5, loss: 0 },
};

function subMatch(overrides: Partial<SubMatch>): SubMatch {
  return {
    id: 'sm-' + Math.random().toString(36).slice(2, 8),
    round_id: 'round-1',
    sort_order: 0,
    team_a_player_ids: ['p1', 'p2'],
    team_b_player_ids: ['p3', 'p4'],
    tee_time: null,
    pairing_id: null,
    status: 'completed',
    result: 'a-wins',
    final_differential: 2,
    final_holes_remaining: null,
    team_a_net_total: null,
    team_b_net_total: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('finalizePairResults', () => {
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    saveSpy = jest
      .spyOn(roundResultsService, 'saveRoundResults')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes 2 team rows with accumulated pair points (Team A wins both 2v2 matches)', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, result: 'a-wins' }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(2); // 1 + 1
    expect(byTeam['team-b']).toBe(0); // 0 + 0
  });

  it('derives team sides from membership when team1Id/team2Id are absent', async () => {
    // Alt-shot/Ryder-cup split rounds carry no team1_id/team2_id on the round;
    // sides must be derived from competition team membership.
    const teams = [
      { id: 'team-red', members: [{ player_id: 'p1' }, { player_id: 'p2' }] },
      { id: 'team-blue', members: [{ player_id: 'p3' }, { player_id: 'p4' }] },
    ] as unknown as TeamWithMembers[];
    const subMatches: SubMatch[] = [
      subMatch({ result: 'a-wins', team_a_player_ids: ['p1', 'p2'], team_b_player_ids: ['p3', 'p4'] }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      competitionId: 'comp-1',
      teams, // provided directly → derive sides from these
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-red']).toBe(1); // p1/p2 side won
    expect(byTeam['team-blue']).toBe(0);
  });

  it('resolves alt-shot from scores using profile handicap when daily snapshot is absent', async () => {
    // Equal gross (72 each) so only the handicap decides. Team red's player has
    // HC 8 (alt-shot team HC = 50% = 4); team blue is 0. Scorecards carry NO
    // daily_handicap_used, so the finalizer must fall back to the profile HC
    // from the teams — otherwise both sides net 72 and it wrongly ties.
    const holes = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      strokeIndex: i + 1,
    })) as unknown as Hole[];
    const scoresOf = () =>
      Object.fromEntries(holes.map((h) => [String(h.number), { strokes: 4 }]));
    const scorecards = [
      { player_id: 'p1', scores: scoresOf(), daily_handicap_used: null, total_gross: 72 },
      { player_id: 'p3', scores: scoresOf(), daily_handicap_used: null, total_gross: 72 },
    ] as unknown as Scorecard[];
    const teams = [
      { id: 'team-red', members: [{ player_id: 'p1', player: { handicap: 8 } }, { player_id: 'p2', player: { handicap: 0 } }] },
      { id: 'team-blue', members: [{ player_id: 'p3', player: { handicap: 0 } }, { player_id: 'p4', player: { handicap: 0 } }] },
    ] as unknown as TeamWithMembers[];
    const subMatches: SubMatch[] = [
      subMatch({
        status: 'upcoming',
        result: null,
        team_a_player_ids: ['p1', 'p2'],
        team_b_player_ids: ['p3', 'p4'],
      }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      teams,
      gameType: 'alt-shot',
      scorecards,
      courseHoles: holes,
      subMatches,
      rulesOverride: OVERRIDE,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-red']).toBe(1); // net 68 < 72 → win (NOT a 0.5 tie)
    expect(byTeam['team-blue']).toBe(0);
  });

  it('handles halved sub-matches as 0.5 + 0.5', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'halved' }),
      subMatch({ sort_order: 1, result: 'a-wins' }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(1.5); // 0.5 (halved) + 1 (win)
    expect(byTeam['team-b']).toBe(0.5); // 0.5 (halved) + 0 (loss)
  });

  it('forfeit-b counts as Team A winning; forfeit-a as Team B winning', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'forfeit-b', status: 'forfeited' }),
      subMatch({ sort_order: 1, result: 'forfeit-a', status: 'forfeited' }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(1); // forfeit-b (A wins) + forfeit-a (A loses) = 1 + 0
    expect(byTeam['team-b']).toBe(1); // forfeit-b (B loses) + forfeit-a (B wins) = 0 + 1
  });

  it('skips in-progress and upcoming sub-matches', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, status: 'in-progress', result: null }),
      subMatch({ sort_order: 2, status: 'upcoming', result: null }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(1);
    expect(byTeam['team-b']).toBe(0);
  });

  it('assigns position 1 to the winning team and 2 to the loser', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, result: 'b-wins' }),
      subMatch({ sort_order: 2, result: 'a-wins' }),
    ];

    await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    const b = rows.find((r: { teamId: string }) => r.teamId === 'team-b');
    expect(a.position).toBe(1); // 2 wins - 1 win
    expect(b.position).toBe(2);
  });

  it('assigns both teams position 1 when the overall score is tied', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, result: 'b-wins' }),
    ];

    await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    const rows = saveSpy.mock.calls[0][1];
    expect(rows.every((r: { position: number }) => r.position === 1)).toBe(true);
  });

  describe('perRoundRulesEnabled mode flag (Phase 6)', () => {
    it('no-ops when perRoundRulesEnabled=false even with pair_points set', async () => {
      const count = await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: OVERRIDE,
        perRoundRulesEnabled: false,
        subMatches: [subMatch({ result: 'a-wins' })],
      });
      expect(count).toBe(0);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('persists when perRoundRulesEnabled=true', async () => {
      const count = await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: OVERRIDE,
        perRoundRulesEnabled: true,
        subMatches: [subMatch({ result: 'a-wins' })],
      });
      expect(count).toBe(2);
    });

    it('treats undefined as legacy "honour override"', async () => {
      const count = await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: OVERRIDE,
        subMatches: [subMatch({ result: 'a-wins' })],
      });
      expect(count).toBe(2);
    });
  });

  describe('guard rails', () => {
    const base = {
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      subMatches: [subMatch({ result: 'a-wins' })],
    };

    it('no-ops when override has no pair_points', async () => {
      const count = await finalizePairResults({
        ...base,
        rulesOverride: { team_aggregation: 'sum' },
      });
      expect(count).toBe(0);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('no-ops when team1 or team2 is missing', async () => {
      const count = await finalizePairResults({
        ...base,
        team1Id: '',
        rulesOverride: OVERRIDE,
      });
      expect(count).toBe(0);
    });

    it('no-ops when there are no completed sub-matches', async () => {
      const count = await finalizePairResults({
        ...base,
        subMatches: [subMatch({ status: 'upcoming', result: null })],
        rulesOverride: OVERRIDE,
      });
      expect(count).toBe(0);
    });
  });

  describe('live computation from scorecards', () => {
    // 3 par-4 holes, handicap 0 → stableford per hole = points off gross:
    // birdie(3)=3, par(4)=2, bogey(5)=1, double+(6+)=0.
    const HOLES: Hole[] = [
      { number: 1, par: 4, strokeIndex: 1 },
      { number: 2, par: 4, strokeIndex: 2 },
      { number: 3, par: 4, strokeIndex: 3 },
    ];

    function member(playerId: string) {
      return { team_id: '', player_id: playerId, joined_at: '', player: undefined };
    }

    const TEAMS: TeamWithMembers[] = [
      {
        id: 'team-a',
        competition_id: 'comp-1',
        name: 'Team A',
        color: null,
        created_at: '',
        updated_at: '',
        members: [member('a1'), member('a2'), member('a3'), member('a4')],
      },
      {
        id: 'team-b',
        competition_id: 'comp-1',
        name: 'Team B',
        color: null,
        created_at: '',
        updated_at: '',
        members: [member('b1'), member('b2'), member('b3'), member('b4')],
      },
    ];

    /** Scorecard from a 3-element gross-strokes array (handicap 0). */
    function card(playerId: string, strokes: [number, number, number]): Scorecard {
      const scores: Record<string, { strokes: number }> = {};
      strokes.forEach((s, i) => {
        scores[String(i + 1)] = { strokes: s };
      });
      return {
        id: `sc-${playerId}`,
        round_id: 'round-1',
        player_id: playerId,
        scores,
        total_gross: strokes.reduce((a, b) => a + b, 0),
        total_net: strokes.reduce((a, b) => a + b, 0),
        total_points: 0,
        status: 'completed',
        daily_handicap_used: 0,
      } as unknown as Scorecard;
    }

    const splitSubMatches: SubMatch[] = [
      subMatch({
        sort_order: 0,
        status: 'upcoming',
        result: null,
        team_a_player_ids: ['a1', 'a2'],
        team_b_player_ids: ['b1', 'b2'],
      }),
      subMatch({
        sort_order: 1,
        status: 'upcoming',
        result: null,
        team_a_player_ids: ['a3', 'a4'],
        team_b_player_ids: ['b3', 'b4'],
      }),
    ];

    it('computes sub-match outcomes via best-ball and derives team ids when team1/team2 omitted', async () => {
      const scorecards: Scorecard[] = [
        // SM0: A best-ball [3,2,2]=7 vs B best-ball [2,2,2]=6 → A wins
        card('a1', [3, 4, 4]),
        card('a2', [4, 4, 4]),
        card('b1', [4, 4, 4]),
        card('b2', [5, 5, 5]),
        // SM1: A best-ball [2,2,2]=6 vs B best-ball [1,1,1]=3 → A wins
        card('a3', [4, 4, 4]),
        card('a4', [5, 5, 5]),
        card('b3', [5, 5, 5]),
        card('b4', [5, 5, 5]),
      ];

      const count = await finalizePairResults({
        roundId: 'round-1',
        rulesOverride: OVERRIDE,
        subMatches: splitSubMatches,
        teams: TEAMS,
        scorecards,
        courseHoles: HOLES,
        gameType: 'stableford',
      });

      expect(count).toBe(2);
      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; rawScore: number; position: number }) => [
          r.teamId,
          r,
        ])
      );
      expect(byTeam['team-a'].rawScore).toBe(2); // won both sub-matches
      expect(byTeam['team-b'].rawScore).toBe(0);
      expect(byTeam['team-a'].position).toBe(1);
      expect(byTeam['team-b'].position).toBe(2);
    });

    it('prefers a persisted forfeit result over computed scorecards', async () => {
      const scorecards: Scorecard[] = [
        // Scorecards would say A wins, but the sub-match was forfeited by A.
        card('a1', [3, 3, 3]),
        card('a2', [3, 3, 3]),
        card('b1', [5, 5, 5]),
        card('b2', [5, 5, 5]),
      ];

      const count = await finalizePairResults({
        roundId: 'round-1',
        rulesOverride: OVERRIDE,
        subMatches: [
          subMatch({
            sort_order: 0,
            status: 'forfeited',
            result: 'forfeit-a', // side A forfeits → side B wins
            team_a_player_ids: ['a1', 'a2'],
            team_b_player_ids: ['b1', 'b2'],
          }),
        ],
        teams: TEAMS,
        scorecards,
        courseHoles: HOLES,
        gameType: 'stableford',
      });

      expect(count).toBe(2);
      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore])
      );
      expect(byTeam['team-a']).toBe(0); // forfeited
      expect(byTeam['team-b']).toBe(1); // wins by forfeit
    });
  });

  describe('combined-match-margin bonus', () => {
    const BONUS_OVERRIDE: RoundRulesOverride = {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
    };

    it('adds the bonus to the team with the higher net holes-up margin', async () => {
      // SM0: A wins by 3 (unsigned diff=3). SM1: B wins by 1 (unsigned diff=1).
      // Net: A = +3 −1 = +2 → A wins bonus.
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 3 }),
        subMatch({ sort_order: 1, result: 'b-wins', final_differential: 1 }),
      ];

      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; rawScore: number; competitionPoints: number; position: number }) => [r.teamId, r])
      );
      // pair points: A=1 (one win), B=1 (one win). Bonus +1 to A.
      expect(byTeam['team-a'].rawScore).toBe(1);
      expect(byTeam['team-a'].competitionPoints).toBe(2); // 1 + 1 bonus
      expect(byTeam['team-b'].competitionPoints).toBe(1); // 1 + 0 bonus
      expect(byTeam['team-a'].position).toBe(1);
      expect(byTeam['team-b'].position).toBe(2);
    });

    it('splits the bonus 0.5/0.5 on an exact net-margin tie', async () => {
      // SM0: A wins by 2. SM1: B wins by 2. Net = 0 → split.
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 2 }),
        subMatch({ sort_order: 1, result: 'b-wins', final_differential: 2 }),
      ];

      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; competitionPoints: number }) => [r.teamId, r.competitionPoints])
      );
      expect(byTeam['team-a']).toBe(1.5); // 1 pair + 0.5 bonus
      expect(byTeam['team-b']).toBe(1.5);
    });

    it('awards the bonus to side B when it has the higher margin', async () => {
      // SM0: A wins by 1 (unsigned diff=1). SM1: B wins by 3 (unsigned diff=3).
      // Net: A = +1 −3 = −2 → B wins bonus.
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 1 }),
        subMatch({ sort_order: 1, result: 'b-wins', final_differential: 3 }),
      ];

      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; competitionPoints: number; position: number }) => [r.teamId, r])
      );
      // pair points: A=1, B=1. Bonus +1 to B.
      expect(byTeam['team-b'].competitionPoints).toBe(2);
      expect(byTeam['team-a'].competitionPoints).toBe(1);
      expect(byTeam['team-b'].position).toBe(1);
    });

    it('does not award a bonus when bonus_points is absent', async () => {
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 5 }),
      ];
      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: { pair_points: { win: 1, tie: 0.5, loss: 0 } },
        subMatches,
      });
      const rows = saveSpy.mock.calls[0][1];
      const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
      expect(a.competitionPoints).toBe(1); // no bonus
    });
  });

  describe('alt-shot stroke-play holes-up bonus', () => {
    const ALT_HOLES: Hole[] = [
      { number: 1, par: 4, strokeIndex: 1 },
      { number: 2, par: 4, strokeIndex: 2 },
      { number: 3, par: 4, strokeIndex: 3 },
    ];

    function altMember(playerId: string) {
      return { team_id: '', player_id: playerId, joined_at: '', player: undefined };
    }

    const ALT_TEAMS: TeamWithMembers[] = [
      {
        id: 'team-a', competition_id: 'comp-1', name: 'Team A', color: null,
        created_at: '', updated_at: '',
        members: [altMember('a1'), altMember('a2'), altMember('a3'), altMember('a4')],
      },
      {
        id: 'team-b', competition_id: 'comp-1', name: 'Team B', color: null,
        created_at: '', updated_at: '',
        members: [altMember('b1'), altMember('b2'), altMember('b3'), altMember('b4')],
      },
    ];

    function altCard(playerId: string, strokes: [number, number, number]): Scorecard {
      const scores: Record<string, { strokes: number }> = {};
      strokes.forEach((s, i) => { scores[String(i + 1)] = { strokes: s }; });
      return {
        id: `sc-${playerId}`, round_id: 'round-1', player_id: playerId, scores,
        total_gross: strokes.reduce((a, b) => a + b, 0),
        total_net: strokes.reduce((a, b) => a + b, 0),
        total_points: 0, status: 'completed', daily_handicap_used: 0,
      } as unknown as Scorecard;
    }

    const BONUS_OVERRIDE: RoundRulesOverride = {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
    };

    it('derives the bonus from per-hole holes-up when no final_differential is persisted', async () => {
      // Alt-shot, live-computed (status upcoming, result null, final_differential null).
      // SM0: A one-ball [4,4,4] vs B [5,5,5] → A wins all 3 holes (+3) AND wins the match (net 12<15).
      // SM1: A [4,4,4] vs B [4,4,4] → all holes halved (margin 0) AND match halved.
      // Net margin: A +3, B -3 → A wins the bonus point.
      // Pair points: SM0 A win=1/B loss=0; SM1 halved 0.5/0.5 → A=1.5, B=0.5.
      // Competition points: A = 1.5 + 1 bonus = 2.5; B = 0.5 + 0 = 0.5.
      const subMatches: SubMatch[] = [
        subMatch({
          sort_order: 0, status: 'upcoming', result: null, final_differential: null,
          team_a_player_ids: ['a1', 'a2'], team_b_player_ids: ['b1', 'b2'],
        }),
        subMatch({
          sort_order: 1, status: 'upcoming', result: null, final_differential: null,
          team_a_player_ids: ['a3', 'a4'], team_b_player_ids: ['b3', 'b4'],
        }),
      ];

      const scorecards: Scorecard[] = [
        altCard('a1', [4, 4, 4]), altCard('b1', [5, 5, 5]), // SM0
        altCard('a3', [4, 4, 4]), altCard('b3', [4, 4, 4]), // SM1
      ];

      await finalizePairResults({
        roundId: 'round-1',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
        teams: ALT_TEAMS,
        scorecards,
        courseHoles: ALT_HOLES,
        gameType: 'alt-shot',
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; rawScore: number; competitionPoints: number; position: number }) => [r.teamId, r])
      );
      expect(byTeam['team-a'].rawScore).toBe(1.5);        // pair points only
      expect(byTeam['team-a'].competitionPoints).toBe(2.5); // + 1 bonus
      expect(byTeam['team-b'].competitionPoints).toBe(0.5); // no bonus
      expect(byTeam['team-a'].position).toBe(1);
      expect(byTeam['team-b'].position).toBe(2);
    });
  });

  describe('isPairPointsOverride', () => {
    it('returns true for split rounds with pair_points', () => {
      expect(isPairPointsOverride('split', OVERRIDE)).toBe(true);
    });

    it('returns false for combined rounds', () => {
      expect(isPairPointsOverride('combined', OVERRIDE)).toBe(false);
    });

    it('returns false without pair_points', () => {
      expect(isPairPointsOverride('split', { team_aggregation: 'sum' })).toBe(false);
    });

    it('returns false for null/undefined round_format or override', () => {
      expect(isPairPointsOverride(null, OVERRIDE)).toBe(false);
      expect(isPairPointsOverride('split', null)).toBe(false);
    });
  });
});
