/**
 * Players API helpers.
 */

import { supabase } from '@/services/supabase/client';

/** Minimal player row used across skins/wolf participant lookups. */
export interface PlayerLite {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Fetch `{ id, name, handicap }` for a set of player ids, returned as a Map
 * keyed by id. Deduplicates ids and short-circuits on an empty list.
 *
 * Errors are logged and swallowed (returning whatever rows came back, possibly
 * an empty Map) rather than thrown — callers in skins/wolf payout flows rely on
 * proceeding with the available players, falling back to "Unknown" names, so
 * this must never reject.
 */
export async function fetchPlayersByIds(
  ids: string[]
): Promise<Map<string, PlayerLite>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
  const { data, error } = await (supabase.from('players') as any)
    .select('id, name, handicap')
    .in('id', uniqueIds);

  if (error) {
    console.error('[fetchPlayersByIds] Failed to fetch players:', error);
  }

  const rows = (data ?? []) as PlayerLite[];
  return new Map(
    rows.map((p) => [p.id, { id: p.id, name: p.name, handicap: p.handicap }])
  );
}

/**
 * Convenience wrapper returning the players as an array (Map insertion order,
 * i.e. the DB return order) for callers that need a participants list rather
 * than a lookup Map.
 */
export async function fetchPlayerListByIds(ids: string[]): Promise<PlayerLite[]> {
  return [...(await fetchPlayersByIds(ids)).values()];
}
