/**
 * Tests for useSubMatchPermissions.
 *
 * Verifies the three buckets of access (member / organiser / both) and
 * the disabled-by-default state when there's no auth or no sub-match.
 */

import { renderHook } from '@testing-library/react-native';
import { useSubMatchPermissions } from '@/hooks/rounds/useSubMatchPermissions';
import type { SubMatch } from '@/types/database/round.types';

let mockCurrentUserId: string | null = null;

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUserId ? { id: mockCurrentUserId } : null,
  }),
}));

const baseSubMatch: SubMatch = {
  id: 'sm-1',
  round_id: 'r-1',
  sort_order: 0,
  team_a_player_ids: ['player-a1', 'player-a2'],
  team_b_player_ids: ['player-b1', 'player-b2'],
  tee_time: null,
  pairing_id: null,
  status: 'upcoming',
  result: null,
  final_differential: null,
  team_a_net_total: null,
  team_b_net_total: null,
  created_at: '',
  updated_at: '',
};

describe('useSubMatchPermissions', () => {
  beforeEach(() => {
    mockCurrentUserId = null;
  });

  it('returns no access when no user is signed in', () => {
    mockCurrentUserId = null;
    const { result } = renderHook(() => useSubMatchPermissions(baseSubMatch, 'organiser-id'));
    expect(result.current).toEqual({
      isMember: false,
      isOrganizer: false,
      canManageSkins: false,
    });
  });

  it('returns no access when sub-match is null', () => {
    mockCurrentUserId = 'player-a1';
    const { result } = renderHook(() => useSubMatchPermissions(null, 'organiser-id'));
    expect(result.current.canManageSkins).toBe(false);
  });

  it('flags a player on team A as a member', () => {
    mockCurrentUserId = 'player-a1';
    const { result } = renderHook(() => useSubMatchPermissions(baseSubMatch, 'organiser-id'));
    expect(result.current.isMember).toBe(true);
    expect(result.current.isOrganizer).toBe(false);
    expect(result.current.canManageSkins).toBe(true);
  });

  it('flags a player on team B as a member', () => {
    mockCurrentUserId = 'player-b2';
    const { result } = renderHook(() => useSubMatchPermissions(baseSubMatch, 'organiser-id'));
    expect(result.current.isMember).toBe(true);
    expect(result.current.canManageSkins).toBe(true);
  });

  it('flags the competition organiser as an organiser even when not a member', () => {
    mockCurrentUserId = 'organiser-id';
    const { result } = renderHook(() => useSubMatchPermissions(baseSubMatch, 'organiser-id'));
    expect(result.current.isMember).toBe(false);
    expect(result.current.isOrganizer).toBe(true);
    expect(result.current.canManageSkins).toBe(true);
  });

  it('denies access when the user is neither member nor organiser', () => {
    mockCurrentUserId = 'random-spectator';
    const { result } = renderHook(() => useSubMatchPermissions(baseSubMatch, 'organiser-id'));
    expect(result.current).toEqual({
      isMember: false,
      isOrganizer: false,
      canManageSkins: false,
    });
  });
});
