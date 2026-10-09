// src/__tests__/hooks/playerStatistics/statsFixtures.ts
/**
 * Scorecard rows shared by the player/course statistics hook tests: a full
 * 18, a 9-hole round and a social round ended early after 6 holes — all
 * standalone, completed, on the same course.
 */
import { create18Holes } from '@/__tests__/utils/testFixtures';

export const PLAYER_ID = 'player-1';
export const COURSE_ID = 'course-1';

const HOLES = create18Holes();

export const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

interface StatsCardOptions {
  id: string;
  date: string;
  holeNumbers: number[];
  strokes: number;
  /** Putts recorded on every hole (omitted = not tracked). */
  putts?: number;
  /** Bunker shots recorded on every hole (omitted = not tracked). */
  bunkerShots?: number;
  /** Record a hazards array on every hole (empty except hole 1 when hazardOnFirstHole). */
  trackHazards?: boolean;
  hazardOnFirstHole?: boolean;
  holesPlayed: number | null;
  points: number;
}

export function buildStatsCard(opts: StatsCardOptions) {
  const scores: Record<string, Record<string, unknown>> = {};
  opts.holeNumbers.forEach((n, index) => {
    scores[String(n)] = {
      strokes: opts.strokes,
      ...(opts.putts !== undefined && { putts: opts.putts }),
      ...(opts.bunkerShots !== undefined && { bunkerShots: opts.bunkerShots }),
      ...(opts.trackHazards && {
        hazards: opts.hazardOnFirstHole && index === 0 ? [{ type: 'water' }] : [],
      }),
    };
  });
  return {
    id: opts.id,
    round_id: `round-${opts.id}`,
    player_id: PLAYER_ID,
    scores,
    total_gross: opts.strokes * opts.holeNumbers.length,
    total_net: 0,
    total_points: opts.points,
    status: 'completed',
    submitted_at: `${opts.date}T08:00:00Z`,
    rounds: {
      id: `round-${opts.id}`,
      competition_id: null,
      round_number: 1,
      course_id: COURSE_ID,
      date: opts.date,
      game_type: 'stroke',
      team_format: null,
      handicap_source: 'profile',
      status: 'completed',
      holes_played: opts.holesPlayed,
      courses: {
        id: COURSE_ID,
        name: 'Test Course',
        holes: HOLES,
        clubs: { id: 'club-1', name: 'Test Club' },
      },
      competitions: null,
    },
  };
}

/** 18 holes × 5 = 90; 2 putts and 0 bunker shots per hole; hazards tracked, none. */
export const FULL_CARD = buildStatsCard({
  id: 'full', date: '2026-09-01', holeNumbers: range(1, 18), strokes: 5, putts: 2,
  bunkerShots: 0, trackHazards: true, holesPlayed: null, points: 30,
});

/** 9 holes × 5 = 45; 2 putts per hole; bunkers/hazards not tracked. */
export const NINE_CARD = buildStatsCard({
  id: 'nine', date: '2026-09-05', holeNumbers: range(1, 9), strokes: 5, putts: 2,
  holesPlayed: null, points: 15,
});

/** Ended early after 6 holes: 6 × 4 = 24; 1 putt and 1 bunker shot per hole; water on hole 1. */
export const ENDED_EARLY_CARD = buildStatsCard({
  id: 'ended', date: '2026-09-10', holeNumbers: range(1, 6), strokes: 4, putts: 1,
  bunkerShots: 1, trackHazards: true, hazardOnFirstHole: true, holesPlayed: 6, points: 12,
});

export const STATS_CARDS = [FULL_CARD, NINE_CARD, ENDED_EARLY_CARD];

/** 18 holes × 5 = 90 with no putts, bunkers or hazards tracked. */
export const UNTRACKED_FULL_CARD = buildStatsCard({
  id: 'untracked', date: '2026-09-01', holeNumbers: range(1, 18), strokes: 5,
  holesPlayed: null, points: 30,
});

/** supabase.from() stub: every chain method passes through; awaiting resolves `result`. */
export function resolvingQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  for (const method of ['select', 'eq', 'in', 'is', 'not', 'order', 'limit']) {
    chain[method] = passthrough;
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}
