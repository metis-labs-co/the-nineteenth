import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AltShotScoreCard } from './AltShotScoreCard';
import type { TeamWithMembers } from '@/types/database.types';
import type { Hole } from '@/types';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const team = {
  id: 't1',
  name: 'Sam & Alex',
  members: [
    { player_id: 'p1', player: { id: 'p1', name: 'Sam', handicap: 9 } },
    { player_id: 'p2', player: { id: 'p2', name: 'Alex', handicap: 11 } },
  ],
} as unknown as TeamWithMembers;

const hole = (number: number, par = 4): Hole =>
  ({ number, par, strokeIndex: 7 } as Hole);

describe('AltShotScoreCard', () => {
  it('shows an ALT SHOT badge, never SCRAMBLE', () => {
    const { queryByText, getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={hole(5)}
        currentScore={undefined}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
      />
    );
    expect(getByText('ALT SHOT')).toBeTruthy();
    expect(queryByText('SCRAMBLE')).toBeNull();
  });

  it('hints that member 0 tees on odd holes and member 1 on even holes', () => {
    const odd = render(
      <AltShotScoreCard team={team} currentHole={hole(5)} currentScore={undefined} onScoreSelect={jest.fn()} onShotContributionsChange={jest.fn()} />
    );
    expect(odd.getByText(/Sam tees/i)).toBeTruthy();

    const even = render(
      <AltShotScoreCard team={team} currentHole={hole(6)} currentScore={undefined} onScoreSelect={jest.fn()} onShotContributionsChange={jest.fn()} />
    );
    expect(even.getByText(/Alex tees/i)).toBeTruthy();
  });

  it('reports the per-player shot tally from recorded contributions', () => {
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={hole(5)}
        currentScore={{ strokes: 4 } as never}
        shotContributions={{ teeShot: 'p1', approach: 'p2', putt: 'p1' } as never}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
      />
    );
    // Sam (p1) hit 2 shots (tee+putt), Alex (p2) hit 1 (approach).
    expect(getByText(/Sam 2/i)).toBeTruthy();
    expect(getByText(/Alex 1/i)).toBeTruthy();
  });
});
