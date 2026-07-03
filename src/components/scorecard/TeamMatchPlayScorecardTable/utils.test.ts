import { calculateTeamMatchData } from './utils';
import type { Hole } from '@/types/database.types';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

// Divergence hole. Match handicaps: P1=5, P2=20 (team1); P3=10, P4=12 (team2).
// Lowest in match = 5 (P1). At stroke index 3, grosses P1=5, P2=6, P3=5, P4=6:
//   Old (each off own full handicap): every player gets 1 stroke at SI 3, so
//     team1 best net = 4 (P1 5-1), team2 best net = 4 (P3 5-1) -> HALVED.
//   New (relative to lowest 5): P1 diff 0 -> 0 strokes (net 5); P2 diff 15 -> 1
//     (net 5); P3 diff 5 -> 1 (net 4); P4 diff 7 -> 1 (net 5). team1 best = 5,
//     team2 best = 4 -> TEAM 2 wins the hole (winner 'player2').
const hole: Hole = { number: 1, par: 4, strokeIndex: 3 };
const holes: Hole[] = [hole];

const team1: MatchTeam = {
  id: 't1',
  name: 'Team 1',
  handicap: 0,
  members: [
    { id: 'p1', name: 'P1', handicap: 5, score: null, pickedUp: false },
    { id: 'p2', name: 'P2', handicap: 20, score: null, pickedUp: false },
  ],
};
const team2: MatchTeam = {
  id: 't2',
  name: 'Team 2',
  handicap: 0,
  members: [
    { id: 'p3', name: 'P3', handicap: 10, score: null, pickedUp: false },
    { id: 'p4', name: 'P4', handicap: 12, score: null, pickedUp: false },
  ],
};

const grosses: Record<string, number> = { p1: 5, p2: 6, p3: 5, p4: 6 };
const getPlayerScore = (playerId: string, _holeNumber: number): number | undefined =>
  grosses[playerId];

describe('calculateTeamMatchData — relative-to-lowest allocation', () => {
  it('gives the divergence hole to team 2 (would be halved under full handicaps)', () => {
    const data = calculateTeamMatchData(holes, team1, team2, getPlayerScore);
    expect(data.holeResults[1].winner).toBe('player2');
  });
});
