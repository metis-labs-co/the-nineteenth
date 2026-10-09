/** useScoreReview — submit validation over the holes that count. */
import { renderHook, act } from '@testing-library/react-native';
import { useScoreReview } from './useScoreReview';
import { useScorecardStore } from '@/store/scorecardStore';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { Hole, Player, Scorecard } from '@/types';
import type { NineType } from '@/types/database/enums';

jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: jest.fn() }));
const mockedStore = useScorecardStore as jest.MockedFunction<typeof useScorecardStore>;
const alice = { id: 'p1', name: 'Alice', email: 'alice@test.com' } as Player;
const bob = { id: 'p2', name: 'Bob', email: 'bob@test.com' } as Player;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function card(player: Player, holeNumbers: number[]): Scorecard {
  const scores: Scorecard['scores'] = {};
  for (const number of holeNumbers) scores[number] = { strokes: 4 };
  return {
    id: `sc-${player.id}`, roundId: 'round-1', playerId: player.id, scores,
    totalGross: 0, totalNet: 0, status: 'in-progress',
    createdAt: new Date('2026-10-07T00:00:00Z'), updatedAt: new Date('2026-10-07T00:00:00Z'),
  };
}

function mockStore({
  holes = create18Holes(), aliceHoles = range(1, 18), bobHoles = range(1, 18),
  nineType = 'full', holesPlayed = null,
}: {
  holes?: Hole[]; aliceHoles?: number[]; bobHoles?: number[];
  nineType?: NineType; holesPlayed?: number | null;
} = {}) {
  const state = {
    currentRoundId: 'round-1', currentPlayers: [alice, bob],
    groupScorecards: new Map([[alice.id, card(alice, aliceHoles)], [bob.id, card(bob, bobHoles)]]),
    holes, gameType: 'stroke', getPlayerScore: jest.fn(), submitScorecards: jest.fn(),
    resetRound: jest.fn(), setCurrentHole: jest.fn(), selectedTeeData: null,
    handicapSource: 'profile', startHole: 1, allowedPlayerIds: [] as string[],
    isMultiBall: false, ballCount: 1, nineType, holesPlayed,
  };
  mockedStore.mockReturnValue(state as any);
  return state;
}

function validate(result: { current: ReturnType<typeof useScoreReview> }) {
  let incomplete: ReturnType<typeof useScoreReview>['incompleteHoles'] = [];
  act(() => { incomplete = result.current.validateScores(); });
  expect(result.current.incompleteHoles).toEqual(incomplete);
  return incomplete;
}

describe('useScoreReview — validateScores', () => {
  it('validates only the played holes once the round has been ended early', () => {
    mockStore({ aliceHoles: range(1, 6), bobHoles: range(1, 6), holesPlayed: 6 });
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([]);
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.playedHoles.map((hole) => hole.number)).toEqual(range(1, 6));
    expect(result.current.holesPlayed).toBe(6);
  });

  it('still reports a gap inside the played holes', () => {
    mockStore({ aliceHoles: range(1, 6), bobHoles: range(1, 5), holesPlayed: 6 });
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([{ holeNumber: 6, missingPlayers: [{ id: 'p2', name: 'Bob' }] }]);
  });

  it('slices a back-nine round from hole 10', () => {
    mockStore({ holes: create18Holes().slice(9), aliceHoles: range(10, 15), bobHoles: range(10, 15), nineType: 'back9', holesPlayed: 6 });
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([]);
    expect(result.current.playedHoles.map((hole) => hole.number)).toEqual(range(10, 15));
    expect(result.current.holes).toHaveLength(9);
    expect(result.current.nineType).toBe('back9');
  });

  it.each(['route', 'default'])('validates played holes using the %s fallback when store holes are absent', (fallback) => {
    mockStore({ holes: [], aliceHoles: range(10, 15), bobHoles: range(10, 15), nineType: 'back9', holesPlayed: 6 });
    const routeHoles = fallback === 'route' ? create18Holes().slice(9) : undefined;
    const { result } = renderHook(() => useScoreReview({ routeHoles }));
    expect(validate(result)).toEqual([]);
    expect(result.current.playedHoles.map((hole) => hole.number)).toEqual(range(10, 15));
    if (routeHoles) expect(result.current.holes).toBe(routeHoles);
    else expect(result.current.holes).toHaveLength(18);
  });

  it('updates played validation when only the cutoff changes with stable holes and scorecards', () => {
    const state = mockStore({ aliceHoles: range(1, 6), bobHoles: range(1, 5), holesPlayed: 6 });
    const { result, rerender } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([{ holeNumber: 6, missingPlayers: [{ id: 'p2', name: 'Bob' }] }]);
    state.holesPlayed = 5;
    rerender({});
    expect(validate(result)).toEqual([]);
    expect(result.current.playedHoles.map((hole) => hole.number)).toEqual(range(1, 5));
    expect(result.current.holes).toBe(state.holes);
    expect(result.current.groupScorecards).toBe(state.groupScorecards);
    state.holesPlayed = null;
    rerender({});
    expect(validate(result).map((hole) => hole.holeNumber)).toEqual(range(6, 18));
  });

  it.each([0, -3, 2.5, NaN])('keeps planned validation for an invalid ended marker (%s)', (holesPlayed) => {
    mockStore({ bobHoles: range(1, 17), holesPlayed });
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([{ holeNumber: 18, missingPlayers: [{ id: 'p2', name: 'Bob' }] }]);
    expect(result.current.playedHoles).toHaveLength(18);
  });

  it('reports every planned hole a player is missing (locks current behaviour)', () => {
    mockStore({ bobHoles: range(1, 17) });
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([{ holeNumber: 18, missingPlayers: [{ id: 'p2', name: 'Bob' }] }]);
  });

  it('checks only allowed players when scoring assignments are present', () => {
    const state = mockStore({ bobHoles: [] });
    state.allowedPlayerIds = ['p1'];
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([]);
  });

  it('rejects missing and zero single-ball scores but preserves negative truthy strokes', () => {
    const state = mockStore();
    const scores = state.groupScorecards.get('p2')!.scores;
    delete scores[1];
    scores[2] = { strokes: 0 };
    scores[3] = { strokes: -1 };
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([
      { holeNumber: 1, missingPlayers: [{ id: 'p2', name: 'Bob' }] },
      { holeNumber: 2, missingPlayers: [{ id: 'p2', name: 'Bob' }] },
    ]);
  });

  it('checks the first multi-ball score even when another ball has strokes', () => {
    const state = mockStore();
    state.currentPlayers = [alice];
    const scores = state.groupScorecards.get('p1')!.scores;
    scores[1] = { balls: [{ strokes: 0 }, { strokes: 4 }] };
    scores[2] = { balls: [] };
    scores[3] = { balls: [{ strokes: -1 }, { strokes: 0 }] };
    scores[4] = { balls: [{ strokes: 4 }, { strokes: 0 }] };
    const { result } = renderHook(() => useScoreReview({}));
    expect(validate(result)).toEqual([
      { holeNumber: 1, missingPlayers: [{ id: 'p1', name: 'Alice' }] },
      { holeNumber: 2, missingPlayers: [{ id: 'p1', name: 'Alice' }] },
    ]);
    expect(result.current.isMultiBall).toBe(true);
    expect(result.current.ballCount).toBe(2);
  });
});
