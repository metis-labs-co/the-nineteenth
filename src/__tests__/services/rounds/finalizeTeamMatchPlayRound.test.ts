/**
 * finalizeTeamMatchPlayRound tests
 *
 * Covers combined Team Match Play finalization. The helper derives a hole-
 * by-hole best-ball net comparison between two teams from raw scorecards
 * and writes one team row per side to round_results.
 */

import {
  finalizeTeamMatchPlayRound,
  isCombinedTeamMatchPlay,
} from '@/services/rounds/finalizeTeamMatchPlayRound';
import * as roundResultsService from '@/services/rounds/roundResultsService';
import type {
  Hole,
  Scorecard,
  TeamWithMembers,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

// Two teams of 2 — keeps numbers easy to reason about.
const TEAM_A: TeamWithMembers = {
  id: 'team-a',
  competition_id: 'comp-1',
  name: 'Team A',
  color: null,
  created_at: '',
  updated_at: '',
  members: [
    { team_id: 'team-a', player_id: 'alice', joined_at: '', player: undefined },
    { team_id: 'team-a', player_id: 'bob', joined_at: '', player: undefined },
  ],
};

const TEAM_B: TeamWithMembers = {
  id: 'team-b',
  competition_id: 'comp-1',
  name: 'Team B',
  color: null,
  created_at: '',
  updated_at: '',
  members: [
    { team_id: 'team-b', player_id: 'cam', joined_at: '', player: undefined },
    { team_id: 'team-b', player_id: 'dee', joined_at: '', player: undefined },
  ],
};

// 18-hole par-72 course. Stroke index 1..18 in hole order — keeps net/gross
// math simple (handicap 0 → strokes received per hole = 0; net = gross).
function buildHoles(): Hole[] {
  const holes: Hole[] = [];
  for (let i = 1; i <= 18; i++) {
    holes.push({
      number: i as Hole['number'],
      par: 4,
      strokeIndex: i,
    });
  }
  return holes;
}

const HOLES = buildHoles();

/** Build a completed scorecard with a constant strokes value across 18 holes. */
function scorecard(playerId: string, strokesPerHole: number, dailyHc = 0): Scorecard {
  const scores: Record<string, { strokes: number }> = {};
  for (let i = 1; i <= 18; i++) {
    scores[String(i)] = { strokes: strokesPerHole };
  }
  return {
    id: `sc-${playerId}`,
    round_id: 'round-1',
    player_id: playerId,
    scores,
    total_gross: strokesPerHole * 18,
    total_net: strokesPerHole * 18 - dailyHc,
    total_points: 0,
    ball_totals: null,
    status: 'completed',
    submitted_at: '',
    submitted_by: null,
    device_id: null,
    synced_at: '',
    ga_handicap_used: dailyHc,
    daily_handicap_used: dailyHc,
    handicap_differential: null,
    course_rating_used: null,
    slope_rating_used: null,
    created_at: '',
    updated_at: '',
  };
}

/** Build a scorecard with explicit per-hole gross strokes. */
function scorecardWithHoles(
  playerId: string,
  perHole: number[],
  dailyHc = 0
): Scorecard {
  const scores: Record<string, { strokes: number }> = {};
  perHole.forEach((s, idx) => {
    scores[String(idx + 1)] = { strokes: s };
  });
  return {
    id: `sc-${playerId}`,
    round_id: 'round-1',
    player_id: playerId,
    scores,
    total_gross: perHole.reduce((a, b) => a + b, 0),
    total_net: perHole.reduce((a, b) => a + b, 0) - dailyHc,
    total_points: 0,
    ball_totals: null,
    status: 'completed',
    submitted_at: '',
    submitted_by: null,
    device_id: null,
    synced_at: '',
    ga_handicap_used: dailyHc,
    daily_handicap_used: dailyHc,
    handicap_differential: null,
    course_rating_used: null,
    slope_rating_used: null,
    created_at: '',
    updated_at: '',
  };
}

describe('isCombinedTeamMatchPlay', () => {
  it('matches combined match-play with team_format=match-play-team', () => {
    expect(isCombinedTeamMatchPlay('match-play', 'match-play-team', 'combined')).toBe(true);
  });

  it('rejects split rounds (those go through finalizePairResults)', () => {
    expect(isCombinedTeamMatchPlay('match-play', 'match-play-team', 'split')).toBe(false);
  });

  it('rejects individual match play (no team_format)', () => {
    expect(isCombinedTeamMatchPlay('match-play', null, 'combined')).toBe(false);
  });

  it('rejects non-match-play game types', () => {
    expect(isCombinedTeamMatchPlay('stableford', 'match-play-team', 'combined')).toBe(false);
  });
});

describe('finalizeTeamMatchPlayRound', () => {
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    saveSpy = jest
      .spyOn(roundResultsService, 'saveRoundResults')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseInput = {
    roundId: 'round-1',
    competitionId: 'comp-1',
    teams: [TEAM_A, TEAM_B],
    courseHoles: HOLES,
    team1Id: 'team-a',
    team2Id: 'team-b',
  };

  it('writes 2 team rows with default 1/0.5/0 points when team_points is not set', async () => {
    // Team A players score 4 every hole, Team B 5 every hole.
    // Best-ball: Team A best per hole = 4, Team B best per hole = 5.
    // Team A wins every hole → match ends at dormie or earlier (10&8 expected).
    const scorecards = [
      scorecard('alice', 4),
      scorecard('bob', 4),
      scorecard('cam', 5),
      scorecard('dee', 5),
    ];

    const count = await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: null,
    });

    expect(count).toBe(2);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(
      rows.map((r: { teamId: string; competitionPoints: number; position: number; rawResultData: { match_result: string } }) => [
        r.teamId,
        r,
      ])
    );
    expect(byTeam['team-a'].competitionPoints).toBe(1);
    expect(byTeam['team-b'].competitionPoints).toBe(0);
    expect(byTeam['team-a'].position).toBe(1);
    expect(byTeam['team-b'].position).toBe(2);
    expect(byTeam['team-a'].rawResultData.match_result).toBe('win');
    expect(byTeam['team-b'].rawResultData.match_result).toBe('loss');
  });

  it('uses custom team_points from rules_override', async () => {
    const override: RoundRulesOverride = {
      team_points: { win: 3, tie: 1.5, loss: 0 },
      contributes_to_team_leaderboard: true,
    };

    const scorecards = [
      scorecard('alice', 4),
      scorecard('bob', 4),
      scorecard('cam', 5),
      scorecard('dee', 5),
    ];

    await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: override,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    const b = rows.find((r: { teamId: string }) => r.teamId === 'team-b');
    expect(a.competitionPoints).toBe(3);
    expect(b.competitionPoints).toBe(0);
  });

  it('best-ball: takes each team\'s lowest net per hole', async () => {
    // Hole 1: Alice 4, Bob 6, Cam 5, Dee 5. Best A=4, Best B=5 → A wins.
    // Hole 2: Alice 5, Bob 4, Cam 4, Dee 5. Best A=4, Best B=4 → halved.
    // Holes 3-18: all 5s on both sides → all halved.
    const aliceHoles = [4, 5, ...Array(16).fill(5)];
    const bobHoles = [6, 4, ...Array(16).fill(5)];
    const camHoles = [5, 4, ...Array(16).fill(5)];
    const deeHoles = [5, 5, ...Array(16).fill(5)];

    const scorecards = [
      scorecardWithHoles('alice', aliceHoles),
      scorecardWithHoles('bob', bobHoles),
      scorecardWithHoles('cam', camHoles),
      scorecardWithHoles('dee', deeHoles),
    ];

    await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: null,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    const b = rows.find((r: { teamId: string }) => r.teamId === 'team-b');
    expect(a.rawResultData.holes_won).toBe(1);
    expect(a.rawResultData.holes_lost).toBe(0);
    expect(a.rawResultData.holes_halved).toBe(17);
    expect(a.rawResultData.match_result).toBe('win');
    expect(b.rawResultData.match_result).toBe('loss');
  });

  it('halves the match when both teams win the same number of holes', async () => {
    // Hole 1: A wins. Hole 2: B wins. Holes 3-18: halved → match all square.
    const aliceHoles = [4, 5, ...Array(16).fill(5)];
    const bobHoles = [4, 5, ...Array(16).fill(5)];
    const camHoles = [5, 4, ...Array(16).fill(5)];
    const deeHoles = [5, 4, ...Array(16).fill(5)];

    const scorecards = [
      scorecardWithHoles('alice', aliceHoles),
      scorecardWithHoles('bob', bobHoles),
      scorecardWithHoles('cam', camHoles),
      scorecardWithHoles('dee', deeHoles),
    ];

    await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: null,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    const b = rows.find((r: { teamId: string }) => r.teamId === 'team-b');
    expect(a.competitionPoints).toBe(0.5);
    expect(b.competitionPoints).toBe(0.5);
    expect(a.position).toBe(1);
    expect(b.position).toBe(1);
    expect(a.rawResultData.match_result).toBe('halved');
    expect(b.rawResultData.match_result).toBe('halved');
  });

  it('zeroes competition points when contributes_to_team_leaderboard=false', async () => {
    const override: RoundRulesOverride = {
      team_points: { win: 1, tie: 0.5, loss: 0 },
      contributes_to_team_leaderboard: false,
    };

    const scorecards = [
      scorecard('alice', 4),
      scorecard('bob', 4),
      scorecard('cam', 5),
      scorecard('dee', 5),
    ];

    await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: override,
    });

    const rows = saveSpy.mock.calls[0][1];
    expect(rows.every((r: { competitionPoints: number }) => r.competitionPoints === 0)).toBe(true);
    // Position is still meaningful even when points are zeroed.
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    expect(a.position).toBe(1);
  });

  it('drops the override entirely when perRoundRulesEnabled=false (default points still apply)', async () => {
    const override: RoundRulesOverride = {
      team_points: { win: 5, tie: 2, loss: 0 },
    };

    const scorecards = [
      scorecard('alice', 4),
      scorecard('bob', 4),
      scorecard('cam', 5),
      scorecard('dee', 5),
    ];

    await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: override,
      perRoundRulesEnabled: false,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    const b = rows.find((r: { teamId: string }) => r.teamId === 'team-b');
    // Override dropped → falls back to default 1/0.5/0
    expect(a.competitionPoints).toBe(1);
    expect(b.competitionPoints).toBe(0);
  });

  it('falls back to first two teams when team1Id/team2Id are null and only 2 teams exist', async () => {
    const scorecards = [
      scorecard('alice', 4),
      scorecard('bob', 4),
      scorecard('cam', 5),
      scorecard('dee', 5),
    ];

    const count = await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: null,
      team1Id: null,
      team2Id: null,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const teamIds = new Set(rows.map((r: { teamId: string }) => r.teamId));
    expect(teamIds.has('team-a')).toBe(true);
    expect(teamIds.has('team-b')).toBe(true);
  });

  it('no-ops when team1Id/team2Id are null and 3+ teams exist (ambiguous matchup)', async () => {
    const teamC: TeamWithMembers = {
      ...TEAM_A,
      id: 'team-c',
      name: 'Team C',
      members: [
        { team_id: 'team-c', player_id: 'ed', joined_at: '', player: undefined },
        { team_id: 'team-c', player_id: 'flo', joined_at: '', player: undefined },
      ],
    };

    const count = await finalizeTeamMatchPlayRound({
      ...baseInput,
      teams: [TEAM_A, TEAM_B, teamC],
      scorecards: [scorecard('alice', 4), scorecard('cam', 5)],
      rulesOverride: null,
      team1Id: null,
      team2Id: null,
    });

    expect(count).toBe(0);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('no-ops when one side has no scorecards', async () => {
    const count = await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards: [scorecard('alice', 4), scorecard('bob', 4)],
      rulesOverride: null,
    });
    expect(count).toBe(0);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('applies handicap strokes per hole via daily_handicap_used', async () => {
    // Bob has dailyHandicap=18 → 1 stroke received on every hole.
    // Bob's gross 5 → net 4 every hole.
    // Alice's gross 5 → net 5.
    // Team A best per hole = 4 (Bob's net).
    // Team B players gross 5, no handicap → net 5.
    // → Team A wins every hole.
    const scorecards = [
      scorecard('alice', 5, 0),
      scorecard('bob', 5, 18),
      scorecard('cam', 5, 0),
      scorecard('dee', 5, 0),
    ];

    await finalizeTeamMatchPlayRound({
      ...baseInput,
      scorecards,
      rulesOverride: null,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    expect(a.rawResultData.match_result).toBe('win');
    expect(a.rawResultData.holes_won).toBe(18);
  });
});
