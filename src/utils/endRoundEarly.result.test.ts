/**
 * describeEndRoundEarlyResult — the one-line result on the End-round-early
 * confirmation. Must agree with the shared match rules: no holes remaining
 * ⇒ "N UP" / "A/S" (never "N&M"), a real close-out against the planned
 * holes stands, and only the holes that will count are considered.
 */

import { describeEndRoundEarlyResult, planEndRoundEarly } from './endRoundEarly';
import type { Hole, Scorecard } from '@/types';
import type { EndRoundEarlyStatsRow } from './endRoundEarly';
import type { HoleResult } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { TeamHoleResult } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

function singles(winners: Record<number, HoleResult['winner']>): Record<number, HoleResult> {
  const results: Record<number, HoleResult> = {};
  for (const [hole, winner] of Object.entries(winners)) {
    results[Number(hole)] = {
      player1Score: 4,
      player2Score: 4,
      player1PickedUp: false,
      player2PickedUp: false,
      winner,
    };
  }
  return results;
}

function teams(winners: Record<number, TeamHoleResult['winner']>): Record<number, TeamHoleResult> {
  const results: Record<number, TeamHoleResult> = {};
  for (const [hole, winner] of Object.entries(winners)) {
    results[Number(hole)] = {
      team1Score: 4,
      team2Score: 4,
      team1PlayerScores: {},
      team2PlayerScores: {},
      winner,
    };
  }
  return results;
}

const holesFrom = (first: number, count: number) =>
  Array.from({ length: count }, (_, i) => first + i);

function row(playerName: string, values: Partial<EndRoundEarlyStatsRow>): EndRoundEarlyStatsRow {
  return { playerName, totalNet: 0, totalStableford: 0, totalParScore: 0, ...values };
}

describe('describeEndRoundEarlyResult — match play', () => {
  it('a 9-hole match ended after 6 with a 2-hole lead is won "2 UP", never "N&M"', () => {
    const text = describeEndRoundEarlyResult({
      kind: 'singles',
      names: ['Dave', 'Sam'],
      holeResults: singles({ 1: 'player1', 2: 'player1', 3: 'halved', 4: 'halved', 5: 'halved', 6: 'halved' }),
      playedHoleNumbers: holesFrom(1, 6),
      plannedHoles: 9,
      holesPlayed: 6,
    });

    expect(text).toBe('Dave wins 2 UP');
    expect(text).not.toContain('&');
  });

  it('level after the holes played is halved A/S', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'singles',
        names: ['Dave', 'Sam'],
        holeResults: singles({ 1: 'player1', 2: 'player2', 3: 'halved', 4: 'halved', 5: 'halved', 6: 'halved' }),
        playedHoleNumbers: holesFrom(1, 6),
        plannedHoles: 9,
        holesPlayed: 6,
      })
    ).toBe('Halved A/S');
  });

  it('a real close-out against the planned holes stands, in compact form (5&4)', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'singles',
        names: ['Dave', 'Sam'],
        holeResults: singles({ 1: 'player1', 2: 'player1', 3: 'player1', 4: 'player1', 5: 'player1', 6: 'halved' }),
        playedHoleNumbers: holesFrom(1, 6),
        plannedHoles: 9,
        holesPlayed: 6,
      })
    ).toBe('Dave wins 5&4');
  });

  it('ignores results on holes that are being removed', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'singles',
        names: ['Dave', 'Sam'],
        holeResults: singles({
          1: 'player1', 2: 'player1', 3: 'halved', 4: 'halved', 5: 'halved', 6: 'halved',
          7: 'player2', 8: 'player2',
        }),
        playedHoleNumbers: holesFrom(1, 6),
        plannedHoles: 18,
        holesPlayed: 6,
      })
    ).toBe('Dave wins 2 UP');
  });

  it('a decided hole after N never stands in for an undecided played hole', () => {
    // Hole 6 is undecided and hole 7 is removed: the retained prefix is
    // incomplete, so there is no final result to preview.
    expect(
      describeEndRoundEarlyResult({
        kind: 'singles',
        names: ['Dave', 'Sam'],
        holeResults: singles({
          1: 'player1', 2: 'player1', 3: 'halved', 4: 'halved', 5: 'halved', 6: null, 7: 'player2',
        }),
        playedHoleNumbers: holesFrom(1, 6),
        plannedHoles: 18,
        holesPlayed: 6,
      })
    ).toBeNull();
  });

  it('back nine ended after 6 walks holes 10–15', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'singles',
        names: ['Dave', 'Sam'],
        holeResults: singles({
          10: 'player2', 11: 'halved', 12: 'halved', 13: 'halved', 14: 'halved', 15: 'halved',
          16: 'player1',
        }),
        playedHoleNumbers: holesFrom(10, 6),
        plannedHoles: 9,
        holesPlayed: 6,
      })
    ).toBe('Sam wins 1 UP');
  });

  it('uses the team names for team match play', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'team',
        names: ['Eagles', 'Hawks'],
        holeResults: teams({ 1: 'team2', 2: 'halved', 3: 'halved', 4: 'halved', 5: 'halved', 6: 'halved' }),
        playedHoleNumbers: holesFrom(1, 6),
        plannedHoles: 18,
        holesPlayed: 6,
      })
    ).toBe('Hawks wins 1 UP');
  });
});

describe('describeEndRoundEarlyResult — stroke, stableford, par', () => {
  it('stableford: highest points leads', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'stableford',
        stats: [row('Dave', { totalStableford: 28 }), row('Sam', { totalStableford: 31 })],
      })
    ).toBe('Sam leads on 31 pts');
  });

  it('stableford: a tie at the top', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'stableford',
        stats: [row('Dave', { totalStableford: 31 }), row('Sam', { totalStableford: 31 })],
      })
    ).toBe('Tied on 31 pts');
  });

  it('stroke: lowest net leads', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'stroke',
        stats: [row('Sam', { totalNet: 25 }), row('Dave', { totalNet: 22 })],
      })
    ).toBe('Dave leads on net 22');
  });

  it('stroke: a fractional net (raw-index fallback) shows one decimal', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'stroke',
        stats: [row('Sam', { totalNet: 71.6 }), row('Dave', { totalNet: 74 })],
      })
    ).toBe('Sam leads on net 71.6');
  });

  it('par: highest par score leads, signed', () => {
    expect(
      describeEndRoundEarlyResult({
        kind: 'par',
        stats: [row('Sam', { totalParScore: 2 }), row('Dave', { totalParScore: -1 })],
      })
    ).toBe('Sam leads on +2');
  });

  it('a solo round states the total instead of a leader', () => {
    expect(
      describeEndRoundEarlyResult({ kind: 'stableford', stats: [row('Sam', { totalStableford: 14 })] })
    ).toBe('Sam: 14 pts');
  });

  it('no players ⇒ no preview', () => {
    expect(describeEndRoundEarlyResult({ kind: 'stroke', stats: [] })).toBeNull();
  });
});

describe('describeEndRoundEarlyResult — retained results and caller totals', () => {
  it.each([9, 18])('uses the supplied physical planned count of %i for close-outs', (plannedHoles) => {
    expect(describeEndRoundEarlyResult({
      kind: 'singles',
      names: ['Dave', 'Sam'],
      holeResults: singles({ 1: 'player1', 2: 'player1', 3: 'player1', 4: 'player1', 5: 'player1', 6: 'halved' }),
      playedHoleNumbers: holesFrom(1, 6),
      plannedHoles,
      holesPlayed: 6,
    })).toBe(plannedHoles === 9 ? 'Dave wins 5&4' : 'Dave wins 5 UP');
  });

  it('a missing singles result cannot be replaced by a removed result', () => {
    expect(describeEndRoundEarlyResult({
      kind: 'singles',
      names: ['Dave', 'Sam'],
      holeResults: singles({ 1: 'player1', 2: 'player1', 3: 'halved', 4: 'halved', 5: 'halved', 7: 'player2' }),
      playedHoleNumbers: holesFrom(1, 6),
      plannedHoles: 18,
      holesPlayed: 6,
    })).toBeNull();
  });

  it('an empty team result map has no preview', () => {
    expect(describeEndRoundEarlyResult({
      kind: 'team', names: ['Eagles', 'Hawks'], holeResults: {},
      playedHoleNumbers: holesFrom(1, 6), plannedHoles: 18, holesPlayed: 6,
    })).toBeNull();
  });

  it.each([null, undefined])('a missing or undecided retained team result (%s) stays incomplete on a back nine', (winner) => {
    const holeResults = teams({ 10: 'team2', 11: 'halved', 12: 'halved', 13: 'halved', 14: 'halved', 16: 'team1' });
    if (winner === null) Object.assign(holeResults, teams({ 15: null }));
    expect(describeEndRoundEarlyResult({
      kind: 'team', names: ['Eagles', 'Hawks'], holeResults,
      playedHoleNumbers: holesFrom(10, 6), plannedHoles: 9, holesPlayed: 6,
    })).toBeNull();
  });

  it('a retained team close-out stands even when a later retained result is missing', () => {
    expect(describeEndRoundEarlyResult({
      kind: 'team', names: ['Eagles', 'Hawks'],
      holeResults: teams({ 10: 'team2', 11: 'team2', 12: 'team2', 13: 'team2', 14: 'team2', 16: 'team1' }),
      playedHoleNumbers: holesFrom(10, 6), plannedHoles: 9, holesPlayed: 6,
    })).toBe('Hawks wins 5&4');
  });

  it('team play uses the retained back-nine results and halves a level match', () => {
    expect(describeEndRoundEarlyResult({
      kind: 'team', names: ['Eagles', 'Hawks'],
      holeResults: teams({ 10: 'team1', 11: 'team2', 12: 'halved', 13: 'halved', 14: 'halved', 15: 'halved', 16: 'team1' }),
      playedHoleNumbers: holesFrom(10, 6), plannedHoles: 9, holesPlayed: 6,
    })).toBe('Halved A/S');
  });

  it('does not mutate match results, names or the retained hole list', () => {
    const holeResults = singles({ 1: 'player1', 2: 'halved', 3: 'player2' });
    const before = JSON.parse(JSON.stringify(holeResults));
    Object.values(holeResults).forEach(Object.freeze);
    Object.freeze(holeResults);
    const names: [string, string] = ['Dave', 'Sam'];
    const playedHoleNumbers = [1, 2];
    Object.freeze(names);
    Object.freeze(playedHoleNumbers);
    expect(describeEndRoundEarlyResult({
      kind: 'singles', names, holeResults, playedHoleNumbers, plannedHoles: 9, holesPlayed: 2,
    })).toBe('Dave wins 1 UP');
    expect(holeResults).toEqual(before);
    expect(names).toEqual(['Dave', 'Sam']);
    expect(playedHoleNumbers).toEqual([1, 2]);
  });

  it.each([
    { kind: 'stroke' as const, values: { totalNet: 22 }, text: 'Tied on net 22' },
    { kind: 'par' as const, values: { totalParScore: 0 }, text: 'Tied on 0' },
  ])('$kind formats a tie at the top', ({ kind, values, text }) => {
    expect(describeEndRoundEarlyResult({ kind, stats: [row('Dave', values), row('Sam', values)] }))
      .toBe(text);
  });

  it('formats a negative par score for a solo round', () => {
    expect(describeEndRoundEarlyResult({ kind: 'par', stats: [row('Sam', { totalParScore: -2 })] }))
      .toBe('Sam: -2');
  });

  it('rounds fractional stroke totals to one decimal without mutating the ranking input', () => {
    const stats = [row('Dave', { totalNet: 25 }), row('Sam', { totalNet: 22.26 })];
    const before = stats.map((entry) => ({ ...entry }));
    stats.forEach(Object.freeze);
    Object.freeze(stats);
    expect(describeEndRoundEarlyResult({ kind: 'stroke', stats })).toBe('Sam leads on net 22.3');
    expect(stats).toEqual(before);
  });
});

describe('existing planner contract on a physical nine-hole course', () => {
  const holes: Hole[] = Array.from({ length: 9 }, (_, index) => ({
    number: (index + 1) as Hole['number'],
    par: 4,
    strokeIndex: index + 1,
  }));
  const players = [{ id: 'dave', name: 'Dave' }, { id: 'sam', name: 'Sam' }];
  const scorecardsAfter = (count: number) => new Map(
    players.map(({ id }) => [id, {
      scores: Object.fromEntries(
        holes.slice(0, count).map(({ number }) => [number, { strokes: 4 }])
      ) as Scorecard['scores'],
    }])
  );

  it('keeps the fixed full-round label denominator when ending after six physical holes', () => {
    expect(planEndRoundEarly({ holes, players, nineType: 'full', scorecards: scorecardsAfter(6) }))
      .toEqual({
        holesPlayed: 6,
        plannedHoles: 18,
        nineType: 'full',
        lastHoleNumber: 6,
        removedScores: [],
      });
  });

  it('does not offer an early end when all nine physical holes are complete', () => {
    expect(planEndRoundEarly({ holes, players, nineType: 'full', scorecards: scorecardsAfter(9) }))
      .toBeNull();
  });
});
