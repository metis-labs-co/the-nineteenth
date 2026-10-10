import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LeagueRoundCard from './LeagueRoundCard';
import type { LeagueRound } from '@/types/database';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});
jest.mock('@/hooks/useLeagues', () => ({
  useUntagRound: () => ({ mutate: jest.fn() }),
}));

const round: LeagueRound = {
  id: 'lr1',
  league_id: 'l1',
  scorecard_id: 's1',
  player_id: 'p1',
  handicap_differential: 12.3,
  tagged_at: '2026-10-01T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
  round_id: 'r1',
  competition_id: 'c1',
};

describe('LeagueRoundCard', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('opens the tagged round with its competition', () => {
    const { getByRole } = render(<LeagueRoundCard round={round} leagueId="l1" />);
    fireEvent.press(getByRole('button', { name: /Opens round/ }));
    expect(mockNavigate).toHaveBeenCalledWith('ViewRound', {
      roundId: 'r1',
      competitionId: 'c1',
      initialTab: 'scorecard',
    });
  });

  it('is disabled when the round is unknown', () => {
    const { getByRole } = render(<LeagueRoundCard round={{ ...round, round_id: null }} leagueId="l1" />);
    expect(getByRole('button', { name: /Opens round/ }).props.accessibilityState?.disabled).toBe(true);
  });
});
