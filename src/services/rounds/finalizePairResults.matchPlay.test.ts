/**
 * finalizePairResults — match-play recompute tests
 *
 * For `game_type: 'match-play'` split rounds, each sub-match must be resolved
 * via `resolveMatchPlaySubMatchOutcome` (the same live-consistent engine the
 * Review-screen sub-match leaderboard uses) instead of the stale persisted
 * `sub_matches.result` / best-ball fallback. This file asserts the recompute
 * overrides a stale persisted result when the live (playing-handicap net)
 * scores disagree, while a `manual_result: true` sub-match still honours its
 * persisted result outright.
 */

import { finalizePairResults } from '@/services/rounds/finalizePairResults';
import * as roundResultsService from '@/services/rounds/roundResultsService';
import * as teamQueries from '@/services/teams/teamQueries';
import type { Hole, Scorecard, SubMatch, TeamWithMembers } from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

// Singles match-play round: pair_points win/loss are worth 2 so 3 wins vs 1
// win (the stale, persisted tally) reads as an easy-to-eyeball 6-2, and the
// live-corrected 2 wins vs 2 wins reads as 4-4.
const OVERRIDE: RoundRulesOverride = {
  template_id: 'qualifying_match_play',
  team_aggregation: 'pairs_better_ball',
  pair_points: { win: 2, tie: 1, loss: 0 },
};

const HOLES: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 },
  { number: 2, par: 4, strokeIndex: 2 },
  { number: 3, par: 4, strokeIndex: 3 },
];

function subMatch(overrides: Partial<SubMatch>): SubMatch {
  return {
    id: 'sm-' + Math.random().toString(36).slice(2, 8),
    round_id: 'round-1',
    sort_order: 0,
    team_a_player_ids: [],
    team_b_player_ids: [],
    tee_time: null,
    pairing_id: null,
    status: 'completed',
    result: 'a-wins',
    final_differential: null,
    final_holes_remaining: null,
    manual_result: false,
    team_a_net_total: null,
    team_b_net_total: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function member(playerId: string): TeamWithMembers['members'][number] {
  return {
    team_id: '',
    player_id: playerId,
    joined_at: '',
    player: { id: playerId, name: playerId, handicap: 0 } as unknown as TeamWithMembers['members'][number]['player'],
  };
}

/** Like `member`, but with a custom (non-zero) profile handicap. */
function memberHc(playerId: string, handicap: number): TeamWithMembers['members'][number] {
  return {
    team_id: '',
    player_id: playerId,
    joined_at: '',
    player: { id: playerId, name: playerId, handicap } as unknown as TeamWithMembers['members'][number]['player'],
  };
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

/** A completed scorecard where the player shoots `strokes` gross on every hole. */
function card(playerId: string, strokes: number): Scorecard {
  const scores: Scorecard['scores'] = {};
  for (const h of HOLES) scores[String(h.number)] = { strokes };
  return {
    id: 'sc-' + playerId,
    round_id: 'round-1',
    player_id: playerId,
    scores,
    total_gross: strokes * HOLES.length,
    total_net: strokes * HOLES.length,
    total_points: 0,
    ball_totals: null,
    status: 'completed',
    submitted_at: null,
    submitted_by: null,
    device_id: null,
    synced_at: null,
    ga_handicap_used: null,
    daily_handicap_used: 0,
    handicap_differential: null,
    course_rating_used: null,
    slope_rating_used: null,
    created_at: '',
    updated_at: '',
  } as unknown as Scorecard;
}

describe('finalizePairResults — match-play recompute', () => {
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    saveSpy = jest.spyOn(roundResultsService, 'saveRoundResults').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('recomputes from live scores, overriding a stale persisted result (6-2 stale -> 4-4 live)', async () => {
    // sm1, sm2: persisted a-wins, live a-wins too (a-side pars, b-side bogeys) — unaffected.
    // sm3: persisted a-wins (STALE), but live scores have the b-side player par
    //      and the a-side player bogey — the live engine flips this to b-wins.
    // sm4: persisted b-wins, live b-wins too (b-side pars, a-side bogeys) — unaffected.
    //
    // Stale tally (what the old persistedOutcome-first logic would award):
    //   team-a wins sm1, sm2, sm3 (3 wins) -> 3*2 = 6
    //   team-b wins sm4 (1 win)             -> 1*2 = 2
    //   => 6-2
    //
    // Live-corrected tally (what the new resolver must award):
    //   team-a wins sm1, sm2 (2 wins)       -> 2*2 = 4
    //   team-b wins sm3, sm4 (2 wins)       -> 2*2 = 4
    //   => 4-4
    const subMatches: SubMatch[] = [
      subMatch({
        sort_order: 0,
        team_a_player_ids: ['a1'],
        team_b_player_ids: ['b1'],
        result: 'a-wins',
      }),
      subMatch({
        sort_order: 1,
        team_a_player_ids: ['a2'],
        team_b_player_ids: ['b2'],
        result: 'a-wins',
      }),
      subMatch({
        sort_order: 2,
        team_a_player_ids: ['a3'],
        team_b_player_ids: ['b3'],
        result: 'a-wins', // stale — live scores below actually favour b3
      }),
      subMatch({
        sort_order: 3,
        team_a_player_ids: ['a4'],
        team_b_player_ids: ['b4'],
        result: 'b-wins',
      }),
    ];

    const scorecards: Scorecard[] = [
      card('a1', 4), // par — a1 wins live (matches persisted)
      card('b1', 5), // bogey
      card('a2', 4), // par — a2 wins live (matches persisted)
      card('b2', 5), // bogey
      card('a3', 5), // bogey — a3 loses live (persisted said a-wins: stale)
      card('b3', 4), // par
      card('a4', 5), // bogey — a4 loses live (matches persisted b-wins)
      card('b4', 4), // par
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
      gameType: 'match-play',
      teams: TEAMS,
      allScorecards: scorecards,
      courseHoles: HOLES,
    });

    expect(count).toBe(2);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(
      rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore])
    );
    expect(byTeam['team-a']).toBe(4);
    expect(byTeam['team-b']).toBe(4);
  });

  it('honours a manual_result override even when live scores disagree', async () => {
    // a1 bogeys, b1 pars on every hole -> live scoring favours b1 outright.
    // But the sub-match carries manual_result: true with a persisted a-wins,
    // which must be honoured over the live recompute (organiser override).
    const subMatches: SubMatch[] = [
      subMatch({
        sort_order: 0,
        team_a_player_ids: ['a1'],
        team_b_player_ids: ['b1'],
        result: 'a-wins',
        manual_result: true,
      }),
    ];

    const scorecards: Scorecard[] = [card('a1', 5), card('b1', 4)];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
      gameType: 'match-play',
      teams: TEAMS,
      allScorecards: scorecards,
      courseHoles: HOLES,
    });

    expect(count).toBe(2);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(
      rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore])
    );
    // manual_result honoured: team-a (a1) wins despite b1's better live scores.
    expect(byTeam['team-a']).toBe(2);
    expect(byTeam['team-b']).toBe(0);
  });
});

describe('finalizePairResults — match-play playing handicaps (net, not scratch)', () => {
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    saveSpy = jest.spyOn(roundResultsService, 'saveRoundResults').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // a1 (hc 0) vs b1 (hc 10): b1 receives 1 stroke on every hole below (all
  // stroke indexes 1-3, all <= 10). Gross: a1 pars every hole (4), b1 bogeys
  // holes 1-2 (5) and pars hole 3 (4).
  //   Scratch/no-handicap read (what the old `?? 0` default would produce):
  //     hole1 a1(4) beats b1(5) -> a; hole2 same -> a; hole3 4 vs 4 -> halved
  //     => team-a wins 2 up.
  //   Correct net read (b1's daily/playing handicap of 10 applied):
  //     hole1 net 4 vs 4 -> halved; hole2 net 4 vs 4 -> halved;
  //     hole3 net 4 vs 3 (b1's par nets a birdie) -> b1/team-b wins
  //     => team-b wins 1 up.
  // The two disagree on the WINNER, so this proves the resolver used the
  // real (non-zero, differing) handicaps rather than defaulting both to 0.
  const HC_TEAMS: TeamWithMembers[] = [
    {
      id: 'team-a',
      competition_id: 'comp-1',
      name: 'Team A',
      color: null,
      created_at: '',
      updated_at: '',
      members: [memberHc('a1', 0)],
    },
    {
      id: 'team-b',
      competition_id: 'comp-1',
      name: 'Team B',
      color: null,
      created_at: '',
      updated_at: '',
      members: [memberHc('b1', 10)],
    },
  ];

  const hcScorecards: Scorecard[] = [card('a1', 4), card('b1', 4)];
  // Override hole-by-hole so b1 bogeys 1-2 and pars hole 3.
  hcScorecards[1].scores = { '1': { strokes: 5 }, '2': { strokes: 5 }, '3': { strokes: 4 } };

  const hcSubMatches: SubMatch[] = [
    subMatch({
      sort_order: 0,
      team_a_player_ids: ['a1'],
      team_b_player_ids: ['b1'],
      result: 'a-wins', // stale/irrelevant — live is decisive (all 3 holes played)
    }),
  ];

  it('applies each player\'s real playing handicap (net result), not a scratch (0) default, when `teams` is supplied directly', async () => {
    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches: hcSubMatches,
      gameType: 'match-play',
      teams: HC_TEAMS,
      allScorecards: hcScorecards,
      courseHoles: HOLES,
    });

    expect(count).toBe(2);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(
      rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore])
    );
    // Net-corrected winner is team-b (b1's handicap flips the outright
    // scratch winner from team-a to team-b).
    expect(byTeam['team-b']).toBe(2);
    expect(byTeam['team-a']).toBe(0);
  });

  it('fetches competition teams for a match-play round even when team1Id/team2Id are already set, so handicaps are never silently 0 (Finding 1 regression)', async () => {
    const getTeamsSpy = jest
      .spyOn(teamQueries, 'getCompetitionTeams')
      .mockResolvedValue(HC_TEAMS);

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      competitionId: 'comp-1',
      rulesOverride: OVERRIDE,
      subMatches: hcSubMatches,
      gameType: 'match-play',
      // `teams` deliberately omitted — this is the exact shape the real
      // caller (refinalizeRoundResults) uses: team1Id/team2Id + competitionId,
      // no pre-fetched `teams`. Before the fix, the teams-fetch condition
      // (`!teams && !(team1Id && team2Id) && competitionId`) skipped the
      // fetch entirely whenever team ids were set, so `teams` stayed
      // undefined and every player's playing handicap fell back to `?? 0`.
      allScorecards: hcScorecards,
      courseHoles: HOLES,
    });

    expect(getTeamsSpy).toHaveBeenCalledWith('comp-1');
    expect(count).toBe(2);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(
      rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore])
    );
    expect(byTeam['team-b']).toBe(2);
    expect(byTeam['team-a']).toBe(0);
  });
});

describe('finalizePairResults — match-play combined-margin bonus uses live holes-up', () => {
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    saveSpy = jest.spyOn(roundResultsService, 'saveRoundResults').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // a3 (hc 0) vs b3 (hc 10), same handicap-driven partial flip as the earlier
  // "playing handicaps" fixture: b3 receives 1 stroke on every hole (all
  // stroke indexes 1-3, all <= 10). a3 pars every hole (4); b3 bogeys holes
  // 1-2 (5, net 4 — halved) and pars hole 3 (4, net 3 — b3 wins). Live result:
  // team-b wins 1 up. The sub-match's PERSISTED final_differential is a stale
  // 3 (as if it had closed out 3 up) attached to a persisted 'a-wins' — both
  // the wrong side AND the wrong magnitude versus the live 1-up result.
  const BONUS_TEAMS: TeamWithMembers[] = [
    {
      id: 'team-a',
      competition_id: 'comp-1',
      name: 'Team A',
      color: null,
      created_at: '',
      updated_at: '',
      members: [memberHc('a3', 0)],
    },
    {
      id: 'team-b',
      competition_id: 'comp-1',
      name: 'Team B',
      color: null,
      created_at: '',
      updated_at: '',
      members: [memberHc('b3', 10)],
    },
  ];

  it('derives the bonus margin from the live recomputed outcome, not a stale persisted final_differential', async () => {
    const subMatches: SubMatch[] = [
      subMatch({
        sort_order: 0,
        team_a_player_ids: ['a3'],
        team_b_player_ids: ['b3'],
        result: 'a-wins',
        final_differential: 3, // stale: wrong side AND wrong magnitude
      }),
    ];

    const scorecards: Scorecard[] = [card('a3', 4)];
    const b3Card = card('b3', 4);
    b3Card.scores = { '1': { strokes: 5 }, '2': { strokes: 5 }, '3': { strokes: 4 } };
    scorecards.push(b3Card);

    const OVERRIDE_WITH_BONUS: RoundRulesOverride = {
      ...OVERRIDE,
      bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
    };

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE_WITH_BONUS,
      subMatches,
      gameType: 'match-play',
      teams: BONUS_TEAMS,
      allScorecards: scorecards,
      courseHoles: HOLES,
    });

    expect(count).toBe(2);
    const [, rows] = saveSpy.mock.calls[0];
    const marginByTeam = Object.fromEntries(
      rows.map((r: { teamId: string; rawResultData: { net_margin?: number } }) => [
        r.teamId,
        r.rawResultData.net_margin,
      ])
    );
    // Live-corrected: team-b wins the sub-match 1 up (not the stale 3),
    // so team-b's net margin is +1 and team-a's is -1 — the persisted
    // final_differential of 3 must NOT leak into the bonus magnitude.
    expect(marginByTeam['team-b']).toBe(1);
    expect(marginByTeam['team-a']).toBe(-1);
  });
});
