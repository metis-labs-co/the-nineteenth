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

describe('calculateTeamMatchData — planned hole count', () => {
  const nine = (first: number): Hole[] =>
    Array.from({ length: 9 }, (_, i) => ({ number: first + i, par: 4, strokeIndex: i + 1 }) as Hole);
  const reds: MatchTeam = {
    id: 'r',
    name: 'Reds',
    handicap: 0,
    members: [{ id: 'r1', name: 'R1', handicap: 0, score: null, pickedUp: false }],
  };
  const blues: MatchTeam = {
    id: 'b',
    name: 'Blues',
    handicap: 0,
    members: [{ id: 'b1', name: 'B1', handicap: 0, score: null, pickedUp: false }],
  };

  /** Reds card 3 on `wonHoles` and 4 elsewhere; Blues card 4 on every scored hole. */
  const scoresFor = (scored: number[], wonHoles: number[]) =>
    (playerId: string, holeNumber: number): number | undefined => {
      if (!scored.includes(holeNumber)) return undefined;
      if (playerId === 'r1') return wonHoles.includes(holeNumber) ? 3 : 4;
      return 4;
    };

  it('finishes a front-9 team match on the 9th: "1 up"', () => {
    const holes = nine(1);
    const data = calculateTeamMatchData(holes, reds, blues, scoresFor(holes.map((h) => h.number), [9]));
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '1 up' });
  });

  it('closes out a back-9 team match against 9 planned holes: "5 & 4"', () => {
    const scored = [10, 11, 12, 13, 14];
    const data = calculateTeamMatchData(nine(10), reds, blues, scoresFor(scored, scored));
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '5 & 4' });
    expect(data.runningStatus[13]).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 4, holesRemaining: 5 });
  });

  it('keeps 18 for an empty hole list, never a finished halved match (characterization)', () => {
    const data = calculateTeamMatchData([], reds, blues, () => undefined);
    expect(data.finalStatus).toEqual({ status: 'in_progress', leader: null, holesUp: 0, holesRemaining: 18 });
  });
});
