/**
 * Wolf display summary. buildWolfGameSummary is the body of useWolfSummary's
 * memo, extracted unchanged, plus an optional last-played-hole cut for rounds
 * ended early.
 */
import { buildWolfGameSummary, filterDecisionsThroughHole } from '../wolf';
import type {
  WolfDecisionWithDetails,
  WolfGameWithParticipants,
  WolfParticipant,
} from '@/types/database/wolf.types';

const PLAYERS: WolfParticipant[] = [
  { id: 'p1', name: 'Sam', handicap: 10 },
  { id: 'p2', name: 'Bob', handicap: 12 },
  { id: 'p3', name: 'Ann', handicap: 8 },
];

function game(overrides: Partial<WolfGameWithParticipants> = {}): WolfGameWithParticipants {
  return {
    id: 'w1',
    round_id: 'r1',
    participant_ids: ['p1', 'p2', 'p3'],
    wolf_order: ['p1', 'p2', 'p3'],
    scoring_type: 'gross',
    blind_wolf_enabled: false,
    pot_enabled: false,
    pot_value_per_point: null,
    currency: 'AUD',
    status: 'active',
    disclaimer_accepted_at: null,
    disclaimer_accepted_by: null,
    created_by: 'p1',
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    completed_at: null,
    participants: PLAYERS,
    ...overrides,
  };
}

/** A decided decision on `hole` awarding `points` (calculated unless told otherwise). */
function decision(
  hole: number,
  points: Record<string, number>,
  calculated = true
): WolfDecisionWithDetails {
  return {
    id: `d${hole}`,
    wolf_game_id: 'w1',
    hole_number: hole,
    wolf_id: 'p1',
    is_blind_wolf: false,
    partner_id: null,
    hole_scores: null,
    is_tie: false,
    wolf_team_won: true,
    points_awarded: points,
    decided_at: '2026-10-07T00:00:00Z',
    calculated_at: calculated ? '2026-10-07T00:00:00Z' : null,
    wolf: PLAYERS[0],
    partner: null,
  };
}

const ranks = (s: ReturnType<typeof buildWolfGameSummary>) =>
  s.standings.map((e) => [e.player_id, e.total_points, e.rank]);

describe('filterDecisionsThroughHole', () => {
  const decisions = [decision(10, {}), decision(15, {}), decision(16, {})];

  it('returns the decisions unchanged when there is no cut', () => {
    expect(filterDecisionsThroughHole(decisions, null)).toBe(decisions);
    expect(filterDecisionsThroughHole(decisions, undefined)).toBe(decisions);
  });

  it('keeps holes up to and including the last played hole (back 9 ended after 6 ⇒ 15)', () => {
    expect(filterDecisionsThroughHole(decisions, 15).map((d) => d.hole_number)).toEqual([10, 15]);
  });
});

describe('buildWolfGameSummary', () => {
  it('ranks standings and counts holes like useWolfSummary did (characterization)', () => {
    const s = buildWolfGameSummary(
      game(),
      [
        decision(1, { p1: 4, p2: 0, p3: 0 }),
        decision(2, { p1: 0, p2: 2, p3: 2 }),
        decision(3, {}, false),
      ],
      []
    );

    // p1 4, p2 2, p3 2 ⇒ ranks 1, 2, 2. Calculated: holes 1–2. Decided: holes 1–3.
    expect(ranks(s)).toEqual([
      ['p1', 4, 1],
      ['p2', 2, 2],
      ['p3', 2, 2],
    ]);
    expect(s.holes_completed).toBe(2);
    expect(s.holes_decided).toBe(3);
    expect(s.decisions).toHaveLength(3);
  });

  it('adds zero-sum net results when a per-point pot is enabled', () => {
    // 6 points over 3 players ⇒ average 2: p1 +2, p2 −1, p3 −1 at $1/pt.
    const s = buildWolfGameSummary(
      game({ pot_enabled: true, pot_value_per_point: 1 }),
      [decision(1, { p1: 4, p2: 1, p3: 1 })],
      []
    );

    expect(s.standings.map((e) => [e.player_id, e.net_result])).toEqual([
      ['p1', 2],
      ['p2', -1],
      ['p3', -1],
    ]);
  });

  it('ignores decisions after the last played hole of a round ended early', () => {
    const s = buildWolfGameSummary(
      game(),
      [
        decision(10, { p1: 2, p2: 0, p3: 0 }),
        decision(15, { p1: 0, p2: 0, p3: 2 }),
        decision(16, { p1: 0, p2: 9, p3: 0 }), // after the end — must not count
      ],
      [],
      15
    );

    // p1 2, p3 2, p2 0 ⇒ ranks 1, 1, 3.
    expect(s.decisions.map((d) => d.hole_number)).toEqual([10, 15]);
    expect(s.holes_completed).toBe(2);
    expect(ranks(s)).toEqual([
      ['p1', 2, 1],
      ['p3', 2, 1],
      ['p2', 0, 3],
    ]);
  });
});

describe('summary extraction compatibility', () => {
  it('keeps input identity and zero-point/tied/Unknown players while omitting pot results', () => {
    const g = game({
      participants: PLAYERS.slice(0, 2),
      participant_ids: ['p1', 'p2', 'p3', 'p4'],
    });
    const decisions = [
      decision(1, { p1: 4 }),
      decision(2, { p2: 2, p3: 2 }),
      decision(3, {}, false),
      { ...decision(4, {}), decided_at: null },
    ];
    const payouts = [
      {
        id: 'pay1',
        wolf_game_id: 'w1',
        player_id: 'p1',
        total_points: 99,
        total_winnings: 99,
        net_result: 66,
        calculated_at: '2026-10-07T00:00:00Z',
        player: { id: 'p1', name: 'Sam' },
      },
    ];
    const summary = buildWolfGameSummary(g, decisions, payouts);
    expect(summary.game).toBe(g);
    expect(summary.decisions).toBe(decisions);
    expect(summary.payouts).toBe(payouts);
    expect(summary.standings).toEqual([
      { player_id: 'p1', name: 'Sam', total_points: 4, rank: 1 },
      { player_id: 'p2', name: 'Bob', total_points: 2, rank: 2 },
      { player_id: 'p3', name: 'Unknown', total_points: 2, rank: 2 },
      { player_id: 'p4', name: 'Unknown', total_points: 0, rank: 4 },
    ]);
    expect([summary.holes_completed, summary.holes_decided]).toEqual([3, 3]);
  });

  it('cuts without mutating the shared array or decisions and keeps stored payouts', () => {
    const decisions = [decision(16, { p2: 9 }), decision(10, { p1: 2 }), decision(15, { p3: 2 })];
    const original = JSON.parse(JSON.stringify(decisions));
    const payouts = [
      {
        id: 'pay1',
        wolf_game_id: 'w1',
        player_id: 'p1',
        total_points: 99,
        total_winnings: 99,
        net_result: 66,
        calculated_at: '2026-10-07T00:00:00Z',
        player: { id: 'p1', name: 'Sam' },
      },
    ];
    const summary = buildWolfGameSummary(
      game({ pot_enabled: true, pot_value_per_point: 1 }),
      decisions,
      payouts,
      15
    );
    expect(summary.decisions).toEqual([decisions[1], decisions[2]]);
    expect(summary.decisions[0]).toBe(decisions[1]);
    expect(decisions).toEqual(original);
    expect(summary.payouts).toBe(payouts);
    expect(summary.payouts[0].net_result).toBe(66);
    expect(summary.standings.map((e) => e.net_result)).toEqual([0.67, 0.67, -1.33]);
  });

  it('keeps all participants tied at zero when there are no decisions', () => {
    expect(ranks(buildWolfGameSummary(game(), [], []))).toEqual([
      ['p1', 0, 1],
      ['p2', 0, 1],
      ['p3', 0, 1],
    ]);
  });

  it('omits net results when an enabled pot has zero value', () => {
    expect(
      buildWolfGameSummary(
        game({ pot_enabled: true, pot_value_per_point: 0 }),
        [],
        []
      ).standings.every((e) => !Object.prototype.hasOwnProperty.call(e, 'net_result'))
    ).toBe(true);
  });
});

it('builds an empty summary when the participant roster is empty', () => {
  const summary = buildWolfGameSummary(
    game({ participant_ids: [], participants: [], wolf_order: [] }),
    [],
    []
  );
  expect(summary.standings).toEqual([]);
  expect([summary.holes_completed, summary.holes_decided]).toEqual([0, 0]);
});
