/**
 * Client side of mid-round roster edits on a social round.
 * Server first (owner-only RPCs), then this device's store + SQLite.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2
 */

import { supabase } from '@/services/supabase/client';
import { removePendingSyncByEntityKey } from '@/services/offline/database';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { useScorecardStore } from '@/store/scorecardStore';
import { cancelPendingScorecardSync, debouncedQueueScorecardSync } from '@/store/scorecardSyncDebounce';
import { COMPETITION_PLAYERS_SELECT, type SupabaseCompetitionPlayerData } from '@/types/supabase/roundQueries';
import { getDisplayName } from '@/utils/displayHelpers';
import { syncLogger } from '@/utils/debugLogger';
import type { Player } from '@/types';

export class RoundRosterError extends Error {
  constructor(message: string, readonly hint: string | null = null) {
    super(message);
    this.name = 'RoundRosterError';
  }
}

export interface RoundRosterSnapshot {
  round: { id: string; userId: string; deletedAt: string | null } | null;
  players: Player[];
}

/** Mirrors useRoundPlayers' mapping (keep in step). email/phone are private columns. */
export function rowToPlayer(row: SupabaseCompetitionPlayerData): Player | null {
  const p = row.players;
  if (!p) return null;
  return {
    id: p.id,
    name: getDisplayName(p.name, 'Unknown'),
    email: '',
    phone: null,
    handicap: p.handicap || 0,
    handicapIndex: p.handicap_index ?? null,
    gender: p.gender ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Same select and (no) status filter as useRoundPlayers. Throws on error. */
export async function fetchRoundRoster(roundId: string): Promise<RoundRosterSnapshot> {
  const [roundRes, playersRes] = await Promise.all([
    supabase.from('rounds').select('id, user_id, deleted_at').eq('id', roundId).maybeSingle(),
    supabase.from('round_players').select(COMPETITION_PLAYERS_SELECT).eq('round_id', roundId),
  ]);
  if (roundRes.error) throw new RoundRosterError(roundRes.error.message);
  if (playersRes.error) throw new RoundRosterError(playersRes.error.message);
  const round = roundRes.data as { id: string; user_id: string; deleted_at: string | null } | null;
  return {
    round: round ? { id: round.id, userId: round.user_id, deletedAt: round.deleted_at } : null,
    players: ((playersRes.data ?? []) as SupabaseCompetitionPlayerData[])
      .map(rowToPlayer)
      .filter((p): p is Player => p !== null),
  };
}

function rpcError(error: { message: string; hint?: string | null }): RoundRosterError {
  return new RoundRosterError(error.message, error.hint ?? null);
}

export async function addPlayerToRound(roundId: string, playerId: string): Promise<Player> {
  return withRoundScoringWrite(roundId, async () => {
    const { error } = await supabase.rpc('add_round_player' as never, {
      p_round_id: roundId,
      p_player_id: playerId,
    } as never);
    if (error) throw rpcError(error);

    const roster = await fetchRoundRoster(roundId);
    const player = roster.players.find((p) => p.id === playerId);
    if (!player) throw new RoundRosterError('Player was added but could not be loaded');
    // Idempotent backfill; not team-specific despite its name.
    await useScorecardStore.getState().ensureTeamMemberScorecards([player]);
    return player;
  });
}

export async function removePlayerFromRound(roundId: string, playerId: string): Promise<void> {
  return withRoundScoringWrite(roundId, async () => {
    const card = useScorecardStore.getState().groupScorecards.get(playerId);
    const hadPending = card ? cancelPendingScorecardSync(card.id) : false;

    const { error } = await supabase.rpc('remove_round_player' as never, {
      p_round_id: roundId,
      p_player_id: playerId,
    } as never);
    if (error) {
      if (card && hadPending) {
        debouncedQueueScorecardSync(card.id, () => useScorecardStore.getState().groupScorecards.get(playerId));
      }
      throw rpcError(error);
    }

    // The server removal stands; a local cleanup failure is fixed by the next reconcile.
    try {
      await removePendingSyncByEntityKey(`scorecard:${roundId}:${playerId}`);
      await useScorecardStore.getState().removePlayerFromRound(playerId);
    } catch (cleanupError) {
      syncLogger.error('Remove player: local cleanup failed', cleanupError, { roundId, playerId });
    }
  });
}
