/**
 * useSkinsResultRows Hook
 *
 * Computes all derived data for the SkinsResultsCard:
 * - Per-hole value calculation
 * - Results map for quick lookup
 * - Front 9 / Back 9 subtotals
 * - Unsettled carryover detection
 * - Participant totals (players or teams)
 * - Full row data array for FlatList rendering
 */

import { useMemo } from 'react';
import {
  calculateHoleValue,
  calculateTotalPot,
} from '@/utils/skins';
import type {
  SkinsResultWithWinner,
  SkinsResult,
  SkinsPotType,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database';
import type { ParticipantTotal, ResultRow } from '../types';

interface UseSkinsResultRowsParams {
  results: SkinsResultWithWinner[];
  potType: SkinsPotType;
  potValue: number;
  participants?: SkinsParticipant[];
  isTeamSkins: boolean;
  teams?: SkinsTeamParticipant[];
}

export function useSkinsResultRows({
  results,
  potType,
  potValue,
  participants,
  isTeamSkins,
  teams,
}: UseSkinsResultRowsParams) {
  // Calculate values
  const perHoleValue = useMemo(
    () => calculateHoleValue(potType, potValue),
    [potType, potValue]
  );
  const _totalPot = useMemo(
    () => calculateTotalPot(potType, potValue),
    [potType, potValue]
  );

  // Create a map of hole number -> result for quick lookup
  const resultsMap = useMemo(() => {
    const map = new Map<number, SkinsResultWithWinner>();
    results.forEach((r) => map.set(r.hole_number, r));
    return map;
  }, [results]);

  // Calculate front 9 and back 9 totals
  const { front9Total, back9Total, unsettledCarryover } = useMemo(() => {
    let front = 0;
    let back = 0;
    let carryover = 0;

    // Sum up payouts by hole range
    results.forEach((r) => {
      if (r.hole_number <= 9) {
        front += r.payout_amount;
      } else {
        back += r.payout_amount;
      }
    });

    // Check for unsettled carryover (carryover remaining after hole 18)
    const hole18Result = resultsMap.get(18);
    if (hole18Result && hole18Result.is_carryover) {
      carryover = hole18Result.carryover_to_next;
    }

    return { front9Total: front, back9Total: back, unsettledCarryover: carryover };
  }, [results, resultsMap]);

  // Calculate participant totals (players or teams)
  const participantTotals = useMemo<ParticipantTotal[]>(() => {
    const totalsMap = new Map<string, ParticipantTotal>();

    if (isTeamSkins && teams) {
      // Team skins - initialize all teams
      teams.forEach((t) => {
        totalsMap.set(t.id, {
          id: t.id,
          name: t.name,
          holesWon: 0,
          totalWinnings: 0,
          memberCount: t.members?.length ?? 0,
        });
      });

      // Accumulate winnings from results using team_winner_id
      results.forEach((result) => {
        const skinsResult = result as SkinsResult;
        if (!skinsResult.is_carryover && skinsResult.team_winner_id && skinsResult.payout_amount > 0) {
          const existing = totalsMap.get(skinsResult.team_winner_id);
          if (existing) {
            existing.holesWon += 1;
            existing.totalWinnings += skinsResult.payout_amount;
          }
        }
      });
    } else {
      // Individual skins - initialize all players
      if (participants) {
        participants.forEach((p) => {
          totalsMap.set(p.id, {
            id: p.id,
            name: p.name,
            holesWon: 0,
            totalWinnings: 0,
          });
        });
      }

      // Accumulate winnings from results
      results.forEach((result) => {
        if (!result.is_carryover && result.winner_id && result.winner && result.payout_amount > 0) {
          const existing = totalsMap.get(result.winner_id);
          if (existing) {
            existing.holesWon += 1;
            existing.totalWinnings += result.payout_amount;
          } else {
            // Winner not in participants list (or no participants provided)
            totalsMap.set(result.winner_id, {
              id: result.winner_id,
              name: result.winner.name,
              holesWon: 1,
              totalWinnings: result.payout_amount,
            });
          }
        }
      });
    }

    // Convert to array and sort by total winnings descending
    return Array.from(totalsMap.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);
  }, [results, participants, isTeamSkins, teams]);

  // Build row data for FlatList
  const rowData = useMemo<ResultRow[]>(() => {
    const rows: ResultRow[] = [];

    // Header row
    rows.push({ type: 'header' });

    // Holes 1-9
    for (let hole = 1; hole <= 9; hole++) {
      const result = resultsMap.get(hole);
      if (result) {
        rows.push({ type: 'hole', result });
      } else {
        // Create placeholder for holes not yet played
        rows.push({
          type: 'hole',
          result: {
            id: `placeholder-${hole}`,
            skins_game_id: '',
            hole_number: hole,
            winner_id: null,
            is_carryover: false,
            hole_scores: {},
            hole_pot_value: perHoleValue,
            carryover_to_next: 0,
            payout_amount: 0,
            calculated_at: '',
            winner: null,
          } as SkinsResultWithWinner,
        });
      }
    }

    // Front 9 subtotal
    rows.push({
      type: 'subtotal',
      label: 'FRONT 9',
      value: front9Total,
      holeRange: '1-9',
    });

    // Holes 10-18
    for (let hole = 10; hole <= 18; hole++) {
      const result = resultsMap.get(hole);
      if (result) {
        rows.push({ type: 'hole', result });
      } else {
        // Create placeholder for holes not yet played
        rows.push({
          type: 'hole',
          result: {
            id: `placeholder-${hole}`,
            skins_game_id: '',
            hole_number: hole,
            winner_id: null,
            is_carryover: false,
            hole_scores: {},
            hole_pot_value: perHoleValue,
            carryover_to_next: 0,
            payout_amount: 0,
            calculated_at: '',
            winner: null,
          } as SkinsResultWithWinner,
        });
      }
    }

    // Back 9 subtotal
    rows.push({
      type: 'subtotal',
      label: 'BACK 9',
      value: back9Total,
      holeRange: '10-18',
    });

    // Total row
    rows.push({
      type: 'total',
      value: front9Total + back9Total,
      unsettledCarryover,
    });

    // Participant totals row (players or teams)
    if (participantTotals.length > 0) {
      rows.push({
        type: 'participantTotals',
        totals: participantTotals,
        isTeamSkins,
      });
    }

    return rows;
  }, [resultsMap, perHoleValue, front9Total, back9Total, unsettledCarryover, participantTotals, isTeamSkins]);

  return {
    perHoleValue,
    rowData,
  };
}
