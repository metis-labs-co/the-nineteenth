/**
 * Competition Players Service
 *
 * Handles CRUD operations for competition players.
 * Features:
 * - Get players in a competition
 * - Add players to a competition
 * - Remove players from a competition (with scoring pair check)
 * - Check for scoring pair assignments before removal
 */

import { supabase } from '@/services/supabase/client';
import { getCurrentTier, hasPremiumAccess } from '@/store/subscriptionStore';
import type { FeatureAccess } from '@/types/subscription.types';

// =====================================================
// TYPES
// =====================================================

export interface CompetitionPlayersServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'UNAUTHORIZED' | 'UNKNOWN';
}

/**
 * Information about a player's scoring pair assignments
 */
export interface PlayerScoringPairInfo {
  /** Total number of rounds where player has scoring pair assignments */
  roundCount: number;
  /** Details of each affected round */
  affectedRounds: {
    roundId: string;
    roundNumber: number;
    courseName: string | null;
    date: string | null;
    /** Is this player a scorer for others? */
    isScorer: boolean;
    /** Is this player being scored by others? */
    isBeingScored: boolean;
  }[];
}

/**
 * Result of checking if a player can be safely removed
 */
export interface PlayerRemovalCheck {
  /** Can the player be removed? (always true, but with warnings) */
  canRemove: boolean;
  /** Does the player have scoring pair assignments? */
  hasScoringPairs: boolean;
  /** Details about scoring pair assignments (if any) */
  scoringPairInfo: PlayerScoringPairInfo | null;
  /** Warning message to display (if any) */
  warningMessage: string | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a typed CompetitionPlayersServiceError
 */
function createError(
  message: string,
  code: CompetitionPlayersServiceError['code']
): CompetitionPlayersServiceError {
  const error = new Error(message) as CompetitionPlayersServiceError;
  error.code = code;
  return error;
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Check if a player has scoring pair assignments in a competition
 *
 * This should be called before removing a player to warn the organizer
 * about affected rounds.
 *
 * @param competitionId - Competition UUID
 * @param playerId - Player UUID to check
 * @returns Information about the player's scoring pair assignments
 *
 * @example
 * ```typescript
 * const check = await checkPlayerScoringPairs('comp-123', 'player-456');
 * if (check.hasScoringPairs) {
 *   Alert.alert('Warning', check.warningMessage);
 * }
 * ```
 */
export async function checkPlayerScoringPairs(
  competitionId: string,
  playerId: string
): Promise<PlayerRemovalCheck> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }
  if (!playerId) {
    throw createError('Player ID is required', 'VALIDATION');
  }

  // Type for round query result
  type RoundWithCourse = {
    id: string;
    round_number: number;
    date: string | null;
    courses: { name: string } | null;
  };

  // Type for scoring pair query result
  type ScoringPairRow = {
    round_id: string;
    scorer_id: string;
    player_id: string;
  };

  // First, get all rounds in this competition
  const { data: rounds, error: roundsError } = await (
    supabase
      .from('rounds')
      .select('id, round_number, date, courses!inner(name)')
      .eq('competition_id', competitionId) as any
  );

  if (roundsError) {
    console.error('[CompetitionPlayersService] Failed to fetch rounds:', roundsError);
    throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
  }

  const typedRounds = rounds as RoundWithCourse[] | null;

  if (!typedRounds || typedRounds.length === 0) {
    return {
      canRemove: true,
      hasScoringPairs: false,
      scoringPairInfo: null,
      warningMessage: null,
    };
  }

  const roundIds = typedRounds.map((r) => r.id);

  // Get all scoring pairs where this player is involved (as scorer or player)
  const { data: scoringPairs, error: pairsError } = await (
    supabase
      .from('scoring_pairs')
      .select('round_id, scorer_id, player_id')
      .in('round_id', roundIds)
      .or(`scorer_id.eq.${playerId},player_id.eq.${playerId}`) as any
  );

  if (pairsError) {
    console.error('[CompetitionPlayersService] Failed to fetch scoring pairs:', pairsError);
    throw createError(`Failed to fetch scoring pairs: ${pairsError.message}`, 'DATABASE');
  }

  const typedPairs = scoringPairs as ScoringPairRow[] | null;

  if (!typedPairs || typedPairs.length === 0) {
    return {
      canRemove: true,
      hasScoringPairs: false,
      scoringPairInfo: null,
      warningMessage: null,
    };
  }

  // Group scoring pairs by round
  const roundPairsMap = new Map<
    string,
    { isScorer: boolean; isBeingScored: boolean }
  >();

  for (const pair of typedPairs) {
    const existing = roundPairsMap.get(pair.round_id) || {
      isScorer: false,
      isBeingScored: false,
    };
    if (pair.scorer_id === playerId) {
      existing.isScorer = true;
    }
    if (pair.player_id === playerId) {
      existing.isBeingScored = true;
    }
    roundPairsMap.set(pair.round_id, existing);
  }

  // Build affected rounds info
  const affectedRounds = typedRounds
    .filter((r) => roundPairsMap.has(r.id))
    .map((r) => {
      const pairInfo = roundPairsMap.get(r.id)!;
      return {
        roundId: r.id,
        roundNumber: r.round_number,
        courseName: r.courses?.name ?? null,
        date: r.date,
        isScorer: pairInfo.isScorer,
        isBeingScored: pairInfo.isBeingScored,
      };
    });

  const roundCount = affectedRounds.length;
  const warningMessage = `This player has scoring pair assignments in ${roundCount} round${roundCount !== 1 ? 's' : ''}. Removing them will delete those assignments and affected rounds will need to be re-configured.`;

  return {
    canRemove: true,
    hasScoringPairs: true,
    scoringPairInfo: {
      roundCount,
      affectedRounds,
    },
    warningMessage,
  };
}

/**
 * Remove a player from a competition
 *
 * This will:
 * - Delete scoring_pairs where the player is scorer or player in this competition's rounds
 * - Delete the competition_players record
 *
 * Note: The scoring_pairs table has ON DELETE CASCADE on players(id),
 * but since we're removing from competition_players (not deleting the player),
 * we need to manually delete the scoring pairs for this competition's rounds.
 *
 * @param competitionId - Competition UUID
 * @param playerId - Player UUID to remove
 * @throws CompetitionPlayersServiceError if removal fails
 *
 * @example
 * ```typescript
 * // First check for scoring pairs
 * const check = await checkPlayerScoringPairs('comp-123', 'player-456');
 * if (check.hasScoringPairs) {
 *   // Show warning dialog, get confirmation
 * }
 * // Then remove
 * await removePlayerFromCompetition('comp-123', 'player-456');
 * ```
 */
export async function removePlayerFromCompetition(
  competitionId: string,
  playerId: string
): Promise<void> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }
  if (!playerId) {
    throw createError('Player ID is required', 'VALIDATION');
  }

  // Verify the current user is the organizer
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw createError('You must be logged in to remove players', 'UNAUTHORIZED');
  }

  // Check if user is the organizer
  const { data: competition, error: compError } = await (
    supabase
      .from('competitions')
      .select('organizer_id')
      .eq('id', competitionId)
      .single() as any
  );

  if (compError) {
    console.error('[CompetitionPlayersService] Failed to fetch competition:', compError);
    throw createError(`Failed to fetch competition: ${compError.message}`, 'DATABASE');
  }

  const typedCompetition = competition as { organizer_id: string } | null;

  if (!typedCompetition || typedCompetition.organizer_id !== user.id) {
    throw createError('Only the organizer can remove players', 'UNAUTHORIZED');
  }

  // Prevent removing yourself if you're the organizer
  if (playerId === user.id) {
    throw createError('You cannot remove yourself from the competition', 'VALIDATION');
  }

  // Get all round IDs for this competition
  const { data: rounds, error: roundsError } = await (
    supabase
      .from('rounds')
      .select('id')
      .eq('competition_id', competitionId) as any
  );

  if (roundsError) {
    console.error('[CompetitionPlayersService] Failed to fetch rounds:', roundsError);
    throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
  }

  const typedRounds = rounds as { id: string }[] | null;

  // Delete scoring pairs for this player in this competition's rounds
  // This is necessary because ON DELETE CASCADE is on players(id), not competition_players
  if (typedRounds && typedRounds.length > 0) {
    const roundIds = typedRounds.map((r) => r.id);

    // Delete scoring pairs where player is either scorer or the one being scored
    const { error: deleteScorerError } = await supabase
      .from('scoring_pairs')
      .delete()
      .in('round_id', roundIds)
      .eq('scorer_id', playerId);

    if (deleteScorerError) {
      console.error('[CompetitionPlayersService] Failed to delete scorer pairs:', deleteScorerError);
      throw createError(`Failed to delete scoring pairs: ${deleteScorerError.message}`, 'DATABASE');
    }

    const { error: deletePlayerError } = await supabase
      .from('scoring_pairs')
      .delete()
      .in('round_id', roundIds)
      .eq('player_id', playerId);

    if (deletePlayerError) {
      console.error('[CompetitionPlayersService] Failed to delete player pairs:', deletePlayerError);
      throw createError(`Failed to delete scoring pairs: ${deletePlayerError.message}`, 'DATABASE');
    }
  }

  // Delete the competition_players record
  const { error: deleteError } = await supabase
    .from('competition_players')
    .delete()
    .eq('competition_id', competitionId)
    .eq('player_id', playerId);

  if (deleteError) {
    console.error('[CompetitionPlayersService] Failed to remove player:', deleteError);
    throw createError(`Failed to remove player: ${deleteError.message}`, 'DATABASE');
  }
}

/**
 * Get the list of round IDs affected by removing a player
 *
 * This returns only rounds that have scoring pairs involving the player,
 * which will need to be re-configured after removal.
 *
 * @param competitionId - Competition UUID
 * @param playerId - Player UUID
 * @returns Array of affected round IDs
 */
export async function getAffectedRoundIds(
  competitionId: string,
  playerId: string
): Promise<string[]> {
  const check = await checkPlayerScoringPairs(competitionId, playerId);

  if (!check.hasScoringPairs || !check.scoringPairInfo) {
    return [];
  }

  return check.scoringPairInfo.affectedRounds.map((r) => r.roundId);
}

// =====================================================
// SUBSCRIPTION FEATURE CHECKS
// =====================================================

/**
 * Check if the current user can use the scoring pairs feature
 *
 * Scoring pairs is a Premium-only feature that allows organizers
 * to designate specific players to score each other in competitive rounds.
 *
 * @returns FeatureAccess object indicating if the feature is accessible
 *
 * @example
 * ```typescript
 * const access = checkCanUseScoringPairs();
 * if (!access.allowed) {
 *   // Show upgrade prompt
 *   navigation.navigate('Subscription');
 * }
 * ```
 */
export function checkCanUseScoringPairs(): FeatureAccess {
  const isPremium = hasPremiumAccess();
  const tier = getCurrentTier();

  if (isPremium) {
    return {
      allowed: true,
      upgradeRequired: false,
      currentValue: 1,
      limitValue: 1,
    };
  }

  return {
    allowed: false,
    upgradeRequired: true,
    reason: 'Scoring pairs requires a Premium subscription',
    requiredTier: 'premium',
    currentValue: 0,
    limitValue: 1,
  };
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Competition players service with all CRUD operations
 */
export const competitionPlayersService = {
  checkPlayerScoringPairs,
  removePlayerFromCompetition,
  getAffectedRoundIds,
  checkCanUseScoringPairs,
};

export default competitionPlayersService;
