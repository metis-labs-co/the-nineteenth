import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SubMatchNetCard, SubMatchOverallHeader } from './SubMatchNetCard';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
    success: '#0a0',
  }),
}));

const baseData = { unit: '' as const, diff: 2, hasScores: true };

describe('SubMatchNetCard', () => {
  it('renders both pair labels, nets, and the "leads by" status', () => {
    render(
      <SubMatchNetCard
        index={0}
        leftLabel="Team A"
        rightLabel="Team B"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ ...baseData, valueA: 34, valueB: 36, leaderSide: 'a' }}
      />
    );
    expect(screen.getByText('Team A')).toBeTruthy();
    expect(screen.getByText('Team B')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
    expect(screen.getByText('36')).toBeTruthy();
    expect(screen.getByTestId('net-card-status-0')).toHaveTextContent('Team A leads by 2');
  });

  it('shows the players under each team name when provided', () => {
    render(
      <SubMatchNetCard
        index={0}
        leftLabel="England"
        rightLabel="Australia"
        leftColor="#0a0"
        rightColor="#a00"
        leftPlayers="Sam Winzar & Sam Kay"
        rightPlayers="A. Biggs & B. Beckerleg"
        data={{ ...baseData, valueA: 71, valueB: 73, leaderSide: 'a' }}
      />
    );
    expect(screen.getByText('England')).toBeTruthy();
    expect(screen.getByText('Sam Winzar & Sam Kay')).toBeTruthy();
    expect(screen.getByText('Australia')).toBeTruthy();
    expect(screen.getByText('A. Biggs & B. Beckerleg')).toBeTruthy();
  });

  it('omits the players line when not provided', () => {
    render(
      <SubMatchNetCard
        index={0}
        leftLabel="Team A"
        rightLabel="Team B"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ ...baseData, valueA: 34, valueB: 36, leaderSide: 'a' }}
      />
    );
    expect(screen.queryByText('Sam Winzar & Sam Kay')).toBeNull();
  });

  it('shows "Not started" with no scores', () => {
    render(
      <SubMatchNetCard
        index={1}
        leftLabel="Team A"
        rightLabel="Team B"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ unit: '', diff: 0, hasScores: false, valueA: null, valueB: null, leaderSide: null }}
      />
    );
    expect(screen.getByTestId('net-card-status-1')).toHaveTextContent('Not started');
  });
});

describe('SubMatchOverallHeader', () => {
  it('renders the projected team tally', () => {
    render(
      <SubMatchOverallHeader
        leftLabel="Reds"
        rightLabel="Blues"
        leftColor="#a00"
        rightColor="#00a"
        pointsA={1.5}
        pointsB={0.5}
      />
    );
    expect(screen.getByText('Reds')).toBeTruthy();
    expect(screen.getByText('Blues')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
    expect(screen.getByText('0.5')).toBeTruthy();
  });
});
