/**
 * useScoreSubmission — both Review submit paths finalise the round through
 * the shared step (useFinalizeSubmittedRound). Online it completes the round
 * (or queues it while this device's cards upload); offline it queues it.
 * Before this, an offline submit never finalised the round at all.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScoreSubmission } from './useScoreSubmission';

const mockFinalizeRound = jest.fn();
jest.mock('@/hooks/rounds/useFinalizeSubmittedRound', () => ({
  useFinalizeSubmittedRound: () => mockFinalizeRound,
}));

const mockShowDialog = jest.fn();
jest.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({
    dialogConfig: { visible: false },
    showDialog: mockShowDialog,
    showAlert: jest.fn(),
    dismissDialog: jest.fn(),
  }),
}));

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/services/activeRoundSession', () => ({ activeRoundSession: { clear: jest.fn() } }));
jest.mock('@/services/scoreMismatch', () => ({
  checkSubmissionReadiness: jest.fn().mockResolvedValue({ canSubmit: true }),
  createMismatchRecords: jest.fn().mockResolvedValue(0),
  getPendingMismatches: jest.fn().mockResolvedValue([]),
  startBypassTimer: jest.fn(),
  getSubmissionStatus: jest.fn().mockResolvedValue(null),
  markSubmissionBypassed: jest.fn().mockResolvedValue(undefined),
  applyBypassScores: jest.fn().mockResolvedValue(undefined),
  getPartnerProgress: jest.fn(),
}));
jest.mock('@/services/scoringPairs', () => ({ getScoringPartner: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({ checkAndAward: jest.fn(), isReady: false }),
}));
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({ showMultipleToasts: jest.fn() }),
}));
jest.mock('@/hooks/rounds', () => ({ usePairings: () => ({ data: undefined }) }));
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: () => ({ allowedPlayerIds: [], groupScorecards: new Map([['player-1', {}]]) }),
  },
}));

const ROUND_ID = 'round-1';

function renderSubmission(isOnline: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const submitScorecards = jest.fn().mockResolvedValue(undefined);
  const navigation = { reset: jest.fn(), popToTop: jest.fn() } as any;

  const view = renderHook(
    () =>
      useScoreSubmission({
        isOnline,
        routeRoundId: ROUND_ID,
        currentRoundId: ROUND_ID,
        playerCount: 1,
        scorecardCount: 1,
        validateScores: () => [],
        setShowIncompleteModal: jest.fn(),
        submitScorecards,
        resetRound: jest.fn(),
        navigation,
        currentUserId: 'user-1',
      }),
    { wrapper }
  );
  return { ...view, submitScorecards };
}

/** The config passed to showDialog for the dialog with this title. */
function dialog(title: string) {
  return mockShowDialog.mock.calls.map(([config]) => config).find((config) => config.title === title);
}

beforeEach(() => {
  mockFinalizeRound.mockResolvedValue({ completed: true, queued: false });
});

describe('useScoreSubmission — round finalisation', () => {
  it('queues the round finalisation when submitting offline', async () => {
    mockFinalizeRound.mockResolvedValue({ completed: false, queued: true });
    const { result, submitScorecards } = renderSubmission(false);

    await act(async () => {
      await result.current.handleSubmit();
    });
    act(() => {
      dialog('Submit Scorecard').onConfirm();
    });

    await waitFor(() => {
      expect(dialog('Saved Offline')).toBeDefined();
    });
    expect(submitScorecards).toHaveBeenCalledWith({ playerIds: ['player-1'] });
    expect(mockFinalizeRound).toHaveBeenCalledWith(ROUND_ID);
    const [submitted] = submitScorecards.mock.invocationCallOrder;
    const [finalized] = mockFinalizeRound.mock.invocationCallOrder;
    expect(submitted).toBeLessThan(finalized);
  });

  it('finalises the round through the shared step when submitting online', async () => {
    const { result } = renderSubmission(true);

    await act(async () => {
      await result.current.handleSubmit();
    });
    act(() => {
      dialog('Submit Scorecard').onConfirm();
    });

    await waitFor(() => {
      expect(dialog('Success')).toBeDefined();
    });
    expect(mockFinalizeRound).toHaveBeenCalledTimes(1);
    expect(mockFinalizeRound).toHaveBeenCalledWith(ROUND_ID);
  });

  it('finalises the round through the shared step on a bypassed submit', async () => {
    const { result } = renderSubmission(true);

    await act(async () => {
      await result.current.handleBypassSubmit();
    });
    act(() => {
      dialog('Submit Without Verification').onConfirm();
    });

    await waitFor(() => {
      expect(dialog('Submitted (Unverified)')).toBeDefined();
    });
    expect(mockFinalizeRound).toHaveBeenCalledWith(ROUND_ID);
  });
});
