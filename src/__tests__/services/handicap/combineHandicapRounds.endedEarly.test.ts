import {
  combineHandicapRounds,
  previewCombinedDifferential,
} from '@/services/handicap/combineHandicapRounds';

/**
 * Combine-two-nines validation — a nine whose round was ended early never
 * combines, even when its card has no per-hole data (multi-ball / legacy),
 * which the card-level completeness check (A4a) lets through.
 */

// supabase.from(table) → a chain whose first .eq(column, value) picks the row
// mockRows[table][value]; .single() resolves it (or a not-found error).
// Every select() column list is recorded in mockSelects[table].
const mockRows: Record<string, Record<string, unknown>> = {};
const mockSelects: Record<string, string[]> = {};

function mockQuery(table: string) {
  let key: string | undefined;
  const chain: Record<string, unknown> = {};
  chain.select = (columns: string) => {
    mockSelects[table] = [...(mockSelects[table] ?? []), columns];
    return chain;
  };
  chain.eq = (_column: string, value: string) => {
    if (key === undefined) key = value;
    return chain;
  };
  chain.insert = () => {
    key = 'inserted';
    return chain;
  };
  chain.single = () => {
    const row = key === undefined ? undefined : mockRows[table]?.[key];
    return Promise.resolve(
      row ? { data: row, error: null } : { data: null, error: { message: 'not found' } }
    );
  };
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

const PLAYER_ID = 'player-1';
const TEE_ID = 'tee-1';

/** 18 × par 4, stroke indexes 1..18 in hole order. */
const COURSE_HOLES = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

/**
 * Seed a front9 + back9 pair on the same course and tee. Both cards have
 * scores: {} (no per-hole data) and a gross of 45.
 */
function seedPair(
  frontHolesPlayed: number | null | undefined,
  backHolesPlayed: number | null | undefined,
  absentScores = false
) {
  const card = (id: string, roundId: string) => ({
    id,
    player_id: PLAYER_ID,
    round_id: roundId,
    total_gross: 45,
    ga_handicap_used: null,
    status: 'completed',
    ...(absentScores ? {} : { scores: {} }),
  });
  const round = (id: string, nineType: string, holesPlayed: number | null | undefined) => ({
    id,
    course_id: 'course-1',
    nine_type: nineType,
    ...(holesPlayed === undefined ? {} : { holes_played: holesPlayed }),
    selected_tee: { tee_id: TEE_ID, name: 'Blue', color: 'blue' },
    courses: { holes: COURSE_HOLES },
  });

  for (const table of Object.keys(mockSelects)) delete mockSelects[table];
  mockSelects.rounds = [];
  mockRows.scorecards = {
    'sc-front': card('sc-front', 'round-front'),
    'sc-back': card('sc-back', 'round-back'),
  };
  mockRows.rounds = {
    'round-front': round('round-front', 'front9', frontHolesPlayed),
    'round-back': round('round-back', 'back9', backHolesPlayed),
  };
  mockRows.tees = {
    [TEE_ID]: {
      id: TEE_ID,
      name: 'Blue',
      slope: 125,
      course_rating: 72.5,
      slope_women: null,
      course_rating_women: null,
    },
  };
  mockRows.players = {
    [PLAYER_ID]: { id: PLAYER_ID, gender: 'male', handicap: null },
  };
  mockRows.handicap_combined_rounds = { inserted: { id: 'combined-1' } };
}

describe('previewCombinedDifferential — ended-early nines', () => {
  it('combines two nines with no hole data (locks current behaviour)', async () => {
    seedPair(null, null);

    const preview = await previewCombinedDifferential('sc-front', 'sc-back');

    // No hole data → adjusted gross falls back to the combined gross:
    // (113 / 125) × (90 − 72.5) = 15.82 → 15.8
    expect(preview.handicapDifferential).toBe(15.8);
    expect(preview.combinedGross).toBe(90);
  });

  it('requests holes_played with each round', async () => {
    seedPair(null, null);

    await previewCombinedDifferential('sc-front', 'sc-back');

    expect(mockSelects.rounds).toHaveLength(2);
    for (const columns of mockSelects.rounds) expect(columns).toContain('holes_played');
  });

  it('combines ordinary legacy nines with absent scores and end metadata (locks current behaviour)', async () => {
    seedPair(undefined, undefined, true);

    const preview = await previewCombinedDifferential('sc-front', 'sc-back');

    expect(preview.handicapDifferential).toBe(15.8);
    expect(preview.combinedGross).toBe(90);
  });

  it('rejects a pair whose back nine was ended early', async () => {
    seedPair(null, 6);

    await expect(previewCombinedDifferential('sc-front', 'sc-back')).rejects.toThrow(
      'Both nines must be fully scored to combine'
    );
    expect(mockSelects.round_players).toBeUndefined();
    expect(mockSelects.tees).toBeUndefined();
  });

  it('rejects a pair whose front nine was ended early', async () => {
    seedPair(6, null);

    await expect(previewCombinedDifferential('sc-front', 'sc-back')).rejects.toThrow(
      'Both nines must be fully scored to combine'
    );
    expect(mockSelects.round_players).toBeUndefined();
    expect(mockSelects.tees).toBeUndefined();
  });

  it.each(['front', 'back'])(
    'rejects creating a combination with an ended %s nine before tee reads or writes',
    async (endedNine) => {
      seedPair(endedNine === 'front' ? 6 : null, endedNine === 'back' ? 6 : null);

      await expect(combineHandicapRounds('sc-front', 'sc-back')).rejects.toThrow(
        'Both nines must be fully scored to combine'
      );
      expect(mockSelects.round_players).toBeUndefined();
      expect(mockSelects.tees).toBeUndefined();
      expect(mockSelects.handicap_combined_rounds).toBeUndefined();
    }
  );
});
