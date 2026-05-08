/**
 * Round Row Updates
 *
 * Thin Supabase update wrapper for partial `rounds` row writes. Used by every
 * "edit one field" sheet in the round detail surface (date/time, tee, course,
 * matchup, name, pairing config, etc.) — every consumer should import from
 * here so we have one place to extend the allowed-field list.
 */

import { supabase } from '@/services/supabase/client';
import type {
  GameType,
  TeamFormat,
  TeeBox,
} from '@/types/database.types';
import type {
  BracketSeedingStyle,
  NineType,
  PairingSource,
  QualifyingMetric,
} from '@/types/database/enums';

export interface UpdateRoundFields {
  date?: string;
  tee_time?: string | null;
  game_type?: GameType;
  selected_tee?: TeeBox | null;
  scoring_pairs_required?: boolean;
  course_id?: string | null;
  is_team_round?: boolean;
  team_format?: TeamFormat | null;
  // Pairing config — set when EditPairingConfigSheet saves changes. Style and
  // metric must be NULL when source = 'manual' (DB-enforced consistency
  // check); the sheet guards this at the call site.
  pairing_source?: PairingSource;
  pairing_style?: BracketSeedingStyle | null;
  pairing_metric?: QualifyingMetric | null;
  name?: string | null;
  // Hole count for standalone rounds. Editable mid-round via
  // EditNineTypeSheet so users can extend or shorten a round in flight.
  nine_type?: NineType;
}

/**
 * Update one or more columns on a round row. Throws on Supabase error.
 *
 * Cache invalidation is the caller's responsibility — typically:
 *   queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) })
 */
export async function updateRound(
  roundId: string,
  updates: UpdateRoundFields
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types lag the schema; the field set above is the source of truth.
  const { error } = await (supabase as any)
    .from('rounds')
    .update(updates)
    .eq('id', roundId);

  if (error) {
    throw new Error(`Failed to update round: ${error.message}`);
  }
}
