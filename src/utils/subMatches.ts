import type { SubMatch } from '@/types';

/**
 * Resolve the two players for the logged-in user's individual match-play
 * sub-match.
 *
 * Split match-play rounds store each head-to-head in `sub_matches` (one
 * player per side for 1v1). The scoring screen needs to open the current
 * user's own match — not the first two players in the round — so we find
 * the sub-match the user belongs to and return `{ player1Id, player2Id }`
 * with the user first and their opponent second.
 *
 * Returns `null` when there's nothing to resolve (no sub-matches, no user,
 * the user isn't in any sub-match, or a side is empty), so callers can fall
 * back to their existing behaviour.
 */
export function resolveSubMatchForUser(
  subMatches: SubMatch[] | undefined,
  currentUserId: string | undefined
): { player1Id: string; player2Id: string } | null {
  if (!subMatches?.length || !currentUserId) return null;

  for (const sm of subMatches) {
    const inTeamA = sm.team_a_player_ids.includes(currentUserId);
    const inTeamB = sm.team_b_player_ids.includes(currentUserId);
    if (!inTeamA && !inTeamB) continue;

    const opponentId = inTeamA ? sm.team_b_player_ids[0] : sm.team_a_player_ids[0];
    if (!opponentId) return null;

    return { player1Id: currentUserId, player2Id: opponentId };
  }

  return null;
}
