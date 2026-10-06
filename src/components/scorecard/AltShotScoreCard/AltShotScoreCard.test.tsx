import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AltShotScoreCard } from './AltShotScoreCard';
import type { Hole, HoleScore } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const HOLE: Hole = { number: 1, par: 4, strokeIndex: 5 } as Hole;

const team: TeamWithMembers = {
  id: 'team-1',
  name: 'Pair 1',
  color: null,
  members: [
    { player_id: 'a', player: { id: 'a', name: 'Alice', handicap: 10 } },
    { player_id: 'b', player: { id: 'b', name: 'Bob', handicap: 12 } },
  ],
} as unknown as TeamWithMembers;

describe('AltShotScoreCard (derived contributions)', () => {
  it('shows the first-tee toggle on hole 1 and writes hole-1 teeShot on select', () => {
    const onShotContributionsChange = jest.fn();
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={HOLE}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={onShotContributionsChange}
        firstTeePlayerId="a"
      />,
    );

    // Toggle visible on hole 1
    fireEvent.press(getByText('Bob'));
    expect(onShotContributionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ teeShot: 'b' }),
    );
  });

  it('does not show the first-tee toggle after hole 1', () => {
    const { queryByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={{ number: 5, par: 4, strokeIndex: 5 } as Hole}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
        firstTeePlayerId="a"
      />,
    );
    expect(queryByText('Who tees off first?')).toBeNull();
  });

  it('uses the 50% foursomes allowance for the team handicap (not scramble 25%)', () => {
    // members 10 + 12 = 22. Alt Shot (foursomes) allowance is 50% -> 11.0.
    // The shared scramble hook would wrongly apply 25% -> 5.5.
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={HOLE}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
        firstTeePlayerId="a"
      />,
    );
    expect(getByText(/HC: 11\.0/)).toBeTruthy();
  });

  it('renders a derived per-player tally from the stroke count (4 strokes -> 2 / 2)', () => {
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={HOLE}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
        firstTeePlayerId="a"
      />,
    );
    expect(getByText('Alice 2')).toBeTruthy();
    expect(getByText('Bob 2')).toBeTruthy();
  });
});
