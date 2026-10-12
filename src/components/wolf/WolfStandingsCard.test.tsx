/**
 * WolfStandingsCard rows open the player's scorecard only when a roundId is given.
 */
import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { WolfStandingsCard } from './WolfStandingsCard';
import type { WolfStandingEntry } from '@/types/database/wolf.types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const STANDINGS: WolfStandingEntry[] = [
  { player_id: 'p1', name: 'Sam', total_points: 6, rank: 1 },
];

describe('WolfStandingsCard', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('opens the player scorecard when a roundId is given', () => {
    render(<WolfStandingsCard standings={STANDINGS} potEnabled={false} roundId="r1" />);
    fireEvent.press(screen.getByLabelText(/Sam.*View scorecard/));
    expect(mockNavigate).toHaveBeenCalledWith('PlayerScorecard', { playerId: 'p1', roundId: 'r1' });
  });

  it('is not tappable without a roundId', () => {
    render(<WolfStandingsCard standings={STANDINGS} potEnabled={false} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
