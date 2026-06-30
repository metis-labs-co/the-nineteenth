import { resolveSubMatchForUser } from '@/utils/subMatches';
import type { SubMatch } from '@/types';

/**
 * Builds a minimal SubMatch with just the fields the resolver reads.
 * The rest of the SubMatch shape is irrelevant to opponent resolution.
 */
function makeSubMatch(
  sortOrder: number,
  teamA: string[],
  teamB: string[]
): SubMatch {
  return {
    id: `sm-${sortOrder}`,
    round_id: 'round-1',
    sort_order: sortOrder,
    team_a_player_ids: teamA,
    team_b_player_ids: teamB,
    tee_time: null,
    pairing_id: null,
    status: 'upcoming',
    result: null,
    final_differential: null,
    final_holes_remaining: null,
    team_a_net_total: null,
    team_b_net_total: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('resolveSubMatchForUser', () => {
  // The real bug: a split 1v1 round with 4 sub-matches across two tee groups.
  // The logged-in user (Example) is in sub-match 1 vs Noah, but the scoring
  // entry was grabbing the first two players in the round (Example + nvl).
  const subMatches: SubMatch[] = [
    makeSubMatch(0, ['sam'], ['metis']),
    makeSubMatch(1, ['example'], ['noah']),
    makeSubMatch(2, ['ben'], ['philip']),
    makeSubMatch(3, ['nvl'], ['john']),
  ];

  it('returns the user (player1) and their real opponent (player2) when user is on team A', () => {
    const result = resolveSubMatchForUser(subMatches, 'example');
    expect(result).toEqual({ player1Id: 'example', player2Id: 'noah' });
  });

  it('returns the user (player1) and their real opponent (player2) when user is on team B', () => {
    const result = resolveSubMatchForUser(subMatches, 'noah');
    expect(result).toEqual({ player1Id: 'noah', player2Id: 'example' });
  });

  it('does not match a player from a different sub-match', () => {
    // nvl is in sub-match 3 (vs john), never paired with example.
    const result = resolveSubMatchForUser(subMatches, 'nvl');
    expect(result).toEqual({ player1Id: 'nvl', player2Id: 'john' });
  });

  it('returns null when the user is not in any sub-match (e.g. organizer not playing)', () => {
    expect(resolveSubMatchForUser(subMatches, 'stranger')).toBeNull();
  });

  it('returns null when there are no sub-matches', () => {
    expect(resolveSubMatchForUser([], 'example')).toBeNull();
    expect(resolveSubMatchForUser(undefined, 'example')).toBeNull();
  });

  it('returns null when no current user id is provided', () => {
    expect(resolveSubMatchForUser(subMatches, undefined)).toBeNull();
  });

  it('returns null for a malformed sub-match with an empty opposing side', () => {
    const malformed: SubMatch[] = [makeSubMatch(0, ['example'], [])];
    expect(resolveSubMatchForUser(malformed, 'example')).toBeNull();
  });
});
