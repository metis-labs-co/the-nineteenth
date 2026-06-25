import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff', border: '#eee', textPrimary: '#000', textSecondary: '#666',
    success: '#0a0', error: '#a00',
  }),
}));
jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({
    data: [
      { id: 'sm1', round_id: 'r1', sort_order: 0, team_a_player_ids: ['a1'], team_b_player_ids: ['b1'], tee_time: null, pairing_id: null, status: 'in-progress', result: null, final_differential: null, team_a_net_total: null, team_b_net_total: null, created_at: '', updated_at: '' },
    ],
    isLoading: false,
  }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({
    teams: [
      { id: 't1', name: 'Reds', color: null, members: [{ player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } }] },
      { id: 't2', name: 'Blues', color: null, members: [{ player_id: 'b1', player: { id: 'b1', name: 'Bob', handicap: 0 } }] },
    ],
    isLoading: false,
  }),
}));
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: () => ({ playingHandicap: 0 }),
}));
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: (sel: any) => sel({ getPlayerScore: () => undefined }),
}));

const holes = Array.from({ length: 9 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));

describe('SubMatchLeaderboardTab', () => {
  it('renders a match-play row for a singles sub-match', () => {
    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        competitionId="c1"
        gameType="match-play"
        teamFormat={null}
        holes={holes as any}
        currentUserId="a1"
        selectedTeeData={null}
        handicapSource={"manual" as any}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
      />
    );
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
  });
});
