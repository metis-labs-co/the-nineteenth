/**
 * roundListMeta — the per-round hole lists the Rounds list feeds the match
 * pill and calculatePlayerStats.
 *
 * - plannedHoles: the course narrowed to the round's nine_type (match pill).
 * - statsHoles: what calculatePlayerStats gets — the raw course holes for a
 *   round played as planned (unchanged), the planned holes for one ended early
 *   (B4 slices the first N of them).
 */
import { buildRoundListMeta, type RoundListMetaSource } from './roundListMeta';
import {
  computeStandaloneMatchResult,
  type ScorecardForMatchPlay,
} from '@/utils/matchPlayResult';
import { calculatePlayerStats } from '@/utils/scorecardCalculations';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { HoleScore, TeeBox } from '@/types/database/base';

const TEE: TeeBox = { name: 'White', color: 'white', courseRating: 72, slopeRating: 125 };

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const numbers = (holes: { number: number }[]) => holes.map((h) => h.number);

function source(overrides: Partial<RoundListMetaSource> = {}): RoundListMetaSource {
  return {
    nine_type: 'full',
    holes_played: null,
    handicap_source: null,
    selected_tee: TEE,
    courses: { holes: create18Holes() },
    ...overrides,
  };
}

/** A match-play card with gross strokes keyed by hole number. DHC 0 ⇒ no shots given. */
function card(id: string, name: string, strokes: Record<number, number>): ScorecardForMatchPlay {
  const scores: Record<string, HoleScore> = {};
  for (const [hole, value] of Object.entries(strokes)) {
    scores[hole] = { strokes: value };
  }
  return { player_id: id, scores, daily_handicap_used: 0, player: { id, name } };
}

/** Sam shoots 4 on every hole; Bob shoots 5 on `bobLoses`, 4 elsewhere. */
function match(holeNumbers: number[], bobLoses: number[]) {
  const sam: Record<number, number> = {};
  const bob: Record<number, number> = {};
  for (const n of holeNumbers) {
    sam[n] = 4;
    bob[n] = bobLoses.includes(n) ? 5 : 4;
  }
  return [card('sam', 'Sam', sam), card('bob', 'Bob', bob)] as const;
}

describe('buildRoundListMeta', () => {
  it('keeps every course hole for a full round played as planned', () => {
    const meta = buildRoundListMeta(source());

    expect(numbers(meta.courseHoles)).toEqual(range(1, 18));
    expect(numbers(meta.plannedHoles)).toEqual(range(1, 18));
    expect(meta.statsHoles).toBe(meta.courseHoles);
    expect(meta.holesPlayed).toBeNull();
    expect(meta.selectedTee).toBe(TEE);
    expect(meta.handicapSource).toBe('profile');
  });

  it('plans holes 1–9 for a front-9 round but leaves the stats holes as they were', () => {
    const meta = buildRoundListMeta(source({ nine_type: 'front9' }));

    expect(numbers(meta.plannedHoles)).toEqual(range(1, 9));
    // Unchanged from today: the raw course holes (no nine-aware DHC in this plan).
    expect(numbers(meta.statsHoles)).toEqual(range(1, 18));
  });

  it('plans holes 10–18 for a back-9 round', () => {
    expect(numbers(buildRoundListMeta(source({ nine_type: 'back9' })).plannedHoles)).toEqual(
      range(10, 18)
    );
  });

  it('treats a null nine_type as a full round', () => {
    expect(buildRoundListMeta(source({ nine_type: null })).plannedHoles).toHaveLength(18);
  });

  it('feeds the planned holes to the stats, and carries holes_played, for a round ended early', () => {
    const meta = buildRoundListMeta(source({ nine_type: 'back9', holes_played: 6 }));

    expect(numbers(meta.statsHoles)).toEqual(range(10, 18));
    expect(meta.statsHoles).toBe(meta.plannedHoles);
    expect(meta.holesPlayed).toBe(6);
  });

  it('returns no holes when the course has no hole data', () => {
    const noCourse = buildRoundListMeta(source({ courses: null }));
    expect(noCourse.courseHoles).toEqual([]);
    expect(noCourse.plannedHoles).toEqual([]);
    expect(noCourse.statsHoles).toEqual([]);
    expect(buildRoundListMeta(source({ courses: { holes: null } })).plannedHoles).toEqual([]);
  });

  it('keeps an explicit handicap source', () => {
    expect(buildRoundListMeta(source({ handicap_source: 'none' })).handicapSource).toBe('none');
  });

  it.each([0, -1, 2.5, NaN])('keeps ordinary stats holes while forwarding invalid marker %s', (marker) => {
    const meta = buildRoundListMeta(source({ nine_type: 'back9', holes_played: marker }));
    expect(meta.statsHoles).toBe(meta.courseHoles);
    expect(meta.holesPlayed).toBe(marker);
  });

  it('preserves the ordinary stats holes for an older row without the optional marker', () => {
    const meta = buildRoundListMeta(source({ nine_type: 'back9', holes_played: undefined }));
    expect(meta.statsHoles).toBe(meta.courseHoles);
    expect(meta.holesPlayed).toBeNull();
  });
});

describe('round-list match pill fed from buildRoundListMeta', () => {
  it('settles a front-9 match won 2 up on holes 8 and 9 as "2 UP"', () => {
    // Level through 7; Sam wins 8 (1 up, 1 left) and 9 (2 up, 0 left) ⇒ "2 UP".
    const [sam, bob] = match(range(1, 9), [8, 9]);
    const meta = buildRoundListMeta(source({ nine_type: 'front9' }));

    expect(computeStandaloneMatchResult(sam, bob, meta.plannedHoles, meta.holesPlayed)).toMatchObject({
      winnerId: 'sam',
      winnerName: 'Sam',
      margin: '2 UP',
    });
  });

  it('settles an 18-hole match ended after 6 on the final lead — "2 UP", never "N&M"', () => {
    // Sam wins 1 and 2, holes 3–6 halved; 2 up with 12 planned holes left is no close-out.
    const [sam, bob] = match(range(1, 6), [1, 2]);
    const meta = buildRoundListMeta(source({ holes_played: 6 }));
    const result = computeStandaloneMatchResult(sam, bob, meta.plannedHoles, meta.holesPlayed);

    expect(result).toMatchObject({ winnerId: 'sam', winnerName: 'Sam', margin: '2 UP' });
    expect(result?.margin).not.toContain('&');
  });

  it('halves a level match that was ended early', () => {
    const [sam, bob] = match(range(1, 6), []);
    const meta = buildRoundListMeta(source({ holes_played: 6 }));

    expect(computeStandaloneMatchResult(sam, bob, meta.plannedHoles, meta.holesPlayed)).toMatchObject({
      winnerId: null,
      margin: 'A/S',
    });
  });
});

describe('round-list stats fed from buildRoundListMeta', () => {
  it('totals a back-9 card ended after 6 over holes 10–15 only', () => {
    // 4 on holes 10–16; hole 16 lies after the end and must not count.
    const scores: Record<string, HoleScore> = {};
    for (const n of range(10, 16)) scores[String(n)] = { strokes: 4 };
    const meta = buildRoundListMeta(
      source({ nine_type: 'back9', holes_played: 6, handicap_source: 'none' })
    );

    const [stats] = calculatePlayerStats(
      [
        {
          id: 'sc1',
          playerId: 'p1',
          player: { id: 'p1', name: 'Sam', handicap: 0 },
          scores,
          hasScorecard: true,
        },
      ],
      meta.statsHoles,
      meta.selectedTee,
      meta.handicapSource,
      { holesPlayed: meta.holesPlayed }
    );

    // handicap_source 'none' ⇒ daily handicap 0 ⇒ net = gross = 6 × 4.
    expect(stats.totalGross).toBe(24);
    expect(stats.totalNet).toBe(24);
  });

  it('keeps the stored snapshot DHC and nets a front-9 card ended after 6 over holes 1–6', () => {
    // 5 on holes 1–7; hole 7 lies after the end and must not count.
    const scores: Record<string, HoleScore> = {};
    for (const n of range(1, 7)) scores[String(n)] = { strokes: 5 };
    const meta = buildRoundListMeta(source({ nine_type: 'front9', holes_played: 6 }));

    const [stats] = calculatePlayerStats(
      [
        {
          id: 'sc1',
          playerId: 'p1',
          // Profile handicap 20 must be ignored: the stored snapshot wins.
          player: { id: 'p1', name: 'Sam', handicap: 20 },
          scores,
          hasScorecard: true,
          storedGaHandicap: 10,
          storedDailyHandicap: 9,
          storedTotalPoints: 13,
        },
      ],
      meta.statsHoles,
      meta.selectedTee,
      meta.handicapSource,
      { holesPlayed: meta.holesPlayed }
    );

    // Hand check (create18Holes, holes 1–6):
    //   stroke index 7, 15, 1, 11, 5, 17 → at DHC 9 a stroke on SI ≤ 9:
    //   holes 1, 3, 5 ⇒ 3 strokes received; holes 2, 4, 6 ⇒ 0.
    //   gross = 6 × 5 = 30; net = Σ(gross − strokes) = 30 − 3 = 27
    //   (not 30 − 9 = 21: the full DHC would credit 9 holes never played).
    expect(stats.dailyHandicap).toBe(9);
    expect(stats.handicap).toBe(10);
    expect(stats.totalGross).toBe(30);
    expect(stats.totalNet).toBe(27);
    // Retained points: 2 + 0 + 3 + 1 + 2 + 0 = 8; stored 13 is stale.
    expect(stats.totalStableford).toBe(8);
  });
});
