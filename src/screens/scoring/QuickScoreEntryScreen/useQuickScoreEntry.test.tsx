/**
 * useQuickScoreEntry — review preview of the handicap differential.
 *
 * The preview must match what useQuickScoreSubmit persists: no differential
 * for a part-filled card (I12), judged against the round's nine type, and the
 * submit receives that nine type.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useQuickScoreEntry } from './useQuickScoreEntry';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';

const mockMutateAsync = jest.fn();
const mockGoBack = jest.fn();
const mockShowAlert = jest.fn();
const mockPlayers = [{ id: 'player-1', name: 'Sam', handicap: 18, gender: 'male' }];
let mockNoScorecards: unknown[] = [];
let mockRoundData: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundDetails: () => ({ data: mockRoundData, isLoading: false }),
  useRoundScorecards: () => ({ data: mockNoScorecards, isLoading: false }),
  useRoundPlayers: () => ({ data: mockPlayers, isLoading: false }),
}));

jest.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({ showAlert: mockShowAlert, dialogConfig: null, dismissDialog: jest.fn() }),
}));

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
  getCurrentUser: jest.fn(),
}));

jest.mock('@/hooks/scorecard/useQuickScoreSubmit', () => ({
  useQuickScoreSubmit: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

const HOLES = create18Holes();
const TEE = { name: 'Blue', color: 'blue', courseRating: 72.5, slopeRating: 125 };

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

function setRound(nineType: 'full' | 'front9' | 'back9') {
  mockRoundData = {
    id: 'round-1',
    course: { holes: HOLES },
    selected_tee: TEE,
    nine_type: nineType,
    handicap_source: 'profile',
    competition: null,
  };
}

type HookResult = { current: ReturnType<typeof useQuickScoreEntry> };

/** Tap "+" until each listed hole reads one over par. */
function scoreBogeys(result: HookResult, holeNumbers: number[]) {
  act(() => {
    for (const n of holeNumbers) {
      for (let i = 0; i < HOLES[n - 1].par + 1; i++) result.current.incrementScore(n);
    }
  });
}

function renderEntry(): HookResult {
  const { result } = renderHook(() => useQuickScoreEntry({ roundId: 'round-1', playerId: 'player-1' }));
  return result;
}

describe('useQuickScoreEntry — handicap preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoScorecards = [];
    mockMutateAsync.mockResolvedValue({ success: true });
  });

  it('keeps a newer draft edit when a previously missing server card appears during save', async () => {
    setRound('full'); mockRoundData.holes_played = 2;
    const { result, rerender } = renderHook(() => useQuickScoreEntry({ roundId: 'round-1', playerId: 'player-1' }));
    scoreBogeys(result, [1, 2]);
    let finish!: (value: { success: boolean }) => void;
    mockMutateAsync.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let saving!: Promise<void>;
    act(() => { saving = result.current.handleConfirmSave(); });
    act(() => result.current.incrementScore(1));
    mockNoScorecards = [{ player_id: 'player-1', scores: { 1: { strokes: 5 }, 2: { strokes: 4 } } }];
    rerender({});
    await act(async () => { finish({ success: true }); await saving; });
    expect(result.current.scores['1']).toBe(6);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('resets a reused entry hook when the requested player changes', () => {
    setRound('full');
    const { result, rerender } = renderHook(({ id }) => useQuickScoreEntry({ roundId: 'round-1', playerId: id }),
      { initialProps: { id: 'player-1' } });
    scoreBogeys(result, [1, 2]);
    rerender({ id: 'player-2' });
    expect(result.current.scores).toEqual({});
  });

  it('reinitializes the draft from refreshed played scores after a shape rejection', async () => {
    setRound('full');
    mockNoScorecards = [{ player_id: 'player-1', scores: { 1: { strokes: 5 }, 7: { strokes: 12 } } }];
    const { result, rerender } = renderHook(() => useQuickScoreEntry({ roundId: 'round-1', playerId: 'player-1' }));
    act(() => result.current.incrementScore(1));
    mockMutateAsync.mockImplementationOnce(async () => {
      mockRoundData = { ...mockRoundData, holes_played: 2 };
      mockNoScorecards = [{ player_id: 'player-1', scores: { 1: { strokes: 4 }, 7: { strokes: 12 } } }];
      rerender({});
      throw new RoundScoringWriteError('shape_changed', 'round-1', 'Review refreshed scores');
    });
    await act(async () => { await result.current.handleConfirmSave(); });
    expect(result.current.scores).toEqual({ 1: 4 });
    expect(result.current.showReview).toBe(false);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('supplies a CURRENT draft callback and keeps a newer edit when an older save settles', async () => {
    setRound('full'); mockRoundData.holes_played = 2; mockRoundData.game_type = 'stableford';
    const result = renderEntry(); scoreBogeys(result, [1, 2]);
    let finish!: (value: { success: boolean }) => void;
    mockMutateAsync.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let saving!: Promise<void>;
    act(() => { saving = result.current.handleConfirmSave(); });
    act(() => result.current.incrementScore(1));
    const submitted = mockMutateAsync.mock.calls[0][0];
    expect(submitted.readCurrent().scores).toEqual({ 1: { strokes: 6 }, 2: { strokes: 4 } });
    await act(async () => { finish({ success: true }); await saving; });
    expect(result.current.scores['1']).toBe(6);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('previews a complete 18-hole card (I12 lock)', () => {
    setRound('full');
    const result = renderEntry();

    scoreBogeys(result, range(1, 18));

    expect(result.current.dailyHandicap).toBe(19);
    expect(result.current.totals.totalGross).toBe(90);
    // (113 / 125) × (90 − 72.5) = 15.8
    expect(result.current.handicapDifferential).toBe(15.8);
  });

  it('prepares ended back-nine review and submission from played holes with planned DHC', async () => {
    setRound('back9');
    mockRoundData.holes_played = 2;
    mockRoundData.game_type = 'stableford';
    const result = renderEntry();
    scoreBogeys(result, [1, 10, 11, 12]);
    expect(result.current.holes.map(h => h.number)).toEqual([10, 11]);
    expect(result.current.totalHoles).toBe(2);
    expect(result.current.dailyHandicap).toBe(9);
    expect(result.current.totals).toEqual({ totalGross: 9, totalNet: 8, totalPoints: 3, holesEntered: 2 });
    expect(result.current.handicapDifferential).toBeNull();
    await act(async () => { await result.current.handleConfirmSave(); });
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      scores: { 10: { strokes: 5 }, 11: { strokes: 4 } }, totalGross: 9, totalNet: 8, totalPoints: 3,
      expectedRoundShape: { nine_type: 'back9', holes_played: 2 }, gameType: 'stableford', holes: HOLES,
    }));
  });

  it('previews a differential for a complete front-9 card (I12 lock)', () => {
    setRound('front9');
    const result = renderEntry();

    scoreBogeys(result, range(1, 9));

    expect(result.current.handicapDifferential).not.toBeNull();
  });

  it('previews no differential for an 18-hole card scored on 6 holes', () => {
    setRound('full');
    const result = renderEntry();

    scoreBogeys(result, range(1, 6));

    // Before the gate: gross 29 → (113 / 125) × (29 − 72.5) = −39.3
    expect(result.current.handicapDifferential).toBeNull();
  });

  it('previews no differential for a front-9 card scored on 6 holes', () => {
    setRound('front9');
    const result = renderEntry();

    scoreBogeys(result, range(1, 6));

    expect(result.current.handicapDifferential).toBeNull();
  });

  it("submits the round's nine type", async () => {
    setRound('front9');
    const result = renderEntry();
    scoreBogeys(result, range(1, 9));

    await act(async () => {
      await result.current.handleConfirmSave();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ nineType: 'front9' }));
  });

  it('preserves normal preview full DHC subtraction and sends every draft key with full course context', async () => {
    setRound('back9');
    const result = renderEntry();
    scoreBogeys(result, [1, 10]);
    expect(result.current.dailyHandicap).toBe(19);
    expect(result.current.totals).toEqual({ totalGross: 5, totalNet: -14, totalPoints: 2, holesEntered: 1 });
    await act(async () => { await result.current.handleConfirmSave(); });
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      scores: { 1: { strokes: 5 }, 10: { strokes: 5 } },
      holes: HOLES, nineType: 'back9', totalGross: 5, totalNet: -14, totalPoints: 2,
    }));
  });
});
