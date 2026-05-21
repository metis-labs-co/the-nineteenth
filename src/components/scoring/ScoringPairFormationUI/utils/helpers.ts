/**
 * Helper functions for ScoringPairFormationUI
 */

import type { Player, ScoringPairWithPlayers } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { ColorPalette } from '@/constants/theme';
import { getTeamColorHex } from '@/utils/teamColor';
import type { CoverageQuality } from '../types';

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
 * Resolve a team slot to a tint colour for player chips / pair cards.
 * Prefers the team's stored avatar palette colour; falls back to a
 * legacy index-based theme cycle when no colour is stored (e.g. for
 * ad-hoc teams or any unmigrated row).
 *
 * Returns `null` only when both `colorId` is missing AND `teamIndex`
 * is invalid, so the caller can fall back to untinted styling.
 */
export const getTeamColor = (
  colorId: string | null | undefined,
  teamIndex: number | undefined,
  colors: ColorPalette
): string | null => {
  const hasValidIndex =
    typeof teamIndex === 'number' &&
    Number.isFinite(teamIndex) &&
    teamIndex >= 0;
  if (!colorId && !hasValidIndex) {
    return null;
  }
  return getTeamColorHex(colorId, hasValidIndex ? teamIndex : 0, colors);
};

/**
 * A logical scoring pair for display purposes. Reciprocal rows
 * (A→B and B→A) collapse into a single entry with `reciprocal: true`
 * so the UI can render one card per relationship instead of two.
 */
export interface GroupedPair {
  scorerId: string;
  playerId: string;
  /** True when the inverse direction (playerId→scorerId) also exists
   *  in the source pair list — i.e. A and B score each other. */
  reciprocal: boolean;
}

/**
 * Collapse reciprocal rows into single logical pairs.
 *
 * Input: directed pair rows (A→B, B→A, C→D, D→C).
 * Output: logical pairs ([{A,B,true}, {C,D,true}]) — one card per
 *   relationship so "8 players reciprocal" renders as 4 cards, not 8.
 *
 * Directional-only rows (part of a circular chain A→B→C→A) stay as
 * individual entries with `reciprocal: false`.
 */
export const groupScoringPairs = (
  pairs: ScoringPairCreateInput[]
): GroupedPair[] => {
  const grouped: GroupedPair[] = [];
  const seen = new Set<string>();
  const key = (a: string, b: string) => `${a}|${b}`;
  const reverseKey = (a: string, b: string) => key(b, a);
  const pairKeys = new Set(pairs.map((p) => key(p.scorerId, p.playerId)));

  for (const pair of pairs) {
    const forward = key(pair.scorerId, pair.playerId);
    const reverse = reverseKey(pair.scorerId, pair.playerId);
    if (seen.has(forward) || seen.has(reverse)) continue;

    const isReciprocal = pairKeys.has(reverse);
    grouped.push({
      scorerId: pair.scorerId,
      playerId: pair.playerId,
      reciprocal: isReciprocal,
    });

    seen.add(forward);
    if (isReciprocal) seen.add(reverse);
  }

  return grouped;
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
