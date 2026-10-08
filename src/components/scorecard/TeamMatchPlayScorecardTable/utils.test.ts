import { calculateTeamMatchData } from './utils';
import { PICKUP_SCORE } from '@/constants/scoring';
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

describe('calculateTeamMatchData — ended early (holesPlayed)', () => {
  const eighteen: Hole[] = Array.from(
    { length: 18 },
    (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }) as Hole
  );
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
  const getScore = (playerId: string, holeNumber: number): number | undefined => {
    if (holeNumber > 6) return undefined;
    if (playerId === 'r1') return holeNumber <= 2 ? 3 : 4;
    return 4;
  };

  it('walks and totals only the played holes, settling on the lead', () => {
    const data = calculateTeamMatchData(eighteen, reds, blues, getScore, 6);
    expect(Object.keys(data.holeResults).map(Number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(data.total).toEqual({ par: 24, player1: 22, player2: 24, holesPlayed: 6 });
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '2 up' });
  });

  it('is unchanged when holesPlayed is null (characterization)', () => {
    const data = calculateTeamMatchData(eighteen, reds, blues, getScore, null);
    expect(Object.keys(data.holeResults)).toHaveLength(18);
    expect(data.finalStatus).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 2, holesRemaining: 12 });
  });

  it('keeps running status against planned holes until N and ignores later scored holes', () => {
    const data = calculateTeamMatchData(eighteen, reds, blues, (pid, h) =>
      h > 6 ? (pid === 'r1' ? 8 : 3) : getScore(pid, h), 6);
    expect(data.runningStatus[5]).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 2, holesRemaining: 13 });
    expect(data.runningStatus[6]).toEqual({ status: 'complete', winner: 'player1', margin: '2 up' });
    expect(data).toEqual(calculateTeamMatchData(eighteen, reds, blues, getScore, 6));
  });

  it('keeps an undecided back-nine hole before N without admitting a later result', () => {
    const planned = eighteen.slice(0, 9).map((h) => ({ ...h, number: h.number + 9 }) as Hole);
    const data = calculateTeamMatchData(planned, reds, blues, (pid, h) => {
      if (h === 11) return undefined;
      return pid === 'r1' && (h === 10 || h > 15) ? 3 : 4;
    }, 6);
    expect(Object.keys(data.holeResults).map(Number)).toEqual([10, 11, 12, 13, 14, 15]);
    expect(data.holeResults[11].winner).toBeNull();
    expect(data.front9.par).toBe(0);
    expect(data.back9).toEqual({ par: 24, player1: 19, player2: 20, holesPlayed: 5 });
    expect(data.finalStatus).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 1, holesRemaining: 4 });
  });

  it('totals the best net contributor’s gross and retains partial/full concession semantics', () => {
    // Relative to lowest 5, P2 gets 2 strokes, P3/P4 get 1 at SI 3.
    // P2's gross 5 (net 3) beats P1's gross 4 (net 4) on the first hole.
    const unequal = { ...team1, members: team1.members.map((m) => ({ ...m, handicap: m.id === 'p2' ? 41 : m.handicap })) };
    const planned = eighteen.map((h) => ({ ...h, strokeIndex: 3 }));
    const data = calculateTeamMatchData(planned, unequal, team2, (pid, h) => {
      if (pid === 'p3') return 5;
      if (pid === 'p4') return undefined;
      if (h === 1) return pid === 'p1' ? 4 : 5;
      if (h === 2) return pid === 'p1' ? 4 : PICKUP_SCORE;
      return PICKUP_SCORE;
    }, 3);
    expect(data.holeResults[1]).toEqual(expect.objectContaining({ player1Score: 5, winner: 'player1' }));
    expect(data.holeResults[2]).toEqual(expect.objectContaining({ player1PickedUp: false, winner: 'halved' }));
    expect(data.holeResults[3]).toEqual(expect.objectContaining({ player1PickedUp: true, winner: 'player2' }));
    expect(data.total).toEqual({ par: 12, player1: 9, player2: 15, holesPlayed: 3 });
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'halved', margin: 'All Square' });
  });

  it.each([undefined, 0, -1, 1.5, NaN, Infinity, 18, 19])('keeps default outputs for cutoff %s', (cutoff) => {
    const unsorted = [...eighteen].reverse();
    expect(calculateTeamMatchData(unsorted, reds, blues, getScore, cutoff))
      .toEqual(calculateTeamMatchData(unsorted, reds, blues, getScore));
  });
});
