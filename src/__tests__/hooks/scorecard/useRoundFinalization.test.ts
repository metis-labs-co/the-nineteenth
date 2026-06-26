/**
 * useRoundFinalization Hook Tests
 *
 * Tests for the updateRoundStatus function, specifically the multi-group guard
 * that ensures a round flips to 'completed' only when EVERY scorecard is terminal.
 *
 * @see src/screens/scoring/ReviewScorecardScreen/hooks/useRoundFinalization.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRoundFinalization } from '@/screens/scoring/ReviewScorecardScreen/hooks/useRoundFinalization';
import { supabase } from '@/services/supabase/client';

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/services/rounds/refinalizeRoundResults', () => ({
  refinalizeRoundResults: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

const ROUND_ID = 'round-aaaaaaaa-0000-0000-0000-000000000000';

type ScorecardRow = { status: string; player_id: string };
type PairingRow = { player_ids: string[] };

/**
 * Wire supabase.from() to return appropriate mock chains for each table.
 * Returns the `update` spy so tests can assert on it.
 */
function setupSupabaseMocks(scorecards: ScorecardRow[], pairings: PairingRow[]): jest.Mock {
  const updateSpy = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ id: ROUND_ID, status: 'completed' }],
        error: null,
      }),
    }),
  });

  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    switch (table) {
      case 'scorecards':
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: scorecards, error: null }),
          }),
        };
      case 'pairings':
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: pairings, error: null }),
          }),
        };
      case 'rounds':
      default:
        return {
          // Initial fetch: .select().eq().single()
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: ROUND_ID,
                  status: 'in-progress',
                  user_id: 'user-11111111',
                  competition_id: 'comp-11111111',
                },
                error: null,
              }),
            }),
          }),
          // Status update: .update().eq().select()
          update: updateSpy,
        };
    }
  });

  return updateSpy;
}

function makeCards(statuses: string[]): ScorecardRow[] {
  return statuses.map((status, i) => ({ status, player_id: `player-${i + 1}` }));
}

function makePairings(playerCount: number): PairingRow[] {
  const group1 = Array.from({ length: playerCount / 2 }, (_, i) => `player-${i + 1}`);
  const group2 = Array.from({ length: playerCount / 2 }, (_, i) => `player-${i + 1 + playerCount / 2}`);
  return [{ player_ids: group1 }, { player_ids: group2 }];
}

// ============================================================================
// TEST SUITE: updateRoundStatus — multi-group guard
// ============================================================================

describe('useRoundFinalization — updateRoundStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT flip the round to completed while a group is still in-progress', async () => {
    // Group A submitted (4 completed), Group B still scoring (4 in-progress).
    // Expected: rounds.update({ status: 'completed' }) is NOT called.
    const scorecards = makeCards([
      'completed', 'completed', 'completed', 'completed', // group A done
      'in-progress', 'in-progress', 'in-progress', 'in-progress', // group B still scoring
    ]);
    const pairings = makePairings(8); // 8 distinct players across 2 groups

    const updateSpy = setupSupabaseMocks(scorecards, pairings);

    const { result } = renderHook(() => useRoundFinalization());

    await act(async () => {
      await result.current.updateRoundStatus(ROUND_ID);
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('flips the round to completed once every scorecard is terminal', async () => {
    // Both groups have submitted — all 8 scorecards completed.
    // Expected: rounds.update({ status: 'completed' }) IS called.
    const scorecards = makeCards([
      'completed', 'completed', 'completed', 'completed', // group A
      'completed', 'completed', 'completed', 'completed', // group B
    ]);
    const pairings = makePairings(8); // 8 distinct players across 2 groups

    const updateSpy = setupSupabaseMocks(scorecards, pairings);

    const { result } = renderHook(() => useRoundFinalization());

    await act(async () => {
      await result.current.updateRoundStatus(ROUND_ID);
    });

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('flips a single-group round to completed when its only group submits', async () => {
    // Single group of 4 — all 4 complete. Backward-compat: should still flip immediately.
    const scorecards = makeCards(['completed', 'completed', 'completed', 'completed']);
    const pairings = [{ player_ids: ['player-1', 'player-2', 'player-3', 'player-4'] }];

    const updateSpy = setupSupabaseMocks(scorecards, pairings);

    const { result } = renderHook(() => useRoundFinalization());

    await act(async () => {
      await result.current.updateRoundStatus(ROUND_ID);
    });

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('also accepts confirmed scorecards as terminal', async () => {
    // Mix of completed and confirmed — both count as terminal.
    const scorecards = makeCards(['confirmed', 'confirmed', 'completed', 'completed']);
    const pairings = [{ player_ids: ['player-1', 'player-2', 'player-3', 'player-4'] }];

    const updateSpy = setupSupabaseMocks(scorecards, pairings);

    const { result } = renderHook(() => useRoundFinalization());

    await act(async () => {
      await result.current.updateRoundStatus(ROUND_ID);
    });

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });
});
