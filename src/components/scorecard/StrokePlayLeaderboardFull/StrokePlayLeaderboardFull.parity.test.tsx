/**
 * Regression: the stroke-play leaderboard must compute NET off the round's
 * DAILY handicap (matching the scorecard), not the raw profile index, and must
 * treat pickups as WHS net double bogey (like the scorecard) — not double par.
 *
 * Pins the leaderboard's gross/net relative-to-par to calculatePlayerStats
 * (totalGross/totalNet) for the same completed 18-hole round.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { StrokePlayLeaderboardFull } from './StrokePlayLeaderboardFull';
import { buildDailyHandicapMap } from '@/utils/leaderboardHandicaps';
import { calculatePlayerStats } from '@/utils/scorecardCalculations';
import type { ScorecardPlayerData } from '@/utils/scorecardCalculations';
import type { Player, Hole, HoleScore, TeeBox } from '@/types';

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`,
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
})) as unknown as Hole[];
const COURSE_PAR = 72;

const TEE: TeeBox = { slopeRating: 132, courseRating: 73.1 } as unknown as TeeBox;
const GA_HANDICAP = 18;

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

const fmt = (value: number): string => (value === 0 ? 'E' : value > 0 ? `+${value}` : `${value}`);

function expectedTotals(): { gross: number; net: number } {
  const playerData: ScorecardPlayerData = {
    id: 'p1',
    playerId: 'p1',
    player: { id: 'p1', name: 'Test Player', handicap: GA_HANDICAP, gender: 'male' },
    scores,
    hasScorecard: true,
  };
  const [stats] = calculatePlayerStats([playerData], HOLES, TEE, 'profile');
  return { gross: stats.totalGross, net: stats.totalNet };
}

describe('StrokePlayLeaderboardFull — parity with scorecard', () => {
  const getPlayerScore = (playerId: string, holeNumber: number) =>
    playerId === 'p1' ? scores[String(holeNumber)] : undefined;

  it('shows gross and net relative-to-par matching calculatePlayerStats (daily handicap)', () => {
    const { gross, net } = expectedTotals();
    const dailyHandicaps = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: GA_HANDICAP, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );

    render(
      <StrokePlayLeaderboardFull
        players={[player]}
        holes={HOLES}
        getPlayerScore={getPlayerScore}
        dailyHandicaps={dailyHandicaps}
      />
    );

    // Net is the default sort; both gross and net relative-to-par render.
    expect(screen.getByText(fmt(gross - COURSE_PAR))).toBeTruthy();
    expect(screen.getByText(fmt(net - COURSE_PAR))).toBeTruthy();
  });

  it('daily handicap differs from the raw index on this tee (guards the fix)', () => {
    const map = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: GA_HANDICAP, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );
    expect(map.p1).not.toBe(GA_HANDICAP);
  });
});
