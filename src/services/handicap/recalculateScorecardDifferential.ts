/**
 * Retroactive Scorecard Differential Recalculation
 *
 * When a round is scored on a course with missing slope/course ratings,
 * the scorecard's handicap_differential is null. If the course tee data
 * is later updated with valid ratings, this service recalculates the
 * differential so the scorecard can be tagged to a league.
 */

import { supabase } from '@/services/supabase/client';
import { invalidateHandicapCache } from '@/services/queryClient';
import { calculateScoreDifferential, getRatingsForGender } from '@/utils/handicapDifferential';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';
import { syncLogger } from '@/utils/debugLogger';
import type { TeeBox, Hole } from '@/types/database/base';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

interface RecalculationResult {
  handicapDifferential: number;
  dailyHandicapUsed: number | null;
  courseRatingUsed: number;
  slopeRatingUsed: number;
  gaHandicapUsed: number | null;
}

interface TeeRecord {
  id: string;
  name: string;
  color: string | null;
  slope: number | null;
  course_rating: number | null;
  slope_women: number | null;
  course_rating_women: number | null;
}

interface ScorecardRecord {
  id: string;
  round_id: string;
  player_id: string;
  total_gross: number;
  ga_handicap_used: number | null;
}

interface RoundRecord {
  id: string;
  course_id: string;
  selected_tee: TeeBox | null;
  courses: { holes: Hole[] | null } | null;
}

interface PlayerRecord {
  id: string;
  gender: 'male' | 'female' | null;
  handicap: number | null;
}

/**
 * Resolve the canonical tee record from the tees table for a round.
 *
 * Strategy:
 * 1. If selected_tee has a tee_id, look up directly
 * 2. Otherwise, match by course_id + name (case-insensitive)
 * 3. Prefer tees with valid ratings if multiple matches
 */
async function resolveTeeForRound(
  courseId: string,
  selectedTee: TeeBox | null
): Promise<TeeRecord> {
  if (!selectedTee) {
    throw new Error('Round has no selected tee');
  }

  // Strategy 1: Direct lookup by tee_id
  if (selectedTee.tee_id) {
    const { data: tee, error } = await from('tees')
      .select('id, name, color, slope, course_rating, slope_women, course_rating_women')
      .eq('id', selectedTee.tee_id)
      .single();

    if (!error && tee) {
      return tee as TeeRecord;
    }
    // Fall through to name/color matching if direct lookup fails
  }

  // Strategy 2: Match by course_id + name
  const { data: tees, error: teesError } = await from('tees')
    .select('id, name, color, slope, course_rating, slope_women, course_rating_women')
    .eq('course_id', courseId);

  if (teesError || !tees || tees.length === 0) {
    throw new Error('No tees found for this course');
  }

  const teeList = tees as TeeRecord[];
  const teeName = selectedTee.name.toLowerCase();

  // Case-insensitive name match
  const nameMatches = teeList.filter(
    (t) => t.name.toLowerCase() === teeName
  );

  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  if (nameMatches.length > 1) {
    // Prefer the one with valid ratings
    const withRatings = nameMatches.find(
      (t) => t.slope != null && t.slope > 0 && t.course_rating != null && t.course_rating > 0
    );
    return withRatings ?? nameMatches[0];
  }

  // No name match — try color match as fallback
  const teeColor = selectedTee.color.toLowerCase();
  const colorMatches = teeList.filter(
    (t) => t.color?.toLowerCase() === teeColor || t.name.toLowerCase() === teeColor
  );

  if (colorMatches.length > 0) {
    const withRatings = colorMatches.find(
      (t) => t.slope != null && t.slope > 0 && t.course_rating != null && t.course_rating > 0
    );
    return withRatings ?? colorMatches[0];
  }

  throw new Error(
    `Could not resolve tee "${selectedTee.name}" from tees table for this course`
  );
}

/**
 * Recalculate the handicap differential for a scorecard using current tee data.
 *
 * This is used when a scorecard was synced without a differential (because the
 * tee had no slope/course ratings at the time) but the tee data has since been updated.
 *
 * Updates the scorecard record in Supabase and triggers a player handicap index refresh.
 */
export async function recalculateScorecardDifferential(
  scorecardId: string
): Promise<RecalculationResult> {
  syncLogger.info('Attempting retroactive differential recalculation', {
    scorecardId: scorecardId.substring(0, 8) + '...',
  });

  // 1. Fetch the scorecard
  const { data: scorecardData, error: scError } = await supabase
    .from('scorecards')
    .select('id, round_id, player_id, total_gross, ga_handicap_used')
    .eq('id', scorecardId)
    .single();

  if (scError || !scorecardData) {
    throw new Error('Scorecard not found');
  }

  const scorecard = scorecardData as unknown as ScorecardRecord;

  if (!scorecard.total_gross || scorecard.total_gross <= 0) {
    throw new Error('Invalid scorecard data for recalculation: no gross score');
  }

  // 2. Fetch the round with course data
  const { data: roundData, error: roundError } = await from('rounds')
    .select('id, course_id, selected_tee, courses!course_id (holes)')
    .eq('id', scorecard.round_id)
    .single();

  if (roundError || !roundData) {
    throw new Error('Round not found for this scorecard');
  }

  const round = roundData as RoundRecord;

  if (!round.course_id) {
    throw new Error('Round has no associated course');
  }

  // 3. Resolve the canonical tee from tees table
  const tee = await resolveTeeForRound(round.course_id, round.selected_tee);

  // 4. Map to TeeWithRatings format for getRatingsForGender
  const teeWithRatings = {
    course_rating: tee.course_rating,
    slope_rating: tee.slope,
    womens_course_rating: tee.course_rating_women,
    womens_slope_rating: tee.slope_women,
  };

  // 5. Get player gender
  const { data: playerData } = await supabase
    .from('players')
    .select('id, gender, handicap')
    .eq('id', scorecard.player_id)
    .single();

  const player = playerData as unknown as PlayerRecord | null;
  const playerGender = player?.gender ?? null;

  // 6. Get ratings for gender
  const ratings = getRatingsForGender(teeWithRatings, playerGender);

  if (!ratings) {
    throw new Error('Tee still has no valid slope/course ratings');
  }

  // 7. Calculate differential
  const handicapDifferential = calculateScoreDifferential({
    adjustedGrossScore: scorecard.total_gross,
    courseRating: ratings.courseRating,
    slopeRating: ratings.slopeRating,
  });

  if (handicapDifferential === null) {
    throw new Error('Failed to calculate differential from current ratings');
  }

  // 8. Calculate daily handicap if player has a WHS index
  let gaHandicapUsed = scorecard.ga_handicap_used;
  let dailyHandicapUsed: number | null = null;

  // Use stored handicap if available, otherwise fetch current
  if (gaHandicapUsed == null && player?.handicap != null) {
    gaHandicapUsed = player.handicap;
  }

  if (gaHandicapUsed != null) {
    // Calculate course par from holes
    const holes = round.courses?.holes;
    if (holes && Array.isArray(holes)) {
      const coursePar = holes.reduce((sum, h) => sum + (h.par || 0), 0);
      if (coursePar > 0) {
        const dailyResult = calculateGADailyHandicap({
          gaHandicap: gaHandicapUsed,
          slopeRating: ratings.slopeRating,
          courseRating: ratings.courseRating,
          par: coursePar,
          gender: playerGender,
        });
        dailyHandicapUsed = dailyResult.dailyHandicap;
      }
    }
  }

  // 9. Update the scorecard in Supabase
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { error: updateError, data: _data } = await (
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      .from('scorecards') as any
  ).update({
    handicap_differential: handicapDifferential,
    course_rating_used: ratings.courseRating,
    slope_rating_used: ratings.slopeRating,
    daily_handicap_used: dailyHandicapUsed,
    ga_handicap_used: gaHandicapUsed,
  }).eq('id', scorecardId);

  if (updateError) {
    throw new Error(`Failed to update scorecard: ${updateError.message}`);
  }

  syncLogger.info('Retroactive differential recalculation successful', {
    scorecardId: scorecardId.substring(0, 8) + '...',
    handicapDifferential,
    courseRatingUsed: ratings.courseRating,
    slopeRatingUsed: ratings.slopeRating,
    dailyHandicapUsed,
  });

  // 10. Update player handicap index in background (fire-and-forget)
  invalidateHandicapCache(scorecard.player_id);
  updatePlayerHandicapIndex(scorecard.player_id).catch((error) => {
    syncLogger.warn('Failed to update player handicap index after recalculation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      playerId: scorecard.player_id.substring(0, 8) + '...',
    });
  });

  return {
    handicapDifferential,
    dailyHandicapUsed,
    courseRatingUsed: ratings.courseRating,
    slopeRatingUsed: ratings.slopeRating,
    gaHandicapUsed,
  };
}
