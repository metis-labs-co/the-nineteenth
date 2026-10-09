import { supabase } from '@/services/supabase/client';
import { applyResolvedScoreToScorecard } from '@/services/scoreMismatch/resolution';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const ROUND_ID = 'round-1';
const PLAYER_ID = 'player-1';
const HOLES = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));
const chain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
  then: jest.fn((resolve) => resolve({ data: null, error: null })),
};
const shapeChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  abortSignal: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
};
const SHAPE_ERROR = { code: '22023', hint: 'round_shape_changed', message: 'Shape changed' };

function rejectShapeThenRead(currentCard: unknown, shape: unknown) {
  mockCard(card());
  chain.maybeSingle
    .mockResolvedValueOnce({ data: card(), error: null })
    .mockResolvedValue({ data: currentCard, error: null });
  shapeChain.maybeSingle.mockResolvedValue({ data: shape, error: null });
  (supabase.from as jest.Mock).mockImplementation((table) =>
    table === 'rounds' ? shapeChain : chain
  );
  (supabase.rpc as jest.Mock)
    .mockResolvedValueOnce({ data: null, error: SHAPE_ERROR })
    .mockResolvedValue({ data: true, error: null });
}

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'remote-card',
    scores: { '1': { strokes: 4, putts: 2, custom: 'keep' }, '2': { strokes: 5 } },
    daily_handicap_used: 10,
    status: 'in-progress',
    revision: 17,
    submitted_by: 'original-scorer',
    submitted_at: '2026-10-01T10:00:00Z',
    round: {
      game_type: 'stroke',
      nine_type: 'full',
      holes_played: null,
      courses: { holes: HOLES },
    },
    ...overrides,
  };
}

function mockCard(row: unknown) {
  chain.maybeSingle.mockResolvedValue({ data: row, error: null });
  (supabase.from as jest.Mock).mockReturnValue(chain);
}

// Characterization originally observed the direct database patch; the same
// expectations now observe that unchanged patch through the required RPC.
function writtenPatch() {
  return (supabase.rpc as jest.Mock).mock.calls[0][1].p_patch;
}

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
});

describe('resolution compatibility characterization', () => {
  it.each(['in-progress', 'completed', 'confirmed'])(
    'corrects %s cards without patching revision or submission metadata',
    async (status) => {
      mockCard(card({ status }));
      await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(true);
      const patch = writtenPatch();
      expect(patch).toMatchObject({
        scores: { '1': { strokes: 6, putts: 2, custom: 'keep' }, '2': { strokes: 5 } },
        total_gross: 11,
        total_net: 1,
        updated_at: expect.any(String),
      });
      expect(patch).not.toHaveProperty('total_points');
      for (const key of [
        'revision',
        'status',
        'submitted_at',
        'submitted_by',
        'daily_handicap_used',
        'synced_at',
      ]) {
        expect(patch).not.toHaveProperty(key);
      }
    }
  );

  it('omits net and points when no recorded daily handicap is available', async () => {
    mockCard(card({ daily_handicap_used: null }));
    await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(true);
    expect(writtenPatch()).toMatchObject({ total_gross: 11 });
    expect(writtenPatch()).not.toHaveProperty('total_net');
    expect(writtenPatch()).not.toHaveProperty('total_points');
  });

  it('includes freshly computed Stableford points when the recorded basis is available', async () => {
    mockCard(
      card({
        daily_handicap_used: 18,
        round: {
          game_type: 'stableford',
          nine_type: 'full',
          holes_played: null,
          courses: { holes: HOLES },
        },
      })
    );
    await applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 4);
    expect(writtenPatch()).toMatchObject({ total_gross: 9, total_net: -9, total_points: 5 });
  });
});

it('writes the exact shape-declared resolution RPC patch instead of a direct update', async () => {
  mockCard(card());
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(true);
  expect(supabase.rpc).toHaveBeenCalledWith('write_scorecard_resolution', {
    p_scorecard_id: 'remote-card',
    p_patch: {
      expected_round_shape: { nine_type: 'full', holes_played: null },
      scores: { '1': { strokes: 6, putts: 2, custom: 'keep' }, '2': { strokes: 5 } },
      total_gross: 11,
      total_net: 1,
      updated_at: expect.any(String),
    },
  });
  expect(chain.update).not.toHaveBeenCalled();
});

it('filters removed numeric keys for back-nine play while preserving unknown and non-hole JSON', async () => {
  mockCard(
    card({
      scores: {
        '5': { strokes: 6 },
        '10': { strokes: 5, penalties: 1, custom: ['untouched'] },
        '11': { strokes: 4, putts: 3, unknown: { original: true } },
        '12': { strokes: 6 },
        '19': { strokes: 7 },
        '0': { strokes: 4 },
        '12-note': { strokes: 99, text: 'non-hole' },
        meta: { text: 'keep' },
        '-1': ['legacy'],
        '1.5': null,
      },
      round: {
        game_type: 'stableford',
        nine_type: 'back9',
        holes_played: 2,
        courses: { holes: HOLES },
      },
    })
  );
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 11, 5)).resolves.toBe(true);
  expect(supabase.rpc).toHaveBeenCalledWith('write_scorecard_resolution', {
    p_scorecard_id: 'remote-card',
    p_patch: {
      expected_round_shape: { nine_type: 'back9', holes_played: 2 },
      scores: {
        '10': { strokes: 5, penalties: 1, custom: ['untouched'] },
        '11': { strokes: 5, putts: 3, unknown: { original: true } },
        '12-note': { strokes: 99, text: 'non-hole' },
        meta: { text: 'keep' },
        '-1': ['legacy'],
        '1.5': null,
      },
      total_gross: 10,
      total_net: 9,
      total_points: 3,
      updated_at: expect.any(String),
    },
  });
});

it('returns false for a missing or RLS-hidden target', async () => {
  mockCard(null);
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(false);
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(chain.maybeSingle).toHaveBeenCalled();
});

it('returns false when the card disappears or becomes hidden before the RPC', async () => {
  mockCard(card());
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(false);
});

it('surfaces genuine card read failure rather than reporting absence', async () => {
  mockCard(null);
  const error = { message: 'network unavailable', code: 'FETCH_ERROR' };
  chain.maybeSingle.mockResolvedValue({ data: null, error });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).rejects.toThrow(
    'network unavailable'
  );
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it('refuses an unavailable joined round instead of declaring an unended full round', async () => {
  mockCard(card({ round: null }));
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).rejects.toMatchObject({
    kind: 'unavailable',
    roundId: ROUND_ID,
  });
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it('refuses a missing BOOLEAN response rather than reporting target absence', async () => {
  mockCard(card());
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).rejects.toMatchObject({
    kind: 'unavailable',
  });
});

it('reapplies only the intended correction to the CURRENT card after a shape rejection', async () => {
  rejectShapeThenRead(
    card({
      scores: {
        '1': { strokes: 4, putts: 3, custom: 'fresh' },
        '2': { strokes: 8, penalties: 2 },
        '3': { strokes: 5 },
        metadata: { current: true },
      },
      daily_handicap_used: 18,
      status: 'confirmed',
      revision: 23,
      // Joined shape can lag the separate authorized read. Preparation must use
      // the read shape for filtering AND totals, not relabel the original patch.
      round: {
        game_type: 'stableford',
        nine_type: 'full',
        holes_played: null,
        courses: { holes: HOLES },
      },
    }),
    { nine_type: 'full', holes_played: 2 }
  );
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(true);
  expect(supabase.rpc).toHaveBeenLastCalledWith('write_scorecard_resolution', {
    p_scorecard_id: 'remote-card',
    p_patch: {
      expected_round_shape: { nine_type: 'full', holes_played: 2 },
      scores: {
        '1': { strokes: 6, putts: 3, custom: 'fresh' },
        '2': { strokes: 8, penalties: 2 },
        metadata: { current: true },
      },
      total_gross: 14,
      total_net: 12,
      total_points: 1,
      updated_at: expect.any(String),
    },
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(2);
  expect(chain.maybeSingle).toHaveBeenCalledTimes(2);
  expect(shapeChain.is).toHaveBeenCalledWith('deleted_at', null);
});

// Supplementary coverage added after the retry implementation. These scenarios
// exercise the existing retry boundary; they are not claimed as new RED cycles.
it('returns false without a retry write when the intended hole is now unplayed', async () => {
  rejectShapeThenRead(card(), { nine_type: 'full', holes_played: 2 });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 3, 6)).resolves.toBe(false);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});

it('surfaces a second shape change with its SQL code and hint', async () => {
  rejectShapeThenRead(card(), { nine_type: 'full', holes_played: 2 });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: SHAPE_ERROR });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).rejects.toMatchObject({
    kind: 'shape_changed',
    roundId: ROUND_ID,
    sqlCode: '22023',
    sqlHint: 'round_shape_changed',
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(2);
  expect(chain.maybeSingle).toHaveBeenCalledTimes(2);
});

it.each([
  { data: null, error: null },
  { data: null, error: { message: 'shape read unavailable', code: 'FETCH_ERROR' } },
  { data: { nine_type: 'bad', holes_played: null }, error: null },
])('keeps an unavailable authorized shape read as a failure (%j)', async (response) => {
  rejectShapeThenRead(card(), null);
  shapeChain.maybeSingle.mockResolvedValue(response);
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).rejects.toMatchObject({
    kind: 'unavailable',
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});

it('keeps optional net/points absent when the CURRENT retry card lacks that basis', async () => {
  rejectShapeThenRead(card({ daily_handicap_used: null }), { nine_type: 'full', holes_played: 2 });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(true);
  expect((supabase.rpc as jest.Mock).mock.calls[1][1].p_patch).toEqual({
    expected_round_shape: { nine_type: 'full', holes_played: 2 },
    scores: { '1': { strokes: 6, putts: 2, custom: 'keep' }, '2': { strokes: 5 } },
    total_gross: 11,
    updated_at: expect.any(String),
  });
});

it('returns false if the current target is missing after shape rejection', async () => {
  rejectShapeThenRead(null, { nine_type: 'full', holes_played: 2 });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).resolves.toBe(false);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});

it.each([
  ['round_scoring_busy', 'busy'],
  ['invalid_round_shape', 'invalid_shape'],
  ['round_score_out_of_play', 'out_of_play'],
])('surfaces %s without retrying an old payload', async (hint, kind) => {
  mockCard(card());
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: null,
    error: { message: 'Rejected', code: '22023', hint },
  });
  await expect(applyResolvedScoreToScorecard(ROUND_ID, PLAYER_ID, 1, 6)).rejects.toMatchObject({
    kind,
    sqlCode: '22023',
    sqlHint: hint,
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});
