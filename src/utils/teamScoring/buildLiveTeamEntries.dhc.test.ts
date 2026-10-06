/**
 * Regression: buildLiveTeamEntries (the live team-stroke leaderboard) must
 * score each member off the round's DAILY handicap, not the raw profile index.
 */

import { buildLiveTeamEntries, getBestBallTeamPoints } from './calculations';
import { getStrokesReceived } from '../scoring';
import { calculateStablefordPointsNet } from '../scoring';
import type { TeamWithMembers } from '@/types/database/team.types';
import type { Hole, HoleScore } from '@/types';

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`,
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
})) as unknown as Hole[];

// One-member team so the "team" total equals that member's individual total —
// lets us assert the exact daily-handicap-based value.
const team: TeamWithMembers = {
  id: 'team-1',
  competition_id: 'c1',
  name: 'Team 1',
  color: null,
  created_at: '',
  updated_at: '',
  members: [
    {
      team_id: 'team-1',
      player_id: 'p1',
      joined_at: '',
      player: { id: 'p1', name: 'P1', email: '', handicap: 18, gender: 'male' } as unknown as NonNullable<
        TeamWithMembers['members'][number]['player']
      >,
    },
  ],
};

const GROSS = [4, 5, 6, 3, 4, 7, 5, 4, 6, 4, 5, 4, 8, 3, 4, 5, 6, 5];
const getPlayerScore = (playerId: string, holeNumber: number): HoleScore | undefined =>
  playerId === 'p1' ? ({ strokes: GROSS[holeNumber - 1] } as HoleScore) : undefined;

function expectedStableford(dailyHandicap: number): number {
  let total = 0;
  for (const hole of HOLES) {
    const sr = getStrokesReceived(dailyHandicap, hole.strokeIndex);
    total += calculateStablefordPointsNet(GROSS[hole.number - 1], hole.par, sr);
  }
  return total;
}

describe('buildLiveTeamEntries — daily handicap', () => {
  it('scores members off the provided daily handicap, not the raw index', () => {
    const RAW = 18;
    const DAILY = 22; // deliberately different from the raw index

    const withDaily = buildLiveTeamEntries({
      teams: [team],
      holes: HOLES,
      gameType: 'stableford',
      teamFormat: 'aggregate',
      getPlayerScore,
      dailyHandicaps: { p1: DAILY },
    });
    const withoutMap = buildLiveTeamEntries({
      teams: [team],
      holes: HOLES,
      gameType: 'stableford',
      teamFormat: 'aggregate',
      getPlayerScore,
    });

    const dailyScore =
      withDaily[0].scoreData.type === 'team' ? withDaily[0].scoreData.teamScore : -1;
    const rawScore =
      withoutMap[0].scoreData.type === 'team' ? withoutMap[0].scoreData.teamScore : -1;

    // With the daily handicap map, the team total equals the daily-HC stableford.
    expect(dailyScore).toBe(expectedStableford(DAILY));
    // Without the map it falls back to the raw index — a different total.
    expect(rawScore).toBe(expectedStableford(RAW));
    expect(dailyScore).not.toBe(rawScore);

    // The member's displayed handicap reflects the daily handicap.
    expect(withDaily[0].members[0].handicap).toBe(DAILY);
  });

  it('getBestBallTeamPoints (scorecard team header) also uses the daily handicap', () => {
    const DAILY = 22;
    const withDaily = getBestBallTeamPoints(team, HOLES, getPlayerScore, { p1: DAILY });
    const withoutMap = getBestBallTeamPoints(team, HOLES, getPlayerScore);

    // Single-member team → best-ball total equals that member's stableford.
    expect(withDaily.totalPoints).toBe(expectedStableford(DAILY));
    expect(withoutMap.totalPoints).toBe(expectedStableford(18));
    expect(withDaily.totalPoints).not.toBe(withoutMap.totalPoints);
  });
});
