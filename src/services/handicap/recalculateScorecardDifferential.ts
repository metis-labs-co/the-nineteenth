/**
 * Retroactive Scorecard Differential Recalculation
 *
 * When a round is scored on a course with missing slope/course ratings,
 * the scorecard's handicap_differential is null. If the course tee data
 * is later updated with valid ratings, this service recalculates the
 * differential so the scorecard can be tagged to a league.
 */

import { useScorecardStore, type RoundScoringSession } from '@/store/scorecardStore';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import {
  captureRoundPersistenceRead,
  captureRoundPersistenceSource,
  isRoundPersistenceSourceCurrent,
} from '@/services/offline/roundPersistenceBarrier';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { calculateHandicapData } from '@/services/offline/sync/scorecardSync';
import { createRoundScoringContext } from '@/services/rounds/roundScoringContext';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';
import { adoptRoundShapeWithinScoringWrite } from '@/services/rounds/roundScoringAdoption';
import type { RoundScoringShape } from '@/services/rounds/roundScoringWrite';
import type { RoundPersistenceSource } from '@/services/offline/roundPersistenceBarrier';

import { supabase } from '@/services/supabase/client';
import { invalidateHandicapCache } from '@/services/queryClient';
import { calculateScoreDifferential, getRatingsForGender } from '@/utils/handicapDifferential';
import { calculateAdjustedGrossScore, type AdjustedGrossParams } from '@/utils/adjustedGross';
import { calculateNineAwareDailyHandicap } from '@/utils/dailyHandicap';
import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';
import { syncLogger } from '@/utils/debugLogger';
import { getEffectiveTeeRatings } from '@/utils/teeResolution';
import { isSharedBallRound } from '@/utils/roundFormat';
import { isCompleteForHandicap } from '@/utils/handicapEligibility';
import { getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import type { GameType } from '@/types';
import type { TeeBox, Hole, HoleScore } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import type { Database, ScorecardHandicapPatch } from '@/types/database/schema';
import { fetchRoundScoringShape } from '@/services/rounds/roundScoringShape';
import {
  roundScoringErrorFromSql,
  RoundScoringWriteError,
} from '@/services/rounds/roundScoringErrors';
import type { NineType } from '@/types/database/enums';

export interface HandicapRecalculationOperation {
  ownerId: string;
  session: RoundScoringSession | null;
  isSessionCurrent: () => boolean;
  source: RoundPersistenceSource;
  preparedShape?: RoundScoringShape;
  assertCurrent: () => void;
}
/** Original owner/private session or absence captured before any operation await. */
export function captureHandicapRecalculationOperation(
  roundId: string
): HandicapRecalculationOperation {
  const state = useScorecardStore.getState();
  return createHandicapRecalculationOperation(roundId, {
    ownerId: getSyncAuthUserId() ?? '',
    session: state.captureRoundScoringSession(roundId),
    isSessionCurrent: state.captureRoundScoringOperation(roundId),
    source: captureRoundPersistenceSource(roundId),
  });
}

function createHandicapRecalculationOperation(
  roundId: string,
  captured: Pick<
    HandicapRecalculationOperation,
    'ownerId' | 'session' | 'isSessionCurrent' | 'source'
  >
): HandicapRecalculationOperation {
  const { ownerId, session, isSessionCurrent } = captured;
  const operation: HandicapRecalculationOperation = {
    ...captured,
    assertCurrent: () => {
      if (!ownerId || getSyncAuthUserId() !== ownerId)
        throw new RoundScoringWriteError('unavailable', roundId, 'Captured scoring owner changed');
      if (
        !isSessionCurrent() ||
        (session && !session.isCurrent()) ||
        !isRoundPersistenceSourceCurrent(operation.source)
      )
        throw new RoundScoringWriteError('context_changed', roundId, 'Scoring context changed');
    },
  };
  operation.assertCurrent();
  return operation;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

export interface RecalculationResult {
  /**
   * Null when the card is not complete for its planned nine (I12) — e.g. an
   * early-ended round, a part-filled card, or an in-progress card
   * recalculated by mid-round Change Tees.
   */
  handicapDifferential: number | null;
  dailyHandicapUsed: number | null;
  courseRatingUsed: number;
  slopeRatingUsed: number;
  gaHandicapUsed: number | null;
  /** Actual persisted override used for this preparation, including fresh retries. */
  teeUsed: TeeBox;
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
  const nameMatches = teeList.filter((t) => t.name.toLowerCase() === teeName);

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

  throw new Error(`Could not resolve tee "${selectedTee.name}" from tees table for this course`);
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
  // Round identity is not known until an authorized card read. Capture the
  // original global generation and per-round epochs before that first await.
  const ownerId = getSyncAuthUserId();
  const state = useScorecardStore.getState();
  const originalRoundId = state.currentRoundId;
  const isSessionCurrent = state.captureRoundScoringOperation(originalRoundId ?? '');
  const originalSession = originalRoundId
    ? state.captureRoundScoringSession(originalRoundId)
    : null;
  const sourceForRound = captureRoundPersistenceRead();
  const { data, error } = await supabase
    .from('scorecards')
    .select('round_id')
    .eq('id', scorecardId)
    .single();
  if (error || !data) throw new Error('Scorecard not found');
  const roundId = (data as { round_id: string }).round_id;
  if (getSyncAuthUserId() !== ownerId || !isSessionCurrent())
    throw new RoundScoringWriteError('context_changed', roundId, 'Scoring context changed');
  const operation = createHandicapRecalculationOperation(roundId, {
    ownerId: ownerId ?? '',
    isSessionCurrent,
    source: sourceForRound(roundId),
    session: originalRoundId === roundId ? originalSession : null,
  });
  operation.assertCurrent();
  return withRoundScoringWrite(roundId, () =>
    recalculateScorecardDifferentialWithinScoringWrite(scorecardId, roundId, operation)
  );
}

/** Tee callers already own the single coordinator for metadata, patch and local application. */
export async function recalculateScorecardDifferentialWithinScoringWrite(
  scorecardId: string,
  roundId: string,
  operation: HandicapRecalculationOperation
): Promise<RecalculationResult> {
  try {
    return await prepareAndPatchScorecard(scorecardId, roundId, operation);
  } catch (error) {
    if (!(error instanceof RoundScoringWriteError) || error.kind !== 'shape_changed') throw error;
    operation.assertCurrent();
    const shape = await fetchRoundScoringShape(roundId);
    operation.assertCurrent();
    if (
      !operation.preparedShape ||
      JSON.stringify(shape) === JSON.stringify(operation.preparedShape)
    )
      throw error;
    const originalSource = operation.source;
    await adoptRoundShapeWithinScoringWrite(roundId, shape, {
      ownerId: operation.ownerId,
      originalSession: operation.session,
      isCurrent: () =>
        getSyncAuthUserId() === operation.ownerId &&
        operation.isSessionCurrent() &&
        (!operation.session || operation.session.isCurrent()),
    });
    // Accept exactly our own successful transition, never a later independent one.
    operation.source = { roundId, epoch: originalSource.epoch + 1 };
    operation.assertCurrent();
    return prepareAndPatchScorecard(scorecardId, roundId, operation);
  }
}

async function prepareAndPatchScorecard(
  scorecardId: string,
  roundId: string,
  operation: HandicapRecalculationOperation
): Promise<RecalculationResult> {
  operation.assertCurrent();
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

  operation.assertCurrent();
  const scorecard = scorecardData as unknown as ScorecardRecord;
  if (scorecard.round_id !== roundId)
    throw new RoundScoringWriteError('context_changed', roundId, 'Scorecard round changed');

  if (!scorecard.total_gross || scorecard.total_gross <= 0) {
    throw new Error('Invalid scorecard data for recalculation: no gross score');
  }

  // 2. Fetch the round with course data
  const { data: roundData, error: roundError } = await from('rounds')
    .select(
      'id, course_id, game_type, team_format, selected_tee, nine_type, courses!course_id (holes)'
    )
    .eq('id', scorecard.round_id)
    .single();

  if (roundError || !roundData) {
    throw new Error('Round not found for this scorecard');
  }

  operation.assertCurrent();
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
  const { data: roundPlayerData, error: roundPlayerError } = await from('round_players')
    .select('selected_tee')
    .eq('round_id', scorecard.round_id)
    .eq('player_id', scorecard.player_id)
    .maybeSingle();

  operation.assertCurrent();
  if (roundPlayerError)
    throw new Error(`Failed to read persisted tee: ${roundPlayerError.message}`);
  const roundPlayer = roundPlayerData as RoundPlayerRecord | null;
  const effectiveSelectedTee = roundPlayer?.selected_tee ?? round.selected_tee;

  // 3. Resolve the canonical tee from tees table
  const tee = await resolveTeeForRound(round.course_id, effectiveSelectedTee);
  operation.assertCurrent();

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

  operation.assertCurrent();
  const player = playerData as unknown as PlayerRecord | null;
  const shape = await fetchRoundScoringShape(scorecard.round_id);
  operation.assertCurrent();
  operation.preparedShape = shape;
  const nineType: NineType = shape.nine_type;
  const localSource = operation.session
    ?.getCards()
    .find(
      (card) =>
        card.roundId === roundId &&
        card.playerId === scorecard.player_id &&
        (card.syncHoles?.length || card.syncHandicapSource !== undefined)
    );
  const localBasis = localSource
    ? createRoundScoringContext(roundId, {
        holes: round.courses?.holes ?? undefined,
        gameType: round.game_type as GameType,
        getLiveContext: operation.session?.getLiveContext,
      })(localSource, shapeHoleNumbers(shape), shape)
    : undefined;
  if (
    localBasis &&
    scorecard.ga_handicap_used != null &&
    localBasis.playerHandicap != null &&
    scorecard.ga_handicap_used !== localBasis.playerHandicap
  )
    throw new RoundScoringWriteError(
      'context_changed',
      roundId,
      'Recorded handicap inputs disagree'
    );
  const playerGender =
    localBasis?.playerGender !== undefined ? localBasis.playerGender : (player?.gender ?? null);

  // 6. Get ratings for gender (full-round ratings from canonical tee record)
  const baseRatings = getRatingsForGender(teeWithRatings, playerGender);

  if (!baseRatings) {
    throw new Error('Tee still has no valid slope/course ratings');
  }

  // 6b. Apply 9-hole rating selection if round has a non-full nine_type.
  // The 9-hole ratings come from the effectiveSelectedTee TeeBox (stored on round/round_player),
  // which may carry slopeRatingFront9/Back9 and courseRatingFront9/Back9 fields.
  // We build a TeeBox merging the canonical full-round ratings with 9-hole overrides from the tee JSON.
  let finalSlopeRating = baseRatings.slopeRating;
  let finalCourseRating = baseRatings.courseRating;

  if (nineType !== 'full' && effectiveSelectedTee) {
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

  // 7. Calculate daily handicap if player has a WHS index.
  // NOTE: this used to run AFTER the differential, but the differential now
  // needs dailyHandicapUsed to work out strokes received for the net double
  // bogey cap, so the two steps are swapped. Nothing between them depends on
  // the differential.
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
      // Same helper as the sync path (calculateHandicapData) so a recalculated
      // daily_handicap_used always matches a freshly synced one: gender-resolved
      // 18-hole ratings plus the tee's dedicated 9-hole ratings when present.
      const dailyResult = calculateNineAwareDailyHandicap({
        gaHandicap: gaHandicapUsed,
        nineType,
        par: coursePar,
        slopeRating: baseRatings.slopeRating,
        courseRating: baseRatings.courseRating,
        slopeRatingFront9: effectiveSelectedTee?.slopeRatingFront9,
        courseRatingFront9: effectiveSelectedTee?.courseRatingFront9,
        slopeRatingBack9: effectiveSelectedTee?.slopeRatingBack9,
        courseRatingBack9: effectiveSelectedTee?.courseRatingBack9,
        gender: playerGender,
      });
      dailyHandicapUsed = dailyResult.dailyHandicap;
    }
  }

  if (localBasis) {
    // Deliberate tee changes retain the recorded HI/source/gender. Validate
    // through the same context adapter and reuse the existing none-aware math.
    const canonicalTee: TeeBox = {
      ...effectiveSelectedTee!,
      slopeRating: baseRatings.slopeRating,
      courseRating: baseRatings.courseRating,
    };
    const prepared = createRoundScoringContext(roundId, {
      holes: effectiveHoles,
      getLiveContext: operation.session?.getLiveContext,
    })({ ...localBasis, teeData: canonicalTee }, shapeHoleNumbers(shape), shape);
    const frozenHandicap = calculateHandicapData(prepared);
    gaHandicapUsed = prepared.playerHandicap ?? scorecard.ga_handicap_used ?? null;
    dailyHandicapUsed = frozenHandicap.dailyHandicapUsed;
  }

  // 8. Calculate differential from the WHS ADJUSTED gross score — every hole
  // capped at net double bogey (par + 2 + strokes received). Falls back to the
  // raw total_gross when hole data is unavailable, which is what this call site
  // used before the cap was introduced.
  //
  // Handicap completeness gate (I12): an incomplete card — an early-ended or
  // part-filled round, or an in-progress card recalculated by mid-round Change
  // Tees — gets a NULL differential instead of an error, so the daily handicap
  // and points snapshot below still refresh. Cards with no per-hole data keep
  // the legacy gross-only rule.
  const isCompleteCard =
    shape.holes_played === null && isCompleteForHandicap(scorecard.scores, nineType);
  let handicapDifferential: number | null = null;

  if (isCompleteCard) {
    const adjustedGross =
      effectiveHoles.length > 0 && scorecard.scores
        ? calculateAdjustedGrossScore({
            holes: effectiveHoles,
            scores: scorecard.scores as AdjustedGrossParams['scores'],
            dailyHandicap: dailyHandicapUsed ?? 0,
          }).adjustedGross
        : scorecard.total_gross;

    handicapDifferential = calculateScoreDifferential({
      adjustedGrossScore: adjustedGross > 0 ? adjustedGross : scorecard.total_gross,
      courseRating: ratings.courseRating,
      slopeRating: ratings.slopeRating,
    });

    if (handicapDifferential === null) {
      throw new Error('Failed to calculate differential from current ratings');
    }
  }

  // 9. Recalculate total_points if this is a Stableford round with daily handicap
  let totalPoints: number | null = null;
  if (
    round.game_type === 'stableford' &&
    dailyHandicapUsed != null &&
    scorecard.scores &&
    effectiveHoles.length > 0
  ) {
    let points = 0;
    for (const hole of filterPlayableHoles(effectiveHoles, nineType, shape.holes_played)) {
      const score = scorecard.scores[String(hole.number)];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) continue;
      const strokesReceived = getStrokesReceived(dailyHandicapUsed, hole.strokeIndex);
      points += calculateStablefordPointsNet(score.strokes, hole.par, strokesReceived);
    }
    totalPoints = points;
  }

  // 10. Update the scorecard in Supabase
  const updatePayload: ScorecardHandicapPatch = {
    expected_round_shape: shape,
    handicap_differential: handicapDifferential,
    course_rating_used: ratings.courseRating,
    slope_rating_used: ratings.slopeRating,
    daily_handicap_used: dailyHandicapUsed,
    ga_handicap_used: gaHandicapUsed,
  };
  if (totalPoints != null) {
    updatePayload.total_points = totalPoints;
  }

  type PatchRpc = Database['public']['Functions']['write_scorecard_handicap_patch'];
  type PatchWrite = (
    name: 'write_scorecard_handicap_patch',
    args: PatchRpc['Args']
  ) => PromiseLike<{
    data: PatchRpc['Returns'] | null;
    error: { message: string; code?: string; hint?: string } | null;
  }>;
  operation.assertCurrent();
  const { data: applied, error: updateError } = await (supabase.rpc as unknown as PatchWrite).call(
    supabase,
    'write_scorecard_handicap_patch',
    { p_scorecard_id: scorecardId, p_patch: updatePayload }
  );
  operation.assertCurrent();
  if (updateError) {
    throw (
      roundScoringErrorFromSql(scorecard.round_id, updateError) ??
      new Error(`Failed to update scorecard: ${updateError.message}`)
    );
  }
  if (applied !== true)
    throw new RoundScoringWriteError(
      'unavailable',
      scorecard.round_id,
      'Handicap patch was not applied'
    );

  syncLogger.info('Retroactive differential recalculation successful', {
    scorecardId: scorecardId.substring(0, 8) + '...',
    handicapDifferential,
    isCompleteCard,
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
    teeUsed: {
      ...effectiveSelectedTee!,
      slopeRating: baseRatings.slopeRating,
      courseRating: baseRatings.courseRating,
    },
  };
}
