/**
 * MatchScorecardTabContent — the shared table is mocked to inspect the
 * planned-hole and cutoff props forwarded by the Review tab.
 */

import React from 'react';
import { render } from '@/__tests__/utils/renderHelpers';
import { MatchScorecardTabContent } from './MatchScorecardTabContent';
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
    members: [
      { player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } },
    ],
  },
  {
    id: 't2',
    name: 'Blues',
    color: null,
    members: [
      { player_id: 'b1', player: { id: 'b1', name: 'Bob', handicap: 0 } },
    ],
  },
];

jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: mockTeams, isLoading: false }),
}));

jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: jest.fn(() => ({ playingHandicap: 0 })),
}));

const mockTableProps = jest.fn();
jest.mock('@/components/scorecard/TeamMatchPlayScorecardTable', () => ({
  TeamMatchPlayScorecardTable: (props: unknown) => {
    mockTableProps(props);
    return null;
  },
}));

/** `n` par-4 holes numbered 1..n, stroke index = hole number. */
function holesFrom(n: number): Hole[] {
  return Array.from(
    { length: n },
    (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }) as Hole,
  );
}

function renderTab(holes: Hole[]) {
  return render(
    <MatchScorecardTabContent
      roundId="r1"
      holes={holes}
      roundDetails={undefined}
      isRefreshing={false}
      onRefresh={() => {}}
      bottomInset={0}
    />,
  );
}

function lastTableProps() {
  return mockTableProps.mock.calls[mockTableProps.mock.calls.length - 1][0] as {
    holes: Hole[];
    holesPlayed?: number | null;
  };
}

describe('MatchScorecardTabContent', () => {
  beforeEach(() => {
    mockTableProps.mockClear();
    mockStoreState = { getPlayerScore: () => undefined };
  });

  it.each([undefined, null])(
    'keeps planned back-nine holes with no cutoff (%s)',
    (holesPlayed) => {
      mockStoreState.holesPlayed = holesPlayed;
      const plannedHoles = holesFrom(18).slice(9);
      renderTab(plannedHoles);
      expect(lastTableProps().holes).toBe(plannedHoles);
      expect(lastTableProps().holesPlayed == null).toBe(true);
    },
  );
  it.each([9, 18])(
    'forwards cutoff-only rerenders while retaining %s planned holes',
    (count) => {
      const plannedHoles = holesFrom(18).slice(count === 9 ? 9 : 0);
      const tab = () => (
        <MatchScorecardTabContent
          roundId="r1"
          holes={plannedHoles}
          roundDetails={undefined}
          isRefreshing={false}
          onRefresh={() => {}}
          bottomInset={0}
        />
      );
      mockStoreState.holesPlayed = null;
      const { rerender } = render(tab());
      expect(lastTableProps().holesPlayed).toBeNull();
      mockStoreState.holesPlayed = 6;
      rerender(tab());
      expect(lastTableProps().holes).toBe(plannedHoles);
      expect(lastTableProps().holesPlayed).toBe(6);
      mockStoreState.holesPlayed = null;
      rerender(tab());
      expect(lastTableProps().holes).toBe(plannedHoles);
      expect(lastTableProps().holesPlayed).toBeNull();
    },
  );
});
