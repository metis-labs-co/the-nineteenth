/**
 * Grandfathering Service
 *
 * Handles subscription downgrade scenarios with graceful degradation.
 * Features:
 * - Check grandfathered access for existing competitions
 * - Apply graceful degradation (view/score existing, restrict new actions)
 * - Find competitions that exceed current tier limits
 *
 * For MVP: All existing competitions are grandfathered (view/score allowed).
 * Future: Track original tier at creation time for more nuanced policies.
 */

import { supabase } from '@/services/supabase/client';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { isUnlimited, isNoLimit, mapDBTierLimits } from '@/types/subscription.types';
import type { SubscriptionTier, TierLimits } from '@/types/subscription.types';
import type { TierLimits as DBTierLimits } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Result of checking grandfathered access
 */
export interface GrandfatheredAccessResult {
  /** Whether the competition is grandfathered (always true for MVP) */
  isGrandfathered: boolean;

  /** Original tier when competition was created (future use) */
  originalTier?: SubscriptionTier;

  /** Human-readable reason for grandfathering */
  reason?: string;
}

/**
 * Result of applying graceful degradation
 */
export interface GracefulDegradationResult {
  /** Actions the user can perform on this competition */
  allowedActions: GrandfatheringAction[];

  /** Actions that are restricted due to tier limits */
  restrictedActions: GrandfatheringAction[];

  /** Whether any degradation is applied */
  isDegraded: boolean;

  /** Upgrade message if applicable */
  upgradeMessage?: string;
}

/**
 * Actions that can be allowed or restricted on a competition
 */
export type GrandfatheringAction =
  | 'view_competition'
  | 'view_leaderboard'
  | 'enter_scores'
  | 'submit_scorecard'
  | 'add_round'
  | 'add_player'
  | 'edit_competition'
  | 'configure_scoring_pairs'
  | 'use_advanced_game_types';

/**
 * Competition info with counts for limit checking
 */
export interface CompetitionWithCounts {
  id: string;
  name: string;
  organizerId: string;
  roundCount: number;
  playerCount: number;
  createdAt: Date;
  status: string;
}

/**
 * Competition that exceeds current tier limit
 */
export interface OverLimitCompetition {
  competition: CompetitionWithCounts;
  reason: 'rounds' | 'players' | 'index';
  currentValue: number;
  limitValue: number;
}

// =====================================================
// ERROR TYPES
// =====================================================

export interface GrandfatheringServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'UNAUTHORIZED' | 'UNKNOWN';
}

function createError(
  message: string,
  code: GrandfatheringServiceError['code']
): GrandfatheringServiceError {
  const error = new Error(message) as GrandfatheringServiceError;
  error.code = code;
  return error;
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Actions that are always allowed for grandfathered competitions
 * These represent read and score entry operations
 */
const GRANDFATHERED_ALLOWED_ACTIONS: GrandfatheringAction[] = [
  'view_competition',
  'view_leaderboard',
  'enter_scores',
  'submit_scorecard',
];

/**
 * Actions that may be restricted based on current tier limits
 * These represent operations that add resources to the competition
 */
const POTENTIALLY_RESTRICTED_ACTIONS: GrandfatheringAction[] = [
  'add_round',
  'add_player',
  'edit_competition',
  'configure_scoring_pairs',
  'use_advanced_game_types',
];

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Check if a user has grandfathered access to a competition
 *
 * For MVP: Always returns true for existing competitions where user is organizer or player.
 * This allows users to continue viewing and scoring competitions after a downgrade.
 *
 * Future enhancement: Track original tier at competition creation time to provide
 * more nuanced grandfathering policies based on original subscription level.
 *
 * @param competitionId - Competition UUID to check
 * @param userId - User UUID to check access for
 * @returns Grandfathered access result
 *
 * @example
 * ```typescript
 * const access = await checkGrandfatheredAccess('comp-123', 'user-456');
 * if (access.isGrandfathered) {
 *   console.log('User can view this legacy competition');
 * }
 * ```
 */
export async function checkGrandfatheredAccess(
  competitionId: string,
  userId: string
): Promise<GrandfatheredAccessResult> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }
  if (!userId) {
    throw createError('User ID is required', 'VALIDATION');
  }

  // Check if user has any relationship to this competition
  // (organizer or player)
  const { data: competition, error } = await supabase
    .from('competitions')
    .select(
      `
      id,
      organizer_id,
      competition_players!inner (player_id)
    `
    )
    .eq('id', competitionId)
    .or(`organizer_id.eq.${userId},competition_players.player_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    console.error('[GrandfatheringService] Failed to check access:', error);
    throw createError(
      `Failed to check grandfathered access: ${error.message}`,
      'DATABASE'
    );
  }

  // If competition doesn't exist or user has no relationship
  if (!competition) {
    return {
      isGrandfathered: false,
      reason: 'No relationship to competition',
    };
  }

  // MVP: All existing competitions are grandfathered
  // User can view/score any competition they're part of
  return {
    isGrandfathered: true,
    reason: 'Existing competition - full view and score access retained',
    // originalTier: undefined, // Future: store this in competitions table
  };
}

/**
 * Apply graceful degradation to a competition based on current tier
 *
 * Determines which actions are allowed vs restricted based on:
 * 1. Tier capabilities (can_use_scoring_pairs, allowed_game_types, etc.)
 * 2. Resource limits (max_rounds_per_competition, max_players_per_competition)
 *
 * Always allows: view, leaderboard, score entry, scorecard submission
 * May restrict: add_round, add_player, advanced features
 *
 * @param competitionId - Competition UUID to check
 * @param currentTier - User's current subscription tier
 * @returns Graceful degradation result with allowed/restricted actions
 *
 * @example
 * ```typescript
 * const result = await applyGracefulDegradation('comp-123', 'free');
 * console.log('Allowed:', result.allowedActions);
 * console.log('Restricted:', result.restrictedActions);
 * ```
 */
export async function applyGracefulDegradation(
  competitionId: string,
  currentTier: SubscriptionTier
): Promise<GracefulDegradationResult> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }

  // Get tier limits from store or fetch from database
  const storeState = useSubscriptionStore.getState();
  let limits: TierLimits | null = null;

  if (storeState.allTierLimits) {
    limits = storeState.allTierLimits[currentTier];
  }

  if (!limits) {
    // Fetch from database if not in store
    const { data: tierLimits, error } = await supabase
      .from('tier_limits')
      .select('*')
      .eq('tier', currentTier)
      .single();

    if (error) {
      console.error('[GrandfatheringService] Failed to fetch tier limits:', error);
      throw createError(
        `Failed to fetch tier limits: ${error.message}`,
        'DATABASE'
      );
    }

    // Map from DB snake_case to app camelCase
    limits = mapDBTierLimits(tierLimits as unknown as DBTierLimits);
  }

  // Get current competition counts
  // Define type for the aggregation query result
  interface CompetitionCountsResult {
    id: string;
    rounds: { count: number }[];
    players: { count: number }[];
  }

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select(
      `
      id,
      rounds:rounds(count),
      players:competition_players(count)
    `
    )
    .eq('id', competitionId)
    .single();

  if (compError) {
    console.error('[GrandfatheringService] Failed to fetch competition:', compError);
    throw createError(
      `Failed to fetch competition: ${compError.message}`,
      'DATABASE'
    );
  }

  // Extract counts from the nested array result
  const compData = competition as unknown as CompetitionCountsResult;
  const roundCount = compData.rounds?.[0]?.count ?? 0;
  const playerCount = compData.players?.[0]?.count ?? 0;

  // Start with grandfathered allowed actions
  const allowedActions: GrandfatheringAction[] = [...GRANDFATHERED_ALLOWED_ACTIONS];
  const restrictedActions: GrandfatheringAction[] = [];

  // Check if super_admin or unlimited - allow all
  if (currentTier === 'super_admin' || isNoLimit(limits.maxRoundsPerCompetition)) {
    allowedActions.push(...POTENTIALLY_RESTRICTED_ACTIONS);
    return {
      allowedActions,
      restrictedActions: [],
      isDegraded: false,
    };
  }

  // Check add_round limit
  if (isUnlimited(limits.maxRoundsPerCompetition) || roundCount < limits.maxRoundsPerCompetition) {
    allowedActions.push('add_round');
  } else {
    restrictedActions.push('add_round');
  }

  // Check add_player limit
  if (isUnlimited(limits.maxPlayersPerCompetition) || playerCount < limits.maxPlayersPerCompetition) {
    allowedActions.push('add_player');
  } else {
    restrictedActions.push('add_player');
  }

  // edit_competition always allowed for organizer
  allowedActions.push('edit_competition');

  // Check scoring pairs capability
  if (limits.canUseScoringPairs) {
    allowedActions.push('configure_scoring_pairs');
  } else {
    restrictedActions.push('configure_scoring_pairs');
  }

  // Check advanced game types
  // For now, always allow since we don't track game type at competition level
  // This would be checked when actually adding/editing a round
  allowedActions.push('use_advanced_game_types');

  const isDegraded = restrictedActions.length > 0;
  let upgradeMessage: string | undefined;

  if (isDegraded) {
    upgradeMessage = `Some actions are restricted. Upgrade to ${
      currentTier === 'free' ? 'Social' : 'Premium'
    } for full access.`;
  }

  return {
    allowedActions,
    restrictedActions,
    isDegraded,
    upgradeMessage,
  };
}

/**
 * Get competitions that exceed the current tier limit
 *
 * Returns competitions where the user is the organizer that are over
 * their current tier's competition limit. Used for display purposes
 * to show which competitions are "grandfathered" in the UI.
 *
 * @param userId - User UUID to check competitions for
 * @param maxAllowed - Maximum competitions allowed by current tier (-1 = unlimited)
 * @returns Array of competitions over the limit with details
 *
 * @example
 * ```typescript
 * // User on free tier (limit: 1) has 3 competitions
 * const overLimit = await getCompetitionsOverLimit('user-123', 1);
 * // Returns 2 competitions (the 2nd and 3rd oldest are over limit)
 * overLimit.forEach(item => {
 *   console.log(`${item.competition.name} is over limit (index: ${item.currentValue})`);
 * });
 * ```
 */
export async function getCompetitionsOverLimit(
  userId: string,
  maxAllowed: number
): Promise<OverLimitCompetition[]> {
  if (!userId) {
    throw createError('User ID is required', 'VALIDATION');
  }

  // If unlimited or no limit, nothing is over limit
  if (isUnlimited(maxAllowed) || isNoLimit(maxAllowed)) {
    return [];
  }

  // Define type for the aggregation query result
  interface CompetitionListResult {
    id: string;
    name: string;
    organizer_id: string;
    status: string;
    created_at: string;
    rounds: { count: number }[];
    players: { count: number }[];
  }

  // Fetch user's competitions as organizer, ordered by creation date
  // Active competitions only (not completed or cancelled)
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select(
      `
      id,
      name,
      organizer_id,
      status,
      created_at,
      rounds:rounds(count),
      players:competition_players(count)
    `
    )
    .eq('organizer_id', userId)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GrandfatheringService] Failed to fetch competitions:', error);
    throw createError(
      `Failed to fetch competitions: ${error.message}`,
      'DATABASE'
    );
  }

  if (!competitions || competitions.length <= maxAllowed) {
    return [];
  }

  // Cast to typed array
  const typedCompetitions = competitions as unknown as CompetitionListResult[];

  // Competitions beyond maxAllowed are over limit
  // They're ordered by created_at ASC, so the oldest are allowed
  const overLimitCompetitions = typedCompetitions.slice(maxAllowed);

  return overLimitCompetitions.map((comp, index) => {
    const roundCount = comp.rounds?.[0]?.count ?? 0;
    const playerCount = comp.players?.[0]?.count ?? 0;

    return {
      competition: {
        id: comp.id,
        name: comp.name,
        organizerId: comp.organizer_id,
        roundCount,
        playerCount,
        createdAt: new Date(comp.created_at),
        status: comp.status,
      },
      reason: 'index' as const,
      currentValue: maxAllowed + index + 1, // 1-indexed position
      limitValue: maxAllowed,
    };
  });
}

/**
 * Check if a specific action is allowed for a competition
 *
 * Convenience function that combines grandfathering and degradation checks.
 *
 * @param competitionId - Competition UUID
 * @param userId - User UUID
 * @param action - Action to check
 * @returns Whether the action is allowed
 *
 * @example
 * ```typescript
 * const canAddRound = await isActionAllowed('comp-123', 'user-456', 'add_round');
 * if (!canAddRound) {
 *   showUpgradePrompt();
 * }
 * ```
 */
export async function isActionAllowed(
  competitionId: string,
  userId: string,
  action: GrandfatheringAction
): Promise<boolean> {
  // First check grandfathered access
  const access = await checkGrandfatheredAccess(competitionId, userId);

  if (!access.isGrandfathered) {
    return false;
  }

  // Get current tier from store
  const currentTier = useSubscriptionStore.getState().subscription?.tier ?? 'free';

  // Apply degradation
  const degradation = await applyGracefulDegradation(competitionId, currentTier);

  return degradation.allowedActions.includes(action);
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Grandfathering service for handling subscription downgrades
 */
export const grandfatheringService = {
  checkGrandfatheredAccess,
  applyGracefulDegradation,
  getCompetitionsOverLimit,
  isActionAllowed,
};

export default grandfatheringService;
