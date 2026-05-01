/**
 * SubMatchesTab — basic render / mode-switching tests
 *
 * Covers the happy paths:
 *   - Match-play mode shows the status/result text block.
 *   - Stroke mode shows "Team A N · Team B N" when scorecards carry net totals.
 *   - Organizer sees per-side forfeit buttons; non-organizer does not.
 */

import React from 'react';
import { fireEvent, render, screen } from '@/__tests__/utils/renderHelpers';
import { SubMatchesTab } from './SubMatchesTab';
import type { SubMatch } from '@/types';

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockUseSubMatches = jest.fn<Record<string, unknown>, [string | undefined]>();
const mockUseRoundScorecards = jest.fn<unknown, [string | undefined]>();
const mockUseUpdateSubMatchResult = jest.fn<unknown, [string | undefined]>(() => ({
  mutateAsync: jest.fn(),
}));
const mockUseUpdateSubMatchTeeTime = jest.fn<unknown, [string | undefined]>(() => ({
  mutateAsync: jest.fn(),
}));

jest.mock('@/hooks/rounds', () => ({
  useSubMatches: (roundId: string | undefined) => ({
    refetch: jest.fn(),
    ...mockUseSubMatches(roundId),
  }),
  useRoundScorecards: (roundId: string | undefined) => mockUseRoundScorecards(roundId),
  useUpdateSubMatchResult: (roundId: string | undefined) =>
    mockUseUpdateSubMatchResult(roundId),
  useUpdateSubMatchTeeTime: (roundId: string | undefined) =>
    mockUseUpdateSubMatchTeeTime(roundId),
  // New hooks introduced by the "Groups" mode — split-mode tests don't
  // exercise these paths, so stub them with no-op data.
  usePairings: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
  useAutoGeneratePairings: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useReplacePairings: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdatePairing: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/competitions', () => ({
  useCompetitionLeaderboard: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/hooks/scoringPairs', () => ({
  useAutoGenerateScoringPairs: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useGenerateTeamMatchPlayPairs: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useCreateScoringPairs: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

const mockUseRoundTeams = jest.fn(() => ({
  teams: [] as { id: string; name: string; members: { player_id: string }[] }[],
  isLoading: false,
  error: null,
  getPlayerTeam: () => undefined,
  refetch: jest.fn(),
}));

jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => mockUseRoundTeams(),
}));

jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundPlayers: () => ({
    data: [
      { id: 'p1', name: 'Alice', handicap: 8 },
      { id: 'p2', name: 'Bob', handicap: 14 },
      { id: 'p3', name: 'Carol', handicap: 5 },
      { id: 'p4', name: 'Dan', handicap: 22 },
    ],
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, player: null }),
}));

// Stub the ScoringPairsSection to a sentinel so tests can assert on its
// presence without dragging in the full scoring-pairs data layer.
jest.mock('@/components/rounds/ViewRound/RoundDetailsTab/components', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    ScoringPairsSection: () => <View testID="scoring-pairs-section-inline" />,
  };
});

// ConfirmationDialog pulls in hooks we don't need to exercise here.
jest.mock('@/components/common', () => {
  const actual = jest.requireActual('@/components/common');
  return {
    ...actual,
    ConfirmationDialog: () => null,
    GolfBallLoader: () => null,
  };
});

function makeSubMatch(overrides: Partial<SubMatch> = {}): SubMatch {
  return {
    id: 'sm-1',
    round_id: 'round-1',
    sort_order: 0,
    team_a_player_ids: ['p1', 'p2'],
    team_b_player_ids: ['p3', 'p4'],
    tee_time: '08:00:00',
    pairing_id: null,
    status: 'upcoming',
    result: null,
    final_differential: null,
    team_a_net_total: null,
    team_b_net_total: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('SubMatchesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateSubMatchResult.mockImplementation(() => ({ mutateAsync: jest.fn() }));
    mockUseRoundScorecards.mockReturnValue({ data: [], isLoading: false });
    mockUseRoundTeams.mockReturnValue({
      teams: [],
      isLoading: false,
      error: null,
      getPlayerTeam: () => undefined,
      refetch: jest.fn(),
    });
  });

  describe('Empty + loading states', () => {
    it('renders the empty state when no sub-matches exist', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });

      render(<SubMatchesTab roundId="round-1" isSplitRound />);

      expect(screen.getByText(/No Sub-Matches/i)).toBeTruthy();
    });
  });

  describe('Match-play mode', () => {
    it('renders the status text for an upcoming sub-match', () => {
      mockUseSubMatches.mockReturnValue({
        data: [makeSubMatch({ status: 'upcoming' })],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound />);

      expect(screen.getByText('Sub-Match 1')).toBeTruthy();
      expect(screen.getByText('Upcoming')).toBeTruthy();
    });

    it('renders the final result text for a completed sub-match', () => {
      mockUseSubMatches.mockReturnValue({
        data: [
          makeSubMatch({
            status: 'completed',
            result: 'a-wins',
            final_differential: 3,
          }),
        ],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound />);

      expect(screen.getByText(/Team A won/i)).toBeTruthy();
    });
  });

  describe('Stroke (pairs-aggregate) mode', () => {
    it('renders Team A/B net totals when gameType is stroke-based', () => {
      mockUseSubMatches.mockReturnValue({
        data: [makeSubMatch()],
        isLoading: false,
      });
      mockUseRoundScorecards.mockReturnValue({
        data: [
          { player: { id: 'p1' }, total_net: 72 },
          { player: { id: 'p2' }, total_net: 78 },
          { player: { id: 'p3' }, total_net: 70 },
          { player: { id: 'p4' }, total_net: 82 },
        ],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound gameType="stroke" />);

      // Team A: 72 + 78 = 150, Team B: 70 + 82 = 152
      expect(screen.getByText('Team A 150 · Team B 152')).toBeTruthy();
    });

    it('shows the pairs-aggregate header with overall totals', () => {
      mockUseSubMatches.mockReturnValue({
        data: [
          makeSubMatch({ id: 'sm-1', sort_order: 0 }),
          makeSubMatch({
            id: 'sm-2',
            sort_order: 1,
            team_a_player_ids: ['p3'],
            team_b_player_ids: ['p4'],
          }),
        ],
        isLoading: false,
      });
      mockUseRoundScorecards.mockReturnValue({
        data: [
          { player: { id: 'p1' }, total_net: 70 },
          { player: { id: 'p2' }, total_net: 75 },
          { player: { id: 'p3' }, total_net: 72 },
          { player: { id: 'p4' }, total_net: 80 },
        ],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound gameType="stableford" />);

      expect(screen.getByText(/Pairs Aggregate/i)).toBeTruthy();
    });
  });

  describe('Forfeit actions', () => {
    it('shows per-side forfeit buttons for organizers on upcoming sub-matches', () => {
      mockUseSubMatches.mockReturnValue({
        data: [makeSubMatch()],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound isOrganizer={true} />);

      expect(screen.getByLabelText('Forfeit Team A')).toBeTruthy();
      expect(screen.getByLabelText('Forfeit Team B')).toBeTruthy();
    });

    it('hides forfeit buttons for non-organizers', () => {
      mockUseSubMatches.mockReturnValue({
        data: [makeSubMatch()],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound isOrganizer={false} />);

      expect(screen.queryByLabelText('Forfeit Team A')).toBeNull();
      expect(screen.queryByLabelText('Forfeit Team B')).toBeNull();
    });

    it('hides the Shuffle button for combined Scramble rounds (team-together strategy)', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });
      mockUseRoundTeams.mockReturnValue({
        teams: [
          { id: 't1', name: 'Team A', members: [{ player_id: 'p1' }, { player_id: 'p2' }] },
          { id: 't2', name: 'Team B', members: [{ player_id: 'p3' }, { player_id: 'p4' }] },
        ],
        isLoading: false,
        error: null,
        getPlayerTeam: () => undefined,
        refetch: jest.fn(),
      });

      render(
        <SubMatchesTab
          roundId="round-1"
          isOrganizer
          isTeamRound
          teamFormat="scramble"
          gameType="scramble"
        />
      );

      expect(screen.queryByTestId('groups-shuffle-button')).toBeNull();
    });

    it('shows the Shuffle button for team-balanced rounds (best-ball team round)', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });
      mockUseRoundTeams.mockReturnValue({
        teams: [
          { id: 't1', name: 'Team A', members: [{ player_id: 'p1' }, { player_id: 'p2' }] },
          { id: 't2', name: 'Team B', members: [{ player_id: 'p3' }, { player_id: 'p4' }] },
        ],
        isLoading: false,
        error: null,
        getPlayerTeam: () => undefined,
        refetch: jest.fn(),
      });

      render(
        <SubMatchesTab
          roundId="round-1"
          isOrganizer
          isTeamRound
          teamFormat="best-ball"
          gameType="stableford"
        />
      );

      expect(screen.getByTestId('groups-shuffle-button')).toBeTruthy();
    });

    it('shows the Shuffle button for non-team rounds (snake-draft strategy)', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });
      // teams default to [] via beforeEach.

      render(
        <SubMatchesTab
          roundId="round-1"
          isOrganizer
          isTeamRound={false}
          gameType="stableford"
        />
      );

      expect(screen.getByTestId('groups-shuffle-button')).toBeTruthy();
    });

    it('no longer renders the Scoring pairs action button', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });

      render(
        <SubMatchesTab
          roundId="round-1"
          competitionId="comp-1"
          isOrganizer
          scoringPairsEnabled
          roundStatus="upcoming"
          gameType="stableford"
        />
      );

      // Management moved to Round Settings — this screen shows only a
      // read-only summary, never an edit/navigate action button here.
      expect(screen.queryByTestId('groups-scoring-pairs-button')).toBeNull();
    });

    it('shows sub-tabs and switches to Scoring Pairs view when enabled', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });

      render(
        <SubMatchesTab
          roundId="round-1"
          competitionId="comp-1"
          isOrganizer
          scoringPairsEnabled
          roundStatus="upcoming"
          gameType="stableford"
        />
      );

      // Sub-tab bar present with both labels.
      expect(screen.getByText('Groups')).toBeTruthy();
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();

      // Default view is Groups — shuffle button visible, pair summary hidden.
      expect(screen.getByTestId('groups-shuffle-button')).toBeTruthy();
      expect(screen.queryByTestId('scoring-pairs-section-inline')).toBeNull();

      // Tapping the Scoring Pairs sub-tab swaps the content.
      fireEvent.press(screen.getByText('Scoring Pairs'));

      expect(screen.queryByTestId('groups-shuffle-button')).toBeNull();
      expect(screen.getByTestId('scoring-pairs-section-inline')).toBeTruthy();
    });

    it('omits the sub-tab bar and the Scoring Pairs section when disabled', () => {
      mockUseSubMatches.mockReturnValue({ data: [], isLoading: false });

      render(
        <SubMatchesTab
          roundId="round-1"
          competitionId="comp-1"
          isOrganizer
          scoringPairsEnabled={false}
          roundStatus="upcoming"
          gameType="stableford"
        />
      );

      // No "Scoring Pairs" sub-tab label anywhere on the screen.
      expect(screen.queryByText('Scoring Pairs')).toBeNull();
      expect(screen.queryByTestId('scoring-pairs-section-inline')).toBeNull();
      // Groups view renders directly — shuffle button still visible.
      expect(screen.getByTestId('groups-shuffle-button')).toBeTruthy();
    });

    it('renders the tee-time pill as non-editable once the round is in-progress', () => {
      mockUseSubMatches.mockReturnValue({
        data: [makeSubMatch()],
        isLoading: false,
      });

      render(
        <SubMatchesTab
          roundId="round-1"
          isSplitRound
          isOrganizer
          roundStatus="in-progress"
        />
      );

      expect(screen.queryByLabelText('Edit tee time for Sub-Match 1')).toBeNull();
    });

    it('keeps the tee-time pill editable for organizers while the round is upcoming', () => {
      mockUseSubMatches.mockReturnValue({
        data: [makeSubMatch()],
        isLoading: false,
      });

      render(
        <SubMatchesTab
          roundId="round-1"
          isSplitRound
          isOrganizer
          roundStatus="upcoming"
        />
      );

      expect(screen.getByLabelText('Edit tee time for Sub-Match 1')).toBeTruthy();
    });

    it('hides forfeit buttons on 1v1 (singles) sub-matches', () => {
      mockUseSubMatches.mockReturnValue({
        data: [
          makeSubMatch({
            team_a_player_ids: ['p1'],
            team_b_player_ids: ['p3'],
          }),
        ],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound isOrganizer={true} />);

      expect(screen.queryByLabelText('Forfeit Team A')).toBeNull();
      expect(screen.queryByLabelText('Forfeit Team B')).toBeNull();
    });

    it('hides forfeit buttons on completed sub-matches even for organizers', () => {
      mockUseSubMatches.mockReturnValue({
        data: [
          makeSubMatch({
            status: 'completed',
            result: 'halved',
          }),
        ],
        isLoading: false,
      });

      render(<SubMatchesTab roundId="round-1" isSplitRound isOrganizer={true} />);

      expect(screen.queryByLabelText('Forfeit Team A')).toBeNull();
    });
  });
});
