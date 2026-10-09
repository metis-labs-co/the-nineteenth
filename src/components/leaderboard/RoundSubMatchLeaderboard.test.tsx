import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';
import { create18Holes } from '@/__tests__/utils/testFixtures';

let mockRound: Record<string, unknown>;
let mockScorecards: Record<string, unknown>[];
let mockSubMatches: Record<string, unknown>[];
let mockTeams: Record<string, unknown>[];

jest.mock('@/hooks/rounds', () => ({
  useRoundDetails: () => ({ data: mockRound }),
  useRoundScorecards: () => ({ data: mockScorecards }),
  useSubMatches: () => ({ data: mockSubMatches, isLoading: false }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: mockTeams, isLoading: false }),
}));

function setupScoredMatch(persisted: Record<string, unknown> = {}) {
  mockRound = {
    id: 'r1', game_type: 'match-play', team_format: 'match-play-team',
    nine_type: 'back9', holes_played: 6, handicap_source: 'none',
    course: { holes: create18Holes() },
  };
  mockTeams = ['a', 'b'].map((side) => ({
    id: side, name: side === 'a' ? 'Reds' : 'Blues', color: null,
    members: [1, 2].map((n) => ({
      player_id: `${side}${n}`,
      player: { id: `${side}${n}`, name: `${side}${n}`, handicap: 0 },
    })),
  }));
  // Back-nine scores: Reds win holes 10 and 11; 12–15 are halved.
  // Stale scores after the end favor Blues, and must not decide the match.
  mockScorecards = ['a1', 'a2', 'b1', 'b2'].map((playerId) => ({
    player_id: playerId,
    scores: {
      '10': { strokes: playerId.startsWith('b') ? 5 : 4 },
      '11': { strokes: playerId.startsWith('b') ? 5 : 4 },
      '12': { strokes: 4 }, '13': { strokes: 4 },
      '14': { strokes: 4 }, '15': { strokes: 4 },
      '16': { strokes: playerId.startsWith('a') ? 5 : 4 },
      '17': { strokes: playerId.startsWith('a') ? 5 : 4 },
      '18': { strokes: playerId.startsWith('a') ? 5 : 4 },
    },
  }));
  mockSubMatches = [{
    id: 'sm1', team_a_player_ids: ['a1', 'a2'], team_b_player_ids: ['b1', 'b2'],
    status: 'in-progress', result: null, final_differential: null,
    final_holes_remaining: null, ...persisted,
  }];
}

describe('RoundSubMatchLeaderboard', () => {
  beforeEach(() => {
    mockRound = {
      id: 'r1',
      game_type: 'alt-shot',
      team_format: 'alt-shot',
      handicap_source: 'profile',
      selected_tee: null,
      course: { holes: [] },
    };
    mockScorecards = [];
    mockSubMatches = [];
    mockTeams = [];
  });
  it('renders the sub-match leaderboard for a round id (empty sub-matches → empty state)', () => {
    render(<RoundSubMatchLeaderboard roundId="r1" competitionId="c1" bottomInset={0} />);
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });

  it('preserves a persisted manual margin over conflicting scores (characterization)', () => {
    setupScoredMatch({
      status: 'completed', result: 'b-wins', final_differential: 6,
      final_holes_remaining: 5, manual_result: true,
    });
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('6&5');
  });

  it('preserves a persisted forfeit over conflicting scores (characterization)', () => {
    setupScoredMatch({ status: 'forfeited', result: 'forfeit-a' });
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('Forfeit');
  });

  it.each([true, false])('settles a back-nine match at six holes, ignoring stale scores (synthesized=%s)', (synthesized) => {
    setupScoredMatch({
      status: 'completed', result: 'b-wins', final_differential: 6,
      final_holes_remaining: 5, manual_result: false,
    });
    if (synthesized) mockSubMatches = [];
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('2 UP');
  });

  it('decides an ordinary front-nine team match over nine planned holes', () => {
    setupScoredMatch();
    mockRound = { ...mockRound, nine_type: 'front9', holes_played: null };
    mockSubMatches = [];
    mockScorecards = ['a1', 'a2', 'b1', 'b2'].map((playerId) => ({
      player_id: playerId,
      // Reds win the first five holes: a real nine-hole close-out is 5&4.
      scores: {
        '1': { strokes: playerId.startsWith('b') ? 5 : 4 },
        '2': { strokes: playerId.startsWith('b') ? 5 : 4 },
        '3': { strokes: playerId.startsWith('b') ? 5 : 4 },
        '4': { strokes: playerId.startsWith('b') ? 5 : 4 },
        '5': { strokes: playerId.startsWith('b') ? 5 : 4 },
      },
    }));
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('5&4');
  });
});
