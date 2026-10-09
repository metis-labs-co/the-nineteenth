/** Public prop seam: planned holes and the raw cutoff, not match calculations. */
import React from 'react';
import { render } from '@/__tests__/utils/renderHelpers';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { Hole } from '@/types';
import { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';

const mockTabProps = jest.fn();
let mockRound: Record<string, unknown> | undefined;

jest.mock('@/hooks/rounds', () => ({
  useRoundDetails: () => ({ data: mockRound }),
  useRoundScorecards: () => ({ data: [] }),
}));
jest.mock('./SubMatchLeaderboardTab', () => ({
  SubMatchLeaderboardTab: (props: Record<string, unknown>) => {
    mockTabProps(props);
    return null;
  },
}));

function boardProps() {
  return mockTabProps.mock.calls[0][0] as {
    holes: Hole[];
    holesPlayed?: number | null;
  };
}

describe('RoundSubMatchLeaderboard holes', () => {
  beforeEach(() => mockTabProps.mockClear());

  it('passes back-9 planned holes and the raw six-hole cutoff', () => {
    mockRound = {
      id: 'r1', game_type: 'match-play', team_format: 'match-play-team',
      nine_type: 'back9', holes_played: 6, course: { holes: create18Holes() },
    };
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(boardProps().holes.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(boardProps().holesPlayed).toBe(6);
  });

  it('passes front-9 planned holes and a null cutoff for a round played as planned', () => {
    mockRound = {
      id: 'r1', game_type: 'match-play', nine_type: 'front9',
      course: { holes: create18Holes() },
    };
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(boardProps().holes.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(boardProps().holesPlayed).toBeNull();
  });

  it.each([0, -3, 2.5, NaN])('forwards raw invalid cutoff %s without mutating metadata', (cutoff) => {
    const holes = create18Holes();
    mockRound = { nine_type: 'back9', holes_played: cutoff, course: { holes } };
    render(<RoundSubMatchLeaderboard roundId="r1" />);
    expect(boardProps().holesPlayed).toBe(cutoff);
    expect(mockRound.holes_played).toBe(cutoff);
    expect(holes).toHaveLength(18);
  });

  it.each(['full', null, undefined])(
    'keeps all competition holes when nine_type is %s (characterization)',
    (nineType) => {
      const holes = create18Holes();
      mockRound = {
        id: 'r1', competition_id: 'c1', game_type: 'alt-shot',
        nine_type: nineType, course: { holes },
      };
      render(<RoundSubMatchLeaderboard roundId="r1" competitionId="c1" />);
      expect(boardProps().holes).toEqual(holes);
      expect(boardProps().holesPlayed ?? null).toBeNull();
    },
  );

  it.each([undefined, {}, { course: null }, { course: {} }])(
    'keeps an empty hole list with missing metadata %j (characterization)',
    (round) => {
      mockRound = round;
      render(<RoundSubMatchLeaderboard roundId="r1" />);
      expect(boardProps().holes).toEqual([]);
      expect(boardProps().holesPlayed ?? null).toBeNull();
    },
  );
});
