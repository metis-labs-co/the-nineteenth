/**
 * Scoring Pairs Service
 *
 * Handles CRUD operations for scoring pairs in rounds.
 * Features:
 * - Get scoring pairs with player data
 * - Get players assigned to a scorer
 * - Create, update, and delete scoring pairs
 * - Auto-generate pairs using various algorithms
 * - Cross-team pairing for team match play
 */

import { supabase } from '@/services/supabase/client';
import { createError } from '@/services/errors';
import {
  autoGenerateScoringPairs,
  generateCrossTeamPairs,
} from '@/utils/scoringPairs';
import type {
  ScoringPair,
  ScoringPairWithPlayers,
  ScoringPairInput,
  Player,
} from '@/types/database.types';
import type { Player as AppPlayer, ScoringPairCreateInput } from '@/types';

// =====================================================
// SUPABASE QUERY RESPONSE TYPES
// =====================================================

/**
 * Raw scoring pair from Supabase join query with player data
 */
interface ScoringPairQueryRow {
  id: string;
  round_id: string;
  scorer_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
  scorer: Player | null;
  player: Player | null;
}

/**
 * Raw scoring pair for players to score query
 */
interface PlayerToScoreQueryRow {
  player: Player | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert database Player to app Player format
 */
function toAppPlayer(dbPlayer: Player): AppPlayer {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    email: dbPlayer.email,
    phone: dbPlayer.phone ?? undefined,
    handicap: dbPlayer.handicap,
    photoUrl: dbPlayer.photo_url ?? undefined,
    createdAt: new Date(dbPlayer.created_at),
    updatedAt: new Date(dbPlayer.updated_at),
  };
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Get all scoring pairs for a round with player details
 *
 * @param roundId - Round UUID
 * @returns Array of scoring pairs with scorer and player populated
 * @throws ScoringPairsServiceError if query fails
 *
 * @example
 * ```typescript
 * const pairs = await getRoundScoringPairs('round-123');
 * pairs.forEach(pair => {
 *   console.log(`${pair.scorer?.name} scores ${pair.player?.name}`);
 * });
 * ```
 */
export async function getRoundScoringPairs(
  roundId: string
): Promise<ScoringPairWithPlayers[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { data: pairs, error } = await supabase
    .from('scoring_pairs')
    .select(
      `
      *,
      scorer:players!scoring_pairs_scorer_id_fkey (*),
      player:players!scoring_pairs_player_id_fkey (*)
    `
    )
    .eq('round_id', roundId)
    .order('created_at');

  if (error) {
    console.error('[ScoringPairsService] Failed to fetch scoring pairs:', error);
    throw createError(
      `Failed to fetch scoring pairs: ${error.message}`,
      'DATABASE'
    );
  }

  // Transform to ScoringPairWithPlayers format
  const typedPairs = (pairs as ScoringPairQueryRow[]) || [];
  return typedPairs.map((pair) => ({
    id: pair.id,
    round_id: pair.round_id,
    scorer_id: pair.scorer_id,
    player_id: pair.player_id,
    created_at: pair.created_at,
    updated_at: pair.updated_at,
    scorer: pair.scorer ?? undefined,
    player: pair.player ?? undefined,
  }));
}

/**
 * Get players that a specific scorer is responsible for scoring
 *
 * Returns [self, ...partners] - the scorer themselves first, then their assigned partners.
 * This enables dual-scoring where each player scores themselves AND their partner.
 *
 * @param roundId - Round UUID
 * @param scorerId - Scorer (marker) player UUID
 * @returns Array of players: [self, ...assigned partners]
 * @throws ScoringPairsServiceError if query fails
 *
 * @example
 * ```typescript
 * const players = await getPlayersToScore('round-123', currentUserId);
 * // players[0] = self (currentUser)
 * // players[1+] = assigned partners
 * players.forEach(player => {
 *   console.log(`You are scoring: ${player.name}`);
 * });
 * ```
 */
export async function getPlayersToScore(
  roundId: string,
  scorerId: string
): Promise<AppPlayer[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!scorerId) {
    throw createError('Scorer ID is required', 'VALIDATION');
  }

  // Fetch the scorer's own player record (self)
  const { data: selfPlayer, error: selfError } = await supabase
    .from('players')
    .select('*')
    .eq('id', scorerId)
    .single();

  if (selfError) {
    console.error('[ScoringPairsService] Failed to fetch self player:', selfError);
    throw createError(
      `Failed to fetch self player: ${selfError.message}`,
      'DATABASE'
    );
  }

  // Fetch assigned partners from scoring_pairs
  const { data: pairs, error } = await supabase
    .from('scoring_pairs')
    .select(
      `
      player:players!scoring_pairs_player_id_fkey (*)
    `
    )
    .eq('round_id', roundId)
    .eq('scorer_id', scorerId);

  if (error) {
    console.error('[ScoringPairsService] Failed to fetch players to score:', error);
    throw createError(
      `Failed to fetch players to score: ${error.message}`,
      'DATABASE'
    );
  }

  // Extract partner data and convert to app Player format
  const typedPairs = (pairs as PlayerToScoreQueryRow[]) || [];
  const partners = typedPairs
    .map((pair) => pair.player)
    .filter((player): player is Player => player !== null)
    .map(toAppPlayer);

  // Return [self, ...partners] - self always first
  const self = toAppPlayer(selfPlayer as Player);
  return [self, ...partners];
}

/**
 * Get the player who is assigned to score a specific user
 *
 * In scoring pairs, each player has exactly one scorer (marker) assigned.
 * This function returns that scorer for mismatch detection purposes.
 *
 * @param roundId - Round UUID
 * @param playerId - Player UUID (the one being scored)
 * @returns The scorer (partner) assigned to score this player, or null if none
 * @throws ScoringPairsServiceError if query fails
 *
 * @example
 * ```typescript
 * const myScorer = await getScoringPartner('round-123', currentUserId);
 * if (myScorer) {
 *   console.log(`${myScorer.name} is scoring your card`);
 * }
 * ```
 */
export async function getScoringPartner(
  roundId: string,
  playerId: string
): Promise<AppPlayer | null> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!playerId) {
    throw createError('Player ID is required', 'VALIDATION');
  }

  const { data: pair, error } = await supabase
    .from('scoring_pairs')
    .select(
      `
      scorer:players!scoring_pairs_scorer_id_fkey (*)
    `
    )
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is valid (no scorer assigned)
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[ScoringPairsService] Failed to fetch scoring partner:', error);
    throw createError(
      `Failed to fetch scoring partner: ${error.message}`,
      'DATABASE'
    );
  }

  const scorer = (pair as { scorer: Player | null })?.scorer;
  return scorer ? toAppPlayer(scorer) : null;
}

/**
 * Create scoring pairs for a round
 *
 * Deletes any existing pairs for the round before creating new ones.
 *
 * @param roundId - Round UUID
 * @param pairs - Array of scorer/player pair inputs
 * @returns Array of created scoring pairs
 * @throws ScoringPairsServiceError if creation fails
 *
 * @example
 * ```typescript
 * const pairs = await createScoringPairs('round-123', [
 *   { scorerId: 'player-1', playerId: 'player-2' },
 *   { scorerId: 'player-2', playerId: 'player-1' },
 * ]);
 * ```
 */
export async function createScoringPairs(
  roundId: string,
  pairs: ScoringPairCreateInput[]
): Promise<ScoringPair[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!pairs || pairs.length === 0) {
    throw createError('At least one scoring pair is required', 'VALIDATION');
  }

  // Delete existing pairs for this round
  const { error: deleteError } = await supabase
    .from('scoring_pairs')
    .delete()
    .eq('round_id', roundId);

  if (deleteError) {
    console.error('[ScoringPairsService] Failed to delete existing pairs:', deleteError);
    throw createError(
      `Failed to delete existing pairs: ${deleteError.message}`,
      'DATABASE'
    );
  }

  // Prepare insert data (convert camelCase to snake_case)
  const insertData: ScoringPairInput[] = pairs.map((pair) => ({
    scorer_id: pair.scorerId,
    player_id: pair.playerId,
  }));

  // Insert new pairs with round_id
  const insertRows = insertData.map((pair) => ({
    round_id: roundId,
    ...pair,
  }));

  const { data: createdPairs, error: insertError } = await supabase
    .from('scoring_pairs')
    .insert(insertRows as unknown as never)
    .select();

  if (insertError) {
    console.error('[ScoringPairsService] Failed to create scoring pairs:', insertError);
    throw createError(
      `Failed to create scoring pairs: ${insertError.message}`,
      'DATABASE'
    );
  }

  return (createdPairs as ScoringPair[]) || [];
}

/**
 * Auto-generate and save scoring pairs for a round
 *
 * Uses the optimal auto-pairing algorithm:
 * - Even number of players: Reciprocal pairs (A↔B)
 * - Odd number of players: Circular chain (A→B→C→A)
 *
 * @param roundId - Round UUID
 * @param players - Array of players to pair
 * @returns Created scoring pairs
 * @throws ScoringPairsServiceError if generation or creation fails
 *
 * @example
 * ```typescript
 * const pairs = await autoGenerateAndSaveScoringPairs(
 *   'round-123',
 *   [player1, player2, player3, player4]
 * );
 * console.log(`Created ${pairs.length} scoring pairs`);
 * ```
 */
export async function autoGenerateAndSaveScoringPairs(
  roundId: string,
  players: { id: string }[]
): Promise<ScoringPair[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!players || players.length < 2) {
    throw createError('At least 2 players are required for auto-pairing', 'VALIDATION');
  }

  // Generate pairs using the utility function
  const { pairs: generatedPairs } = autoGenerateScoringPairs(players);

  // Save to database
  return createScoringPairs(roundId, generatedPairs);
}

/**
 * Generate and save cross-team scoring pairs for team match play
 *
 * Creates reciprocal pairs between players from opposing teams.
 * Team1[0] ↔ Team2[0], Team1[1] ↔ Team2[1], etc.
 *
 * @param roundId - Round UUID
 * @param team1Players - Players from team 1
 * @param team2Players - Players from team 2
 * @returns Created scoring pairs
 * @throws ScoringPairsServiceError if generation or creation fails
 *
 * @example
 * ```typescript
 * const pairs = await generateTeamMatchPlayPairs(
 *   'round-123',
 *   [{ id: 'a1' }, { id: 'a2' }],
 *   [{ id: 'b1' }, { id: 'b2' }]
 * );
 * // Result: A1↔B1, A2↔B2
 * ```
 */
export async function generateTeamMatchPlayPairs(
  roundId: string,
  team1Players: { id: string }[],
  team2Players: { id: string }[]
): Promise<ScoringPair[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!team1Players || team1Players.length === 0) {
    throw createError('Team 1 must have at least one player', 'VALIDATION');
  }
  if (!team2Players || team2Players.length === 0) {
    throw createError('Team 2 must have at least one player', 'VALIDATION');
  }

  // Generate cross-team pairs using the utility function
  const result = generateCrossTeamPairs(team1Players, team2Players, 'wrap');

  // Save to database
  return createScoringPairs(roundId, result.pairs);
}

/**
 * Delete all scoring pairs for a round
 *
 * @param roundId - Round UUID
 * @throws ScoringPairsServiceError if deletion fails
 *
 * @example
 * ```typescript
 * await deleteScoringPairs('round-123');
 * ```
 */
export async function deleteScoringPairs(roundId: string): Promise<void> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { error } = await supabase
    .from('scoring_pairs')
    .delete()
    .eq('round_id', roundId);

  if (error) {
    console.error('[ScoringPairsService] Failed to delete scoring pairs:', error);
    throw createError(
      `Failed to delete scoring pairs: ${error.message}`,
      'DATABASE'
    );
  }
}

/**
 * Check if a round has scoring pairs configured
 *
 * @param roundId - Round UUID
 * @returns True if the round has at least one scoring pair
 * @throws ScoringPairsServiceError if query fails
 *
 * @example
 * ```typescript
 * const hasPairs = await hasScoringPairs('round-123');
 * if (!hasPairs) {
 *   // Prompt user to set up scoring pairs
 * }
 * ```
 */
export async function hasScoringPairs(roundId: string): Promise<boolean> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { count, error } = await supabase
    .from('scoring_pairs')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId);

  if (error) {
    console.error('[ScoringPairsService] Failed to check scoring pairs:', error);
    throw createError(
      `Failed to check scoring pairs: ${error.message}`,
      'DATABASE'
    );
  }

  return (count ?? 0) > 0;
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Scoring pairs service with all CRUD operations
 */
export const scoringPairsService = {
  getRoundScoringPairs,
  getPlayersToScore,
  getScoringPartner,
  createScoringPairs,
  autoGenerateAndSaveScoringPairs,
  generateTeamMatchPlayPairs,
  deleteScoringPairs,
  hasScoringPairs,
};

export default scoringPairsService;
