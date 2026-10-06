/**
 * FullLeaderboardTable component tests (the shared presentational table).
 * Score-computation parity is covered by the Par/Stableford .parity.test.tsx.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FullLeaderboardTable, type FullLeaderboardRow } from './FullLeaderboardTable';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    background: '#fff',
    surface: '#fff',
    surfaceVariant: '#f3f4f6',
    primary: '#1E7F5E',
    primaryBackground: '#E6F4F0',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
  }),
}));

jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, ...p }: any) => <Text {...p}>{children}</Text>,
    Icon: ({ source, ...p }: any) => <View testID={`icon-${source}`} {...p} />,
  };
});

jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    EmptyState: ({ title }: { title: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
      </View>
    ),
  };
});

const rows: FullLeaderboardRow[] = [
  { playerId: 'a', playerName: 'Ann', handicap: 5, position: 1, holesCompleted: 9, isCurrentUser: false, scoreValue: 18 },
  { playerId: 'b', playerName: 'Bob', handicap: 10, position: 2, holesCompleted: 9, isCurrentUser: true, scoreValue: 14 },
];

const base = {
  rows,
  maxCompletedHole: 9,
  hasPlayers: true,
  scoreHeaderLabel: 'Pts',
  formatScore: (r: FullLeaderboardRow) => `${r.scoreValue}`,
  scoreAccessibility: (r: FullLeaderboardRow) => `${r.scoreValue} points`,
};

describe('FullLeaderboardTable', () => {
  it('renders the score header, thru, and each row via formatScore', () => {
    render(<FullLeaderboardTable {...base} />);
    expect(screen.getByText('Pts')).toBeTruthy();
    expect(screen.getByText('(thru 9)')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('Ann')).toBeTruthy();
  });

  it('shows the empty state when no holes are complete', () => {
    render(<FullLeaderboardTable {...base} maxCompletedHole={0} />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });

  it('shows the empty state when there are no players', () => {
    render(<FullLeaderboardTable {...base} hasPlayers={false} />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });

  it('makes rows pressable when onPlayerPress is provided', () => {
    const onPlayerPress = jest.fn();
    render(<FullLeaderboardTable {...base} onPlayerPress={onPlayerPress} />);
    fireEvent.press(screen.getByLabelText('1 place: Ann, 18 points'));
    expect(onPlayerPress).toHaveBeenCalledWith('a');
  });
});
