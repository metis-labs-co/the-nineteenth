import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MiniLeaderboardSection } from './MiniLeaderboardSection';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

const individual: MiniLeaderboardData = {
  above: { id: 'p2', position: 2, name: 'Jess Patel', points: 38, isCurrent: false },
  you: { id: 'p3', position: 3, name: 'You', points: 32, isCurrent: true },
  below: { id: 'p4', position: 4, name: 'Mike', points: 28, isCurrent: false },
};

const team: MiniLeaderboardData = {
  above: { id: 't1', position: 1, name: 'Eagles', points: 88, isCurrent: false },
  you: { id: 't2', position: 2, name: 'Hawks', points: 82, isCurrent: true },
  below: { id: 't3', position: 3, name: 'Falcons', points: 79, isCurrent: false },
};

describe('MiniLeaderboardSection', () => {
  it('renders both individual and team sub-sections when both provided', () => {
    const { getByTestId } = render(
      <MiniLeaderboardSection
        individual={individual}
        team={team}
        teamName="Hawks"
        onOpenLeaderboard={jest.fn()}
      />,
    );
    expect(getByTestId('mini-leaderboard-individual')).toBeTruthy();
    expect(getByTestId('mini-leaderboard-team')).toBeTruthy();
  });

  it('hides team sub-section when team is null', () => {
    const { queryByTestId } = render(
      <MiniLeaderboardSection
        individual={individual}
        team={null}
        onOpenLeaderboard={jest.fn()}
      />,
    );
    expect(queryByTestId('mini-leaderboard-team')).toBeNull();
  });

  it('renders nothing when individual is null', () => {
    const { queryByTestId } = render(
      <MiniLeaderboardSection
        individual={null}
        team={team}
        onOpenLeaderboard={jest.fn()}
      />,
    );
    expect(queryByTestId('mini-leaderboard-individual')).toBeNull();
    expect(queryByTestId('mini-leaderboard-team')).toBeNull();
    expect(queryByTestId('mini-leaderboard-card')).toBeNull();
  });

  it('calls onOpenLeaderboard("individual") when individual section pressed', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      <MiniLeaderboardSection
        individual={individual}
        team={null}
        onOpenLeaderboard={onOpen}
      />,
    );
    fireEvent.press(getByTestId('mini-leaderboard-individual'));
    expect(onOpen).toHaveBeenCalledWith('individual');
  });

  it('calls onOpenLeaderboard("team") when team section pressed', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      <MiniLeaderboardSection
        individual={individual}
        team={team}
        teamName="Hawks"
        onOpenLeaderboard={onOpen}
      />,
    );
    fireEvent.press(getByTestId('mini-leaderboard-team'));
    expect(onOpen).toHaveBeenCalledWith('team');
  });

  it('shows only the user own row, not the surrounding context rows', () => {
    const { queryByText, getByText } = render(
      <MiniLeaderboardSection
        individual={individual}
        team={null}
        onOpenLeaderboard={jest.fn()}
      />,
    );
    expect(getByText('You')).toBeTruthy();
    expect(queryByText('Jess Patel')).toBeNull();
    expect(queryByText('Mike')).toBeNull();
  });
});
