import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';

// ---------------------------------------------------------------------------
// Mutable mock state — set per test so both tests see different return values
// ---------------------------------------------------------------------------
let mockSubMatchesReturn: { data: unknown[]; isLoading: boolean } = {
  data: [],
  isLoading: false,
};
let mockRoundTeamsReturn: { teams: unknown[]; isLoading: boolean } = {
  teams: [],
  isLoading: false,
};

jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => mockSubMatchesReturn,
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => mockRoundTeamsReturn,
}));
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
    success: '#0a0',
    error: '#a00',
    warning: '#fa0',
    info: '#00a',
    primary: '#06f',
  }),
}));
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: () => ({ playingHandicap: 0 }),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const holes = Array.from({ length: 9 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SubMatchLeaderboardTab (decoupled)', () => {
  beforeEach(() => {
    mockSubMatchesReturn = { data: [], isLoading: false };
    mockRoundTeamsReturn = { teams: [], isLoading: false };
  });

  it('renders the empty state with an injected getStrokes and no scorecard store', () => {
    const getStrokes = jest.fn(() => undefined);
    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        gameType="alt-shot"
        teamFormat="alt-shot"
        holes={[]}
        getStrokes={getStrokes}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
      />
    );
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });

  it('renders empty state in non-scrolling mode (scrollable=false)', () => {
    const getStrokes = jest.fn(() => undefined);
    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        gameType="alt-shot"
        teamFormat="alt-shot"
        holes={[]}
        getStrokes={getStrokes}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
        scrollable={false}
      />
    );
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });

  it('renders a match-play row for a singles sub-match', () => {
    mockSubMatchesReturn = {
      data: [
        {
          id: 'sm1',
          round_id: 'r1',
          sort_order: 0,
          team_a_player_ids: ['a1'],
          team_b_player_ids: ['b1'],
          tee_time: null,
          pairing_id: null,
          status: 'in-progress',
          result: null,
          final_differential: null,
          team_a_net_total: null,
          team_b_net_total: null,
          created_at: '',
          updated_at: '',
        },
      ],
      isLoading: false,
    };
    mockRoundTeamsReturn = {
      teams: [
        {
          id: 't1',
          name: 'Reds',
          color: null,
          members: [{ player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } }],
        },
        {
          id: 't2',
          name: 'Blues',
          color: null,
          members: [{ player_id: 'b1', player: { id: 'b1', name: 'Bob', handicap: 0 } }],
        },
      ],
      isLoading: false,
    };

    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        competitionId="c1"
        gameType="match-play"
        teamFormat={null}
        holes={holes as any}
        currentUserId="a1"
        selectedTeeData={null}
        handicapSource={'manual' as any}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
        getStrokes={jest.fn(() => undefined)}
      />
    );
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
  });

  it('synthesizes a single team-vs-team row for a team match-play round with no sub-matches', () => {
    // Combined team match play: no sub_matches rows, but two full teams. The
    // leaderboard should render ONE match-play row labelled with team names
    // (not the per-member names, and not the empty state).
    mockSubMatchesReturn = { data: [], isLoading: false };
    mockRoundTeamsReturn = {
      teams: [
        {
          id: 't1',
          name: 'Reds',
          color: null,
          members: [
            { player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } },
            { player_id: 'a2', player: { id: 'a2', name: 'Sue', handicap: 0 } },
          ],
        },
        {
          id: 't2',
          name: 'Blues',
          color: null,
          members: [
            { player_id: 'b1', player: { id: 'b1', name: 'Bob', handicap: 0 } },
            { player_id: 'b2', player: { id: 'b2', name: 'Bea', handicap: 0 } },
          ],
        },
      ],
      isLoading: false,
    };

    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        competitionId="c1"
        gameType="match-play"
        teamFormat={'match-play-team' as any}
        holes={holes as any}
        selectedTeeData={null}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
        getStrokes={jest.fn(() => undefined)}
      />
    );
    expect(screen.queryByText('No Sub-Matches')).toBeNull();
    expect(screen.getByText('Reds')).toBeTruthy();
    expect(screen.getByText('Blues')).toBeTruthy();
    // Members are not listed individually on the whole-team row.
    expect(screen.queryByText('Sam')).toBeNull();
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
  });

  it('shows the empty state for a team match-play round with only one team', () => {
    mockSubMatchesReturn = { data: [], isLoading: false };
    mockRoundTeamsReturn = {
      teams: [
        {
          id: 't1',
          name: 'Reds',
          color: null,
          members: [{ player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } }],
        },
      ],
      isLoading: false,
    };

    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        gameType="match-play"
        teamFormat={'match-play-team' as any}
        holes={holes as any}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
        getStrokes={jest.fn(() => undefined)}
      />
    );
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });

  it('shows the forfeit outcome on an alt-shot sub-match instead of blank values', () => {
    mockSubMatchesReturn = {
      data: [
        {
          id: 'sm1',
          round_id: 'r1',
          sort_order: 0,
          team_a_player_ids: ['a1', 'a2'],
          team_b_player_ids: ['b1', 'b2'],
          tee_time: null,
          pairing_id: null,
          status: 'forfeited',
          result: 'forfeit-a', // side A (Reds) forfeited → Blues win
          final_differential: null,
          team_a_net_total: null,
          team_b_net_total: null,
          created_at: '',
          updated_at: '',
        },
      ],
      isLoading: false,
    };
    mockRoundTeamsReturn = {
      teams: [
        {
          id: 't1',
          name: 'Reds',
          color: null,
          members: [
            { player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } },
            { player_id: 'a2', player: { id: 'a2', name: 'Sue', handicap: 0 } },
          ],
        },
        {
          id: 't2',
          name: 'Blues',
          color: null,
          members: [
            { player_id: 'b1', player: { id: 'b1', name: 'Bob', handicap: 0 } },
            { player_id: 'b2', player: { id: 'b2', name: 'Bea', handicap: 0 } },
          ],
        },
      ],
      isLoading: false,
    };

    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        competitionId="c1"
        gameType="alt-shot"
        teamFormat="alt-shot"
        holes={holes as any}
        selectedTeeData={null}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
        getStrokes={jest.fn(() => undefined)}
      />
    );
    // Forfeit shown instead of blank "—" net values, and the winner stated.
    expect(screen.getByText('Forfeited')).toBeTruthy();
    expect(screen.getByText('Won')).toBeTruthy();
    expect(screen.getByTestId('net-card-status-0')).toHaveTextContent('Blues wins by forfeit');
  });
});
