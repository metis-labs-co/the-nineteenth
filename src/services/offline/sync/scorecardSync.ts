/**
 * Scorecard Sync Module
 *
 * Handles synchronization of scorecard data to Supabase.
 * Includes handicap calculation and score entry sync.
 */

import { supabase, getCurrentUser } from '@/services/supabase/client';
import { invalidateHandicapCache } from '@/services/queryClient';
import { saveScoreEntry } from '@/services/scoreMismatch';
import type { Scorecard, PendingSync } from '@/types';
import { isSingleBallScore } from '@/types/database/base';
import { syncLogger, logScorecardSummary } from '@/utils/debugLogger';
import { calculateScoreDifferential, getRatingsForGender } from '@/utils/handicapDifferential';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import { teeBoxToRatings } from '@/utils/teeTransformers';
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
      await syncScorecard(data as Scorecard);
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
export async function syncScorecard(scorecard: Scorecard): Promise<void> {
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

  // Calculate handicap data
  const handicapData = calculateHandicapData(scorecard);

  // Calculate correct Stableford points using daily handicap and hole data
  const totalPoints = calculateTotalPoints(scorecard, handicapData.dailyHandicapUsed);

  // For Stableford, the store sets totalNet = totalPoints (incorrect for DB storage).
  // Correct total_net should be gross - daily handicap.
  const isStableford = scorecard.syncGameType === 'stableford';
  const totalNet = isStableford && handicapData.dailyHandicapUsed != null
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
      courseRatingUsed = ratings.courseRating;
      slopeRatingUsed = ratings.slopeRating;

      // Calculate daily handicap if player has a WHS handicap index
      if (playerHandicap != null) {
        // Capture the WHS handicap index used for this round (historical snapshot)
        gaHandicapUsed = playerHandicap;

        const dailyResult = calculateGADailyHandicap({
          gaHandicap: playerHandicap,
          slopeRating: ratings.slopeRating,
          courseRating: ratings.courseRating,
          par: coursePar,
          gender: playerGender,
        });
        dailyHandicapUsed = dailyResult.dailyHandicap;
      }

      // Calculate score differential (uses raw gross score - no Net Double Bogey adjustment)
      const differential = calculateScoreDifferential({
        adjustedGrossScore: scorecard.totalGross || 0,
        courseRating: ratings.courseRating,
        slopeRating: ratings.slopeRating,
      });
      handicapDifferential = differential;

      syncLogger.debug('Calculated handicap data for scorecard', {
        dailyHandicapUsed,
        handicapDifferential,
        courseRatingUsed,
        slopeRatingUsed,
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
 * Sync score entries for mismatch detection
 */
async function syncScoreEntries(scorecard: Scorecard): Promise<void> {
  // Populate score_entries for mismatch detection (if scores have scoredBy attribution)
  // This ensures offline scores are available for mismatch detection after reconnect
  // NOTE: Only sync entries where the current user is the scorer (RLS policy requirement)
  let scoreEntriesSynced = 0;
  let entriesSkipped = 0;
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id;

  for (const [holeNum, score] of Object.entries(scorecard.scores)) {
    if (score && isSingleBallScore(score) && score.strokes !== undefined && score.scoredBy) {
      // Only sync entries where current user was the scorer (RLS policy requires scorer_id = auth.uid())
      // Entries scored by others will be synced when they sync their own device
      if (currentUserId && score.scoredBy !== currentUserId) {
        entriesSkipped++;
        continue;
      }

      try {
        await saveScoreEntry(
          scorecard.roundId,
          scorecard.playerId,
          parseInt(holeNum),
          score.scoredBy,
          score
        );
        scoreEntriesSynced++;
      } catch (entryError) {
        // Non-critical - log but don't fail the sync
        syncLogger.warn('Failed to save score entry during sync', {
          error: entryError instanceof Error ? entryError.message : 'Unknown error',
          holeNum,
        });
      }
    }
  }

  if (scoreEntriesSynced > 0 || entriesSkipped > 0) {
    syncLogger.debug('Score entries synced for mismatch detection', {
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
      entriesCount: scoreEntriesSynced,
      entriesSkipped: entriesSkipped, // Skipped because scorer was another user
    });
  }
}
