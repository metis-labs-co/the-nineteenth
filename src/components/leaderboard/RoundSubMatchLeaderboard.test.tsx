import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';

jest.mock('@/hooks/rounds', () => ({
  useRoundDetails: () => ({
    data: {
      id: 'r1',
      game_type: 'alt-shot',
      team_format: 'alt-shot',
      handicap_source: 'profile',
      selected_tee: null,
      course: { holes: [] },
    },
  }),
  useRoundScorecards: () => ({ data: [] }),
  useSubMatches: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: [], isLoading: false }),
}));

describe('RoundSubMatchLeaderboard', () => {
  it('renders the sub-match leaderboard for a round id (empty sub-matches → empty state)', () => {
    render(<RoundSubMatchLeaderboard roundId="r1" competitionId="c1" bottomInset={0} />);
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });
});
