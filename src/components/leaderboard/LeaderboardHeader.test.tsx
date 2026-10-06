import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { LeaderboardHeader } from './LeaderboardHeader';

describe('LeaderboardHeader round title', () => {
  it('shows the round name when provided', () => {
    render(
      <LeaderboardHeader gameType="alt-shot" isTeamRound roundNumber={4} roundName="2v2 Alt Shot" />
    );
    expect(screen.getByText('2v2 Alt Shot')).toBeTruthy();
    expect(screen.queryByText('Round 4')).toBeNull();
  });

  it('falls back to "Round N" when roundName is null', () => {
    render(
      <LeaderboardHeader gameType="stableford" isTeamRound={false} roundNumber={2} roundName={null} />
    );
    expect(screen.getByText('Round 2')).toBeTruthy();
  });

  it('falls back to "Round N" when roundName is whitespace', () => {
    render(
      <LeaderboardHeader gameType="stableford" isTeamRound={false} roundNumber={3} roundName="   " />
    );
    expect(screen.getByText('Round 3')).toBeTruthy();
  });
});
