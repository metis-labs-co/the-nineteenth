/**
 * useTeamMatchPlayState Hook Tests
 *
 * Match status is judged against the round's planned hole count
 * (`totalHoles`), so a 9-hole team match can complete.
 */

import { renderHook } from '@testing-library/react-native';
import { useTeamMatchPlayState } from './useTeamMatchPlayState';
import type { Hole } from '@/types';
import type { MatchTeam } from '../types';

// The hook only needs the dialog helper from the hooks barrel — use the real
// one without loading every hook in '@/hooks'.
jest.mock('@/hooks', () => ({
  useConfirmationDialog: jest.requireActual('@/hooks/useConfirmationDialog').useConfirmationDialog,
}));

type Winner = 'team1' | 'team2' | 'halved' | null;

interface HoleProps {
  currentHole: number;
  currentHoleWinner: Winner;
  holesPlayed?: number | null;
  plannedHoles?: readonly Pick<Hole, 'number'>[];
}

function buildTeam(id: string, name: string, memberIds: string[]): MatchTeam {
  return {
    id,
    name,
    handicap: 0,
    members: memberIds.map((memberId) => ({
      id: memberId,
      name: memberId,
      handicap: 0,
      score: null,
      pickedUp: false,
    })),
  };
}

const reds = buildTeam('t1', 'Reds', ['a1', 'a2']);
const blues = buildTeam('t2', 'Blues', ['b1', 'b2']);
const getPlayerScoreValue = () => 4;
const onSubmitSuccess = jest.fn();

function renderState(totalHoles: number, firstHole = 1, holesPlayed: number | null = null) {
  return renderHook(
    ({
      currentHole,
      currentHoleWinner,
      holesPlayed: cutoff = holesPlayed,
      plannedHoles = Array.from(
        { length: totalHoles },
        (_, i) => ({ number: firstHole + i }) as Hole
      ),
    }: HoleProps) =>
      useTeamMatchPlayState({
        team1: reds,
        team2: blues,
        currentHole,
        team1BestScore: 4,
        team2BestScore: 4,
        currentHoleWinner,
        getPlayerScoreValue,
        onSubmitSuccess,
        totalHoles,
        holesPlayed: cutoff,
        plannedHoles,
      }),
    { initialProps: { currentHole: firstHole, currentHoleWinner: null } as HoleProps }
  );
}

/** Swipe through holes in order, recording each hole's winner as the screen does. */
function playHoles(rerender: (props: HoleProps) => void, firstHole: number, winners: Winner[]) {
  winners.forEach((currentHoleWinner, i) => rerender({ currentHole: firstHole + i, currentHoleWinner }));
}

describe('useTeamMatchPlayState — planned hole count', () => {
  it('completes a front-9 match once all 9 holes are decided', () => {
    const { result, rerender } = renderState(9);

    playHoles(rerender, 1, ['team1', 'team1', 'halved', 'halved', 'halved', 'halved', 'halved', 'halved', 'halved']);

    expect(result.current.isMatchComplete).toBe(true);
    expect(result.current.matchStatus).toEqual({ status: 'complete', winner: 'team1', margin: '2 up' });
    expect(result.current.matchStatusText).toBe('Reds wins 2 up');
  });

  it('closes out a back-9 match against 9 planned holes (5 & 4)', () => {
    const { result, rerender } = renderState(9, 10);

    playHoles(rerender, 10, ['team2', 'team2', 'team2', 'team2', 'team2']);

    expect(result.current.matchStatus).toEqual({ status: 'complete', winner: 'team2', margin: '5 & 4' });
  });

  it('reads an 18-hole match against 18 (characterization)', () => {
    const { result, rerender } = renderState(18);

    playHoles(rerender, 1, ['team1', 'team1', 'halved', 'halved', 'halved', 'halved', 'halved', 'halved', 'halved']);

    expect(result.current.isMatchComplete).toBe(false);
    expect(result.current.matchStatus).toEqual({
      status: 'in_progress',
      leader: 'team1',
      holesUp: 2,
      holesRemaining: 9,
    });
  });
});

describe('useTeamMatchPlayState early-end baseline', () => {
  it('keeps six decided holes in progress against eighteen planned holes', () => {
    const { result, rerender } = renderState(18);
    playHoles(rerender, 1, ['team1', 'halved', 'team1', 'halved', 'halved', 'halved']);
    expect(result.current.matchStatus).toEqual({
      status: 'in_progress',
      leader: 'team1',
      holesUp: 2,
      holesRemaining: 12,
    });
    expect(result.current.holesWon).toEqual({ team1: 2, team2: 0, halved: 4 });
  });
});

describe('useTeamMatchPlayState — round ended early', () => {
  it('completes an 18-hole match ended after 6 on the lead: "2 up"', () => {
    const { result, rerender } = renderState(18, 1, 6);

    playHoles(rerender, 1, ['team1', 'halved', 'team1', 'halved', 'halved', 'halved']);

    expect(result.current.isMatchComplete).toBe(true);
    expect(result.current.matchStatus).toEqual({
      status: 'complete',
      winner: 'team1',
      margin: '2 up',
    });
  });

  it('keeps a real close-out against the planned 9 holes: "5 & 4"', () => {
    const { result, rerender } = renderState(9, 1, 6);

    playHoles(rerender, 1, ['team2', 'team2', 'team2', 'team2', 'team2', 'halved']);

    expect(result.current.matchStatus).toEqual({
      status: 'complete',
      winner: 'team2',
      margin: '5 & 4',
    });
  });
});

describe('useTeamMatchPlayState sparse cutoff boundary', () => {
  it.each([1, 10, 31])(
    'uses actual planned hole numbering from %i with an absent pre-cutoff hole',
    (first) => {
      const { result, rerender } = renderState(9, first, 3);
      // The second physical hole is never visited: its key is entirely absent.
      rerender({ currentHole: first, currentHoleWinner: 'team1' });
      rerender({ currentHole: first + 2, currentHoleWinner: 'halved' });
      rerender({ currentHole: first + 3, currentHoleWinner: 'team2' });
      expect(result.current.holeResults[first + 1]).toBeUndefined();
      expect(result.current.matchStatus).toEqual({
        status: 'in_progress',
        leader: 'team1',
        holesUp: 1,
        holesRemaining: 7,
      });
      expect(result.current.holesWon).toEqual({ team1: 1, team2: 0, halved: 1 });
      rerender({ currentHole: first + 1, currentHoleWinner: 'halved' });
      expect(result.current.matchStatus).toEqual({
        status: 'complete',
        winner: 'team1',
        margin: '1 up',
      });
      expect(result.current.holesWon).toEqual({ team1: 1, team2: 0, halved: 2 });
    }
  );
  it('updates only the cutoff while preserving scores', () => {
    const { result, rerender } = renderState(18);
    playHoles(rerender, 1, ['team1', 'halved', 'team1', 'halved', 'halved', 'halved']);
    rerender({ currentHole: 6, currentHoleWinner: 'halved', holesPlayed: 6 });
    expect(result.current.matchStatus).toEqual({
      status: 'complete',
      winner: 'team1',
      margin: '2 up',
    });
    rerender({ currentHole: 6, currentHoleWinner: 'halved', holesPlayed: null });
    expect(result.current.matchStatus.status).toBe('in_progress');
  });
});

describe('useTeamMatchPlayState missing planned context', () => {
  it('stays undecided until matching planned context is available', () => {
    const { result, rerender } = renderState(9, 10, 3);
    playHoles(rerender, 10, ['team1', 'halved', 'halved']);
    expect(result.current.isMatchComplete).toBe(true);
    for (const plannedHoles of [[], [{ number: 10 }] as Hole[]]) {
      rerender({ currentHole: 12, currentHoleWinner: 'halved', plannedHoles });
      expect(result.current.matchStatus).toEqual({
        status: 'in_progress',
        leader: null,
        holesUp: 0,
        holesRemaining: 9,
      });
      expect(result.current.holesWon).toEqual({ team1: 0, team2: 0, halved: 0 });
    }
    rerender({ currentHole: 12, currentHoleWinner: 'halved' });
    expect(result.current.matchStatus).toEqual({
      status: 'complete',
      winner: 'team1',
      margin: '1 up',
    });
  });
});
