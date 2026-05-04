import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatsTile } from './StatsTile';
import { AchievementsTile } from './AchievementsTile';
import { CompetitionsTile } from './CompetitionsTile';
import { LastRoundTile } from './LastRoundTile';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const wrap = (node: React.ReactNode) => (
  <NavigationContainer>{node}</NavigationContainer>
);

describe('StatsTile', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('shows "—" when stats is null', () => {
    const { getByText } = render(wrap(<StatsTile stats={null} />));
    expect(getByText('—')).toBeTruthy();
    expect(getByText(/Play 3 rounds/)).toBeTruthy();
  });

  it('shows handicap and avg when stats are present', () => {
    const { getByText } = render(
      wrap(
        <StatsTile
          stats={{
            handicap: 12.4,
            roundsYtd: 6,
            scoringAverage: 84,
            last5Average: 82,
            last5DeltaVsHandicap: null,
            notable: null,
          }}
        />,
      ),
    );
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText(/avg 84/)).toBeTruthy();
  });
});

describe('AchievementsTile', () => {
  it('shows total earned and "X close" subtext', () => {
    const { getByText } = render(
      wrap(
        <AchievementsTile
          summary={{ totalEarned: 23, totalPoints: 540, completionPercentage: 57 }}
          inProgressCount={3}
        />,
      ),
    );
    expect(getByText(/23/)).toBeTruthy();
    expect(getByText(/3 close/)).toBeTruthy();
  });

  it('shows "—" when summary is null', () => {
    const { getByText } = render(
      wrap(<AchievementsTile summary={null} inProgressCount={0} />),
    );
    expect(getByText('—')).toBeTruthy();
  });
});

describe('CompetitionsTile', () => {
  it('shows active count', () => {
    const { getByText } = render(
      wrap(
        <CompetitionsTile
          competitions={[{ id: 'c-1', name: 'Spring', status: 'in-progress' } as any, { id: 'c-2', name: 'X', status: 'upcoming' } as any]}
          leagues={[]}
        />,
      ),
    );
    expect(getByText('2')).toBeTruthy();
  });

  it('shows empty subtext when nothing active', () => {
    const { getByText } = render(wrap(<CompetitionsTile competitions={[]} leagues={[]} />));
    expect(getByText(/No active comps/)).toBeTruthy();
  });
});

describe('LastRoundTile', () => {
  it('shows score, course and days-ago', () => {
    const recentDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { getByText } = render(
      wrap(
        <LastRoundTile
          round={{
            id: 'r-1',
            date: recentDate,
            userScore: { totalGross: 82, hasScorecard: true },
            course: { id: 'c-1', name: 'Royal Melb' },
          } as any}
        />,
      ),
    );
    expect(getByText('82')).toBeTruthy();
    expect(getByText(/Royal Melb · 4d ago/)).toBeTruthy();
  });

  it('shows empty subtext when no round', () => {
    const { getByText } = render(wrap(<LastRoundTile round={null} />));
    expect(getByText(/No completed rounds/)).toBeTruthy();
  });
});
