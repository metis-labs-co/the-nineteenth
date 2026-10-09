import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SubMatchLeaderboardTab, selectMatchSource } from './SubMatchLeaderboardTab';
import type { MatchPlayRowData } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

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
const mockColors = {
  surface: '#fff',
  border: '#eee',
  textPrimary: '#000',
  textSecondary: '#666',
  success: '#0a0',
  error: '#a00',
  warning: '#fa0',
  info: '#00a',
  primary: '#06f',
};
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
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

function setupMatch(synthesized: boolean, persisted = {}) {
  mockRoundTeamsReturn = {
    teams: ['a', 'b'].map((side, index) => ({
      id: `t${index + 1}`,
      name: index === 0 ? 'Reds' : 'Blues',
      color: null,
      members: [1, 2].map((n) => ({
        player_id: `${side}${n}`,
        player: { id: `${side}${n}`, name: `${side}${n}`, handicap: 0 },
      })),
    })),
    isLoading: false,
  };
  mockSubMatchesReturn = {
    data: synthesized
      ? []
      : [
          {
            id: 'sm1',
            team_a_player_ids: ['a1'],
            team_b_player_ids: ['b1'],
            status: 'in-progress',
            result: null,
            final_differential: null,
            final_holes_remaining: null,
            ...persisted,
          },
        ],
    isLoading: false,
  };
}

const matchProps = {
  roundId: 'r1',
  gameType: 'match-play' as const,
  holes: holes as import('@/types').Hole[],
  isRefreshing: false,
  onRefresh: () => {},
  bottomInset: 0,
};

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

  it.each([true, false])(
    'keeps a partial match in progress by default (synthesized=%s)',
    (synthesized) => {
      setupMatch(synthesized);
      const getStrokes = (pid: string, h: number) =>
        h > 6 ? undefined : h <= 2 && pid.startsWith('b') ? 5 : 4;
      const { rerender } = render(
        <SubMatchLeaderboardTab {...matchProps} getStrokes={getStrokes} />,
      );
      expect(screen.getByTestId('match-row-status')).toHaveTextContent('2 UP');
      rerender(
        <SubMatchLeaderboardTab {...matchProps} getStrokes={getStrokes} />,
      );
      expect(screen.getByTestId('match-row-status')).toHaveTextContent('2 UP');
    },
  );

  it.each([true, false])(
    'settles at the first real planned-nine close-out on cutoff-only rerenders (synthesized=%s)',
    (synthesized) => {
      setupMatch(synthesized);
      const plannedHoles = holes.map((h) => ({
        ...h,
        number: h.number + 9,
      })) as import('@/types').Hole[];
      const getStrokes = (pid: string, h: number) =>
        h > 15 ? undefined : h <= 14 && pid.startsWith('b') ? 5 : 4;
      const props = { ...matchProps, holes: plannedHoles, getStrokes };
      const { rerender } = render(
        <SubMatchLeaderboardTab {...props} holesPlayed={null} />,
      );
      expect(screen.getByTestId('match-row-status')).toHaveTextContent('5&3');
      rerender(<SubMatchLeaderboardTab {...props} holesPlayed={6} />);
      expect(screen.getByTestId('match-row-status')).toHaveTextContent('5&4');
      rerender(<SubMatchLeaderboardTab {...props} holesPlayed={null} />);
      expect(screen.getByTestId('match-row-status')).toHaveTextContent('5&3');
    },
  );

  it.each([true, false])(
    'ignores stale scores after an ended-early level match (synthesized=%s)',
    (synthesized) => {
      setupMatch(synthesized);
      const getStrokes = (pid: string, h: number) =>
        h > 6 && pid.startsWith('b') ? 5 : 4;
      render(
        <SubMatchLeaderboardTab
          {...matchProps}
          getStrokes={getStrokes}
          holesPlayed={6}
        />,
      );
      expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
    },
  );

  it.each([true, false])(
    'preserves manual precedence after an early end (manual=%s)',
    (manual) => {
      setupMatch(false, {
        status: 'completed',
        result: 'b-wins',
        final_differential: 6,
        final_holes_remaining: 5,
        manual_result: manual,
      });
      const getStrokes = (pid: string, h: number) =>
        h > 6 ? undefined : h <= 2 && pid.startsWith('b') ? 5 : 4;
      render(
        <SubMatchLeaderboardTab
          {...matchProps}
          getStrokes={getStrokes}
          holesPlayed={6}
        />,
      );
      expect(screen.getByTestId('match-row-status')).toHaveTextContent(
        manual ? '6&5' : '2 UP',
      );
    },
  );

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

// ---------------------------------------------------------------------------
// selectMatchSource — live-vs-persisted source selection logic (FIX 1)
// ---------------------------------------------------------------------------
describe('selectMatchSource', () => {
  const liveDecided: MatchPlayRowData = {
    statusText: '2 UP',
    leaderSide: 'b',
    isComplete: true,
    hasScores: true,
  };
  const liveUndecided: MatchPlayRowData = {
    statusText: 'A/S',
    leaderSide: null,
    isComplete: false,
    hasScores: false,
  };
  const persistedManual = {
    holesUpDown: '3UP',
    leaderSide: 'a' as const,
    hasScores: true,
    isManual: false,
  };
  const persistedManual6and5 = {
    holesUpDown: '6&5',
    leaderSide: 'a' as const,
    hasScores: true,
    isManual: false,
  };

  it('(a) prefers live when live.isComplete is true and the persisted result is not manual', () => {
    // Scored sub-match: live is decided (isComplete) and persisted.isManual is
    // false. The live margin wins — a non-manual persisted result must not
    // override real scores.
    const source = selectMatchSource(liveDecided, persistedManual);
    expect(source).toBe(liveDecided);
    expect(source.statusText).toBe('2 UP');
    expect(source.leaderSide).toBe('b');
  });

  it('(b) falls back to persisted "6&5" when live has no scores and a manual result exists', () => {
    // No-scores sub-match with an organiser-entered manual result.
    // Live is undecided (isComplete: false, hasScores: false), so the
    // persisted "6&5" is the only result available and should be shown.
    const source = selectMatchSource(liveUndecided, persistedManual6and5);
    expect(source.statusText).toBe('6&5');
    expect(source.leaderSide).toBe('a');
    expect(source.isComplete).toBe(true);
  });

  it('returns live when there is no persisted result and live is undecided', () => {
    const source = selectMatchSource(liveUndecided, null);
    expect(source).toBe(liveUndecided);
    expect(source.statusText).toBe('A/S');
    expect(source.isComplete).toBe(false);
  });
});
