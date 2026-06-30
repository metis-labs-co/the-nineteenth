import { forceFinalizeRound } from '@/services/rounds/forceFinalizeRound';
import { supabase } from '@/services/supabase/client';
import * as refinalize from '@/services/rounds/refinalizeRoundResults';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/services/courses/getRoundHoles', () => ({
  getRoundHoles: jest.fn().mockResolvedValue([]),
}));

// Helper: rounds mock supporting both select (meta) and update (status flip).
function mockRoundsFull(
  meta: { nine_type: string; game_type: string },
  updateResult: { data: unknown[] | null; error: unknown }
) {
  const single = jest.fn().mockResolvedValue({ data: meta, error: null });
  const metaEq = jest.fn().mockReturnValue({ single });
  const selectFn = jest.fn().mockReturnValue({ eq: metaEq });

  const updateSelect = jest.fn().mockResolvedValue(updateResult);
  const updateEq = jest.fn().mockReturnValue({ select: updateSelect });
  const update = jest.fn().mockReturnValue({ eq: updateEq });

  return { select: selectFn, update, _update: update, _eq: updateEq };
}

// Helper: scorecards mock for select only (no card promotion expected).
function mockScorecardsSelect(rows: {
  id?: string;
  player_id?: string;
  status: string;
  scores?: Record<string, unknown> | null;
  daily_handicap_used?: number | null;
}[]) {
  const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
  return { select: jest.fn().mockReturnValue({ eq }) };
}

describe('forceFinalizeRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('partial-only round still finalizes (round → completed, refinalize called, no card promoted)', async () => {
    const rounds = mockRoundsFull(
      { nine_type: 'full', game_type: 'stableford' },
      { data: [{ id: 'round-1', status: 'completed' }], error: null }
    );
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') return rounds;
      if (table === 'scorecards')
        return mockScorecardsSelect([
          {
            id: 'sc1',
            player_id: 'p1',
            status: 'in-progress',
            scores: { '1': { strokes: 4 } },
            daily_handicap_used: 0,
          },
        ]);
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest
      .spyOn(refinalize, 'refinalizeRoundResults')
      .mockResolvedValue(undefined);

    await forceFinalizeRound('round-1');

    expect(rounds._update).toHaveBeenCalledWith({ status: 'completed' });
    expect(refSpy).toHaveBeenCalledWith('round-1');
  });

  it('flips status to completed and re-finalizes when at least one card is terminal', async () => {
    const rounds = mockRoundsFull(
      { nine_type: 'full', game_type: 'stableford' },
      { data: [{ id: 'round-1', status: 'completed' }], error: null }
    );
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') return rounds;
      if (table === 'scorecards')
        return mockScorecardsSelect([
          { id: 'sc1', status: 'completed', scores: null, daily_handicap_used: 0 },
          { id: 'sc2', status: 'in-progress', scores: null, daily_handicap_used: 0 },
        ]);
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest
      .spyOn(refinalize, 'refinalizeRoundResults')
      .mockResolvedValue(undefined);

    await forceFinalizeRound('round-1');

    expect(rounds._update).toHaveBeenCalledWith({ status: 'completed' });
    expect(rounds._eq).toHaveBeenCalledWith('id', 'round-1');
    expect(refSpy).toHaveBeenCalledWith('round-1');
  });

  it('throws when the update affects 0 rows (RLS)', async () => {
    const rounds = mockRoundsFull(
      { nine_type: 'full', game_type: 'stableford' },
      { data: [], error: null }
    );
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') return rounds;
      if (table === 'scorecards')
        return mockScorecardsSelect([
          { id: 'sc1', status: 'confirmed', scores: null, daily_handicap_used: 0 },
        ]);
      throw new Error(`unexpected table ${table}`);
    });
    jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await expect(forceFinalizeRound('round-1')).rejects.toThrow(/0 rows/);
  });

  it('promotes a full-scorecard in-progress card and finalizes even with 0 formally-completed cards', async () => {
    // round is 18 holes; one card has 18 holes scored but status in-progress
    const fullScores: Record<string, unknown> = {};
    for (let h = 1; h <= 18; h++) fullScores[String(h)] = { strokes: 4 };

    const promoted: { id: string; status: string }[] = [];
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { nine_type: 'full', game_type: 'stableford' },
                  error: null,
                }),
            }),
          }),
          update: (patch: { status: string }) => ({
            eq: () => ({
              select: () =>
                Promise.resolve({
                  data: [{ id: 'r1', status: patch.status }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'scorecards') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'sc1',
                    player_id: 'p1',
                    status: 'in-progress',
                    scores: fullScores,
                    daily_handicap_used: 0,
                  },
                  {
                    id: 'sc2',
                    player_id: 'p2',
                    status: 'in-progress',
                    scores: { '1': { strokes: 4 } },
                    daily_handicap_used: 0,
                  },
                ],
                error: null,
              }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => {
              promoted.push({ id, status: patch.status as string });
              return Promise.resolve({ data: null, error: null });
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest
      .spyOn(refinalize, 'refinalizeRoundResults')
      .mockResolvedValue(undefined);

    await forceFinalizeRound('r1');

    // sc1 (18 holes) promoted to completed; sc2 (1 hole) NOT promoted
    expect(promoted).toEqual([{ id: 'sc1', status: 'completed' }]);
    expect(refSpy).toHaveBeenCalledWith('r1');
  });

  it('promotes a full 9-hole card (front9) and leaves an 8-hole card as DNF', async () => {
    // front9 round: 9 holes required; sc1 has 9 scored (full), sc2 has 8 scored (partial)
    const nineHoleScores: Record<string, unknown> = {};
    for (let h = 1; h <= 9; h++) nineHoleScores[String(h)] = { strokes: 4 };

    const eightHoleScores: Record<string, unknown> = {};
    for (let h = 1; h <= 8; h++) eightHoleScores[String(h)] = { strokes: 4 };

    const promoted: { id: string; status: string }[] = [];
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { nine_type: 'front9', game_type: 'stableford' },
                  error: null,
                }),
            }),
          }),
          update: (patch: { status: string }) => ({
            eq: () => ({
              select: () =>
                Promise.resolve({
                  data: [{ id: 'r2', status: patch.status }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'scorecards') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'sc1',
                    player_id: 'p1',
                    status: 'in-progress',
                    scores: nineHoleScores,
                    daily_handicap_used: 0,
                  },
                  {
                    id: 'sc2',
                    player_id: 'p2',
                    status: 'in-progress',
                    scores: eightHoleScores,
                    daily_handicap_used: 0,
                  },
                ],
                error: null,
              }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => {
              promoted.push({ id, status: patch.status as string });
              return Promise.resolve({ data: null, error: null });
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest
      .spyOn(refinalize, 'refinalizeRoundResults')
      .mockResolvedValue(undefined);

    await forceFinalizeRound('r2');

    // sc1 (9 holes, full front9) promoted; sc2 (8 holes) NOT promoted
    expect(promoted).toEqual([{ id: 'sc1', status: 'completed' }]);
    expect(refSpy).toHaveBeenCalledWith('r2');
  });
});
