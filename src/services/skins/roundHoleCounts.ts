/**
 * The hole counts a round's skins games are priced and settled over, read
 * from the round row. Used by per-hole processing (hole value = pot /
 * planned holes), by settlement (finalizeSkinsGame, finalizeSkinsForSubMatch)
 * and by useSkinsHoleCounts.
 *
 * Part A reads nine_type only; B1b adds holes_played to the select once the
 * column exists.
 */

import { supabase } from '@/services/supabase/client';
import { createError } from '@/services/errors';
import { getSkinsHoleCounts, type SkinsHoleCounts } from '@/utils/skins/holeCounts';
import type { NineType } from '@/types/database/enums';

/**
 * @returns Planned / played hole counts. A round row hidden by RLS (no data,
 *   no error) keeps the 18-hole default; a query error throws so money is
 *   never settled on a guessed hole count.
 */
export async function fetchSkinsHoleCounts(roundId: string): Promise<SkinsHoleCounts> {
  const { data, error } = (await supabase
    .from('rounds')
    .select('nine_type')
    .eq('id', roundId)
    .maybeSingle()) as unknown as {
    data: { nine_type?: NineType | null } | null;
    error: { message: string } | null;
  };

  if (error) {
    throw createError(`Failed to load round for skins pricing: ${error.message}`, 'DATABASE');
  }

  return getSkinsHoleCounts(data);
}
