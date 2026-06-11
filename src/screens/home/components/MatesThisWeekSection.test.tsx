import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MatesThisWeekSection } from './MatesThisWeekSection';
import * as matesHook from '@/hooks/home/useMatesThisWeek';
import type { MateWeeklyEntry } from '@/hooks/home/matesLeaderboard';

jest.mock('@/hooks/home/useMatesThisWeek');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const entries: MateWeeklyEntry[] = [
  { playerId: 'f1', name: 'Mia Chen', photoUrl: null, points: 38, roundId: 'r1', isCurrentUser: false },
  { playerId: 'f2', name: 'Jess Mol', photoUrl: null, points: 34, roundId: 'r2', isCurrentUser: false },
  { playerId: 'me', name: 'Sam Kay', photoUrl: null, points: 31, roundId: 'r3', isCurrentUser: true },
];

const wrap = (node: React.ReactNode) => <NavigationContainer>{node}</NavigationContainer>;

function mockData(data: MateWeeklyEntry[] | undefined, extra: object = {}) {
  (matesHook.useMatesThisWeek as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  });
}

describe('MatesThisWeekSection', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders ranked mates with points', () => {
    mockData(entries);
    const { getByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('Mates this week')).toBeTruthy();
    expect(getByText('Mia Chen')).toBeTruthy();
    expect(getByText('38')).toBeTruthy();
    expect(getByText('Jess Mol')).toBeTruthy();
    expect(getByText('34')).toBeTruthy();
  });

  it('labels the current user row "You"', () => {
    mockData(entries);
    const { getByText, queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('You')).toBeTruthy();
    expect(queryByText('Sam Kay')).toBeNull();
  });

  it('shows "Leading" for first place and "N behind" for the rest', () => {
    mockData(entries);
    const { getByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('Leading')).toBeTruthy();
    expect(getByText('4 behind')).toBeTruthy();
    expect(getByText('7 behind')).toBeTruthy();
  });

  it('renders nothing when there are no entries', () => {
    mockData([]);
    const { queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(queryByText('Mates this week')).toBeNull();
  });

  it('renders nothing while loading', () => {
    mockData(undefined, { isLoading: true });
    const { queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(queryByText('Mates this week')).toBeNull();
  });

  it('navigates to the round on row press', () => {
    mockData(entries);
    const { getByTestId } = render(wrap(<MatesThisWeekSection />));
    fireEvent.press(getByTestId('mate-row-f1'));
    expect(mockNavigate).toHaveBeenCalledWith('RoundActivity', { roundId: 'r1' });
  });

  it('navigates to the activity feed on See all', () => {
    mockData(entries);
    const { getByText } = render(wrap(<MatesThisWeekSection />));
    fireEvent.press(getByText('See all'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'ActivityTab' });
  });

  it('renders nothing on error', () => {
    mockData(undefined, { isError: true });
    const { queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(queryByText('Mates this week')).toBeNull();
  });

  it('shows only "Leading" when a single mate has played', () => {
    mockData([entries[0]]);
    const { getByText, queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('Leading')).toBeTruthy();
    expect(queryByText(/behind/)).toBeNull();
  });
});
