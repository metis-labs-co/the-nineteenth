import React from 'react';
import { render, fireEvent } from '@/__tests__/utils/renderHelpers';
import { TeamHeadToHeadCard } from './TeamHeadToHeadCard';
import type { TeamLeaderboardEntry } from './TeamLeaderboardTable';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const rounds = [
  { id: 'r1', display_order: 1, course: { name: 'Old Course' } },
  { id: 'r2', display_order: 2, course: { name: 'West Course' } },
] as unknown as RoundWithCourse[];

const england: TeamLeaderboardEntry = {
  teamId: 'eng',
  teamName: 'England',
  avgHandicap: 12.4,
  totalPoints: 22,
  members: [{ playerId: 'p1', playerName: 'Sam Kay', handicap: 10 }],
  roundBreakdown: [
    { roundId: 'r1', roundLabel: 'R1', courseName: 'Old Course', position: 1, points: 12 },
    { roundId: 'r2', roundLabel: 'R2', courseName: 'West Course', position: 2, points: 10 },
  ],
};
const australia: TeamLeaderboardEntry = {
  teamId: 'aus',
  teamName: 'Australia',
  avgHandicap: 10.1,
  totalPoints: 14,
  members: [{ playerId: 'p2', playerName: 'Andrew Biggs', handicap: 8 }],
  roundBreakdown: [
    { roundId: 'r1', roundLabel: 'R1', courseName: 'Old Course', position: 2, points: 8 },
    { roundId: 'r2', roundLabel: 'R2', courseName: 'West Course', position: 1, points: 6 },
  ],
};
const colors = new Map([
  ['eng', '#1e40af'],
  ['aus', '#eab308'],
]);

describe('TeamHeadToHeadCard', () => {
  it('renders both teams and their big totals, leader first', () => {
    const { getByText, getByTestId } = render(
      <TeamHeadToHeadCard entries={[australia, england]} teamColors={colors} rounds={rounds} testID="h2h" />
    );
    expect(getByText('England')).toBeTruthy();
    expect(getByText('Australia')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
    expect(getByText('14')).toBeTruthy();
    // leader (England, 22) shown in the left column
    expect(getByTestId('h2h-team-left')).toHaveTextContent('England', { exact: false });
  });

  it('shows the "You" badge only on the current user\'s team', () => {
    const { getByTestId, queryAllByText } = render(
      <TeamHeadToHeadCard
        entries={[england, australia]}
        teamColors={colors}
        currentUserId="p2"
        rounds={rounds}
        testID="h2h"
      />
    );
    expect(getByTestId('h2h-team-right')).toHaveTextContent('Australia', { exact: false });
    expect(queryAllByText('You').length).toBe(1);
  });

  it('expands to show the per-round breakdown in two columns', () => {
    const { getByTestId, queryByText, getByText } = render(
      <TeamHeadToHeadCard entries={[england, australia]} teamColors={colors} rounds={rounds} testID="h2h" />
    );
    expect(queryByText('Round Breakdown')).toBeNull();
    fireEvent.press(getByTestId('h2h-card'));
    expect(getByText('Round Breakdown')).toBeTruthy();
    expect(getByText('R1 · Old Course')).toBeTruthy();
    // R1: England 12 vs Australia 8 aligned in the row
    expect(getByTestId('h2h-round-r1')).toHaveTextContent('12', { exact: false });
    expect(getByTestId('h2h-round-r1')).toHaveTextContent('8', { exact: false });
  });
});
