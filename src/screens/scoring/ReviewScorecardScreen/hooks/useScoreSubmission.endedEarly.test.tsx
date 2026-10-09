/**
 * useScoreSubmission — an ended-early round's readiness check is limited to
 * its played holes (R16), not skipped. Review passes the played hole numbers
 * in as `playedHoleNumbers`.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScoreSubmission } from './useScoreSubmission';

const mockCheckSubmissionReadiness = jest.fn();
const mockFinalizeRound = jest.fn();
const mockCheckAndAward = jest.fn();
const mockShowMultipleToasts = jest.fn();
const mockPairings: never[] = [];

jest.mock('@/services/scoreMismatch', () => ({
  checkSubmissionReadiness: (...args: unknown[]) => mockCheckSubmissionReadiness(...args),
  createMismatchRecords: jest.fn(() => Promise.resolve(0)),
  getPendingMismatches: jest.fn(() => Promise.resolve([])),
  startBypassTimer: jest.fn(),
  getSubmissionStatus: jest.fn(() => Promise.resolve(null)),
  markSubmissionBypassed: jest.fn(),
  applyBypassScores: jest.fn(),
  getPartnerProgress: jest.fn(),
}));
jest.mock('@/services/scoringPairs', () => ({ getScoringPartner: jest.fn() }));
jest.mock('@/services/activeRoundSession', () => ({
  activeRoundSession: { clear: jest.fn(() => Promise.resolve()) },
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({ checkAndAward: mockCheckAndAward, isReady: false }),
}));
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({ showMultipleToasts: mockShowMultipleToasts }),
}));
jest.mock('@/hooks/rounds', () => ({
  usePairings: () => ({ data: mockPairings }),
  useFinalizeSubmittedRound: () => mockFinalizeRound,
}));
jest.mock('@/hooks/rounds/useFinalizeSubmittedRound', () => ({
  useFinalizeSubmittedRound: () => mockFinalizeRound,
  finalizeOrQueueRound: jest.fn(),
}));

// Only what getGroupScopeIds (and the post-submit achievement read) touch.
const mockStoreState = {
  allowedPlayerIds: [] as string[],
  groupScorecards: new Map<string, unknown>([
    ['p1', {}],
    ['p2', {}],
  ]),
  holes: [],
  gameType: 'stroke',
};
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: { getState: () => mockStoreState },
}));

function renderSubmission(holeCount: number, playedHoleNumbers?: number[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const params = {
    isOnline: true,
    routeRoundId: 'round-1',
    currentRoundId: 'round-1',
    playerCount: 2,
    scorecardCount: 2,
    validateScores: () => [],
    setShowIncompleteModal: jest.fn(),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
    navigation: { reset: jest.fn(), popToTop: jest.fn() } as never,
    currentUserId: 'user-1',
  };
  return renderHook(
    (props: { holeCount: number; playedHoleNumbers?: number[] }) =>
      useScoreSubmission({ ...params, ...props }),
    { wrapper, initialProps: { holeCount, playedHoleNumbers } }
  );
}

async function submit(result: ReturnType<typeof renderSubmission>['result']) {
  await act(async () => {
    await result.current.handleSubmit();
  });
}

describe('useScoreSubmission — readiness over the played holes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckSubmissionReadiness.mockResolvedValue({ canSubmit: true });
  });

  it('checks every planned hole for a round played as planned (locks current behaviour)', async () => {
    const { result } = renderSubmission(18);

    await submit(result);

    const call = mockCheckSubmissionReadiness.mock.calls[0];
    expect(call.slice(0, 5)).toEqual(['round-1', 'user-1', false, 18, ['p1', 'p2']]);
    expect(call[5]).toBeUndefined();
    expect(result.current.dialogConfig.title).toBe('Submit Scorecard');
  });

  it('limits readiness to holes 1–6 when the round was ended after 6', async () => {
    const { result } = renderSubmission(6, [1, 2, 3, 4, 5, 6]);

    await submit(result);

    expect(mockCheckSubmissionReadiness.mock.calls[0]).toEqual([
      'round-1', 'user-1', false, 6, ['p1', 'p2'], [1, 2, 3, 4, 5, 6],
    ]);
    expect(result.current.dialogConfig.title).toBe('Submit Scorecard');
  });

  it('passes the real hole numbers for a back nine ended after 6 (10–15)', async () => {
    const { result } = renderSubmission(6, [10, 11, 12, 13, 14, 15]);

    await submit(result);

    expect(mockCheckSubmissionReadiness.mock.calls[0][5]).toEqual([10, 11, 12, 13, 14, 15]);
    expect(mockCheckSubmissionReadiness.mock.calls[0][3]).toBe(6);
  });

  it('counts the played holes even if the caller passed a different holeCount', async () => {
    const { result } = renderSubmission(18, [1, 2, 3, 4, 5, 6]);

    await submit(result);

    expect(mockCheckSubmissionReadiness.mock.calls[0][3]).toBe(6);
  });

  it('treats an empty played list as not limited', async () => {
    const { result } = renderSubmission(18, []);

    await submit(result);

    const call = mockCheckSubmissionReadiness.mock.calls[0];
    expect(call[3]).toBe(18);
    expect(call[5]).toBeUndefined();
  });

  it('refreshes readiness when only the played cutoff changes', async () => {
    const initial = [10, 11, 12, 13, 14, 15];
    const { result, rerender } = renderSubmission(18, initial);
    const originalSubmit = result.current.handleSubmit;
    rerender({ holeCount: 18, playedHoleNumbers: initial });
    // All other callback dependencies stay fixed: the cutoff is the only change.
    expect(result.current.handleSubmit).toBe(originalSubmit);
    await submit(result);
    expect(mockCheckSubmissionReadiness.mock.calls[0].slice(3)).toEqual([6, ['p1', 'p2'], initial]);
    rerender({ holeCount: 18, playedHoleNumbers: [10, 11, 12] });
    await submit(result);
    expect(mockCheckSubmissionReadiness.mock.calls[1].slice(3)).toEqual([3, ['p1', 'p2'], [10, 11, 12]]);
  });

  it('keeps played-hole mismatch verification blocking submission', async () => {
    mockCheckSubmissionReadiness.mockResolvedValue({ canSubmit: false, reason: 'unresolved_mismatches', mismatchCount: 1 });
    const { result } = renderSubmission(6, [10, 11, 12, 13, 14, 15]);
    await submit(result);
    expect(mockCheckSubmissionReadiness).toHaveBeenCalledTimes(1);
    expect(result.current.showMismatchModal).toBe(true);
    expect(result.current.dialogConfig.title).not.toBe('Submit Scorecard');
  });
});
