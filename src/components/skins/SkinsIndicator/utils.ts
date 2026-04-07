/**
 * Utility functions and types for SkinsIndicator sub-components
 */

import type {
  SkinsResultWithWinner,
  SkinsParticipant,
  SkinsTeamParticipant,
  SkinsResult,
} from '@/types/database/skins.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ParticipantTotal {
  id: string;
  name: string;
  holesWon: number;
  totalWinnings: number;
  /** For team skins, number of members for display */
  memberCount?: number;
}

export interface LastWinnerInfo {
  name: string;
  hole: number;
  amount: number;
  isTeam: boolean;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Calculate player totals from skins results (individual skins)
 */
export function calculatePlayerTotals(
  results: SkinsResultWithWinner[],
  participants: SkinsParticipant[]
): ParticipantTotal[] {
  // Initialize totals for all participants
  const totalsMap = new Map<string, ParticipantTotal>();
  participants.forEach((p) => {
    totalsMap.set(p.id, {
      id: p.id,
      name: p.name,
      holesWon: 0,
      totalWinnings: 0,
    });
  });

  // Accumulate winnings from results
  results.forEach((result) => {
    if (!result.is_carryover && result.winner_id && result.payout_amount > 0) {
      const playerTotal = totalsMap.get(result.winner_id);
      if (playerTotal) {
        playerTotal.holesWon += 1;
        playerTotal.totalWinnings += result.payout_amount;
      }
    }
  });

  // Convert to array and sort by total winnings descending
  return Array.from(totalsMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
}

/**
 * Calculate team totals from skins results (team skins)
 */
export function calculateTeamTotals(
  results: (SkinsResult & { team_winner?: { id: string; name: string } | null })[],
  teams: SkinsTeamParticipant[]
): ParticipantTotal[] {
  // Initialize totals for all teams
  const totalsMap = new Map<string, ParticipantTotal>();
  teams.forEach((t) => {
    totalsMap.set(t.id, {
      id: t.id,
      name: t.name,
      holesWon: 0,
      totalWinnings: 0,
      memberCount: t.members?.length ?? 0,
    });
  });

  // Accumulate winnings from results
  results.forEach((result) => {
    if (!result.is_carryover && result.payout_amount > 0) {
      // Get team winner ID from either team_winner object or team_winner_id field
      const teamWinnerId = result.team_winner?.id ?? result.team_winner_id;
      if (teamWinnerId) {
        const teamTotal = totalsMap.get(teamWinnerId);
        if (teamTotal) {
          teamTotal.holesWon += 1;
          teamTotal.totalWinnings += result.payout_amount;
        }
      }
    }
  });

  // Convert to array and sort by total winnings descending
  return Array.from(totalsMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
}
