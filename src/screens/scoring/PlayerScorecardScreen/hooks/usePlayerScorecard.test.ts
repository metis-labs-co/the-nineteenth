/**
 * usePlayerScorecard Hook Tests
 *
 * Focus: the read-only vs live-scoring data sourcing introduced so the screen
 * works when opened from a leaderboard (store NOT populated for that round).
 */

import { renderHook } from '@testing-library/react-native';
import { usePlayerScorecard } from './usePlayerScorecard';
import { useScorecardStore } from '@/store/scorecardStore';
import { useRoundScorecards, useRoundDetails } from '@/hooks/rounds/queries';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { displayHoleNumber } from '@/utils/holeTransformers';
import type { NineType } from '@/types/database/enums';
import type { Hole } from '@/types/database/base';

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

jest.mock('@/hooks/rounds/queries', () => ({
  useRoundScorecards: jest.fn(),
  useRoundDetails: jest.fn(),
}));

const mockedUseScorecardStore = useScorecardStore as unknown as jest.Mock;
const mockedUseRoundScorecards = useRoundScorecards as unknown as jest.Mock;
const mockedUseRoundDetails = useRoundDetails as unknown as jest.Mock;

// 18 par-4 holes, stroke index = hole number.
const holes: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4,
  strokeIndex: i + 1,
}));

/** Default (empty) live store — not initialised, simulating "opened from leaderboard". */
function emptyStore() {
  return {
    currentRoundId: null,
    currentPlayers: [],
    groupScorecards: new Map(),
    holes: [],
    isLoading: false,
    isInitialized: false,
    isMultiBall: false,
    ballCount: 1,
    selectedTeeData: null,
    handicapSource: 'profile',
    startHole: 1,
    nineType: 'full',
    holesPlayed: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseScorecardStore.mockReturnValue(emptyStore());
  mockedUseRoundScorecards.mockReturnValue({ data: undefined, isLoading: false });
  mockedUseRoundDetails.mockReturnValue({ data: undefined, isLoading: false });
});

describe('usePlayerScorecard — read-only (from leaderboard)', () => {
  beforeEach(() => {
    mockedUseRoundScorecards.mockReturnValue({
      data: [
        {
          player_id: 'p1',
          // daily_handicap_used: 0 → strokes-received = 0 on every hole (deterministic).
          daily_handicap_used: 0,
          ga_handicap_used: 10,
          scores: {
            '1': { strokes: 4, putts: 2 }, // par → 2 pts
            '2': { strokes: 5, putts: 2 }, // bogey → 1 pt
            '3': { strokes: 3, putts: 1 }, // birdie → 3 pts
          },
          player: {
            id: 'p1',
            name: 'Alice',
            email: 'alice@example.com',
            handicap: 10,
            handicap_index: null,
            gender: 'male',
          },
        },
      ],
      isLoading: false,
    });
    mockedUseRoundDetails.mockReturnValue({
      data: {
        id: 'r1',
        nine_type: 'full',
        selected_tee: { slopeRating: 113, courseRating: 72 },
        course: { holes },
        competition: { handicap_source: 'profile' },
      },
      isLoading: false,
    });
  });

  it('flags read-only and loads the player from the database', () => {
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.player?.name).toBe('Alice');
    expect(result.current.scorecard).toBeDefined();
  });

  it('computes gross and stableford totals from the fetched scores', () => {
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    expect(result.current.playerStats.totalGross).toBe(12); // 4 + 5 + 3
    expect(result.current.playerStats.totalStableford).toBe(6); // 2 + 1 + 3
  });

  it('counts a picked-up hole as net double bogey in gross, not the raw pickup score', () => {
    mockedUseRoundScorecards.mockReturnValue({
      data: [
        {
          player_id: 'p1',
          daily_handicap_used: 0, // strokes-received 0 on every hole
          ga_handicap_used: 10,
          scores: {
            '1': { strokes: 4, putts: 2 }, // par
            '2': { strokes: 10 }, // pickup -> net double bogey = par 4 + 2 + 0 = 6
          },
          player: {
            id: 'p1',
            name: 'Alice',
            handicap: 10,
            handicap_index: null,
            gender: 'male',
          },
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    // 4 (par) + 6 (net double bogey for the pickup), NOT 4 + 10.
    expect(result.current.playerStats.totalGross).toBe(10);
  });

  it('does not fetch read-only data once the live store owns the round', () => {
    mockedUseScorecardStore.mockReturnValue({
      ...emptyStore(),
      currentRoundId: 'r1',
      isInitialized: true,
      holes,
      currentPlayers: [{ id: 'p1', name: 'Bob', handicap: 0, email: 'b@x.com' }],
      groupScorecards: new Map([['p1', { scores: { '1': { strokes: 4 } } }]]),
    });

    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.player?.name).toBe('Bob');
    // Read-only queries are gated off while the store owns the round.
    expect(mockedUseRoundScorecards).toHaveBeenCalledWith('r1', { enabled: false });
    expect(mockedUseRoundDetails).toHaveBeenCalledWith('r1', { enabled: false });
  });
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const numbers = (list: { number: number }[]) => list.map((h) => h.number);

function readOnlyRound(overrides: Record<string, unknown> = {}) {
  mockedUseRoundDetails.mockReturnValue({
    data: {
      id: 'r1', nine_type: 'full', holes_played: null,
      selected_tee: { slopeRating: 113, courseRating: 72 },
      course: { holes }, competition: { handicap_source: 'profile' },
      ...overrides,
    },
    isLoading: false,
  });
}

// Scores on holes 10/11 deliberately remain in the input even after a cutoff.
const singleScores = {
  '1': { strokes: 4, putts: 2, fairwayHit: true, greenInRegulation: true },
  '2': { strokes: 5, putts: 2, fairwayHit: false, greenInRegulation: false },
  '3': { strokes: 3, putts: 1, fairwayHit: true, greenInRegulation: true },
  '10': { strokes: 4, putts: 3, fairwayHit: true, greenInRegulation: true },
  '11': { strokes: 6, putts: 4, fairwayHit: true, greenInRegulation: true },
};
const multiScores = {
  '1': { balls: [{ strokes: 4 }, { strokes: 5 }] },
  '2': { balls: [{ strokes: 3 }, { strokes: 4 }] },
  '10': { balls: [{ strokes: 6 }, { strokes: 3 }] },
};

type Source = 'live' | 'read-only';
function cardSource(source: Source, {
  nineType = 'full', holesPlayed = null, multi = false, snapshot = true,
  courseHoles = holes, startHole = 1,
}: {
  nineType?: NineType; holesPlayed?: number | null; multi?: boolean;
  snapshot?: boolean | number; courseHoles?: Hole[]; startHole?: number;
} = {}) {
  const scores = multi ? { ...multiScores } : { ...singleScores };
  if (source === 'live') {
    mockedUseScorecardStore.mockReturnValue({
      ...emptyStore(), currentRoundId: 'r1', isInitialized: true,
      holes: courseHoles, nineType, holesPlayed, startHole,
      isMultiBall: multi, ballCount: multi ? 2 : 1,
      selectedTeeData: { slopeRating: 113, courseRating: 72 },
      currentPlayers: [{ id: 'p1', name: 'Bob', handicap: 10, email: 'b@x.com', gender: 'male' }],
      groupScorecards: new Map([['p1', { scores }]]),
    });
  } else {
    readOnlyRound({ nine_type: nineType, holes_played: holesPlayed,
      course: { holes: courseHoles, start_hole: startHole } });
    mockedUseRoundScorecards.mockReturnValue({
      data: [{ player_id: 'p1', daily_handicap_used: snapshot === false ? null : typeof snapshot === 'number' ? snapshot : 0,
        ga_handicap_used: 10, scores,
        player: { id: 'p1', name: 'Alice', handicap: 25, gender: 'male' } }],
      isLoading: false,
    });
  }
  return scores;
}

describe('usePlayerScorecard — planned-round characterization', () => {
  it.each<Source>(['live', 'read-only'])('%s: keeps full rows and fallback daily handicap', (source) => {
    cardSource(source, { snapshot: false });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 18));
    expect(result.current.playerStats).toMatchObject({ totalPar: 72, totalGross: 22,
      totalPutts: 12, dailyHandicap: 9, handicap: 10 });
    expect(result.current.startHole).toBe(1);
  });

  it('read-only: honours the stored zero DHC and GA instead of current profile/tee values', () => {
    cardSource('read-only');
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(result.current.playerStats).toMatchObject({ dailyHandicap: 0, handicap: 10, totalStableford: 8 });
    expect(result.current.holeRowData[0].strokesReceived).toBe(0);
  });

  it.each<Source>(['live', 'read-only'])('%s: builds separate totals for each ball', (source) => {
    cardSource(source, { multi: true });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(result.current.isMultiBall).toBe(true);
    expect(result.current.ballCount).toBe(2);
    expect(result.current.multiBallHoleData).toHaveLength(18);
    expect(result.current.multiBallStats.totalPar).toBe(72);
    expect(result.current.multiBallStats.ballStats[1].totalGross).toBe(13);
    expect(result.current.multiBallStats.ballStats[2].totalGross).toBe(12);
  });

  it.each<Source>(['live', 'read-only'])('%s: generates a full course when holes are absent', (source) => {
    cardSource(source, { courseHoles: [], snapshot: false });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 18));
    expect(result.current.playerStats.totalPar).toBe(72);
    expect(result.current.playerStats.dailyHandicap).toBe(9);
  });
});

describe('usePlayerScorecard — holes played', () => {
  it('renders every hole of a full round played as planned', () => {
    cardSource('read-only');
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 18));
    expect(result.current.playerStats.totalPar).toBe(72);
    expect(result.current.playerStats.totalGross).toBe(22);
    expect(result.current.startHole).toBe(1);
  });

  it.each<Source>(['live', 'read-only'])('%s: excludes stale scores after hole 6 from all single-ball rows and stats', (source) => {
    const scores = cardSource(source, { holesPlayed: 6 });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 6));
    expect(result.current.holeRowData.map((row) => row.hole.number)).toEqual(range(1, 6));
    expect(result.current.back9Holes).toHaveLength(0);
    expect(result.current.playerStats).toMatchObject({ totalPar: 24, totalGross: 12,
      totalPutts: 5, totalFairwaysHit: 2, totalFairwaysPossible: 3, totalGIR: 2, totalGIRPossible: 3,
      totalStableford: source === 'live' ? 9 : 6, dailyHandicap: source === 'live' ? 9 : 0 });
    expect(result.current.scorecard?.scores).toBe(scores);
    expect(scores['10']).toBeDefined();
  });

  it.each<Source>(['live', 'read-only'])('%s: renders back-9 physical hole numbers without a second offset', (source) => {
    cardSource(source, { nineType: 'back9', courseHoles: source === 'live' ? holes.slice(9) : holes });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(10, 18));
    expect(result.current.playerStats).toMatchObject({ totalPar: 36, totalGross: 10 });
    expect(result.current.startHole).toBe(1);
    expect(result.current.holes.map((hole) => displayHoleNumber(hole, result.current.startHole))).toEqual(range(10, 18));
  });

  it.each<Source>(['live', 'read-only'])('%s: renders only holes 10–15 for a back-9 ended after 6', (source) => {
    cardSource(source, { nineType: 'back9', holesPlayed: 6,
      courseHoles: source === 'live' ? holes.slice(9) : holes });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(10, 15));
    expect(result.current.front9Holes).toHaveLength(0);
    expect(result.current.back9Holes).toHaveLength(6);
    expect(result.current.holes.map((hole) => displayHoleNumber(hole, result.current.startHole))).toEqual(range(10, 15));
  });

  it.each<Source>(['live', 'read-only'])('%s: applies the actual course display offset for combo courses', (source) => {
    cardSource(source, { startHole: 10, holesPlayed: 6 });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(result.current.startHole).toBe(10);
    expect(displayHoleNumber(result.current.holes[0], result.current.startHole)).toBe(10);
  });

  it.each<Source>(['live', 'read-only'])('%s: cuts multi-ball rows and each ball total without changing raw scores', (source) => {
    const scores = cardSource(source, { multi: true, holesPlayed: 6 });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(result.current.multiBallHoleData.map((row) => row.hole.number)).toEqual(range(1, 6));
    expect(result.current.multiBallFront9).toHaveLength(6);
    expect(result.current.multiBallBack9).toHaveLength(0);
    expect(result.current.multiBallStats.totalPar).toBe(24);
    expect(result.current.multiBallStats.ballStats[1]).toMatchObject({ totalGross: 7,
      totalStableford: source === 'live' ? 7 : 5, back9Gross: 0 });
    expect(result.current.multiBallStats.ballStats[2]).toMatchObject({ totalGross: 9,
      totalStableford: source === 'live' ? 5 : 3, back9Gross: 0 });
    expect(result.current.scorecard?.scores).toBe(scores);
  });

  it.each<Source>(['live', 'read-only'])('%s: excludes stale multi-ball scores beyond the back-9 cutoff', (source) => {
    const scores = cardSource(source, { multi: true, nineType: 'back9', holesPlayed: 6,
      courseHoles: source === 'live' ? holes.slice(9) : holes });
    Object.assign(scores, { '16': { balls: [{ strokes: 4 }, { strokes: 5 }] } });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(result.current.multiBallHoleData.map((row) => row.hole.number)).toEqual(range(10, 15));
    expect(result.current.multiBallFront9).toHaveLength(0);
    expect(result.current.multiBallBack9).toHaveLength(6);
    expect(result.current.multiBallStats).toMatchObject({ totalPar: 24,
      ballStats: { 1: { totalGross: 6, front9Gross: 0 }, 2: { totalGross: 3, front9Gross: 0 } } });
    expect(result.current.scorecard?.scores['16']).toBeDefined();
  });

  it('read-only: retains a positive stored DHC after filtering the displayed holes', () => {
    cardSource('read-only', { holesPlayed: 6, snapshot: 7 });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 6));
    expect(result.current.playerStats).toMatchObject({ dailyHandicap: 7, handicap: 10, totalStableford: 9 });
    expect(result.current.holeRowData[0].strokesReceived).toBe(1);
  });

  it.each<Source>(['live', 'read-only'])('%s: retains planned par for no-snapshot fallback after cutting to 6', (source) => {
    cardSource(source, { holesPlayed: 6, snapshot: false });
    const planned = calculateGADailyHandicap({ gaHandicap: 10, slopeRating: 113,
      courseRating: 72, par: 72, gender: 'male' }).dailyHandicap;
    const playedOnly = calculateGADailyHandicap({ gaHandicap: 10, slopeRating: 113,
      courseRating: 72, par: 24, gender: 'male' }).dailyHandicap;
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 6));
    expect(planned).toBe(9);
    expect(planned).not.toBe(playedOnly);
    expect(result.current.playerStats.dailyHandicap).toBe(planned);
  });

  it.each<Source>(['live', 'read-only'])('%s: keeps the existing back-9 fallback par source', (source) => {
    cardSource(source, { nineType: 'back9', holesPlayed: 6, snapshot: false,
      courseHoles: source === 'live' ? holes.slice(9) : holes });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(10, 15));
    // Existing GA formula: raw readonly course par72 =>9; store planned par36 =>43.
    expect(result.current.playerStats.dailyHandicap).toBe(source === 'live' ? 43 : 9);
  });

  it.each<Source>(['live', 'read-only'])('%s: filters generated holes to the played back-9', (source) => {
    cardSource(source, { nineType: 'back9', holesPlayed: 6, courseHoles: [], snapshot: false });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(10, 15));
    expect(result.current.playerStats.totalPar).toBe(24);
    expect(result.current.playerStats.dailyHandicap).toBe(9);
  });

  it.each<Source>(['live', 'read-only'])('%s: uses the planned front nine without an early end', (source) => {
    cardSource(source, { nineType: 'front9', courseHoles: source === 'live' ? holes.slice(0, 9) : holes });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 9));
    expect(result.current.playerStats).toMatchObject({ totalPar: 36, totalGross: 12 });
  });

  it.each([undefined, null, 0, -3, 2.5, NaN])('keeps the ordinary planned rows for invalid/unset markers (%s)', (marker) => {
    cardSource('read-only', { holesPlayed: marker });
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));
    expect(numbers(result.current.holes)).toEqual(range(1, 18));
    expect(result.current.playerStats.totalGross).toBe(22);
  });
});
