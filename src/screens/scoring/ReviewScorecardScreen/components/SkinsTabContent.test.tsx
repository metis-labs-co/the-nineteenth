/**
 * Review SkinsTabContent — the live standings, "still in progress" gate and
 * results card use the round's hole counts (holes played after an early end).
 */
import React from 'react';
import { render } from '@/__tests__/utils/renderHelpers';
import { SkinsTabContent } from './SkinsTabContent';

const mockUseSkinsSummary = jest.fn();
jest.mock('@/hooks/useSkins', () => ({
  useSkinsSummary: (...args: unknown[]) => mockUseSkinsSummary(...args),
}));
jest.mock('@/hooks/skins', () => ({
  backfillSkinsResults: jest.fn(),
  useProcessSkinsHole: () => ({}),
  useProcessTeamSkinsHole: () => ({}),
}));
jest.mock('@/components/skins', () => ({
  SkinsResultsCard: jest.fn(() => null),
  SkinsSettlementCard: jest.fn(() => null),
  SkinsCurrentStandingsCard: jest.fn(() => null),
}));

const skinsComponents = jest.requireMock('@/components/skins') as Record<string, jest.Mock>;

const ENDED_AFTER_6 = { plannedHoles: 18, holesPlayed: 6 };

function summaryWith(holesCompleted: number) {
  return {
    game: {
      id: 'g1',
      round_id: 'r1',
      status: 'active',
      pot_type: 'per_hole',
      pot_value: 5,
      scoring_type: 'gross',
      is_team_skins: false,
      participant_ids: ['p1', 'p2'],
      participants: [],
    },
    results: Array.from({ length: holesCompleted }, (_, i) => ({ hole_number: i + 1 })),
    payouts: [],
    current_carryover: 0,
    holes_completed: holesCompleted,
    total_pot: 30,
    per_hole_value: 5,
  };
}

function renderTab() {
  return render(
    <SkinsTabContent
      skinsGameId="g1"
      holeCounts={ENDED_AFTER_6}
      isRefreshing={false}
      onRefresh={jest.fn()}
      bottomInset={0}
    />
  );
}

describe('Review SkinsTabContent hole counts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prices the summary and live standings over the holes played', () => {
    mockUseSkinsSummary.mockReturnValue({ data: summaryWith(4), isLoading: false, refetch: jest.fn() });

    renderTab();

    expect(mockUseSkinsSummary).toHaveBeenCalledWith('g1', ENDED_AFTER_6);
    // React calls function components with (props, …); assert on the props only
    expect(skinsComponents.SkinsResultsCard.mock.calls[0][0]).toEqual(
      expect.objectContaining({ holeCounts: ENDED_AFTER_6 })
    );
    expect(skinsComponents.SkinsCurrentStandingsCard.mock.calls[0][0]).toEqual(
      expect.objectContaining({ holeCounts: ENDED_AFTER_6, holesCompleted: 4 })
    );
  });

  it('stops showing live standings once every played hole has a result', () => {
    mockUseSkinsSummary.mockReturnValue({ data: summaryWith(6), isLoading: false, refetch: jest.fn() });

    renderTab();

    expect(skinsComponents.SkinsCurrentStandingsCard).not.toHaveBeenCalled();
  });
});
