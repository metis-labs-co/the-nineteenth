/**
 * Characterization tests for useContributionData (Shamble summary math).
 *
 * Locks the net / stableford / to-par outputs of `teamScoreSummary` and
 * `playerScoreSummaries`, plus the contribution tallies. These outputs were
 * UNPROTECTED before this file.
 *
 * Scenario is chosen to isolate the handicap-stroke divergence (audit bug #1):
 * a HC-0 player (functions already agree) and a HC-20 player over two holes
 * (SI 2 and SI 10). HC 20 receives its 2nd stroke only on holes with SI ≤ 2, so
 * hole 1 (SI 2) is exactly where the local `getHandicapStrokesForHole` (caps at
 * 1) diverges from canonical `getStrokesReceived` (gives 2).
 */

import { renderHook } from '@testing-library/react-native';
import { useContributionData } from './useContributionData';
import type { Player, Hole, HoleScore } from '@/types';

const players: Player[] = [
  { id: 'p0', name: 'Zero', email: 'p0@x.co', handicap: 0 },
  { id: 'p20', name: 'Twenty', email: 'p20@x.co', handicap: 20 },
];

const holes: Hole[] = [
  { number: 1, par: 4, strokeIndex: 2 }, // HC 20 gets its 2nd stroke here (SI ≤ 2)
  { number: 2, par: 4, strokeIndex: 10 },
];

// gross strokes per player per hole
const strokes: Record<string, Record<number, number>> = {
  p0: { 1: 4, 2: 5 },
  p20: { 1: 6, 2: 6 },
};

const getPlayerScore = (playerId: string, holeNumber: number): HoleScore | undefined => {
  const s = strokes[playerId]?.[holeNumber];
  return s === undefined ? undefined : { strokes: s };
};

// team ball with shot contributions (symmetric so tallies are unambiguous)
const teamScores: Record<number, HoleScore> = {
  1: { strokes: 6, shotContributions: { teeShot: 'p20', approach: 'p0', putt: 'p20' } },
  2: { strokes: 5, shotContributions: { teeShot: 'p0', approach: 'p20', putt: 'p0' } },
};
const getTeamScore = (holeNumber: number): HoleScore | undefined => teamScores[holeNumber];

function render() {
  return renderHook(() =>
    useContributionData({ players, getTeamScore, holes, showOnlyDrives: true, getPlayerScore })
  ).result.current;
}

describe('useContributionData — Shamble summary math (characterization)', () => {
  it('contribution tallies are unaffected by handicap math', () => {
    const { contributions } = render();
    const byId = Object.fromEntries(contributions.map((c) => [c.playerId, c]));
    // symmetric scenario: each player has 1 drive, 1 approach, 1 putt
    expect(byId.p0).toMatchObject({ drives: 1, approaches: 1, putts: 1, total: 3 });
    expect(byId.p20).toMatchObject({ drives: 1, approaches: 1, putts: 1, total: 3 });
  });

  it('teamScoreSummary gross/holes/par are stable', () => {
    const { teamScoreSummary } = render();
    expect(teamScoreSummary).not.toBeNull();
    // gross = 4+5 + 6+6 = 21; two holes each with 2 players → parTotal = 4*2 + 4*2 = 16
    expect(teamScoreSummary!.grossTotal).toBe(21);
    expect(teamScoreSummary!.holesScored).toBe(2);
    expect(teamScoreSummary!.parTotal).toBe(16);
  });

  it('teamScoreSummary net/stableford/toPar (FIXED — canonical getStrokesReceived)', () => {
    const { teamScoreSummary } = render();
    // HC 20 now correctly gets 2 strokes on SI 2 (was 1). Net drops 19→18,
    // stableford rises 5→6, toParNet 3→2.
    expect(teamScoreSummary!.netTotal).toBe(18);
    expect(teamScoreSummary!.stablefordTotal).toBe(6);
    expect(teamScoreSummary!.toParNet).toBe(2);
  });

  it('playerScoreSummaries net/toPar and ordering (FIXED)', () => {
    const { playerScoreSummaries } = render();
    const byId = Object.fromEntries(playerScoreSummaries.map((p) => [p.playerId, p]));
    expect(byId.p0).toMatchObject({ gross: 9, net: 9, toPar: 1, holesPlayed: 2 });
    // HC 20 net 10→9, toPar 2→1 (extra stroke on SI 2).
    expect(byId.p20).toMatchObject({ gross: 12, net: 9, toPar: 1, holesPlayed: 2 });
    // now tied on toPar; stable sort preserves input order [p0, p20]
    expect(playerScoreSummaries.map((p) => p.playerId)).toEqual(['p0', 'p20']);
  });
});
