import React from 'react';
import { fireEvent, render, screen } from '@/__tests__/utils/renderHelpers';
import { ScrambleTeamLeaderboard } from './ScrambleTeamLeaderboard';
import type { Hole, Player } from '@/types';

const holes = [1, 2, 3].map((n) => ({
  id: `hole-${n}`,
  courseId: 'course-1',
  number: n,
  par: 4,
  strokeIndex: n,
})) as Hole[];

const players = [
  { id: 'p1', name: 'Alice Able', handicap: 10 },
  { id: 'p2', name: 'Bob Baker', handicap: 20 },
] as Player[];

const teams = [{ id: 't1', name: 'Team One', memberIds: ['p1', 'p2'] }];

function renderBoard(props: Partial<React.ComponentProps<typeof ScrambleTeamLeaderboard>> = {}) {
  return render(
    <ScrambleTeamLeaderboard
      teams={teams}
      players={players}
      holes={holes}
      getTeamScore={(_team, hole) => (hole === 1 ? { strokes: 4 } : undefined)}
      currentUserId="p1"
      {...props}
    />
  );
}

describe('ScrambleTeamLeaderboard', () => {
  it('expands a team row to show members and collapses on a second press', () => {
    renderBoard();
    expect(screen.queryByText('Team Members')).toBeNull();

    fireEvent.press(screen.getByText('Team One'));
    expect(screen.getByText('Team Members')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Bob Baker')).toBeTruthy();

    fireEvent.press(screen.getByText('Team One'));
    expect(screen.queryByText('Team Members')).toBeNull();
  });

  it('does not make members tappable without onPlayerPress', () => {
    renderBoard();
    fireEvent.press(screen.getByText('Team One'));
    expect(screen.queryByRole('button', { name: /View Bob Baker/ })).toBeNull();
  });

  it('calls onPlayerPress for another member and keeps the row expanded', () => {
    const onPlayerPress = jest.fn();
    renderBoard({ onPlayerPress });
    fireEvent.press(screen.getByText('Team One'));

    fireEvent.press(screen.getByRole('button', { name: /View Bob Baker/ }));
    expect(onPlayerPress).toHaveBeenCalledWith('p2');
    expect(screen.getByText('Team Members')).toBeTruthy();
    // The current user's own row stays plain.
    expect(screen.queryByRole('button', { name: /View Alice Able/ })).toBeNull();
  });
});
