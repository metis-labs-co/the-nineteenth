/**
 * Pairing Service
 *
 * Handles CRUD operations for player groupings (pairings) in rounds.
 * Features:
 * - Create pairings with tee times
 * - Get round pairings with full player data
 * - Update individual pairings
 * - Delete all pairings for a round
 * - Auto-generate pairings using snake draft
 */

import { supabase } from '@/services/supabase/client';
import { generateSnakeDraftPairings, recalculateTeeTimes } from '@/utils/pairingAlgorithm';
import type {
  PairingGroup,
  PairingWithPlayers,
  PairingPlayer,
  GeneratePairingsResult,
  CreatePairingsInput,
} from '@/types';
import type { Player } from '@/types/database.types';

// =====================================================
// SUPABASE QUERY RESPONSE TYPES
// =====================================================

/**
 * Raw pairing from Supabase query
 */
interface PairingQueryRow {
  id: string;
  round_id: string;
  player_ids: string[];
  tee_time: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Player lookup for enriching pairings
 */
interface PlayerLookup {
  [playerId: string]: {
    id: string;
    name: string;
    handicap: number | null;
    photoUrl: string | null;
  };
}

// =====================================================
// ERROR TYPES
// =====================================================

export interface PairingServiceError extends Error {
  code: 'NOT_FOUND' | 'DUPLICATE' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
}

/**
 * Creates a typed PairingServiceError
 */
function createError(
  message: string,
  code: PairingServiceError['code']
): PairingServiceError {
  const error = new Error(message) as PairingServiceError;
  error.code = code;
  return error;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert database Player to PairingPlayer format
 */
function toPlayerInfo(dbPlayer: Player): PairingPlayer {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    handicap: dbPlayer.handicap,
    photoUrl: dbPlayer.photo_url ?? null,
  };
}

/**
 * Enrich pairing rows with player details
 */
async function enrichPairingsWithPlayers(
  pairings: PairingQueryRow[]
): Promise<PairingWithPlayers[]> {
  if (pairings.length === 0) return [];

  // Collect all unique player IDs
  const allPlayerIds = new Set<string>();
  pairings.forEach((pairing) => {
    pairing.player_ids.forEach((id) => allPlayerIds.add(id));
  });

  // Fetch player details
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, handicap, photo_url')
    .in('id', Array.from(allPlayerIds));

  if (error) {
    console.error('[PairingService] Failed to fetch player details:', error);
    throw createError(`Failed to fetch player details: ${error.message}`, 'DATABASE');
  }

  // Create lookup map
  const playerLookup: PlayerLookup = {};
  ((players || []) as { id: string; name: string; handicap: number | null; photo_url: string | null }[]).forEach((player) => {
    playerLookup[player.id] = {
      id: player.id,
      name: player.name,
      handicap: player.handicap,
      photoUrl: player.photo_url,
    };
  });

  // Sort pairings by tee time and enrich with players
  const sortedPairings = [...pairings].sort((a, b) => {
    if (!a.tee_time && !b.tee_time) return 0;
    if (!a.tee_time) return 1;
    if (!b.tee_time) return -1;
    return a.tee_time.localeCompare(b.tee_time);
  });

  return sortedPairings.map((pairing, index) => ({
    id: pairing.id,
    roundId: pairing.round_id,
    playerIds: pairing.player_ids,
    teeTime: pairing.tee_time,
    slotIndex: index,
    createdAt: pairing.created_at,
    updatedAt: pairing.updated_at,
    players: pairing.player_ids
      .map((playerId) => playerLookup[playerId])
      .filter(Boolean),
  }));
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Get all pairings for a round with player details
 *
 * @param roundId - Round UUID
 * @returns Array of pairings with player details, sorted by tee time
 * @throws PairingServiceError if query fails
 *
 * @example
 * ```typescript
 * const pairings = await getPairingsForRound('round-123');
 * pairings.forEach(group => {
 *   console.log(`${group.teeTime}: ${group.players.map(p => p.name).join(', ')}`);
 * });
 * ```
 */
export async function getPairingsForRound(
  roundId: string
): Promise<PairingWithPlayers[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { data: pairings, error } = await supabase
    .from('pairings')
    .select('*')
    .eq('round_id', roundId)
    .order('tee_time', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[PairingService] Failed to fetch pairings:', error);
    throw createError(`Failed to fetch pairings: ${error.message}`, 'DATABASE');
  }

  return enrichPairingsWithPlayers((pairings as PairingQueryRow[]) || []);
}

/**
 * Create pairings for a round (batch insert)
 *
 * @param input - Round ID and array of groups with player IDs and tee times
 * @returns Created pairings with player details
 * @throws PairingServiceError if creation fails
 *
 * @example
 * ```typescript
 * const pairings = await createPairings({
 *   roundId: 'round-123',
 *   groups: [
 *     { playerIds: ['p1', 'p2', 'p3', 'p4'], teeTime: '07:00' },
 *     { playerIds: ['p5', 'p6', 'p7', 'p8'], teeTime: '07:08' },
 *   ],
 * });
 * ```
 */
export async function createPairings(
  input: CreatePairingsInput
): Promise<PairingWithPlayers[]> {
  const { roundId, groups } = input;

  // Validate input
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!groups || groups.length === 0) {
    throw createError('At least one group is required', 'VALIDATION');
  }

  // Validate each group
  groups.forEach((group, index) => {
    if (group.playerIds.length < 2) {
      throw createError(
        `Group ${index + 1} must have at least 2 players`,
        'VALIDATION'
      );
    }
    if (group.playerIds.length > 4) {
      throw createError(
        `Group ${index + 1} cannot have more than 4 players`,
        'VALIDATION'
      );
    }
  });

  // Check for duplicate player assignments
  const allPlayerIds = new Set<string>();
  groups.forEach((group) => {
    group.playerIds.forEach((playerId) => {
      if (allPlayerIds.has(playerId)) {
        throw createError(
          `Player ${playerId} is assigned to multiple groups`,
          'VALIDATION'
        );
      }
      allPlayerIds.add(playerId);
    });
  });

  // Prepare insert data
  const insertData = groups.map((group) => ({
    round_id: roundId,
    player_ids: group.playerIds,
    tee_time: group.teeTime,
  }));

  const { data: createdPairings, error } = await supabase
    .from('pairings')
    .insert(insertData as unknown as never)
    .select();

  if (error) {
    console.error('[PairingService] Failed to create pairings:', error);
    throw createError(`Failed to create pairings: ${error.message}`, 'DATABASE');
  }

  return enrichPairingsWithPlayers((createdPairings as PairingQueryRow[]) || []);
}

/**
 * Update a single pairing
 *
 * @param pairingId - Pairing UUID
 * @param data - Fields to update (playerIds, teeTime)
 * @returns Updated pairing with player details
 * @throws PairingServiceError if update fails
 */
export async function updatePairing(
  pairingId: string,
  data: { playerIds?: string[]; teeTime?: string | null }
): Promise<PairingWithPlayers> {
  if (!pairingId) {
    throw createError('Pairing ID is required', 'VALIDATION');
  }

  // Validate player count if updating
  if (data.playerIds !== undefined) {
    if (data.playerIds.length < 2) {
      throw createError('Pairing must have at least 2 players', 'VALIDATION');
    }
    if (data.playerIds.length > 4) {
      throw createError('Pairing cannot have more than 4 players', 'VALIDATION');
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (data.playerIds !== undefined) {
    updateData.player_ids = data.playerIds;
  }
  if (data.teeTime !== undefined) {
    updateData.tee_time = data.teeTime;
  }

  if (Object.keys(updateData).length === 0) {
    throw createError('No fields to update', 'VALIDATION');
  }

  const { data: updatedPairing, error } = await supabase
    .from('pairings')
    .update(updateData as unknown as never)
    .eq('id', pairingId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError(`Pairing not found: ${pairingId}`, 'NOT_FOUND');
    }
    console.error('[PairingService] Failed to update pairing:', error);
    throw createError(`Failed to update pairing: ${error.message}`, 'DATABASE');
  }

  const enriched = await enrichPairingsWithPlayers([updatedPairing as PairingQueryRow]);
  return enriched[0];
}

/**
 * Delete a single pairing
 *
 * @param pairingId - Pairing UUID
 * @throws PairingServiceError if deletion fails
 */
export async function deletePairing(pairingId: string): Promise<void> {
  if (!pairingId) {
    throw createError('Pairing ID is required', 'VALIDATION');
  }

  const { error } = await supabase
    .from('pairings')
    .delete()
    .eq('id', pairingId);

  if (error) {
    console.error('[PairingService] Failed to delete pairing:', error);
    throw createError(`Failed to delete pairing: ${error.message}`, 'DATABASE');
  }
}

/**
 * Delete all pairings for a round
 *
 * Useful when regenerating pairings or resetting round setup.
 *
 * @param roundId - Round UUID
 * @throws PairingServiceError if deletion fails
 *
 * @example
 * ```typescript
 * await deleteAllPairingsForRound('round-123');
 * // Now create new pairings
 * await createPairings({ roundId: 'round-123', groups: [...] });
 * ```
 */
export async function deleteAllPairingsForRound(roundId: string): Promise<void> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { error } = await supabase
    .from('pairings')
    .delete()
    .eq('round_id', roundId);

  if (error) {
    console.error('[PairingService] Failed to delete pairings:', error);
    throw createError(`Failed to delete pairings: ${error.message}`, 'DATABASE');
  }
}

/**
 * Auto-generate balanced pairings for a round
 *
 * Uses snake draft algorithm to create groups balanced by handicap.
 * Deletes existing pairings before creating new ones.
 *
 * @param roundId - Round UUID
 * @param playerIds - Array of player IDs to pair
 * @param options - Tee time configuration
 * @returns Generated pairings with player details
 * @throws PairingServiceError if generation fails
 *
 * @example
 * ```typescript
 * const pairings = await autoGeneratePairings(
 *   'round-123',
 *   ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
 *   { startTime: '07:00', intervalMinutes: 8, groupSize: 4 }
 * );
 * ```
 */
export async function autoGeneratePairings(
  roundId: string,
  playerIds: string[],
  options: {
    startTime: string;
    intervalMinutes: number;
    groupSize?: 2 | 3 | 4;
  }
): Promise<{ pairings: PairingWithPlayers[]; result: GeneratePairingsResult }> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!playerIds || playerIds.length < 2) {
    throw createError('At least 2 players required', 'VALIDATION');
  }

  // Fetch player details for handicap-based sorting
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, handicap, photo_url')
    .in('id', playerIds);

  if (playersError) {
    console.error('[PairingService] Failed to fetch players:', playersError);
    throw createError(`Failed to fetch players: ${playersError.message}`, 'DATABASE');
  }

  if (!players || players.length === 0) {
    throw createError('No valid players found', 'VALIDATION');
  }

  // Convert to PairingPlayer format
  const pairingPlayers: PairingPlayer[] = (players as { id: string; name: string; handicap: number | null; photo_url: string | null }[]).map((p) => ({
    id: p.id,
    name: p.name,
    handicap: p.handicap,
    photoUrl: p.photo_url,
  }));

  // Generate pairings using snake draft
  const result = generateSnakeDraftPairings({
    players: pairingPlayers,
    groupSize: options.groupSize || 4,
    startTime: options.startTime,
    intervalMinutes: options.intervalMinutes,
  });

  if (result.groups.length === 0) {
    throw createError('Failed to generate pairings', 'VALIDATION');
  }

  // Delete existing pairings
  await deleteAllPairingsForRound(roundId);

  // Create new pairings
  const pairings = await createPairings({
    roundId,
    groups: result.groups.map((g) => ({
      playerIds: g.playerIds,
      teeTime: g.teeTime,
    })),
  });

  return { pairings, result };
}

/**
 * Replace all pairings for a round with new groups
 *
 * Atomic operation that deletes existing pairings and creates new ones.
 *
 * @param roundId - Round UUID
 * @param groups - New pairing groups to create
 * @returns Created pairings with player details
 * @throws PairingServiceError if operation fails
 */
export async function replacePairings(
  roundId: string,
  groups: PairingGroup[]
): Promise<PairingWithPlayers[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!groups || groups.length === 0) {
    throw createError('At least one group is required', 'VALIDATION');
  }

  // Delete existing pairings
  await deleteAllPairingsForRound(roundId);

  // Create new pairings
  return createPairings({
    roundId,
    groups: groups.map((g) => ({
      playerIds: g.playerIds,
      teeTime: g.teeTime,
    })),
  });
}

/**
 * Update tee times for all pairings in a round
 *
 * Recalculates tee times based on new configuration.
 *
 * @param roundId - Round UUID
 * @param startTime - New start time
 * @param intervalMinutes - New interval between groups
 * @returns Updated pairings
 * @throws PairingServiceError if operation fails
 */
export async function updatePairingTeeTimes(
  roundId: string,
  startTime: string,
  intervalMinutes: number
): Promise<PairingWithPlayers[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  // Fetch current pairings
  const currentPairings = await getPairingsForRound(roundId);

  if (currentPairings.length === 0) {
    return [];
  }

  // Convert to PairingGroup format and recalculate tee times
  const groups: PairingGroup[] = currentPairings.map((p, index) => ({
    id: p.id,
    playerIds: p.playerIds,
    teeTime: p.teeTime,
    slotIndex: index,
  }));

  const updatedGroups = recalculateTeeTimes(groups, startTime, intervalMinutes);

  // Update each pairing's tee time
  const updatePromises = updatedGroups.map((group) =>
    group.id
      ? updatePairing(group.id, { teeTime: group.teeTime })
      : Promise.resolve(null)
  );

  await Promise.all(updatePromises);

  // Return refreshed pairings
  return getPairingsForRound(roundId);
}

/**
 * Check if a round has any pairings
 *
 * @param roundId - Round UUID
 * @returns True if round has pairings
 */
export async function roundHasPairings(roundId: string): Promise<boolean> {
  if (!roundId) return false;

  const { count, error } = await supabase
    .from('pairings')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId);

  if (error) {
    console.error('[PairingService] Failed to check pairings:', error);
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Get the pairing a specific player is in for a round
 *
 * @param roundId - Round UUID
 * @param playerId - Player UUID
 * @returns Pairing with player details, or null if player is not in any pairing
 */
export async function getPlayerPairing(
  roundId: string,
  playerId: string
): Promise<PairingWithPlayers | null> {
  if (!roundId || !playerId) return null;

  const { data: pairings, error } = await supabase
    .from('pairings')
    .select('*')
    .eq('round_id', roundId)
    .contains('player_ids', [playerId]);

  if (error || !pairings || pairings.length === 0) {
    return null;
  }

  const enriched = await enrichPairingsWithPlayers([pairings[0] as PairingQueryRow]);
  return enriched[0] || null;
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Pairing service with all CRUD operations
 */
export const pairingService = {
  getPairingsForRound,
  createPairings,
  updatePairing,
  deletePairing,
  deleteAllPairingsForRound,
  autoGeneratePairings,
  replacePairings,
  updatePairingTeeTimes,
  roundHasPairings,
  getPlayerPairing,
};

export default pairingService;
