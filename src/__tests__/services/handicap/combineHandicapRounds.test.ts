/**
 * Combine-two-nines validation — handicap completeness gate (I12).
 *
 * A combined 18 is handicap-eligible only when each nine is fully scored for
 * its own nine. The current combined differential is locked first.
 */

// supabase.from(table) → a chain whose first .eq(column, value) picks the row
// mockRows[table][value]; .single() resolves it (or a not-found error).
const mockRows: Record<string, Record<string, unknown>> = {};

function mockQuery(table: string) {
  let key: string | undefined;
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = (_column: string, value: string) => {
    if (key === undefined) key = value;
    return chain;
  };
  chain.single = () => {
    const row = key === undefined ? undefined : mockRows[table]?.[key];
    return Promise.resolve(
      row ? { data: row, error: null } : { data: null, error: { message: 'not found' } },
    );
  };
  // round_players (per-player tee override): none
  chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockQuery(table) },
}));

jest.mock('@/services/queryClient', () => ({
  invalidateHandicapCache: jest.fn(),
}));

jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/debugLogger', () => ({
  syncLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { previewCombinedDifferential } from '@/services/handicap/combineHandicapRounds';

const PLAYER_ID = 'player-1';
const TEE_ID = 'tee-1';

/** 18 × par 4, stroke indexes 1..18 in hole order. */
const COURSE_HOLES = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/** Five strokes on each listed hole, JSONB-keyed. */
function fivesOn(holeNumbers: number[]): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  for (const n of holeNumbers) scores[String(n)] = { strokes: 5 };
  return scores;
}

type Scores = Record<string, { strokes: number }> | null;

/** Seed a front9 + back9 pair on the same course and tee. Null scores = legacy card (gross 45). */
function seedPair(frontScores: Scores, backScores: Scores) {
  const grossOf = (scores: Scores) =>
    scores ? Object.values(scores).reduce((sum, s) => sum + s.strokes, 0) : 45;
  const card = (id: string, roundId: string, scores: Scores) => ({
    id,
    player_id: PLAYER_ID,
    round_id: roundId,
    total_gross: grossOf(scores),
    ga_handicap_used: null,
    status: 'completed',
    scores,
  });
  const round = (id: string, nineType: string) => ({
    id,
    course_id: 'course-1',
    nine_type: nineType,
    selected_tee: { tee_id: TEE_ID, name: 'Blue', color: 'blue' },
    courses: { holes: COURSE_HOLES },
  });

  mockRows.scorecards = {
    'sc-front': card('sc-front', 'round-front', frontScores),
    'sc-back': card('sc-back', 'round-back', backScores),
  };
  mockRows.rounds = {
    'round-front': round('round-front', 'front9'),
    'round-back': round('round-back', 'back9'),
  };
  mockRows.tees = {
    [TEE_ID]: { id: TEE_ID, name: 'Blue', slope: 125, course_rating: 72.5, slope_women: null, course_rating_women: null },
  };
  // No handicap → daily handicap null → 0 strokes received; every cap is par + 2 = 6.
  mockRows.players = {
    [PLAYER_ID]: { id: PLAYER_ID, gender: 'male', handicap: null },
  };
}

describe('previewCombinedDifferential — completeness gate', () => {
  it('previews a differential for two fully scored nines (I12 lock)', async () => {
    seedPair(fivesOn(range(1, 9)), fivesOn(range(10, 18)));

    const preview = await previewCombinedDifferential('sc-front', 'sc-back');

    // Adjusted 45 + 45 = 90 (5s are under the cap of 6): (113 / 125) × (90 − 72.5) = 15.8
    expect(preview.handicapDifferential).toBe(15.8);
    expect(preview.combinedGross).toBe(90);
  });

  it('still combines legacy nines with no hole data (I12 lock)', async () => {
    seedPair(null, null);

    const preview = await previewCombinedDifferential('sc-front', 'sc-back');

    // Raw gross 45 + 45 = 90, no cap possible → 15.8
    expect(preview.handicapDifferential).toBe(15.8);
  });

  it('rejects a pair whose back nine stopped after 6 holes', async () => {
    seedPair(fivesOn(range(1, 9)), fivesOn(range(10, 15)));

    await expect(previewCombinedDifferential('sc-front', 'sc-back')).rejects.toThrow(
      'Both nines must be fully scored to combine',
    );
  });

  it('rejects a pair whose front nine is part-filled', async () => {
    seedPair(fivesOn(range(1, 6)), fivesOn(range(10, 18)));

    await expect(previewCombinedDifferential('sc-front', 'sc-back')).rejects.toThrow(
      'Both nines must be fully scored to combine',
    );
  });
});
