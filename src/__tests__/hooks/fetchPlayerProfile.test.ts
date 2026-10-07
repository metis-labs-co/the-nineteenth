/**
 * Unit tests for fetchPlayerProfile — the core of the biometric→onboarding fix.
 *
 * Regression: an errored player-profile fetch must THROW (so the caller's query
 * errors and retries), NOT resolve to null. The old inline version returned
 * null on any error, which the onboarding gate read as "no account" and used to
 * drop real, signed-in users into onboarding on a transient cold-start blip.
 *
 * `null` is reserved for a genuinely absent row (real new user → onboarding).
 */

import { fetchPlayerProfile } from '@/hooks/auth/useAuthUser';

// Mock the Supabase client's get_my_player RPC (own row incl. private columns).
const mockMaybeSingle = jest.fn();
const mockRpc = jest.fn((_fn: string) => ({
  maybeSingle: () => mockMaybeSingle(),
}));
const mockDirectMaybeSingle = jest.fn();
const mockFrom = jest.fn((_table: string) => ({
  select: () => ({ eq: () => ({ maybeSingle: () => mockDirectMaybeSingle() }) }),
}));
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (fn: string) => mockRpc(fn),
    from: (table: string) => mockFrom(table),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
  },
}));

describe('fetchPlayerProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the player when the row exists', async () => {
    const player = { id: 'u1', handicap: 23, handicap_updated_at: '2026-06-27T00:00:00Z' };
    mockMaybeSingle.mockResolvedValue({ data: player, error: null });

    await expect(fetchPlayerProfile('u1')).resolves.toEqual(player);
    expect(mockRpc).toHaveBeenCalledWith('get_my_player');
  });

  it('falls back to a direct own-row read when get_my_player is not deployed', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.get_my_player' },
    });
    const player = { id: 'u1', handicap: 10 };
    mockDirectMaybeSingle.mockResolvedValue({ data: player, error: null });

    await expect(fetchPlayerProfile('u1')).resolves.toEqual(player);
    expect(mockFrom).toHaveBeenCalledWith('players');
  });

  it('returns null if the RPC row belongs to a different user', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'someone-else' }, error: null });

    await expect(fetchPlayerProfile('u1')).resolves.toBeNull();
  });

  it('returns null when the row genuinely does not exist (no row, no error)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchPlayerProfile('u1')).resolves.toBeNull();
  });

  it('THROWS on a fetch error instead of swallowing it to null (the bug)', async () => {
    const err = { code: 'PGRST301', message: 'JWT expired' };
    mockMaybeSingle.mockResolvedValue({ data: null, error: err });

    await expect(fetchPlayerProfile('u1')).rejects.toEqual(err);
  });

  it('THROWS on a network/transient failure', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Network request failed' },
    });

    await expect(fetchPlayerProfile('u1')).rejects.toBeTruthy();
  });
});
