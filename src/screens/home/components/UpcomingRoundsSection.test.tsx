import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { UpcomingRoundsSection } from './UpcomingRoundsSection';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

function createRound(overrides: Partial<RoundItem> = {}): RoundItem {
  return {
    id: 'r-1',
    course: { id: 'c-1', name: 'Royal Melbourne' },
    status: 'upcoming',
    date: '2026-06-20',
    teeTime: '07:30:00',
    gameType: 'stableford',
    roundNumber: 1,
    totalRounds: 1,
    holesCompleted: 0,
    totalHoles: 18,
    ...overrides,
  };
}

const wrap = (node: React.ReactNode) => (
  <NavigationContainer>{node}</NavigationContainer>
);

describe('UpcomingRoundsSection', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders course name and formatted tee time', () => {
    const { getByText } = render(
      wrap(<UpcomingRoundsSection rounds={[createRound()]} showViewAll={false} />)
    );
    expect(getByText('Royal Melbourne')).toBeTruthy();
    expect(getByText('7:30 AM')).toBeTruthy();
  });

  it('joins tee time and competition name in the sub label', () => {
    const round = createRound({
      competition: { id: 'comp-1', name: 'Summer Series' },
    });
    const { getByText } = render(
      wrap(<UpcomingRoundsSection rounds={[round]} showViewAll={false} />)
    );
    expect(getByText('7:30 AM · Summer Series')).toBeTruthy();
  });

  it('shows only the competition name when there is no tee time', () => {
    const round = createRound({
      teeTime: null,
      competition: { id: 'comp-1', name: 'Summer Series' },
    });
    const { getByText, queryByText } = render(
      wrap(<UpcomingRoundsSection rounds={[round]} showViewAll={false} />)
    );
    expect(getByText('Summer Series')).toBeTruthy();
    expect(queryByText(/AM|PM/)).toBeNull();
  });

  it('includes the tee time in the accessibility label', () => {
    const { getByLabelText } = render(
      wrap(<UpcomingRoundsSection rounds={[createRound()]} showViewAll={false} />)
    );
    expect(getByLabelText(/Upcoming round at Royal Melbourne.*7:30 AM/)).toBeTruthy();
  });

  it('navigates to ViewRound on press', () => {
    const { getByText } = render(
      wrap(<UpcomingRoundsSection rounds={[createRound()]} showViewAll={false} />)
    );
    fireEvent.press(getByText('Royal Melbourne'));
    expect(mockNavigate).toHaveBeenCalledWith('ViewRound', {
      roundId: 'r-1',
      competitionId: undefined,
    });
  });
});
