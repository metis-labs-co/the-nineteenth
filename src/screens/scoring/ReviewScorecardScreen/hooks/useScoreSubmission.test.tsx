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

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
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
const mockCheckAndAward = jest.fn();
let mockAchievementReady = false;
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({ checkAndAward: mockCheckAndAward, isReady: mockAchievementReady }),
}));
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({ showMultipleToasts: jest.fn() }),
}));
jest.mock('@/hooks/rounds', () => ({ usePairings: () => ({ data: undefined }) }));
let mockStoreState: Record<string, unknown>;
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: () => mockStoreState,
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
  const resetRound = jest.fn(() => {
    mockStoreState.holesPlayed = null;
    mockStoreState.groupScorecards = new Map();
  });

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
        resetRound,
        navigation,
        currentUserId: 'user-1',
      }),
    { wrapper }
  );
  return { ...view, submitScorecards, resetRound, navigation };
}

/** The config passed to showDialog for the dialog with this title. */
function dialog(title: string) {
  return mockShowDialog.mock.calls
    .map(([config]) => config)
    .find((config) => config.title === title);
}

beforeEach(() => {
  mockFinalizeRound.mockResolvedValue({ completed: true, queued: false });
  mockAchievementReady = false;
  mockStoreState = { allowedPlayerIds: [], groupScorecards: new Map([['player-1', {}]]) };
  mockCheckAndAward.mockResolvedValue({
    newAchievements: [],
    newCosmetics: [],
    hasNewRewards: false,
  });
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { course_id: 'course-1' } }),
  };
  mockFrom.mockReturnValue(query);
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

/** Real hook wiring with ready achievements; deferred awards prove submit awaits them. */
function readyScorecard(scoredHoles: number, holesPlayed: number | null) {
  mockAchievementReady = true;
  mockStoreState = {
    allowedPlayerIds: [],
    holes: Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 })),
    gameType: 'stroke',
    holesPlayed,
    groupScorecards: new Map([
      [
        'user-1',
        {
          scores: Object.fromEntries(
            Array.from({ length: scoredHoles }, (_, i) => [
              i + 1,
              {
                strokes: [3, 2, 1][i] ?? 4,
              },
            ])
          ),
          totalNet: 60,
        },
      ],
    ]),
  };
}

async function confirmSubmission(
  result: ReturnType<typeof renderSubmission>['result'],
  bypass: boolean
) {
  await act(async () => {
    if (bypass) await result.current.handleBypassSubmit();
    else await result.current.handleSubmit();
  });
  act(() => dialog(bypass ? 'Submit Without Verification' : 'Submit Scorecard').onConfirm());
}

describe('useScoreSubmission — ready achievements', () => {
  it.each([
    [false, null],
    [true, null],
    [false, 9],
    [true, 9],
  ] as const)('awaits achievements before reset (bypass=%s, marker=%s)', async (bypass, marker) => {
    readyScorecard(marker ?? 18, marker);
    let releaseAward!: (value: unknown) => void;
    mockCheckAndAward.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAward = resolve;
        })
    );
    const { result, submitScorecards, resetRound, navigation } = renderSubmission(true);
    const successTitle = bypass ? 'Submitted (Unverified)' : 'Success';

    await confirmSubmission(result, bypass);
    await waitFor(() =>
      expect(mockCheckAndAward).toHaveBeenCalledWith('scorecard_submitted', {
        round_id: ROUND_ID,
        game_type: 'stroke',
        course_id: 'course-1',
        is_competition: false,
        hole_count: marker == null ? 18 : undefined,
        gross_score: marker == null ? 66 : undefined,
        net_score: marker == null ? 60 : undefined,
        birdies: 1,
        eagles: 1,
        albatrosses: 1,
        pars: marker == null ? 15 : 6,
        bogeys: 0,
        double_bogeys: 0,
        hole_in_one: true,
      })
    );
    expect(submitScorecards.mock.invocationCallOrder[0]).toBeLessThan(
      mockFinalizeRound.mock.invocationCallOrder[0]
    );
    expect(mockFinalizeRound.mock.invocationCallOrder[0]).toBeLessThan(
      mockCheckAndAward.mock.invocationCallOrder[0]
    );
    expect(dialog(successTitle)).toBeUndefined();
    expect(resetRound).not.toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();

    await act(async () =>
      releaseAward({ newAchievements: [], newCosmetics: [], hasNewRewards: false })
    );
    await waitFor(() => expect(dialog(successTitle)).toBeDefined());
    expect(mockCheckAndAward.mock.calls.map(([event]) => event)).toEqual([
      'scorecard_submitted',
      'round_completed',
      'birdie_recorded',
      'eagle_recorded',
      'albatross_recorded',
      'ace_recorded',
      'par_recorded',
      'course_played',
    ]);
    act(() => dialog(successTitle).onConfirm());
    expect(resetRound).toHaveBeenCalledTimes(1);
    expect(navigation.reset).toHaveBeenCalledTimes(1);
    expect(mockCheckAndAward.mock.invocationCallOrder.at(-1)).toBeLessThan(
      resetRound.mock.invocationCallOrder[0]
    );
  });

  it.each([false, true])(
    'uses ended metadata before reset and retains played-hole events (bypass=%s)',
    async (bypass) => {
      readyScorecard(9, 9); // Full planned eighteen, ended at nine.
      const { result, resetRound, navigation } = renderSubmission(true);
      await confirmSubmission(result, bypass);
      const successTitle = bypass ? 'Submitted (Unverified)' : 'Success';
      await waitFor(() => expect(dialog(successTitle)).toBeDefined());

      for (const eventName of ['scorecard_submitted', 'round_completed']) {
        const event = mockCheckAndAward.mock.calls.find(([name]) => name === eventName)?.[1];
        expect(event).toEqual(
          expect.objectContaining({
            round_id: ROUND_ID,
            course_id: 'course-1',
            game_type: 'stroke',
            is_competition: false,
            birdies: 1,
            eagles: 1,
            albatrosses: 1,
            pars: 6,
            hole_in_one: true,
          })
        );
        expect(event.gross_score).toBeUndefined();
        expect(event.net_score).toBeUndefined();
        expect(event.hole_count).toBeUndefined();
      }
      expect(mockCheckAndAward).toHaveBeenCalledWith('birdie_recorded', { birdies: 1 });
      expect(mockCheckAndAward).toHaveBeenCalledWith('eagle_recorded', { eagles: 1 });
      expect(mockCheckAndAward).toHaveBeenCalledWith('albatross_recorded', { albatrosses: 1 });
      expect(mockCheckAndAward).toHaveBeenCalledWith('ace_recorded', { hole_in_one: true });
      expect(mockCheckAndAward).toHaveBeenCalledWith('par_recorded', { pars: 6 });
      expect(mockCheckAndAward).toHaveBeenCalledWith('course_played', { course_id: 'course-1' });
      expect(mockStoreState.holesPlayed).toBe(9);
      expect(resetRound).not.toHaveBeenCalled();
      act(() => dialog(successTitle).onConfirm());
      expect(mockStoreState.holesPlayed).toBeNull();
      expect(navigation.reset).toHaveBeenCalledTimes(1);
    }
  );
});
