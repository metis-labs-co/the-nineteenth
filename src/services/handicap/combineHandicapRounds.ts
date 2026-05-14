/**
 * Combine / Uncombine Handicap Rounds
 *
 * Lets a player pair two 9-hole scorecards (one front9, one back9) from the
 * same course into a single 18-hole entry for WHS handicap purposes.
 *
 * Combined-round differentials are calculated from the SUM of the two gross
 * scores using the canonical 18-hole course rating and slope for the tee
 * the player used. Both source scorecards must use the same tee.
 */

import { supabase } from '@/services/supabase/client';
import { invalidateHandicapCache } from '@/services/queryClient';
import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';
import {
  calculateScoreDifferential,
  getRatingsForGender,
} from '@/utils/handicapDifferential';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { syncLogger } from '@/utils/debugLogger';
import type { TeeBox, Hole } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

interface ScorecardLite {
  id: string;
  player_id: string;
  round_id: string;
  total_gross: number;
  ga_handicap_used: number | null;
  status: string;
}

interface RoundLite {
  id: string;
  course_id: string;
  nine_type: NineType | null;
  selected_tee: TeeBox | null;
  courses: { holes: Hole[] | null } | null;
}

interface RoundPlayerLite {
  selected_tee: TeeBox | null;
}

interface TeeLite {
  id: string;
  name: string;
  slope: number | null;
  course_rating: number | null;
  slope_women: number | null;
  course_rating_women: number | null;
}

interface PlayerLite {
  id: string;
  gender: 'male' | 'female' | null;
  handicap: number | null;
}

export interface CombineResult {
  combinedRoundId: string;
  handicapDifferential: number;
  combinedGross: number;
  courseRatingUsed: number;
  slopeRatingUsed: number;
  dailyHandicapUsed: number | null;
}

async function loadScorecard(id: string): Promise<ScorecardLite> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('id, player_id, round_id, total_gross, ga_handicap_used, status')
    .eq('id', id)
    .single();
  if (error || !data) {
    throw new Error(`Scorecard not found: ${id}`);
  }
  return data as unknown as ScorecardLite;
}

async function loadRound(roundId: string): Promise<RoundLite> {
  const { data, error } = await from('rounds')
    .select('id, course_id, nine_type, selected_tee, courses!course_id (holes)')
    .eq('id', roundId)
    .single();
  if (error || !data) {
    throw new Error(`Round not found: ${roundId}`);
  }
  return data as RoundLite;
}

async function loadRoundPlayerTee(
  roundId: string,
  playerId: string,
): Promise<TeeBox | null> {
  const { data } = await from('round_players')
    .select('selected_tee')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .maybeSingle();
  const rp = data as RoundPlayerLite | null;
  return rp?.selected_tee ?? null;
}

async function loadPlayer(playerId: string): Promise<PlayerLite | null> {
  const { data } = await supabase
    .from('players')
    .select('id, gender, handicap')
    .eq('id', playerId)
    .single();
  return (data as unknown as PlayerLite) ?? null;
}

async function resolveTee(
  courseId: string,
  selectedTee: TeeBox,
): Promise<TeeLite> {
  if (selectedTee.tee_id) {
    const { data, error } = await from('tees')
      .select('id, name, slope, course_rating, slope_women, course_rating_women')
      .eq('id', selectedTee.tee_id)
      .single();
    if (!error && data) return data as TeeLite;
  }

  const { data: list, error: listErr } = await from('tees')
    .select('id, name, slope, course_rating, slope_women, course_rating_women')
    .eq('course_id', courseId);
  if (listErr || !list) {
    throw new Error('Could not load tees for course');
  }
  const tees = list as TeeLite[];
  const target = selectedTee.name.toLowerCase();
  const match =
    tees.find((t) => t.name.toLowerCase() === target) ??
    tees.find((t) => t.slope != null && t.course_rating != null);
  if (!match) throw new Error(`Could not resolve tee "${selectedTee.name}"`);
  return match;
}

interface PairContext {
  player: PlayerLite | null;
  courseId: string;
  effectiveTee: TeeBox;
  /** Front9 round nine_type (must be 'front9') */
  frontNineType: NineType;
  /** Back9 round nine_type (must be 'back9') */
  backNineType: NineType;
  /** Combined gross score */
  combinedGross: number;
  /** Full 18-hole par from the course (for daily handicap calculation) */
  fullPar: number;
}

async function validateAndBuildContext(
  frontScorecardId: string,
  backScorecardId: string,
): Promise<PairContext> {
  if (frontScorecardId === backScorecardId) {
    throw new Error('Cannot combine a scorecard with itself');
  }

  const [front, back] = await Promise.all([
    loadScorecard(frontScorecardId),
    loadScorecard(backScorecardId),
  ]);

  if (front.player_id !== back.player_id) {
    throw new Error('Scorecards belong to different players');
  }
  if (!['completed', 'confirmed'].includes(front.status) || !['completed', 'confirmed'].includes(back.status)) {
    throw new Error('Both scorecards must be completed before combining');
  }

  const [frontRound, backRound] = await Promise.all([
    loadRound(front.round_id),
    loadRound(back.round_id),
  ]);

  if (frontRound.course_id !== backRound.course_id) {
    throw new Error('Scorecards are from different courses');
  }
  if (frontRound.nine_type !== 'front9') {
    throw new Error('First scorecard must be a front-9 round');
  }
  if (backRound.nine_type !== 'back9') {
    throw new Error('Second scorecard must be a back-9 round');
  }

  // Resolve effective tees for each scorecard (per-player overrides take
  // precedence over the round default).
  const [frontPlayerTee, backPlayerTee] = await Promise.all([
    loadRoundPlayerTee(frontRound.id, front.player_id),
    loadRoundPlayerTee(backRound.id, back.player_id),
  ]);
  const frontEffective = frontPlayerTee ?? frontRound.selected_tee;
  const backEffective = backPlayerTee ?? backRound.selected_tee;

  if (!frontEffective || !backEffective) {
    throw new Error('Both rounds must have a selected tee');
  }
  if (frontEffective.name.toLowerCase() !== backEffective.name.toLowerCase()) {
    throw new Error(
      `Both rounds must use the same tee (front: ${frontEffective.name}, back: ${backEffective.name})`,
    );
  }

  const allHoles = frontRound.courses?.holes ?? backRound.courses?.holes ?? [];
  const fullPar = allHoles.reduce((sum, h) => sum + (h.par || 0), 0);

  const player = await loadPlayer(front.player_id);

  return {
    player,
    courseId: frontRound.course_id,
    effectiveTee: frontEffective,
    frontNineType: 'front9',
    backNineType: 'back9',
    combinedGross: front.total_gross + back.total_gross,
    fullPar,
  };
}

/**
 * Compute the combined-18 differential for a pair of 9-hole scorecards.
 * Exposed for both creating combinations and previewing them in the UI.
 */
export async function previewCombinedDifferential(
  frontScorecardId: string,
  backScorecardId: string,
): Promise<{
  handicapDifferential: number;
  combinedGross: number;
  courseRatingUsed: number;
  slopeRatingUsed: number;
  dailyHandicapUsed: number | null;
  gaHandicapUsed: number | null;
}> {
  const ctx = await validateAndBuildContext(frontScorecardId, backScorecardId);

  const tee = await resolveTee(ctx.courseId, ctx.effectiveTee);
  const ratings = getRatingsForGender(
    {
      course_rating: tee.course_rating,
      slope_rating: tee.slope,
      womens_course_rating: tee.course_rating_women,
      womens_slope_rating: tee.slope_women,
    },
    ctx.player?.gender ?? null,
  );
  if (!ratings) {
    throw new Error(`Tee "${tee.name}" is missing slope/course ratings`);
  }

  const differential = calculateScoreDifferential({
    adjustedGrossScore: ctx.combinedGross,
    courseRating: ratings.courseRating,
    slopeRating: ratings.slopeRating,
  });
  if (differential === null) {
    throw new Error('Failed to calculate combined differential');
  }

  let dailyHandicapUsed: number | null = null;
  const gaHandicapUsed = ctx.player?.handicap ?? null;
  if (gaHandicapUsed != null && ctx.fullPar > 0) {
    const dh = calculateGADailyHandicap({
      gaHandicap: gaHandicapUsed,
      slopeRating: ratings.slopeRating,
      courseRating: ratings.courseRating,
      par: ctx.fullPar,
      gender: ctx.player?.gender ?? null,
    });
    dailyHandicapUsed = dh.dailyHandicap;
  }

  return {
    handicapDifferential: differential,
    combinedGross: ctx.combinedGross,
    courseRatingUsed: ratings.courseRating,
    slopeRatingUsed: ratings.slopeRating,
    dailyHandicapUsed,
    gaHandicapUsed,
  };
}

/**
 * Create a combined handicap round from two 9-hole scorecards.
 */
export async function combineHandicapRounds(
  frontScorecardId: string,
  backScorecardId: string,
): Promise<CombineResult> {
  const preview = await previewCombinedDifferential(frontScorecardId, backScorecardId);

  // Re-load source scorecards for the player_id and submitted_at fields
  const [front, back] = await Promise.all([
    from('scorecards')
      .select('player_id, submitted_at')
      .eq('id', frontScorecardId)
      .single(),
    from('scorecards')
      .select('player_id, submitted_at')
      .eq('id', backScorecardId)
      .single(),
  ]);

  if (front.error || !front.data) throw new Error('Front scorecard not found');
  if (back.error || !back.data) throw new Error('Back scorecard not found');

  const frontRow = front.data as { player_id: string; submitted_at: string | null };
  const backRow = back.data as { player_id: string; submitted_at: string | null };
  const playerId = frontRow.player_id;

  // Look up the course_id from the round
  const ctx = await validateAndBuildContext(frontScorecardId, backScorecardId);

  // Effective date = the later of the two submitted_at timestamps
  const frontDate = frontRow.submitted_at ?? null;
  const backDate = backRow.submitted_at ?? null;
  const effectiveDate =
    frontDate && backDate
      ? new Date(frontDate) > new Date(backDate)
        ? frontDate
        : backDate
      : (frontDate ?? backDate ?? new Date().toISOString());

  const insertPayload = {
    player_id: playerId,
    front_scorecard_id: frontScorecardId,
    back_scorecard_id: backScorecardId,
    course_id: ctx.courseId,
    combined_gross: preview.combinedGross,
    handicap_differential: preview.handicapDifferential,
    course_rating_used: preview.courseRatingUsed,
    slope_rating_used: preview.slopeRatingUsed,
    daily_handicap_used: preview.dailyHandicapUsed,
    ga_handicap_used: preview.gaHandicapUsed,
    effective_date: effectiveDate,
  };

  const { data, error } = await from('handicap_combined_rounds')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error || !data) {
    // Surface unique-constraint violations as a friendly message
    const msg = error?.message ?? 'Failed to create combined round';
    if (msg.includes('hcr_unique_front') || msg.includes('hcr_unique_back')) {
      throw new Error('One of these scorecards is already part of another combination');
    }
    throw new Error(msg);
  }

  const inserted = data as { id: string };

  syncLogger.info('Created handicap combined round', {
    combinedId: inserted.id.substring(0, 8) + '...',
    playerId: playerId.substring(0, 8) + '...',
    differential: preview.handicapDifferential,
  });

  invalidateHandicapCache(playerId);
  updatePlayerHandicapIndex(playerId).catch(() => {});

  return {
    combinedRoundId: inserted.id,
    handicapDifferential: preview.handicapDifferential,
    combinedGross: preview.combinedGross,
    courseRatingUsed: preview.courseRatingUsed,
    slopeRatingUsed: preview.slopeRatingUsed,
    dailyHandicapUsed: preview.dailyHandicapUsed,
  };
}

/**
 * Remove a combined handicap round and restore the underlying 9-hole
 * scorecards to standalone state in the history.
 */
export async function uncombineHandicapRound(
  combinedRoundId: string,
): Promise<void> {
  // Look up player_id first so we can invalidate caches after deletion
  const { data: row, error: fetchError } = await from('handicap_combined_rounds')
    .select('player_id')
    .eq('id', combinedRoundId)
    .single();

  if (fetchError || !row) {
    throw new Error('Combined round not found');
  }
  const playerId = (row as { player_id: string }).player_id;

  const { error } = await from('handicap_combined_rounds')
    .delete()
    .eq('id', combinedRoundId);

  if (error) {
    throw new Error(`Failed to remove combined round: ${error.message}`);
  }

  syncLogger.info('Removed handicap combined round', {
    combinedId: combinedRoundId.substring(0, 8) + '...',
  });

  invalidateHandicapCache(playerId);
  updatePlayerHandicapIndex(playerId).catch(() => {});
}
