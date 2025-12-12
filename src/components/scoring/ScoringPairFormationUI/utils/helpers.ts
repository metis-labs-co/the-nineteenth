/**
 * Helper functions for ScoringPairFormationUI
 */

import type { Player, ScoringPairWithPlayers } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { CoverageQuality } from '../types';

/**
 * Get initials for avatar fallback
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Convert ScoringPairWithPlayers to ScoringPairCreateInput
 */
export const pairsToInputFormat = (pairs: ScoringPairWithPlayers[]): ScoringPairCreateInput[] => {
  return pairs.map((pair) => ({
    scorerId: pair.scorer_id,
    playerId: pair.player_id,
  }));
};

/**
 * Check coverage quality based on player count
 */
export const getCoverageQuality = (
  coveredCount: number,
  totalCount: number
): CoverageQuality => {
  if (coveredCount === totalCount) return 'good';
  if (coveredCount >= totalCount / 2) return 'warning';
  return 'error';
};

/**
 * Get player by ID from players array
 */
export const getPlayerById = (players: Player[], playerId: string): Player | undefined => {
  return players.find((p) => p.id === playerId);
};

/**
 * Build the circular chain flow from pairs
 * Returns ordered list of player IDs representing the chain: A→B→C→...→A
 */
export const buildCircularChainOrder = (
  pairs: ScoringPairCreateInput[],
  players: Player[]
): Player[] => {
  if (pairs.length === 0 || players.length === 0) return [];

  // Build adjacency map: scorerId -> playerId
  const scorerToPlayer = new Map<string, string>();
  for (const pair of pairs) {
    scorerToPlayer.set(pair.scorerId, pair.playerId);
  }

  // Start from first player and follow the chain
  const orderedPlayers: Player[] = [];
  const startPlayer = players[0];
  let currentId = startPlayer.id;
  const visited = new Set<string>();

  while (!visited.has(currentId) && orderedPlayers.length < players.length) {
    visited.add(currentId);
    const player = getPlayerById(players, currentId);
    if (player) {
      orderedPlayers.push(player);
    }
    const nextId = scorerToPlayer.get(currentId);
    if (!nextId) break;
    currentId = nextId;
  }

  return orderedPlayers;
};
