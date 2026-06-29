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
import { getEffectiveTeeRatings } from '@/utils/teeResolution';
import { isSharedBallRound } from '@/utils/roundFormat';
import { getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import type { TeeBox, Hole, HoleScore } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';

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
  scores: Record<string, HoleScore> | null;
}

interface RoundRecord {
  id: string;
  course_id: string;
  game_type: string | null;
  team_format: string | null;
  selected_tee: TeeBox | null;
  nine_type: NineType | null;
  courses: { holes: Hole[] | null } | null;
}

interface RoundPlayerRecord {
  selected_tee: TeeBox | null;
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
    .select('id, round_id, player_id, total_gross, ga_handicap_used, scores')
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
    .select('id, course_id, game_type, team_format, selected_tee, nine_type, courses!course_id (holes)')
    .eq('id', scorecard.round_id)
    .single();

  if (roundError || !roundData) {
    throw new Error('Round not found for this scorecard');
  }

  const round = roundData as RoundRecord;

  if (!round.course_id) {
    throw new Error('Round has no associated course');
  }

  // Shared-ball team formats (scramble, alt-shot) share a single ball, so the
  // scorecard's total_gross is the team's score — never a handicap-eligible
  // individual differential. Refuse to (re)compute one.
  if (isSharedBallRound({ game_type: round.game_type, team_format: round.team_format })) {
    throw new Error('Shared-ball team round (scramble/alt-shot) is not handicap eligible');
  }

  // 2b. Check for per-player tee override from round_players
  const { data: roundPlayerData } = await from('round_players')
    .select('selected_tee')
    .eq('round_id', scorecard.round_id)
    .eq('player_id', scorecard.player_id)
    .maybeSingle();

  const roundPlayer = roundPlayerData as RoundPlayerRecord | null;
  const effectiveSelectedTee = roundPlayer?.selected_tee ?? round.selected_tee;

  // 3. Resolve the canonical tee from tees table
  const tee = await resolveTeeForRound(round.course_id, effectiveSelectedTee);

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

  // 6. Get ratings for gender (full-round ratings from canonical tee record)
  const baseRatings = getRatingsForGender(teeWithRatings, playerGender);

  if (!baseRatings) {
    throw new Error('Tee still has no valid slope/course ratings');
  }

  // 6b. Apply 9-hole rating selection if round has a non-full nine_type.
  // The 9-hole ratings come from the effectiveSelectedTee TeeBox (stored on round/round_player),
  // which may carry slopeRatingFront9/Back9 and courseRatingFront9/Back9 fields.
  // We build a TeeBox merging the canonical full-round ratings with 9-hole overrides from the tee JSON.
  const nineType: NineType = round.nine_type ?? 'full';
  let finalSlopeRating = baseRatings.slopeRating;
  let finalCourseRating = baseRatings.courseRating;
  let has9HoleRatings = false;

  if (nineType !== 'full' && effectiveSelectedTee) {
    const nineRatingField = nineType === 'front9'
      ? effectiveSelectedTee.courseRatingFront9
      : effectiveSelectedTee.courseRatingBack9;
    has9HoleRatings = nineRatingField != null;

    // Build a TeeBox with gender-resolved full ratings plus 9-hole overrides
    const teeBoxForResolution: TeeBox = {
      name: effectiveSelectedTee.name,
      color: effectiveSelectedTee.color,
      slopeRating: baseRatings.slopeRating,
      courseRating: baseRatings.courseRating,
      slopeRatingFront9: effectiveSelectedTee.slopeRatingFront9,
      courseRatingFront9: effectiveSelectedTee.courseRatingFront9,
      slopeRatingBack9: effectiveSelectedTee.slopeRatingBack9,
      courseRatingBack9: effectiveSelectedTee.courseRatingBack9,
    };
    const { slope, cr } = getEffectiveTeeRatings(teeBoxForResolution, nineType);
    if (slope != null) finalSlopeRating = slope;
    if (cr != null) finalCourseRating = cr;
  }

  const ratings = { slopeRating: finalSlopeRating, courseRating: finalCourseRating };

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

  // Filter holes by nineType for correct par calculation
  const allHoles = round.courses?.holes;
  let effectiveHoles: Hole[] = [];
  if (allHoles && Array.isArray(allHoles)) {
    if (nineType === 'front9') {
      effectiveHoles = allHoles.filter((h) => h.number <= 9);
    } else if (nineType === 'back9') {
      effectiveHoles = allHoles.filter((h) => h.number > 9);
    } else {
      effectiveHoles = allHoles;
    }
  }

  if (gaHandicapUsed != null && effectiveHoles.length > 0) {
    const coursePar = effectiveHoles.reduce((sum, h) => sum + (h.par || 0), 0);
    if (coursePar > 0) {
      if (nineType !== 'full' && !has9HoleRatings) {
        // No 9-hole ratings: calculate 18-hole daily handicap then halve it
        const fullPar = coursePar * 2;
        const fullDailyResult = calculateGADailyHandicap({
          gaHandicap: gaHandicapUsed,
          slopeRating: baseRatings.slopeRating,
          courseRating: baseRatings.courseRating,
          par: fullPar,
          gender: playerGender,
        });
        dailyHandicapUsed = Math.round(fullDailyResult.dailyHandicap / 2);
      } else {
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

  // 9. Recalculate total_points if this is a Stableford round with daily handicap
  let totalPoints: number | null = null;
  if (round.game_type === 'stableford' && dailyHandicapUsed != null && scorecard.scores && effectiveHoles.length > 0) {
    let points = 0;
    for (const hole of effectiveHoles) {
      const score = scorecard.scores[String(hole.number)];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) continue;
      const strokesReceived = getStrokesReceived(dailyHandicapUsed, hole.strokeIndex);
      points += calculateStablefordPointsNet(score.strokes, hole.par, strokesReceived);
    }
    totalPoints = points;
  }

  // 10. Update the scorecard in Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    handicap_differential: handicapDifferential,
    course_rating_used: ratings.courseRating,
    slope_rating_used: ratings.slopeRating,
    daily_handicap_used: dailyHandicapUsed,
    ga_handicap_used: gaHandicapUsed,
  };
  if (totalPoints != null) {
    updatePayload.total_points = totalPoints;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { error: updateError, data: _data } = await (
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      .from('scorecards') as any
  ).update(updatePayload).eq('id', scorecardId);

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
