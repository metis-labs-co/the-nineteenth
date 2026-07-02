/**
 * Regression: the Par-game leaderboard must score off the round's DAILY
 * handicap (matching the scorecard), not the raw profile handicap.
 *
 * Pins the leaderboard's total to `calculatePlayerStats().totalParScore` — the
 * exact value the scorecard shows — for the same in-progress scores.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { ParLeaderboardFull } from './ParLeaderboardFull';
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

const formatPoints = (value: number): string =>
  value === 0 ? 'E' : value > 0 ? `+${value}` : `${value}`;

function expectedScorecardParScore(): number {
  const playerData: ScorecardPlayerData = {
    id: 'p1',
    playerId: 'p1',
    player: { id: 'p1', name: 'Test Player', handicap: GA_HANDICAP, gender: 'male' },
    scores,
    hasScorecard: true,
  };
  const [stats] = calculatePlayerStats([playerData], HOLES, TEE, 'profile');
  return stats.totalParScore;
}

describe('ParLeaderboardFull — parity with scorecard', () => {
  const getPlayerScore = (playerId: string, holeNumber: number) =>
    playerId === 'p1' ? scores[String(holeNumber)] : undefined;

  it('matches calculatePlayerStats totalParScore using the daily handicap', () => {
    const expected = expectedScorecardParScore();
    const dailyHandicaps = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: GA_HANDICAP, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );

    render(
      <ParLeaderboardFull
        players={[player]}
        holes={HOLES}
        getPlayerScore={getPlayerScore}
        dailyHandicaps={dailyHandicaps}
      />
    );

    // Points render as +N / E / -N.
    expect(screen.getAllByText(formatPoints(expected)).length).toBeGreaterThan(0);
  });
});
