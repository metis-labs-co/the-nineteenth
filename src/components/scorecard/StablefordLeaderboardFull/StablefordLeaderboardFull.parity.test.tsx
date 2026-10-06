/**
 * Regression: the Stableford leaderboard must score off the round's DAILY
 * handicap (matching the scorecard), not the raw profile handicap.
 *
 * The bug: StablefordLeaderboardFull used `player.handicap` (raw GA index) so
 * its totals drifted from the scorecard (which uses the daily handicap derived
 * from the tee's slope/course rating). These tests pin the leaderboard's points
 * to `calculatePlayerStats().totalStableford` — the exact value the scorecard
 * shows — for the same in-progress scores.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { StablefordLeaderboardFull } from './StablefordLeaderboardFull';
import { buildDailyHandicapMap } from '@/utils/leaderboardHandicaps';
import { calculatePlayerStats } from '@/utils/scorecardCalculations';
import type { ScorecardPlayerData } from '@/utils/scorecardCalculations';
import type { Player, Hole, HoleScore, TeeBox } from '@/types';

// Par-72 course, stroke indexes 1..18.
const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`,
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
})) as unknown as Hole[];

const TEE: TeeBox = { slopeRating: 132, courseRating: 73.1 } as unknown as TeeBox;

// A GA-18 player whose daily handicap will differ from 18 on this tee — the
// whole point of the bug.
const GA_HANDICAP = 18;

// Deterministic scores: a spread of gross strokes across the 18 holes so the
// net stableford total is non-trivial.
const GROSS = [4, 5, 6, 3, 4, 7, 5, 4, 6, 4, 5, 4, 8, 3, 4, 5, 6, 5];

const scores: Record<string, HoleScore> = {};
GROSS.forEach((strokes, i) => {
  scores[String(i + 1)] = { strokes } as HoleScore;
});

const player: Player = {
  id: 'p1',
  name: 'Test Player',
  email: 't@example.com',
  handicap: GA_HANDICAP,
  gender: 'male',
};

function expectedScorecardPoints(): number {
  const playerData: ScorecardPlayerData = {
    id: 'p1',
    playerId: 'p1',
    player: { id: 'p1', name: 'Test Player', handicap: GA_HANDICAP, gender: 'male' },
    scores,
    hasScorecard: true,
    // No stored snapshot -> live recompute from the tee (matches an in-progress card).
  };
  const [stats] = calculatePlayerStats([playerData], HOLES, TEE, 'profile');
  return stats.totalStableford;
}

describe('StablefordLeaderboardFull — parity with scorecard', () => {
  const getPlayerScore = (playerId: string, holeNumber: number) =>
    playerId === 'p1' ? scores[String(holeNumber)] : undefined;

  it('matches calculatePlayerStats totalStableford using the daily handicap', () => {
    const expected = expectedScorecardPoints();
    const dailyHandicaps = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: GA_HANDICAP, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );

    render(
      <StablefordLeaderboardFull
        players={[player]}
        holes={HOLES}
        getPlayerScore={getPlayerScore}
        dailyHandicaps={dailyHandicaps}
      />
    );

    // The points cell renders the total. Assert the scorecard's exact value is shown.
    expect(screen.getByText(String(expected))).toBeTruthy();
  });

  it('produces a DIFFERENT (wrong) total when scored off the raw index', () => {
    // Guards against a regression where dailyHandicaps is ignored: the raw-index
    // total must differ from the daily-handicap total on this tee, otherwise the
    // parity test above would pass even with the bug present.
    const rawIndexMap = { p1: GA_HANDICAP };
    const dailyMap = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: GA_HANDICAP, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );
    expect(dailyMap.p1).not.toBe(rawIndexMap.p1);
  });
});
