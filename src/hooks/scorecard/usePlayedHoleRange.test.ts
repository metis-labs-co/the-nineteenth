/**
 * usePlayedHoleRange — once a round is ended early, the scoring screens only
 * navigate the played holes, and a current hole after the end is pulled back.
 */

import { filterPlayableHoles } from '@/utils/holeTransformers';
import { renderHook } from '@testing-library/react-native';
import { usePlayedHoleRange } from './usePlayedHoleRange';
import { useScorecardStore } from '@/store/scorecardStore';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { NineType } from '@/types/database/enums';

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

const mockedUseScorecardStore = useScorecardStore as jest.MockedFunction<typeof useScorecardStore>;
const allHoles = create18Holes();
const backNine = allHoles.filter((hole) => hole.number >= 10);

function mockStore(overrides: {
  currentRoundId?: string | null;
  holesPlayed?: number | null;
  nineType?: NineType;
}) {
  const state = {
    currentRoundId: 'round-1',
    holesPlayed: null as number | null,
    nineType: 'full' as NineType,
    ...overrides,
  };
  mockedUseScorecardStore.mockReturnValue(state as ReturnType<typeof useScorecardStore>);
  return state;
}

describe('usePlayedHoleRange', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reacts to marker-only changes with the same store and planned-hole references', () => {
    const state = mockStore({});
    const setCurrentHole = jest.fn();
    const { result, rerender } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 8, setCurrentHole })
    );

    state.holesPlayed = 6;
    rerender({});
    expect(result.current.holesPlayed).toBe(6);
    expect(result.current.navigableHoles.map((hole) => hole.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(setCurrentHole).toHaveBeenLastCalledWith(6);

    state.holesPlayed = 3;
    rerender({});
    expect(result.current.navigableHoles.map((hole) => hole.number)).toEqual([1, 2, 3]);
    expect(result.current.lastHoleNumber).toBe(3);
    expect(setCurrentHole).toHaveBeenLastCalledWith(3);
    expect(allHoles).toHaveLength(18);
  });

  it('drops an ended range when the route changes to an unrelated round', () => {
    mockStore({ holesPlayed: 6, nineType: 'back9' });
    const setCurrentHole = jest.fn();
    const { result, rerender } = renderHook(
      ({ roundId }) =>
        usePlayedHoleRange({ roundId, holes: backNine, currentHole: 14, setCurrentHole }),
      { initialProps: { roundId: 'round-1' } }
    );

    expect(result.current.lastHoleNumber).toBe(15);
    rerender({ roundId: 'round-2' });
    expect(result.current.isEnded).toBe(false);
    expect(result.current.holesPlayed).toBeNull();
    expect(result.current.navigableHoles).toBe(backNine);
    expect(result.current.firstHoleNumber).toBe(10);
    expect(result.current.lastHoleNumber).toBe(18);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it.each([null, undefined])('ignores a marker without store round identity (%s)', (currentRoundId) => {
    mockStore({ currentRoundId, holesPlayed: 6 });
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 8, setCurrentHole })
    );

    expect(result.current.isEnded).toBe(false);
    expect(result.current.navigableHoles).toBe(allHoles);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('passes an ordinary back nine through unchanged and does not correct the current hole', () => {
    mockStore({ nineType: 'back9' });
    const holes = [...backNine].reverse();
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes, currentHole: 1, setCurrentHole })
    );

    expect(result.current.navigableHoles).toBe(holes);
    expect(result.current.firstHoleNumber).toBe(18);
    expect(result.current.lastHoleNumber).toBe(10);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('uses the actual sorted physical numbers for a sparse planned range', () => {
    mockStore({ holesPlayed: 2 });
    const holes = [allHoles[4], allHoles[0], allHoles[2]];
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes, currentHole: 8, setCurrentHole })
    );

    expect(result.current.navigableHoles.map((hole) => hole.number)).toEqual([1, 3]);
    expect(result.current.lastHoleNumber).toBe(3);
    expect(setCurrentHole).toHaveBeenCalledWith(3);
    expect(holes.map((hole) => hole.number)).toEqual([5, 1, 3]);
  });

  it('moves an ended current hole absent from a sparse range to the first retained hole', () => {
    mockStore({ holesPlayed: 3, nineType: 'back9' });
    const holes = [allHoles[9], allHoles[11], allHoles[13]];
    const setCurrentHole = jest.fn();
    renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes, currentHole: 13, setCurrentHole })
    );

    expect(setCurrentHole).toHaveBeenCalledWith(10);
  });

  it('rechecks actual membership when range contents change with identical bounds and count', () => {
    mockStore({ holesPlayed: 3, nineType: 'back9' });
    const setCurrentHole = jest.fn();
    const { rerender } = renderHook(
      ({ holes }) =>
        usePlayedHoleRange({ roundId: 'round-1', holes, currentHole: 11, setCurrentHole }),
      { initialProps: { holes: [allHoles[9], allHoles[10], allHoles[13]] } }
    );
    expect(setCurrentHole).not.toHaveBeenCalled();

    rerender({ holes: [allHoles[9], allHoles[11], allHoles[13]] });
    expect(setCurrentHole).toHaveBeenCalledWith(10);
  });

  it.each([0, -1, 2.5, NaN, Infinity])('ignores invalid ended marker %s', (holesPlayed) => {
    mockStore({ holesPlayed });
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 20, setCurrentHole })
    );

    expect(result.current.isEnded).toBe(false);
    expect(result.current.holesPlayed).toBeNull();
    expect(result.current.navigableHoles).toBe(allHoles);
    expect(result.current.lastHoleNumber).toBe(18);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('a round not ended passes the holes through unchanged', () => {
    mockStore({});
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 7, setCurrentHole })
    );

    expect(result.current.isEnded).toBe(false);
    expect(result.current.holesPlayed).toBeNull();
    expect(result.current.navigableHoles).toBe(allHoles);
    expect(result.current.firstHoleNumber).toBe(1);
    expect(result.current.lastHoleNumber).toBe(18);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('an 18-hole round ended after 6 navigates holes 1–6 and pulls hole 8 back to 6', () => {
    mockStore({ holesPlayed: 6 });
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 8, setCurrentHole })
    );

    expect(result.current.isEnded).toBe(true);
    expect(result.current.navigableHoles.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.current.firstHoleNumber).toBe(1);
    expect(result.current.lastHoleNumber).toBe(6);
    expect(setCurrentHole).toHaveBeenCalledWith(6);
  });

  it('a back nine ended after 6 navigates holes 10–15 (Review Focus #2)', () => {
    mockStore({ holesPlayed: 6, nineType: 'back9' });
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: backNine, currentHole: 17, setCurrentHole })
    );

    expect(result.current.navigableHoles.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15]);
    expect(result.current.firstHoleNumber).toBe(10);
    expect(result.current.lastHoleNumber).toBe(15);
    expect(setCurrentHole).toHaveBeenCalledWith(15);
  });

  it('a current hole before the range moves to the first played hole', () => {
    mockStore({ holesPlayed: 6, nineType: 'back9' });
    const setCurrentHole = jest.fn();
    renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: backNine, currentHole: 1, setCurrentHole })
    );

    expect(setCurrentHole).toHaveBeenCalledWith(10);
  });

  it('leaves a current hole inside the played range alone', () => {
    mockStore({ holesPlayed: 6 });
    const setCurrentHole = jest.fn();
    renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 4, setCurrentHole })
    );

    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('ignores holesPlayed while the store still holds another round', () => {
    mockStore({ currentRoundId: 'round-2', holesPlayed: 6 });
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: allHoles, currentHole: 8, setCurrentHole })
    );

    expect(result.current.isEnded).toBe(false);
    expect(result.current.lastHoleNumber).toBe(18);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('falls back to 1–18 bounds while holes are empty', () => {
    mockStore({ holesPlayed: 6 });
    const setCurrentHole = jest.fn();
    const { result } = renderHook(() =>
      usePlayedHoleRange({ roundId: 'round-1', holes: [], currentHole: 8, setCurrentHole })
    );

    expect(result.current.firstHoleNumber).toBe(1);
    expect(result.current.lastHoleNumber).toBe(18);
    expect(setCurrentHole).not.toHaveBeenCalled();
  });
});

describe('played-hole helper characterization', () => {
  it('passes an ordinary full round through without sorting or copying', () => {
    const holes = [...allHoles].reverse();
    expect(filterPlayableHoles(holes, 'full')).toBe(holes);
    expect(holes[0].number).toBe(18);
  });

  it('retains physical back-nine numbers without changing the planned list', () => {
    expect(filterPlayableHoles(backNine, 'back9', 6).map((hole) => hole.number)).toEqual([
      10, 11, 12, 13, 14, 15,
    ]);
    expect(backNine.map((hole) => hole.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });
});
