/**
 * StrokePlayLeaderboardFull Component Tests
 *
 * Focus: the optional onPlayerPress behaviour that makes leaderboard rows
 * tappable so a player's individual scorecard can be opened.
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { StrokePlayLeaderboardFull } from './StrokePlayLeaderboardFull';
import { createTestPlayers, create18Holes } from '@/__tests__/utils/testFixtures';
import type { HoleScore } from '@/types';

const players = createTestPlayers(2);
const holes = create18Holes();

// Every player has a single-ball score on every hole so the leaderboard
// renders rows (it shows an empty state until at least one hole is scored).
const getPlayerScore = () => ({ strokes: 4 }) as unknown as HoleScore;

describe('StrokePlayLeaderboardFull', () => {
  it('renders plain, non-button rows when onPlayerPress is not provided', () => {
    render(
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
      />,
    );
    expect(screen.queryByLabelText(/place: Player 1,/)).toBeTruthy();
    // No row is exposed as a button without a press handler.
    expect(screen.queryByRole('button', { name: /place: Player 1,/ })).toBeNull();
  });

  it('calls onPlayerPress with the player id when a row is tapped', () => {
    const onPlayerPress = jest.fn();
    render(
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        onPlayerPress={onPlayerPress}
      />,
    );
    fireEvent.press(screen.getByLabelText(/place: Player 1,/));
    expect(onPlayerPress).toHaveBeenCalledWith('player-1');
  });
});
