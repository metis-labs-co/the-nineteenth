/**
 * MatchPlayLeaderboardTab — live team match-play leaderboard on the Review
 * screen. The shared leaderboard is mocked so the test can read the entries
 * and props the tab builds from the scorecard store.
 */

import React from 'react';
import { render } from '@/__tests__/utils/renderHelpers';
import { MatchPlayLeaderboardTab } from './MatchPlayLeaderboardTab';
import type { Hole } from '@/types';

type StoreScore = { strokes: number } | undefined;

let mockStoreState: {
  getPlayerScore: (playerId: string, holeNumber: number) => StoreScore;
  holesPlayed?: number | null;
} = { getPlayerScore: () => undefined };

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
}));

const mockTeams = [
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
];

jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: mockTeams, isLoading: false }),
}));

jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: jest.fn(() => ({ playingHandicap: 0 })),
}));

const mockLeaderboardProps = jest.fn();
jest.mock('@/components/leaderboard/MatchPlayLeaderboard', () => ({
  MatchPlayLeaderboard: (props: unknown) => {
    mockLeaderboardProps(props);
    return null;
  },
}));

/** `n` par-4 holes numbered 1..n, stroke index = hole number. */
function holesFrom(n: number): Hole[] {
  return Array.from({ length: n }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }) as Hole);
}

function renderTab(holes: Hole[]) {
  return render(
    <MatchPlayLeaderboardTab
      roundId="r1"
      holes={holes}
      roundDetails={undefined}
      currentUserId="a1"
      isRefreshing={false}
      onRefresh={() => {}}
      bottomInset={0}
    />
  );
}

function lastLeaderboardProps() {
  return mockLeaderboardProps.mock.calls[mockLeaderboardProps.mock.calls.length - 1][0] as {
    totalHoles?: number;
    entries: {
      teamName: string;
      scoreData: { matchResult?: string; holesUpDown: string; holesWon: number; holesHalved: number };
    }[];
  };
}

describe('MatchPlayLeaderboardTab', () => {
  beforeEach(() => {
    mockLeaderboardProps.mockClear();
    mockStoreState = { getPlayerScore: () => undefined };
  });

  it("passes the round's planned hole count to the leaderboard (9-hole match)", () => {
    // Reds win holes 1-2 (4 v 5) and halve 3-5; nothing after 5.
    mockStoreState = {
      getPlayerScore: (playerId, holeNumber) => {
        if (holeNumber > 5) return undefined;
        if (holeNumber <= 2) return { strokes: playerId === 'a1' ? 4 : 5 };
        return { strokes: 4 };
      },
    };

    renderTab(holesFrom(9));

    const props = lastLeaderboardProps();
    expect(props.totalHoles).toBe(9);
    expect(props.entries[0].teamName).toBe('Reds');
    expect(props.entries[0].scoreData).toEqual(
      expect.objectContaining({ holesUpDown: '2 UP', holesWon: 2, holesHalved: 3 })
    );
    expect(props.entries[0].scoreData.matchResult).toBeUndefined();
  });

  it('shows a match won on the last hole in the compact token: "2 UP"', () => {
    // 18 holes: halve 1-16 (4 v 4), Reds win 17-18 (4 v 5). Engine margin '2 up'.
    mockStoreState = {
      getPlayerScore: (playerId, holeNumber) =>
        holeNumber >= 17 ? { strokes: playerId === 'a1' ? 4 : 5 } : { strokes: 4 },
    };

    renderTab(holesFrom(18));

    const props = lastLeaderboardProps();
    expect(props.entries[0].scoreData).toEqual(
      expect.objectContaining({ matchResult: 'win', holesUpDown: '2 UP' })
    );
    expect(props.entries[1].scoreData).toEqual(
      expect.objectContaining({ matchResult: 'loss', holesUpDown: '2 UP' })
    );
  });

  it('shows a close-out in the compact token: "3&2"', () => {
    // 18 holes: Reds win 1-3 (4 v 5), halve 4-16, 17-18 unplayed. Engine margin '3 & 2'.
    mockStoreState = {
      getPlayerScore: (playerId, holeNumber) => {
        if (holeNumber > 16) return undefined;
        if (holeNumber <= 3) return { strokes: playerId === 'a1' ? 4 : 5 };
        return { strokes: 4 };
      },
    };

    renderTab(holesFrom(18));

    expect(lastLeaderboardProps().entries[0].scoreData).toEqual(
      expect.objectContaining({ matchResult: 'win', holesUpDown: '3&2' })
    );
  });
});
