import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MatchPlayMatchRow } from './MatchPlayMatchRow';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
  }),
}));

describe('MatchPlayMatchRow', () => {
  it('renders both names and the centered status', () => {
    render(
      <MatchPlayMatchRow
        leftName="Sam"
        rightName="Bob"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ statusText: '2 UP', leaderSide: 'a', isComplete: false, hasScores: true }}
      />
    );
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('2 UP');
  });

  it('shows A/S when not started', () => {
    render(
      <MatchPlayMatchRow
        leftName="Sam"
        rightName="Bob"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ statusText: 'A/S', leaderSide: null, isComplete: false, hasScores: false }}
      />
    );
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
  });
});
