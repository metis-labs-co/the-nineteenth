/**
 * useRoundMetadata — holes_played mapping (end round early)
 *
 * The scoring init paths resolve the round's shape from the server row
 * (resolveRoundShape), and the mismatch guards compare holesPlayed, so the
 * metadata hook must select `holes_played` and expose it as `holesPlayed`
 * (NULL / absent = played as planned).
 *
 * @see src/hooks/scorecard/useRoundMetadata.ts
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useRoundMetadata } from '@/hooks/scorecard/useRoundMetadata';
import { ROUND_METADATA_SELECT } from '@/types/supabase/roundQueries';
import type { Database } from '@/types/database.types';

// Row returned by the `rounds` query; each test sets it.
let mockRoundRow: Record<string, unknown> = {};

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      const chain: Record<string, jest.Mock> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      if (table === 'rounds') {
        chain.single = jest.fn(() => Promise.resolve({ data: mockRoundRow, error: null }));
      } else {
        // round_players (standalone per-player tees): select → eq → not, awaited
        chain.not = jest.fn(() => Promise.resolve({ data: [], error: null }));
      }
      return chain;
    }),
  },
}));

jest.mock('@/utils/debugLogger', () => {
  const makeLogger = () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() });
  return { roundDataLogger: makeLogger(), createModuleLogger: jest.fn(() => makeLogger()) };
});

// A standalone back-9 round with no course join (skips the tees query).
const BASE_ROW = {
  id: 'round-1',
  competition_id: null,
  status: 'in-progress',
  game_type: 'stroke',
  is_team_round: false,
  team_format: null,
  round_format: 'combined',
  scoring_pairs_required: false,
  ball_count: 1,
  handicap_source: 'profile',
  nine_type: 'back9',
  selected_tee: null,
  team_config: null,
  courses: null,
};

describe('useRoundMetadata — holes_played', () => {
  it('selects holes_played in the metadata query', () => {
    expect(ROUND_METADATA_SELECT).toMatch(/\bholes_played\b/);
  });

  it('maps holes_played to holesPlayed', async () => {
    mockRoundRow = { ...BASE_ROW, holes_played: 6 };

    const { result } = renderHook(() => useRoundMetadata('round-1'));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.holesPlayed).toBe(6);
    expect(result.current.data?.nineType).toBe('back9');
  });

  it('maps a NULL holes_played to null (played as planned)', async () => {
    mockRoundRow = { ...BASE_ROW, holes_played: null };

    const { result } = renderHook(() => useRoundMetadata('round-1'));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.holesPlayed).toBeNull();
  });

  it('treats an absent holes_played column as null', async () => {
    mockRoundRow = { ...BASE_ROW };

    const { result } = renderHook(() => useRoundMetadata('round-1'));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.holesPlayed).toBeNull();
  });
});

describe('end_round_early RPC type', () => {
  it('takes the round id and N only (no front-9 conversion flag)', () => {
    type Args = Database['public']['Functions']['end_round_early']['Args'];
    const args: Args = { p_round_id: 'round-1', p_holes_played: 6 };
    // @ts-expect-error — the conversion flag was cut (spec R12); pnpm type-check fails if it comes back.
    const withConvert: Args = { p_round_id: 'round-1', p_holes_played: 9, p_convert_to_front9: true };
    expect(Object.keys(args)).toEqual(['p_round_id', 'p_holes_played']);
    expect(withConvert.p_holes_played).toBe(9);
  });
});
