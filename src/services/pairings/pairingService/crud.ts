/**
 * Pairing Service - CRUD Operations
 *
 * Core create, read, update, delete operations for pairings.
 */

import { supabase } from '@/services/supabase/client';
import type {
  PairingWithPlayers,
  CreatePairingsInput,
} from '@/types';
import { createModuleLogger } from '@/utils/debugLogger';
import type { PairingQueryRow } from './types';
import { createError } from '@/services/errors';
import { enrichPairingsWithPlayers } from './helpers';

const logger = createModuleLogger('PairingService');

/**
 * Get all pairings for a round with player details
 *
 * @param roundId - Round UUID
 * @returns Array of pairings with player details, sorted by tee time
 * @throws PairingServiceError if query fails
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
    logger.error('Failed to fetch pairings', error);
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
    logger.error('Failed to create pairings', error);
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
    logger.error('Failed to update pairing', error);
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
    logger.error('Failed to delete pairing', error);
    throw createError(`Failed to delete pairing: ${error.message}`, 'DATABASE');
  }
}

/**
 * Delete all pairings for a round
 *
 * @param roundId - Round UUID
 * @throws PairingServiceError if deletion fails
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
    logger.error('Failed to delete pairings', error);
    throw createError(`Failed to delete pairings: ${error.message}`, 'DATABASE');
  }
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
    logger.error('Failed to check pairings', error);
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
