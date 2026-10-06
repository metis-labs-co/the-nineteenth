/**
 * useSubmitScorecard Hook Tests
 *
 * Tests for the useSubmitScorecards and useUpdateScore mutations.
 * These hooks handle offline-first scorecard submission with sync to server.
 *
 * @see src/hooks/scorecard/useSubmitScorecard.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSubmitScorecards } from '@/hooks/scorecard/useSubmitScorecard';
import * as offlineDatabase from '@/services/offline/database';
import * as offlineSync from '@/services/offline/sync';
import type { Scorecard } from '@/types';

// Helper to create app-level Scorecard (camelCase) for testing
function createAppScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'scorecard-1',
    roundId: 'round-1',
    playerId: 'player-1',
    scores: {},
    totalGross: 0,
    totalNet: 0,
    status: 'not-started' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the offline database
jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(() => Promise.resolve()),
  getScorecardsByRound: jest.fn(() => Promise.resolve([])),
}));

// Mock the offline sync service
jest.mock('@/services/offline/sync', () => ({
  queueScorecardSync: jest.fn(() => Promise.resolve()),
  getIsOnline: jest.fn(() => true),
  manualSync: jest.fn(() => Promise.resolve(true)),
}));

// Mock scorecardKeys
jest.mock('@/hooks/scorecard/useScorecards', () => ({
  scorecardKeys: {
    all: ['scorecards'],
    lists: () => ['scorecards', 'list'],
    list: (filters: { roundId?: string }) => ['scorecards', 'list', filters],
    details: () => ['scorecards', 'detail'],
    detail: (id: string) => ['scorecards', 'detail', id],
  },
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    resetPassword: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

// Mock useAchievementToast hook
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({
    showAchievementToast: jest.fn(),
    hideAchievementToast: jest.fn(),
    isVisible: false,
    achievement: null,
  }),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a wrapper with QueryClient for testing React Query hooks
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Create a test scorecard with valid UUID-like IDs
 */
function createValidScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return createAppScorecard({
    id: 'scorecard-11111111-2222-3333-4444-555555555555',
    roundId: 'round-11111111-2222-3333-4444-555555555555',
    playerId: 'player-11111111-2222-3333-4444-555555555555',
    status: 'in-progress',
    ...overrides,
  });
}

// ============================================================================
// TEST SUITE: useSubmitScorecards
// ============================================================================

describe('useSubmitScorecards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Submission', () => {
    it('should save scorecards to local SQLite database', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard()];

      await act(async () => {
        await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });
      });

      expect(offlineDatabase.saveScorecard).toHaveBeenCalledTimes(1);
      expect(offlineDatabase.saveScorecard).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'scorecard-11111111-2222-3333-4444-555555555555',
          status: 'completed',
        })
      );
    });

    it('should queue scorecards for sync', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard()];

      await act(async () => {
        await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });
      });

      expect(offlineSync.queueScorecardSync).toHaveBeenCalledTimes(1);
      expect(offlineSync.queueScorecardSync).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
        'update'
      );
    });

    it('should set status to completed when submitting', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard({ status: 'in-progress' })];

      await act(async () => {
        await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });
      });

      expect(offlineDatabase.saveScorecard).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should set submittedAt timestamp when submitting', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard()];
      const beforeSubmit = new Date();

      await act(async () => {
        await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });
      });

      const afterSubmit = new Date();

      expect(offlineDatabase.saveScorecard).toHaveBeenCalledWith(
        expect.objectContaining({
          submittedAt: expect.any(Date),
        })
      );

      // Verify timestamp is within expected range
      const savedScorecard = (offlineDatabase.saveScorecard as jest.Mock).mock.calls[0][0];
      expect(savedScorecard.submittedAt.getTime()).toBeGreaterThanOrEqual(beforeSubmit.getTime());
      expect(savedScorecard.submittedAt.getTime()).toBeLessThanOrEqual(afterSubmit.getTime());
    });
  });

  describe('Online Sync Behavior', () => {
    it('should attempt immediate sync if online', async () => {
      (offlineSync.getIsOnline as jest.Mock).mockReturnValue(true);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard()];

      await act(async () => {
        const response = await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });

        expect(response.syncedImmediately).toBe(true);
      });

      expect(offlineSync.manualSync).toHaveBeenCalled();
    });

    it('should NOT attempt immediate sync if offline', async () => {
      (offlineSync.getIsOnline as jest.Mock).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard()];

      await act(async () => {
        const response = await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });

        expect(response.syncedImmediately).toBe(false);
      });

      expect(offlineSync.manualSync).not.toHaveBeenCalled();
    });

    it('should handle sync failure gracefully', async () => {
      (offlineSync.getIsOnline as jest.Mock).mockReturnValue(true);
      (offlineSync.manualSync as jest.Mock).mockRejectedValue(new Error('Network error'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [createValidScorecard()];

      // Should NOT throw - sync failure is handled gracefully
      await act(async () => {
        const response = await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });

        // Sync failed but submission still succeeded
        expect(response.success).toBe(true);
        expect(response.syncedImmediately).toBe(false);
      });
    });
  });

  describe('Multiple Scorecards', () => {
    it('should handle multiple scorecards in a single submission', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [
        createValidScorecard({ id: 'sc-1', playerId: 'player-1' }),
        createValidScorecard({ id: 'sc-2', playerId: 'player-2' }),
        createValidScorecard({ id: 'sc-3', playerId: 'player-3' }),
      ];

      await act(async () => {
        const response = await result.current.mutateAsync({
          scorecards,
          roundId: 'round-11111111-2222-3333-4444-555555555555',
        });

        expect(response.scorecardIds).toHaveLength(3);
        expect(response.scorecardIds).toContain('sc-1');
        expect(response.scorecardIds).toContain('sc-2');
        expect(response.scorecardIds).toContain('sc-3');
      });

      expect(offlineDatabase.saveScorecard).toHaveBeenCalledTimes(3);
      expect(offlineSync.queueScorecardSync).toHaveBeenCalledTimes(3);
    });

    it('should return all scorecard IDs on success', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubmitScorecards(), { wrapper });

      const scorecards = [
        createValidScorecard({ id: 'scorecard-aaa' }),
        createValidScorecard({ id: 'scorecard-bbb' }),
      ];

      await act(async () => {
        const response = await result.current.mutateAsync({
          scorecards,
          roundId: 'test-round',
        });

        expect(response.success).toBe(true);
        expect(response.scorecardIds).toEqual(['scorecard-aaa', 'scorecard-bbb']);
      });
    });
  });

});

/* Removed with the dormant useUpdateScore hook.
// ============================================================================
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide mutation function', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateScore(), { wrapper });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });

  it('should accept update score parameters and complete mutation', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateScore(), { wrapper });

    // The mutation should complete without error
    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'sc-123',
        roundId: 'round-123',
        holeNumber: 3,
        strokes: 6,
      });
    });

    // Verify mutation completed successfully
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should rollback on mutation error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    // Pre-populate cache
    const existingScorecard = createValidScorecard({
      id: 'sc-456',
      scores: { '1': { strokes: 4 } },
    });
    queryClient.setQueryData(
      ['scorecards', 'list', { roundId: 'round-456' }],
      [existingScorecard]
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateScore(), { wrapper });

    // Note: The current implementation doesn't throw errors
    // This test verifies the rollback mechanism exists
    await act(async () => {
      result.current.mutate({
        scorecardId: 'sc-456',
        roundId: 'round-456',
        holeNumber: 2,
        strokes: 5,
      });
    });

    // The mutation should complete without error
    expect(result.current.isError).toBe(false);
  });

  it('should invalidate queries after mutation settles', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateScore(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'sc-789',
        roundId: 'round-789',
        holeNumber: 1,
        strokes: 4,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['scorecards', 'list', { roundId: 'round-789' }],
      })
    );
  });

});
*/
