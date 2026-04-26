/**
 * useGroupFilter Hook Tests
 *
 * Covers the activation rule (scoring pairs off, >4 players, user in pairing),
 * the "show all" toggle, and the fallbacks for edge cases (no pairings,
 * user not in any pairing, single-group rounds).
 */

import { renderHook, act } from '@testing-library/react-native';
import { useGroupFilter } from './useGroupFilter';
import type { Player, PairingWithPlayers } from '@/types';

function makePlayer(id: string, name = id): Player {
  return {
    id,
    name,
    email: `${id}@example.com`,
    handicap: 10,
  };
}

function makePairing(id: string, playerIds: string[]): PairingWithPlayers {
  return {
    id,
    roundId: 'round-1',
    playerIds,
    teeTime: null,
    slotIndex: 0,
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    players: playerIds.map((pid) => ({
      id: pid,
      name: pid,
      handicap: 10,
      photoUrl: null,
    })),
  };
}

const eightPlayers = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map((id) =>
  makePlayer(id)
);
const twoPairings = [
  makePairing('pair-a', ['p1', 'p2', 'p3', 'p4']),
  makePairing('pair-b', ['p5', 'p6', 'p7', 'p8']),
];

describe('useGroupFilter', () => {
  it('filters down to the user pairing when scoring pairs is off and 8 players', () => {
    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: 'p1',
        currentPlayers: eightPlayers,
        pairings: twoPairings,
        scoringPairsEnabled: false,
      })
    );

    expect(result.current.canFilter).toBe(true);
    expect(result.current.isFiltered).toBe(true);
    expect(result.current.groupCount).toBe(4);
    expect(result.current.totalCount).toBe(8);
    expect(result.current.groupPlayers.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('returns all players after toggleShowAll, then filters again on second toggle', () => {
    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: 'p1',
        currentPlayers: eightPlayers,
        pairings: twoPairings,
        scoringPairsEnabled: false,
      })
    );

    act(() => result.current.toggleShowAll());
    expect(result.current.isFiltered).toBe(false);
    expect(result.current.groupPlayers).toHaveLength(8);
    expect(result.current.canFilter).toBe(true);

    act(() => result.current.toggleShowAll());
    expect(result.current.isFiltered).toBe(true);
    expect(result.current.groupPlayers).toHaveLength(4);
  });

  it('does not activate when scoring pairs is enabled', () => {
    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: 'p1',
        currentPlayers: eightPlayers,
        pairings: twoPairings,
        scoringPairsEnabled: true,
      })
    );

    expect(result.current.canFilter).toBe(false);
    expect(result.current.isFiltered).toBe(false);
    expect(result.current.groupPlayers).toHaveLength(8);
  });

  it('does not activate when round has 4 or fewer players', () => {
    const fourPlayers = eightPlayers.slice(0, 4);
    const oneGroup = [makePairing('only', ['p1', 'p2', 'p3', 'p4'])];

    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: 'p1',
        currentPlayers: fourPlayers,
        pairings: oneGroup,
        scoringPairsEnabled: false,
      })
    );

    expect(result.current.canFilter).toBe(false);
    expect(result.current.groupPlayers).toHaveLength(4);
  });

  it('falls back to all players when user is not in any pairing', () => {
    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: 'organizer-not-playing',
        currentPlayers: eightPlayers,
        pairings: twoPairings,
        scoringPairsEnabled: false,
      })
    );

    expect(result.current.canFilter).toBe(false);
    expect(result.current.groupPlayers).toHaveLength(8);
  });

  it('falls back to all players when no pairings exist', () => {
    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: 'p1',
        currentPlayers: eightPlayers,
        pairings: [],
        scoringPairsEnabled: false,
      })
    );

    expect(result.current.canFilter).toBe(false);
    expect(result.current.groupPlayers).toHaveLength(8);
  });

  it('falls back to all players when no currentUserId is provided', () => {
    const { result } = renderHook(() =>
      useGroupFilter({
        currentUserId: undefined,
        currentPlayers: eightPlayers,
        pairings: twoPairings,
        scoringPairsEnabled: false,
      })
    );

    expect(result.current.canFilter).toBe(false);
    expect(result.current.groupPlayers).toHaveLength(8);
  });
});
