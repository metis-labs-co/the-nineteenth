/**
 * SubMatchesTab — basic render / mode-switching tests
 *
 * Covers the happy paths:
 *   - Match-play mode shows the status/result text block.
 *   - Stroke mode shows "Team A N · Team B N" when scorecards carry net totals.
 *   - Organizer sees per-side forfeit buttons; non-organizer does not.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SubMatchesTab } from './SubMatchesTab';
import type { SubMatch } from '@/types';

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockUseSubMatches = jest.fn<unknown, [string | undefined]>();
const mockUseRoundScorecards = jest.fn<unknown, [string | undefined]>();
const mockUseUpdateSubMatchResult = jest.fn<unknown, [string | undefined]>(() => ({
  mutateAsync: jest.fn(),
}));
const mockUseUpdateSubMatchTeeTime = jest.fn<unknown, [string | undefined]>(() => ({
  mutateAsync: jest.fn(),
}));

jest.mock('@/hooks/rounds', () => ({
  useSubMatches: (roundId: string | undefined) => mockUseSubMatches(roundId),
  useRoundScorecards: (roundId: string | undefined) => mockUseRoundScorecards(roundId),
  useUpdateSubMatchResult: (roundId: string | undefined) =>
    mockUseUpdateSubMatchResult(roundId),
  useUpdateSubMatchTeeTime: (roundId: string | undefined) =>
    mockUseUpdateSubMatchTeeTime(roundId),
  // New hooks introduced by the "Groups" mode — split-mode tests don't
  // exercise these paths, so stub them with no-op data.
  usePairings: () => ({ data: [], isLoading: false }),
  useAutoGeneratePairings: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useReplacePairings: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdatePairing: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({
    teams: [],
    isLoading: false,
    error: null,
    getPlayerTeam: () => undefined,
    refetch: jest.fn(),
  }),
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
