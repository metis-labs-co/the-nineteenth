/**
 * Loaders for combined rounds and combinable 9-hole pairs.
 *
 * Used by useHandicapHistory to surface (a) combined entries as 18-hole rounds
 * in the history list and (b) any remaining unmatched 9-hole scorecards that
 * the user could pair into a new combination.
 */

import { supabase } from '@/services/supabase/client';
import { isCompleteForHandicap } from '@/utils/handicapEligibility';
import { isEndedEarly } from '@/utils/roundShape';
import type { HandicapRound, CombinableNinePair, NinePieceSummary } from '@/types';
import type { HandicapRoundLink } from '@/types/handicap.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

interface CombinedRow {
  id: string;
  player_id: string;
  front_scorecard_id: string;
  back_scorecard_id: string;
  course_id: string;
  combined_gross: number;
  handicap_differential: number;
  course_rating_used: number;
  slope_rating_used: number;
  daily_handicap_used: number | null;
  effective_date: string;
  courses: {
    id: string;
    name: string;
    clubs: { id: string; name: string } | null;
  } | null;
}

interface SourceScorecardRow {
  id: string;
  round_id: string;
  rounds: { competition_id: string | null } | null;
}

/** Scorecard id → the round (and competition) it belongs to. */
type RoundLinksByScorecard = Map<string, HandicapRoundLink>;

/**
 * Convert a combined-round row into a HandicapRound entry suitable for the
 * history list. The combined row's effective_date drives ordering.
 */
function combinedRowToHandicapRound(
  row: CombinedRow,
  links: RoundLinksByScorecard = new Map(),
): HandicapRound {
  const front = links.get(row.front_scorecard_id) ?? null;
  const back = links.get(row.back_scorecard_id) ?? null;
  return {
    scorecardId: row.id,
    // Combined entries span two rounds; the front 9 stands in for list keys etc.
    roundId: front?.roundId ?? row.front_scorecard_id,
    competitionId: front?.competitionId ?? null,
    roundDate: row.effective_date,
    courseName: row.courses?.name ?? 'Unknown Course',
    clubName: row.courses?.clubs?.name ?? '',
    totalGross: row.combined_gross,
    dailyHandicapUsed: row.daily_handicap_used ?? 0,
    handicapDifferential: row.handicap_differential,
    courseRatingUsed: row.course_rating_used,
    slopeRatingUsed: row.slope_rating_used,
    isQualifying: false, // assigned by the caller after merging
    roundNumber: 0, // assigned by the caller after merging
    isCombined: true,
    combinedFrontScorecardId: row.front_scorecard_id,
    combinedBackScorecardId: row.back_scorecard_id,
    combinedFrontRound: front,
    combinedBackRound: back,
  };
}

/**
 * Fetch combined handicap rounds for a player as HandicapRound entries.
 */
export async function fetchCombinedHandicapRounds(
  playerId: string,
): Promise<HandicapRound[]> {
  const { data, error } = await from('handicap_combined_rounds')
    .select(
      `
      id,
      player_id,
      front_scorecard_id,
      back_scorecard_id,
      course_id,
      combined_gross,
      handicap_differential,
      course_rating_used,
      slope_rating_used,
      daily_handicap_used,
      effective_date,
      courses!course_id (
        id,
        name,
        clubs (
          id,
          name
        )
      )
    `,
    )
    .eq('player_id', playerId)
    .order('effective_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[handicap] Failed to fetch combined rounds:', error);
    return [];
  }

  const rows = data as CombinedRow[];
  const links = await fetchSourceRoundLinks(
    rows.flatMap((row) => [row.front_scorecard_id, row.back_scorecard_id]),
  );
  return rows.map((row) => combinedRowToHandicapRound(row, links));
}

/**
 * Look up which round each source 9-hole scorecard belongs to, so a combined
 * entry can open either half's scorecard. Failure only loses the links; the
 * combined entries still show.
 */
async function fetchSourceRoundLinks(scorecardIds: string[]): Promise<RoundLinksByScorecard> {
  const links: RoundLinksByScorecard = new Map();
  if (scorecardIds.length === 0) return links;

  const { data, error } = await from('scorecards')
    .select('id, round_id, rounds ( competition_id )')
    .in('id', scorecardIds);

  if (error) {
    console.error('[handicap] Failed to fetch combined source rounds:', error);
    return links;
  }

  for (const sc of data as SourceScorecardRow[]) {
    links.set(sc.id, { roundId: sc.round_id, competitionId: sc.rounds?.competition_id ?? null });
  }
  return links;
}

/**
 * Fetch the scorecard IDs that are already part of a combined round so they
 * can be excluded from the combinable-pairs candidate list.
 */
async function fetchCombinedScorecardIds(playerId: string): Promise<Set<string>> {
  const { data, error } = await from('handicap_combined_rounds')
    .select('front_scorecard_id, back_scorecard_id')
    .eq('player_id', playerId);

  if (error || !data) return new Set();

  const ids = new Set<string>();
  for (const row of data as { front_scorecard_id: string; back_scorecard_id: string }[]) {
    ids.add(row.front_scorecard_id);
    ids.add(row.back_scorecard_id);
  }
  return ids;
}

interface NineScorecardRow {
  id: string;
  round_id: string;
  total_gross: number;
  daily_handicap_used: number | null;
  handicap_differential: number | null;
  submitted_at: string | null;
  /** Hole-by-hole scores — the completeness gate (I12) reads them. */
  scores: Record<string, unknown> | null;
  rounds: {
    id: string;
    date: string | null;
    nine_type: 'front9' | 'back9' | 'full';
    /** Set when the round was ended early — such a nine never combines. */
    holes_played?: number | null;
    selected_tee: { name?: string } | null;
    courses: {
      id: string;
      name: string;
      clubs: { id: string; name: string } | null;
    } | null;
  } | null;
}

function pieceFromRow(row: NineScorecardRow): NinePieceSummary {
  return {
    scorecardId: row.id,
    roundId: row.round_id,
    roundDate: row.rounds?.date ?? row.submitted_at ?? '',
    totalGross: row.total_gross,
    dailyHandicapUsed: row.daily_handicap_used,
    handicapDifferential: row.handicap_differential,
  };
}

/**
 * Compute the projected combined-18 differential from two 9-hole scorecards
 * without making extra round-trips. We approximate the 18-hole CR + slope
 * by summing the stored 9-hole ratings; this matches the WHS combined
 * differential formula when both pieces were rated.
 *
 * Returns null when ratings or scores are missing.
 */
function projectCombinedDifferential(
  frontGross: number,
  backGross: number,
  frontCR: number | null,
  backCR: number | null,
  frontSlope: number | null,
  backSlope: number | null,
): number | null {
  if (!frontCR || !backCR || !frontSlope || !backSlope) return null;
  const combinedGross = frontGross + backGross;
  const combinedCR = frontCR + backCR;
  // WHS guidance: use the (typically identical) slope; average is a safe
  // fallback when the two pieces report slightly different values.
  const combinedSlope = (frontSlope + backSlope) / 2;
  const differential = (113 / combinedSlope) * (combinedGross - combinedCR);
  return Math.round(differential * 10) / 10;
}

interface ScorecardWithRatings extends NineScorecardRow {
  course_rating_used: number | null;
  slope_rating_used: number | null;
}

/**
 * Find pairs of un-combined 9-hole scorecards (one front9, one back9) that
 * share the same course + tee, so the user can combine them into 18-hole
 * rounds.
 *
 * Pairing strategy: for each (course_id, tee_name) group, pair the most
 * recent front9 with the most recent back9. We only surface one
 * candidate pair per (course, tee) group to keep the UI simple — once the
 * user combines those, the next pair (if any) becomes eligible.
 */
export async function fetchCombinableNinePairs(
  playerId: string,
): Promise<CombinableNinePair[]> {
  const combinedIds = await fetchCombinedScorecardIds(playerId);

  const { data, error } = await from('scorecards')
    .select(
      `
      id,
      round_id,
      total_gross,
      daily_handicap_used,
      handicap_differential,
      course_rating_used,
      slope_rating_used,
      submitted_at,
      scores,
      rounds!inner (
        id,
        date,
        nine_type,
        holes_played,
        selected_tee,
        courses (
          id,
          name,
          clubs (
            id,
            name
          )
        )
      )
    `,
    )
    .eq('player_id', playerId)
    .in('status', ['completed', 'confirmed'])
    .is('rounds.deleted_at', null)
    .in('rounds.nine_type', ['front9', 'back9'])
    // An ended-early nine never combines (I12, R13).
    .is('rounds.holes_played', null)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error('[handicap] Failed to fetch 9-hole scorecards:', error);
    return [];
  }

  // Only a nine scored on every hole of its own nine can combine (I12). A
  // part-filled nine is dropped BEFORE bucketing, so the most recent complete
  // front/back pair is the one offered.
  const rows = (data as ScorecardWithRatings[]).filter(
    (sc) =>
      !combinedIds.has(sc.id) &&
      sc.rounds &&
      sc.rounds.courses &&
      isCompleteForHandicap(sc.scores, sc.rounds.nine_type) &&
      // Belt: exclude ended nines before choosing the latest front/back pair.
      !isEndedEarly(sc.rounds),
  );

  // Group by (course_id, tee_name_lower). Within each group, separate by nine_type.
  type Bucket = {
    courseId: string;
    courseName: string;
    clubName: string;
    teeName: string | null;
    fronts: ScorecardWithRatings[];
    backs: ScorecardWithRatings[];
  };

  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const courseId = row.rounds!.courses!.id;
    const teeName = row.rounds!.selected_tee?.name ?? null;
    const key = `${courseId}|${teeName?.toLowerCase() ?? ''}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        courseId,
        courseName: row.rounds!.courses!.name,
        clubName: row.rounds!.courses!.clubs?.name ?? '',
        teeName,
        fronts: [],
        backs: [],
      };
      buckets.set(key, bucket);
    }
    if (row.rounds!.nine_type === 'front9') {
      bucket.fronts.push(row);
    } else if (row.rounds!.nine_type === 'back9') {
      bucket.backs.push(row);
    }
  }

  const pairs: CombinableNinePair[] = [];

  for (const bucket of buckets.values()) {
    if (bucket.fronts.length === 0 || bucket.backs.length === 0) continue;

    // Pair the most recent front + most recent back. (Rows are already
    // ordered by submitted_at desc from the query.)
    const front = bucket.fronts[0];
    const back = bucket.backs[0];

    const projectedDifferential = projectCombinedDifferential(
      front.total_gross,
      back.total_gross,
      front.course_rating_used,
      back.course_rating_used,
      front.slope_rating_used,
      back.slope_rating_used,
    );

    pairs.push({
      id: `${front.id}_${back.id}`,
      courseId: bucket.courseId,
      courseName: bucket.courseName,
      clubName: bucket.clubName,
      teeName: bucket.teeName,
      front: pieceFromRow(front),
      back: pieceFromRow(back),
      projectedCombinedGross: front.total_gross + back.total_gross,
      projectedDifferential: projectedDifferential ?? 0,
    });
  }

  return pairs;
}
