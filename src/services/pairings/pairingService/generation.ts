/**
 * Pairing Service - Generation Operations
 *
 * Auto-generate pairings, replace pairings, and update tee times.
 */

import { supabase } from '@/services/supabase/client';
import { createModuleLogger } from '@/utils/debugLogger';
import { generateSnakeDraftPairings, recalculateTeeTimes } from '@/utils/pairingAlgorithm';
import type {
  PairingGroup,
  PairingWithPlayers,
  PairingPlayer,
  GeneratePairingsResult,
} from '@/types';
import { createError } from '@/services/errors';
import {
  getPairingsForRound,
  createPairings,
  updatePairing,
  deleteAllPairingsForRound,
} from './crud';

const logger = createModuleLogger('PairingService');

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
    logger.error('Failed to fetch players', playersError);
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
