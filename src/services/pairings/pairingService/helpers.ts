/**
 * Pairing Service - Helper Functions
 *
 * Shared utilities for enriching pairings with player data.
 */

import { supabase } from '@/services/supabase/client';
import type { PairingWithPlayers, PairingPlayer } from '@/types';
import type { Player } from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';
import type { PairingQueryRow, PlayerLookup } from './types';
import { createError } from './types';

const logger = createModuleLogger('PairingService');

/**
 * Convert database Player to PairingPlayer format
 */
export function _toPlayerInfo(dbPlayer: Player): PairingPlayer {
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
export async function enrichPairingsWithPlayers(
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
    logger.error('Failed to fetch player details', error);
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
