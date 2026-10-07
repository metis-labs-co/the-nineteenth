/**
 * useTeamMatchPlayState Hook Tests
 *
 * Match status is judged against the round's planned hole count
 * (`totalHoles`), so a 9-hole team match can complete.
 */

import { renderHook } from '@testing-library/react-native';
import { useTeamMatchPlayState } from './useTeamMatchPlayState';
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

function renderState(totalHoles: number, firstHole = 1) {
  return renderHook(
    ({ currentHole, currentHoleWinner }: HoleProps) =>
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
