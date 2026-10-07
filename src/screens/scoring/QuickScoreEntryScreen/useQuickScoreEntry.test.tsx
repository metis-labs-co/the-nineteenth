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

const mockMutateAsync = jest.fn();
const mockPlayers = [{ id: 'player-1', name: 'Sam', handicap: 18, gender: 'male' }];
const mockNoScorecards: unknown[] = [];
let mockRoundData: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundDetails: () => ({ data: mockRoundData, isLoading: false }),
  useRoundScorecards: () => ({ data: mockNoScorecards, isLoading: false }),
  useRoundPlayers: () => ({ data: mockPlayers, isLoading: false }),
}));

jest.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({ showAlert: jest.fn(), dialogConfig: null, dismissDialog: jest.fn() }),
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
    mockMutateAsync.mockResolvedValue({ success: true });
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
});
