/**
 * Scorecard Sync Module
 *
 * Handles synchronization of scorecard data to Supabase.
 * Includes handicap calculation and score entry sync.
 */

import { supabase, getCurrentUser } from '@/services/supabase/client';
import { invalidateHandicapCache } from '@/services/queryClient';
import { saveScoreEntries } from '@/services/scoreMismatch';
import type { Scorecard, PendingSync, HoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database/base';
import { syncLogger, logScorecardSummary } from '@/utils/debugLogger';
import { calculateScoreDifferential, getRatingsForGender } from '@/utils/handicapDifferential';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  calculateParScore,
} from '@/utils/scoring';
import { teeBoxToRatings } from '@/utils/teeTransformers';
import { getEffectiveTeeRatings } from '@/utils/teeResolution';
import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Process scorecard sync action
 */
export async function processScorecardSync(sync: PendingSync): Promise<void> {
  const { action, data } = sync;

  syncLogger.debug('Processing scorecard sync', { action, dataId: data?.id });

  switch (action) {
    case 'create':
    case 'update':
      // Pending queue has authoritative submission data — skip server comparison
      await syncScorecard(data as Scorecard, { skipServerCheck: true });
      break;
    case 'delete':
      syncLogger.info('Delete scorecard (not implemented)', { dataId: data.id });
      break;
    default:
      syncLogger.warn('Unknown action', { action });
  }
}

/**
 * Sync a scorecard to Supabase
 */
export async function syncScorecard(
  scorecard: Scorecard,
  options?: { skipServerCheck?: boolean }
): Promise<void> {
  syncLogger.info('Syncing scorecard to Supabase', logScorecardSummary(scorecard));

  // Skip standalone rounds - they are local-only and don't sync to server
  if (scorecard.isStandalone) {
    syncLogger.info('Skipping standalone scorecard (local-only)', {
      id: scorecard.id.substring(0, 20) + '...',
    });
    return;
  }

  // Validate that round_id and player_id are valid UUIDs
  if (!isValidUUID(scorecard.roundId)) {
    syncLogger.error('Invalid round_id (not a UUID)', undefined, {
      roundId: scorecard.roundId,
      playerId: scorecard.playerId,
    });
    throw new Error(
      `Invalid round_id: ${scorecard.roundId} is not a valid UUID. Make sure you're using real competition data, not mock data.`
    );
  }

  if (!isValidUUID(scorecard.playerId)) {
    syncLogger.error('Invalid player_id (not a UUID)', undefined, {
      roundId: scorecard.roundId,
      playerId: scorecard.playerId,
    });
    throw new Error(
      `Invalid player_id: ${scorecard.playerId} is not a valid UUID. Make sure you're using real competition data, not mock data.`
    );
  }

  // Transform scores object to ensure string keys (Supabase JSONB compatibility)
  // Include all tracked stats: putts, FIR, GIR, penalties, shotContributions
  const scoresForDb: Record<
    string,
    {
      strokes: number;
      putts?: number;
      fairwayHit?: boolean;
      greenInRegulation?: boolean;
      penalties?: number;
      shotContributions?: { drive?: string; approach?: string; putt?: string };
      fairwayMissDirection?: string;
      greenMissDirection?: string;
      bunkerShots?: number;
      hazards?: { type: string }[];
    }
  > = {};
  let holesWithScores = 0;
  for (const [holeNum, score] of Object.entries(scorecard.scores)) {
    if (score && isSingleBallScore(score) && score.strokes !== undefined) {
      scoresForDb[String(holeNum)] = {
        strokes: score.strokes,
        putts: score.putts,
        fairwayHit: score.fairwayHit,
        greenInRegulation: score.greenInRegulation,
        penalties: score.penalties || 0,
        // Include shot contributions if present (scramble/shamble formats)
        ...(score.shotContributions && { shotContributions: score.shotContributions }),
        // Include detailed stats if present
        ...(score.fairwayMissDirection && { fairwayMissDirection: score.fairwayMissDirection }),
        ...(score.greenMissDirection && { greenMissDirection: score.greenMissDirection }),
        ...(score.bunkerShots !== undefined && score.bunkerShots > 0 && { bunkerShots: score.bunkerShots }),
        ...(score.hazards && score.hazards.length > 0 && { hazards: score.hazards }),
      };
      holesWithScores++;
    }
  }

  // Warn if a completed scorecard has suspiciously few holes
  if (scorecard.status === 'completed' && holesWithScores < 9) {
    syncLogger.warn('Syncing completed scorecard with very few holes - possible data integrity issue', {
      holesWithScores,
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
    });
  }

  syncLogger.debug('Prepared scores for Supabase', {
    holesWithScores,
    totalGross: scorecard.totalGross,
    totalNet: scorecard.totalNet,
    status: scorecard.status,
  });

  // Helper to safely convert date to ISO string (handles both Date objects and strings)
  const toISOString = (date: Date | string | undefined | null): string | null => {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    // Already a string (from JSON.parse of stored data)
    return typeof date === 'string' ? date : null;
  };

  // Log if syncHoles count doesn't match scored holes
  const syncHolesCount = scorecard.syncHoles?.length ?? 0;
  if (syncHolesCount > 0 && syncHolesCount !== holesWithScores) {
    syncLogger.warn('Hole count mismatch between syncHoles and scored holes', {
      syncHolesCount,
      holesWithScores,
      roundId: scorecard.roundId.substring(0, 8) + '...',
    });
  }

  // Calculate handicap data
  const handicapData = calculateHandicapData(scorecard);

  // Calculate correct Stableford points using daily handicap and hole data
  const totalPoints = calculateTotalPoints(scorecard, handicapData.dailyHandicapUsed);

  // Calculate Par-game score (+1/0/-1 per hole) using the same DHC + hole
  // data. Without this, Par-format rounds would sync with total_par_score
  // null/0 and the round-results pipeline (which reads total_par_score
  // for the rawScore on Par rounds) would treat every player as a 0.
  const totalParScore = calculateTotalParScore(scorecard, handicapData.dailyHandicapUsed);

  // total_net must equal gross - daily_handicap_used to stay consistent with
  // calculatePlayerStats (the scorecard view). When the sync pipeline has a
  // daily handicap, derive it here rather than trusting the store's live total,
  // which can drift if tee/handicap context was missing during score entry.
  // (For Stableford the store also overloads totalNet = totalPoints, so this
  // correction was already required there — now it applies to all game types.)
  const totalNet = handicapData.dailyHandicapUsed != null
    ? (scorecard.totalGross || 0) - handicapData.dailyHandicapUsed
    : scorecard.totalNet || 0;

  // Prepare data for Supabase upsert
  // Don't send 'id' - let Supabase generate it or use the unique constraint (round_id, player_id)
  const scorecardData = {
    round_id: scorecard.roundId,
    player_id: scorecard.playerId,
    scores: scoresForDb,
    total_gross: scorecard.totalGross || 0,
    total_net: totalNet,
    total_points: totalPoints,
    total_par_score: totalParScore,
    status: scorecard.status === 'in-progress' ? 'in-progress' : scorecard.status,
    submitted_at: toISOString(scorecard.submittedAt),
    submitted_by: scorecard.submittedBy || null,
    synced_at: new Date().toISOString(),
    // Handicap tracking fields
    ga_handicap_used: handicapData.gaHandicapUsed,
    daily_handicap_used: handicapData.dailyHandicapUsed,
    handicap_differential: handicapData.handicapDifferential,
    course_rating_used: handicapData.courseRatingUsed,
    slope_rating_used: handicapData.slopeRatingUsed,
  };

  // Check if server has more complete data before overwriting (unless skipServerCheck is set)
  if (!options?.skipServerCheck) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { data: existingScorecard } = await (supabase.from('scorecards') as any)
        .select('scores')
        .eq('round_id', scorecard.roundId)
        .eq('player_id', scorecard.playerId)
        .maybeSingle();

      if (existingScorecard?.scores) {
        const serverHoleCount = Object.keys(existingScorecard.scores).length;
        if (serverHoleCount > holesWithScores) {
          syncLogger.warn('Skipping sync - server has more complete data', {
            serverHoles: serverHoleCount,
            localHoles: holesWithScores,
            roundId: scorecard.roundId.substring(0, 8) + '...',
            playerId: scorecard.playerId.substring(0, 8) + '...',
          });
          return;
        }
      }
    } catch (checkError) {
      // Non-blocking — if the check fails, proceed with sync
      syncLogger.warn('Server check failed, proceeding with sync', {
        error: checkError instanceof Error ? checkError.message : String(checkError),
      });
    }
  }

  syncLogger.debug('Upserting to Supabase', {
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    status: scorecardData.status,
    hasSubmittedAt: !!scorecardData.submitted_at,
    hasHandicapDifferential: handicapData.handicapDifferential !== null,
  });

  // Use type assertion due to Supabase types configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const { error, data: _data } = await (
    supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      .from('scorecards') as any
  ).upsert(scorecardData, {
    onConflict: 'round_id,player_id',
  });

  if (error) {
    syncLogger.error('Supabase upsert error', error, {
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
    });
    throw new Error(`Failed to sync scorecard: ${error.message}`);
  }

  syncLogger.info('Scorecard synced successfully', {
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    holesScored: holesWithScores,
    handicapDifferential: scorecardData.handicap_differential,
  });

  // Update player's handicap index if we calculated a differential
  if (scorecardData.handicap_differential !== null) {
    invalidateHandicapCache(scorecard.playerId);

    // Update player's handicap index in background (fire-and-forget)
    updatePlayerHandicapIndex(scorecard.playerId).catch((error) => {
      syncLogger.warn('Failed to update player handicap index', {
        error: error instanceof Error ? error.message : 'Unknown error',
        playerId: scorecard.playerId.substring(0, 8) + '...',
      });
    });
  }

  // Sync score entries for mismatch detection
  await syncScoreEntries(scorecard);
}

/**
 * Calculate handicap data for a scorecard
 */
function calculateHandicapData(scorecard: Scorecard): {
  gaHandicapUsed: number | null;
  dailyHandicapUsed: number | null;
  handicapDifferential: number | null;
  courseRatingUsed: number | null;
  slopeRatingUsed: number | null;
} {
  let gaHandicapUsed: number | null = null;
  let dailyHandicapUsed: number | null = null;
  let handicapDifferential: number | null = null;
  let courseRatingUsed: number | null = null;
  let slopeRatingUsed: number | null = null;

  // Check if we have the metadata needed for handicap calculation
  const teeData = scorecard.teeData;
  const playerGender = scorecard.playerGender;
  const playerHandicap = scorecard.playerHandicap;
  const coursePar = scorecard.coursePar;

  if (teeData && coursePar) {
    // Get ratings based on player gender
    // Convert TeeBox (camelCase) to TeeWithRatings (snake_case) for getRatingsForGender
    const ratings = getRatingsForGender(teeBoxToRatings(teeData), playerGender);

    if (ratings) {
      // Apply 9-hole rating selection if this is a 9-hole round
      const nineType = scorecard.syncNineType ?? 'full';
      let finalCourseRating = ratings.courseRating;
      let finalSlopeRating = ratings.slopeRating;
      let has9HoleRatings = false;

      if (nineType !== 'full' && teeData) {
        const nineRatingField = nineType === 'front9' ? teeData.courseRatingFront9 : teeData.courseRatingBack9;
        has9HoleRatings = nineRatingField != null;

        const { slope, cr } = getEffectiveTeeRatings(
          {
            name: teeData.name,
            color: teeData.color,
            slopeRating: ratings.slopeRating,
            courseRating: ratings.courseRating,
            slopeRatingFront9: teeData.slopeRatingFront9,
            courseRatingFront9: teeData.courseRatingFront9,
            slopeRatingBack9: teeData.slopeRatingBack9,
            courseRatingBack9: teeData.courseRatingBack9,
          },
          nineType,
        );
        if (slope != null) finalSlopeRating = slope;
        if (cr != null) finalCourseRating = cr;
      }

      courseRatingUsed = finalCourseRating;
      slopeRatingUsed = finalSlopeRating;

      // Calculate daily handicap if player has a WHS handicap index
      if (playerHandicap != null) {
        // Capture the WHS handicap index used for this round (historical snapshot)
        gaHandicapUsed = playerHandicap;

        if (nineType !== 'full' && !has9HoleRatings) {
          // No 9-hole ratings available: calculate 18-hole daily handicap then halve it
          // Use 18-hole par (coursePar × 2 approximation since coursePar is already 9-hole filtered)
          const fullPar = coursePar * 2;
          const fullDailyResult = calculateGADailyHandicap({
            gaHandicap: playerHandicap,
            slopeRating: ratings.slopeRating,
            courseRating: ratings.courseRating,
            par: fullPar,
            gender: playerGender,
          });
          dailyHandicapUsed = Math.round(fullDailyResult.dailyHandicap / 2);
        } else {
          const dailyResult = calculateGADailyHandicap({
            gaHandicap: playerHandicap,
            slopeRating: finalSlopeRating,
            courseRating: finalCourseRating,
            par: coursePar,
            gender: playerGender,
          });
          dailyHandicapUsed = dailyResult.dailyHandicap;
        }
      }

      // Calculate score differential (uses raw gross score - no Net Double Bogey adjustment)
      const differential = calculateScoreDifferential({
        adjustedGrossScore: scorecard.totalGross || 0,
        courseRating: finalCourseRating,
        slopeRating: finalSlopeRating,
      });
      handicapDifferential = differential;

      syncLogger.debug('Calculated handicap data for scorecard', {
        dailyHandicapUsed,
        handicapDifferential,
        courseRatingUsed,
        slopeRatingUsed,
        nineType,
        totalGross: scorecard.totalGross,
        playerGender,
      });
    } else {
      syncLogger.warn('Could not get ratings for handicap calculation - missing valid ratings', {
        hasTeeData: !!teeData,
        playerGender,
      });
    }
  } else {
    syncLogger.debug('Skipping handicap calculation - missing metadata', {
      hasTeeData: !!teeData,
      hasCoursePar: !!coursePar,
    });
  }

  return {
    gaHandicapUsed,
    dailyHandicapUsed,
    handicapDifferential,
    courseRatingUsed,
    slopeRatingUsed,
  };
}

/**
 * Calculate total Stableford points using daily handicap and hole data.
 * Falls back to scorecard.totalNet if hole data is not available.
 */
function calculateTotalPoints(
  scorecard: Scorecard,
  dailyHandicap: number | null
): number {
  const holes = scorecard.syncHoles;
  const gameType = scorecard.syncGameType;

  // Only recalculate for Stableford when we have hole data and daily handicap
  if (gameType === 'stableford' && Array.isArray(holes) && holes.length > 0 && dailyHandicap != null) {
    let totalPoints = 0;

    for (const hole of holes) {
      const score = scorecard.scores[hole.number];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) continue;

      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
      totalPoints += calculateStablefordPointsNet(score.strokes, hole.par, strokesReceived);
    }

    syncLogger.debug('Calculated Stableford points with daily handicap', {
      totalPoints,
      dailyHandicap,
      fallbackValue: scorecard.totalNet || 0,
    });

    return totalPoints;
  }

  // Fallback: use totalNet (which for non-stableford games is the net score)
  return scorecard.totalNet || 0;
}

/**
 * Calculate Par-game total score (+1/0/-1 per hole, summed) from per-hole
 * scores using the captured daily handicap and hole stroke indexes.
 *
 * Mirrors `calculateTotalPoints` but for the Par game type. Returns null
 * when the game type isn't Par or hole data isn't present, leaving the
 * server column unset (rather than overwriting a potentially-correct
 * value with 0). Falls back to the locally-computed `totalParScore` on
 * the scorecard when DHC is missing — preserves the value the store
 * already wrote via calculatePlayerTotals.
 */
function calculateTotalParScore(
  scorecard: Scorecard,
  dailyHandicap: number | null
): number | null {
  const holes = scorecard.syncHoles;
  const gameType = scorecard.syncGameType;

  if (gameType !== 'par') return null;

  if (Array.isArray(holes) && holes.length > 0 && dailyHandicap != null) {
    let totalParScore = 0;
    for (const hole of holes) {
      const score = scorecard.scores[hole.number];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) continue;
      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
      totalParScore += calculateParScore(score.strokes, hole.par, strokesReceived);
    }
    return totalParScore;
  }

  // Fallback to whatever the store wrote (which used DHC if context was
  // available at score entry time).
  return scorecard.total_par_score ?? 0;
}

/**
 * Sync score entries for mismatch detection
 */
async function syncScoreEntries(scorecard: Scorecard): Promise<void> {
  // Populate score_entries for mismatch detection (if scores have scoredBy attribution).
  // This ensures offline scores are available for mismatch detection after reconnect.
  // NOTE: Only sync entries where the current user is the scorer (RLS policy requires
  // scorer_id = auth.uid()); entries scored by others sync from those users' own devices.
  //
  // All of this scorecard's entries are pushed in a SINGLE batched upsert rather than
  // one network call per hole. The per-hole loop previously fired up to 18 concurrent
  // single-row upserts that contended for the same rows and hit the 8s statement
  // timeout; batching collapses them into one short transaction. This is now the sole
  // writer of score_entries — the per-keystroke write in scoreUpdateSlice was removed
  // to eliminate the foreground/background race on these rows.
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id;

  const entries: {
    roundId: string;
    playerId: string;
    holeNumber: number;
    scorerId: string;
    score: HoleScore;
  }[] = [];
  let entriesSkipped = 0;

  for (const [holeNum, score] of Object.entries(scorecard.scores)) {
    if (score && isSingleBallScore(score) && score.strokes !== undefined && score.scoredBy) {
      // Only sync entries where current user was the scorer (RLS policy requires scorer_id = auth.uid())
      if (currentUserId && score.scoredBy !== currentUserId) {
        entriesSkipped++;
        continue;
      }

      entries.push({
        roundId: scorecard.roundId,
        playerId: scorecard.playerId,
        holeNumber: parseInt(holeNum),
        scorerId: score.scoredBy,
        score,
      });
    }
  }

  if (entries.length === 0) {
    if (entriesSkipped > 0) {
      syncLogger.debug('Score entries synced for mismatch detection', {
        roundId: scorecard.roundId.substring(0, 8) + '...',
        playerId: scorecard.playerId.substring(0, 8) + '...',
        entriesCount: 0,
        entriesSkipped, // Skipped because scorer was another user
      });
    }
    return;
  }

  try {
    await saveScoreEntries(entries);
    syncLogger.debug('Score entries synced for mismatch detection', {
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
      entriesCount: entries.length,
      entriesSkipped, // Skipped because scorer was another user
    });
  } catch (entryError) {
    // Non-critical - log but don't fail the scorecard sync
    syncLogger.warn('Failed to save score entries during sync', {
      error: entryError instanceof Error ? entryError.message : 'Unknown error',
      entriesCount: entries.length,
    });
  }
}
