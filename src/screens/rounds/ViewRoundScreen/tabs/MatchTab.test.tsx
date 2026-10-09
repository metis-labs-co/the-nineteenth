import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { MatchTab } from './MatchTab';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { RoundLeaderboardResponse } from '@/hooks/useRoundLeaderboard';

const mockTableProps = jest.fn();
const mockLeaderboardProps = jest.fn();
const mockUseSubMatches = jest.fn();

jest.mock('@/components/scorecard/MatchPlayScorecardTable', () => ({
  MatchPlayScorecardTable: (props: Record<string, unknown>) => {
    mockTableProps(props);
    const { MatchPlayScorecardTable } = jest.requireActual('@/components/scorecard/MatchPlayScorecardTable');
    return <MatchPlayScorecardTable {...props} />;
  },
}));
jest.mock('@/components/leaderboard/MatchPlayLeaderboard', () => ({
  MatchPlayLeaderboard: (props: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    mockLeaderboardProps(props);
    return <View testID="match-leaderboard"><Text>Leaderboard</Text></View>;
  },
}));
jest.mock('@/hooks/rounds', () => ({ useSubMatches: (roundId: string) => mockUseSubMatches(roundId) }));

const holes = create18Holes();
const PLAYERS = { player1: { id: 'p1', name: 'Sam' }, player2: { id: 'p2', name: 'Bob' } };
const baseProps = {
  isMatchPlayRound: true,
  isTeamMatchPlayRound: false,
  matchPlayPlayers: PLAYERS,
  holes,
  getPlayerScore: () => undefined,
  matchPlayData: undefined,
  currentUserId: 'p1',
  roundStatus: 'completed',
  isTeamRound: false,
};
const leaderboard: RoundLeaderboardResponse = {
  entries: [{ playerId: 'p1', playerName: 'Sam', handicap: 0, position: 1,
    competitionPoints: 1, isTeamResult: false, bypassed: false,
    scoreData: { type: 'match-play', matchResult: 'win', holesUpDown: '1 UP',
      opponentId: 'p2', opponentName: 'Bob', holesWon: 1, holesLost: 0, holesHalved: 5 },
  }],
  teamEntries: [], individualEntries: [], dnfEntries: [],
  metadata: { gameType: 'match-play', isTeamRound: false, teamFormat: null,
    roundFormat: 'combined', subMatchSize: null, rulesOverride: null,
    roundId: 'round-1', roundNumber: 1, status: 'completed' },
};

function renderMatchTab(overrides: Partial<React.ComponentProps<typeof MatchTab>> = {}) {
  return render(<MatchTab {...baseProps} {...overrides} />);
}

beforeEach(() => {
  mockUseSubMatches.mockReturnValue({ data: [] });
});

describe('MatchTab planned behavior', () => {
  it('keeps ordinary close-outs against the planned eighteen holes', () => {
    renderMatchTab({ getPlayerScore: (id, n) => n <= 10 ? (id === 'p1' ? 4 : 5) : undefined });
    expect(screen.getAllByText('S 10 & 8').length).toBeGreaterThan(0);
    expect(mockTableProps.mock.calls[0][0].holes).toHaveLength(18);
  });

  it('keeps all planned holes when no cutoff is supplied', () => {
    renderMatchTab();
    expect(screen.getByText('18')).toBeTruthy();
    expect(mockTableProps.mock.calls[0][0].holesPlayed).toBeNull();
  });

  it.each([['upcoming', 'Match Not Started'], ['completed', 'No Match Data Yet']])(
    'shows the empty state for %s rounds', (roundStatus, title) => {
      renderMatchTab({ roundStatus, matchPlayPlayers: null, holes: null });
      expect(screen.getByText(title)).toBeTruthy();
      expect(mockTableProps).not.toHaveBeenCalled();
      expect(mockLeaderboardProps).not.toHaveBeenCalled();
    }
  );

  it('shows a non-match empty state', () => {
    renderMatchTab({ isMatchPlayRound: false });
    expect(screen.getByText('No Match Data')).toBeTruthy();
  });

  it('keeps the singles-split leaderboard and forwards its context', () => {
    renderMatchTab({ isSplitRound: true, roundId: 'round-1', matchPlayData: leaderboard });
    expect(screen.getByText('Match Results')).toBeTruthy();
    expect(screen.getByTestId('match-leaderboard')).toBeTruthy();
    expect(mockLeaderboardProps).toHaveBeenCalledWith({ entries: leaderboard.entries,
      currentUserId: 'p1', roundStatus: 'completed', isTeamRound: false });
    expect(mockUseSubMatches).not.toHaveBeenCalled();
  });

  it('keeps team split Ryder Cup points and suppresses the leaderboard', () => {
    mockUseSubMatches.mockReturnValue({ data: [
      { status: 'completed', result: 'a-wins' },
      { status: 'completed', result: 'halved' },
      { status: 'forfeited', result: 'forfeit-a' },
      { status: 'in-progress', result: null },
    ] });
    renderMatchTab({ isSplitRound: true, isTeamRound: true, roundId: 'round-1',
      matchPlayPlayers: null, matchPlayData: leaderboard });
    expect(screen.getByText('Ryder Cup Points · 3/4 sub-matches complete')).toBeTruthy();
    expect(screen.getAllByText('1.5')).toHaveLength(2);
    expect(screen.queryByText('Match Results')).toBeNull();
    expect(screen.queryByText('No Match Data Yet')).toBeNull();
  });

  it('keeps an ordinary team leaderboard without a split aggregate', () => {
    renderMatchTab({ isTeamRound: true, isTeamMatchPlayRound: true, matchPlayPlayers: null,
      matchPlayData: leaderboard });
    expect(screen.getByTestId('match-leaderboard')).toBeTruthy();
    expect(mockUseSubMatches).not.toHaveBeenCalled();
  });
});

describe('MatchTab ended-round cutoff', () => {
  it('passes planned holes and cutoff while the real table settles the retained lead', () => {
    // Sam wins hole1; 2–6 halve. Stale scores from7 onwards favour Bob.
    renderMatchTab({ holesPlayed: 6, getPlayerScore: (id, n) => {
      if (n === 1) return id === 'p1' ? 4 : 5;
      if (n <= 6) return 4;
      return id === 'p1' ? 9 : 4;
    } });
    expect(mockTableProps.mock.calls[0][0].holes).toHaveLength(18);
    expect(mockTableProps.mock.calls[0][0].holesPlayed).toBe(6);
    expect(screen.getAllByText('S 1 up')).toHaveLength(2); // final-hole status and total result
    expect(screen.queryByText('18')).toBeNull();
    expect(screen.queryByText('B 11 & 7')).toBeNull();
  });

  it.each([undefined, null])('normalizes an omitted/null cutoff %s to planned play', (holesPlayed) => {
    renderMatchTab({ holesPlayed });
    expect(mockTableProps.mock.calls[0][0].holesPlayed).toBeNull();
    expect(screen.getByText('18')).toBeTruthy();
  });

  it('preserves a normal close-out already reached before the early cutoff', () => {
    renderMatchTab({ holesPlayed: 12,
      getPlayerScore: (id, n) => n <= 12 ? (id === 'p1' ? 4 : 5) : undefined });
    expect(screen.getAllByText('S 10 & 8').length).toBeGreaterThan(0);
    expect(screen.queryByText('18')).toBeNull();
  });

  it('ends an even match all square after the cutoff', () => {
    renderMatchTab({ holesPlayed: 6, getPlayerScore: () => 4 });
    expect(screen.getAllByText('HALVED').length).toBeGreaterThan(0);
    expect(screen.queryByText('18')).toBeNull();
  });

  it('keeps the planned back nine and renders only holes 10–15', () => {
    renderMatchTab({ holes: holes.slice(9), holesPlayed: 6, getPlayerScore: () => 4 });
    expect(mockTableProps.mock.calls[0][0].holes).toHaveLength(9);
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
    expect(screen.getAllByText('HALVED').length).toBeGreaterThan(0);
  });
});
