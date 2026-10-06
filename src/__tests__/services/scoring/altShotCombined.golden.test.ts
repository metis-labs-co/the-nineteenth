/**
 * CHARACTERIZATION TEST — Alt Shot (foursomes) combined-round finalize (I6)
 *
 * Locks the current behaviour of the combined (non-split) alt-shot finalize
 * path: `ROUND_ENGINES['alt-shot'].pickTeamRawScore`, the real entry point
 * `refinalizeRoundResults` calls for a 'team-only' shaped alt-shot round
 * (see src/services/rounds/resultsEngine.ts). Each team plays one ball off
 * its OWN 50%-combined member handicap (`computeAltShotTeamRoundScore` in
 * src/utils/teamScoring/altShot.ts), and the round ranks teams net-lowest
 * (`betterDirection: 'lower'` on the ALT_SHOT spec).
 *
 * This is a golden/characterization test: it does not assert a spec, it
 * freezes today's observed output so a future change to this math shows up
 * as a loud, deliberate diff instead of a silent regression. See
 * docs/guides/scoring-invariant-coverage.md (I6).
 *
 * Fixture style (course/scorecard shape) borrowed from
 * src/__tests__/services/scoring/StablefordEngine.test.ts. Values were
 * observed by running these fixtures through the real entry point once
 * (temporary console.log, since removed) and freezing the printed result as
 * literals below.
 */

import { ROUND_ENGINES, type EngineTeamMember } from '@/services/rounds/resultsEngine';
import type { Scorecard } from '@/types/database/scorecard.types';

const altShotEngine = ROUND_ENGINES['alt-shot'];

/** Minimal valid Scorecard fixture — only the fields computeAltShotTeamRoundScore reads matter. */
function baseScorecard(overrides: Partial<Scorecard> & { player_id: string }): Scorecard {
  return {
    id: `sc-${overrides.player_id}`,
    round_id: 'round-1',
    scores: {},
    total_gross: 0,
    total_net: 0,
    total_points: 0,
    ball_totals: null,
    status: 'completed',
    submitted_at: new Date().toISOString(),
    submitted_by: null,
    device_id: null,
    synced_at: null,
    ga_handicap_used: null,
    daily_handicap_used: null,
    handicap_differential: null,
    course_rating_used: null,
    slope_rating_used: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Scorecard;
}

describe('ALT_SHOT.pickTeamRawScore — combined alt-shot own-50%-handicap net-lowest (I6, golden)', () => {
  it('nets a team off its own 50%-combined handicap, reading gross from total_gross', () => {
    // p1 hc 9, p2 hc 11 → 50%-combined = 10. One ball recorded via total_gross = 85.
    const members: EngineTeamMember[] = [
      { player_id: 'p1', handicap: 9 },
      { player_id: 'p2', handicap: 11 },
    ];
    const teamScorecards = [
      baseScorecard({ player_id: 'p1', daily_handicap_used: 9, total_gross: 85 }),
      baseScorecard({ player_id: 'p2', daily_handicap_used: 11, total_gross: 0 }),
    ];

    const result = altShotEngine.pickTeamRawScore(teamScorecards, members);

    expect(result.rawScore).toBe(75); // teamNet = 85 - floor(10) = 75
    expect(result.rawResultData).toEqual({
      team_score: 75,
      gross_score: 85,
      net_score: 75,
      team_handicap: 10,
    });
  });

  it('sums per-hole scores when total_gross is not populated', () => {
    // p1 hc 4, p2 hc 6 → 50%-combined = 5. Per-hole scores sum to 78 (no total_gross).
    const members: EngineTeamMember[] = [
      { player_id: 'p1', handicap: 4 },
      { player_id: 'p2', handicap: 6 },
    ];
    const scores: Record<string, { strokes: number }> = {};
    [5, 4, 5, 4, 5, 4, 4, 5, 4, 4, 4, 5, 4, 4, 5, 4, 4, 4].forEach((strokes, i) => {
      scores[String(i + 1)] = { strokes };
    });
    const teamScorecards = [
      baseScorecard({ player_id: 'p1', daily_handicap_used: 4, scores, total_gross: 0 }),
    ];

    const result = altShotEngine.pickTeamRawScore(teamScorecards, members);

    expect(result.rawScore).toBe(73); // teamGross 78 (per-hole sum) - floor(5) = 73
    expect(result.rawResultData).toEqual({
      team_score: 73,
      gross_score: 78,
      net_score: 73,
      team_handicap: 5,
    });
  });

  it('ranks two teams net-lowest: the lower-handicap team here wins on net despite a lower gross allowance', () => {
    const teamX: EngineTeamMember[] = [
      { player_id: 'x1', handicap: 9 },
      { player_id: 'x2', handicap: 11 },
    ];
    const teamXCards = [
      baseScorecard({ player_id: 'x1', daily_handicap_used: 9, total_gross: 85 }),
      baseScorecard({ player_id: 'x2', daily_handicap_used: 11, total_gross: 0 }),
    ];

    const teamY: EngineTeamMember[] = [
      { player_id: 'y1', handicap: 4 },
      { player_id: 'y2', handicap: 6 },
    ];
    const teamYCards = [
      baseScorecard({ player_id: 'y1', daily_handicap_used: 4, total_gross: 78 }),
      baseScorecard({ player_id: 'y2', daily_handicap_used: 6, total_gross: 0 }),
    ];

    const resultX = altShotEngine.pickTeamRawScore(teamXCards, teamX);
    const resultY = altShotEngine.pickTeamRawScore(teamYCards, teamY);

    expect(resultX.rawScore).toBe(75); // 85 - floor(10)
    expect(resultY.rawScore).toBe(73); // 78 - floor(5)
    expect(altShotEngine.betterDirection).toBe('lower');
    // Net-lowest wins: team Y's 73 beats team X's 75 even though X's raw
    // handicap allowance (10) is larger than Y's (5).
    expect(resultY.rawScore).toBeLessThan(resultX.rawScore);
  });

  it('floors and caps the handicap allowance at 18 strokes even when the combined handicap exceeds it', () => {
    // p1 hc 20, p2 hc 22 → 50%-combined = 21, but strokes are capped at 18.
    const members: EngineTeamMember[] = [
      { player_id: 'p1', handicap: 20 },
      { player_id: 'p2', handicap: 22 },
    ];
    const teamScorecards = [
      baseScorecard({ player_id: 'p1', daily_handicap_used: 20, total_gross: 100 }),
    ];

    const result = altShotEngine.pickTeamRawScore(teamScorecards, members);

    expect(result.rawResultData.team_handicap).toBe(21);
    expect(result.rawScore).toBe(82); // teamNet = 100 - min(floor(21), 18) = 100 - 18
  });
});
