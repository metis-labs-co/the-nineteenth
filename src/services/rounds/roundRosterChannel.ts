/**
 * Broadcast pings for roster changes on a social round. The payload carries
 * only the event name; receivers re-read the roster under their own RLS.
 * Postgres-changes can't be used: on RLS tables DELETE payloads carry only the
 * primary key, and a removed player loses SELECT on round_players.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

export type RoundEvent = 'roster_changed' | 'round_deleted';

const channels = new Map<string, RealtimeChannel>();

export const roundChannelName = (roundId: string) => `round:${roundId}`;

export function registerRoundChannel(roundId: string, channel: RealtimeChannel): () => void {
  channels.set(roundId, channel);
  return () => {
    if (channels.get(roundId) === channel) channels.delete(roundId);
  };
}

export async function sendRoundEvent(roundId: string, event: RoundEvent): Promise<void> {
  const channel = channels.get(roundId);
  if (!channel) return;
  try {
    await channel.send({ type: 'broadcast', event, payload: {} });
  } catch {
    // Best effort: peers also reconcile on focus and on upload failure.
  }
}
