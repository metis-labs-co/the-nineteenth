/**
 * useQuickScoreSubmit — the handicap snapshot Quick Score Entry persists.
 *
 * Locks today's snapshot first, then covers the completeness gate (I12): a
 * part-filled card gets no differential, judged against the round's nineType
 * (never the hole list, which the Quick Score caller passes unfiltered).
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuickScoreSubmit, type QuickScoreSubmitInput } from '@/hooks/scorecard/useQuickScoreSubmit';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { TeeBox } from '@/types/database.types';

const mockFrom = jest.fn();
const mockGetCurrentUser = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
  getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/services/rounds/refinalizeRoundResults', () => ({
  refinalizeRoundResults: jest.fn(() => Promise.resolve()),
}));

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };
let upsertPayloads: Record<string, unknown>[] = [];

/** Chainable + thenable stub that records upsert payloads. */
function queryStub(result: QueryResult) {
  const settled = { data: null, error: null, ...result };
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.select = passthrough;
  chain.eq = passthrough;
  chain.update = passthrough;
  chain.upsert = (payload: Record<string, unknown>) => {
    upsertPayloads.push(payload);
    return chain;
  };
  chain.single = () => Promise.resolve(settled);
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(settled).then(resolve, reject);
  return chain;
}

/** upsert → round lookup → player count (2) → completed count (1): the round stays open. */
function scriptSupabase() {
  const queue: Record<string, QueryResult[]> = {
    scorecards: [{ data: { id: 'scorecard-1' } }, { count: 1 }],
    rounds: [{ data: { status: 'in-progress', competition_id: null } }],
    round_players: [{ count: 2 }],
  };
  mockFrom.mockImplementation((table: string) => queryStub(queue[table]?.shift() ?? {}));
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// create18Holes: pars 4,3,5,4,4,3,4,5,4 | 4,3,5,4,4,3,4,5,4 → par 36 + 36 = 72.
const HOLES = create18Holes();
const TEE: TeeBox = { name: 'Blue', color: 'blue', courseRating: 72.5, slopeRating: 125 };

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/** One over par on each listed hole, in the DB format quick entry submits. */
function bogeyScores(holeNumbers: number[]): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  for (const n of holeNumbers) scores[String(n)] = { strokes: HOLES[n - 1].par + 1 };
  return scores;
}

const grossOf = (scores: Record<string, { strokes: number }>) =>
  Object.values(scores).reduce((sum, s) => sum + s.strokes, 0);

function makeInput(overrides: Partial<QuickScoreSubmitInput> = {}): QuickScoreSubmitInput {
  const scores = overrides.scores ?? bogeyScores(range(1, 18));
  return {
    roundId: 'round-1',
    playerId: 'player-1',
    scores,
    totalGross: grossOf(scores),
    totalNet: 0,
    totalPoints: 0,
    player: { id: 'player-1', name: 'Sam', handicap: 18, gender: 'male' },
    selectedTee: TEE,
    // As the Quick Score caller passes them: the whole course, unfiltered.
    holes: HOLES,
    nineType: 'full',
    handicapSource: 'profile',
    ...overrides,
  };
}

async function submit(input: QuickScoreSubmitInput): Promise<Record<string, unknown>> {
  scriptSupabase();
  const { result } = renderHook(() => useQuickScoreSubmit(), { wrapper: makeWrapper() });
  await act(async () => {
    await result.current.mutateAsync(input);
  });
  return upsertPayloads[upsertPayloads.length - 1];
}

describe('useQuickScoreSubmit — handicap snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upsertPayloads = [];
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' });
  });

  it('snapshots a complete 18-hole card (I12 lock)', async () => {
    const payload = await submit(makeInput());

    // DHC: ((18 × 125 / 113) + (72.5 − 72)) × 0.93 × 0.9986 = 18.96 → 19
    expect(payload).toEqual(
      expect.objectContaining({
        total_gross: 90,
        ga_handicap_used: 18,
        daily_handicap_used: 19,
        course_rating_used: 72.5,
        slope_rating_used: 125,
        // (113 / 125) × (90 − 72.5) = 15.8
        handicap_differential: 15.8,
      }),
    );
  });

  it('snapshots a complete back-9 card (I12 lock)', async () => {
    const scores = bogeyScores(range(10, 18));

    const payload = await submit(makeInput({ scores, totalGross: grossOf(scores), nineType: 'back9' }));

    expect(payload.handicap_differential).not.toBeNull();
  });

  it('writes no differential for an 18-hole card scored on only 6 holes', async () => {
    const scores = bogeyScores(range(1, 6));

    const payload = await submit(makeInput({ scores, totalGross: grossOf(scores) }));

    // Before the gate: gross 23 + 6 = 29 → (113 / 125) × (29 − 72.5) = −39.3
    expect(payload.handicap_differential).toBeNull();
    // The rest of the snapshot is unchanged.
    expect(payload.daily_handicap_used).toBe(19);
    expect(payload.course_rating_used).toBe(72.5);
  });

  it('writes no differential for a back-9 round scored on holes 10–15 only', async () => {
    const scores = bogeyScores(range(10, 15));

    const payload = await submit(makeInput({ scores, totalGross: grossOf(scores), nineType: 'back9' }));

    expect(payload.handicap_differential).toBeNull();
  });

  it('writes no differential when the card covers only 9 holes of an 18-hole round', async () => {
    const scores = bogeyScores(range(1, 9));

    const payload = await submit(makeInput({ scores, totalGross: grossOf(scores), nineType: 'full' }));

    expect(payload.handicap_differential).toBeNull();
  });
});
