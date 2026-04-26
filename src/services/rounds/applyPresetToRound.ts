/**
 * applyPresetToRound
 *
 * Atomic write path for "switch this round to preset X". Writes the six
 * format fields (game_type, is_team_round, team_format, round_format,
 * sub_match_size, rules_override) in one update and, when the target
 * preset is split, also replaces the round's sub-matches.
 *
 * Sub-match generation (pairing players into 1v1 / 2v2 etc. groups) lives
 * in the caller — it needs team rosters, tee time and interval that this
 * service shouldn't have to know about. The caller passes the generated
 * list via `subMatches`; this service just persists it via the existing
 * `replaceSubMatches` path that `RoundFormatSheet` has been using.
 */

import { supabase } from '@/services/supabase/client';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import {
  deleteAllSubMatchesForRound,
  replaceSubMatches,
  type SubMatchInput,
} from '@/services/subMatches';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import {
  getRoundPreset,
  type RoundPresetId,
} from '@/constants/roundPresets';
import type { RoundFormat } from '@/types/database.types';

export interface ApplyPresetInput {
  roundId: string;
  presetId: RoundPresetId;
  /**
   * The round's `round_format` BEFORE this write. Used to decide whether
   * existing sub-matches need to be deleted when the new preset is
   * combined. Defaults to 'combined' so callers that know the round is
   * fresh can omit it.
   */
  currentRoundFormat?: RoundFormat;
  /**
   * Required when the target preset's config is split — the sub-matches
   * to write. Caller is responsible for generating the list (see
   * `generateSubMatches` in utils/pairingAlgorithm) from team rosters.
   * If the target preset is combined, this field is ignored.
   */
  subMatches?: SubMatchInput[];
}

export class ApplyPresetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplyPresetError';
  }
}

export async function applyPresetToRound(input: ApplyPresetInput): Promise<void> {
  const { roundId, presetId, currentRoundFormat = 'combined', subMatches } = input;
  const preset = getRoundPreset(presetId);
  const config = preset.config;

  // Guard: TEAM split presets need a non-empty sub-matches list (the caller
  // generates them from team rosters). Singles split (e.g. individual_match_play)
  // legitimately starts empty — the organiser pairs them via EditPairingConfigSheet.
  if (
    config.round_format === 'split' &&
    config.is_team_round &&
    (!subMatches || subMatches.length === 0)
  ) {
    throw new ApplyPresetError(
      `Preset "${presetId}" is a team split format but no sub-matches were provided`
    );
  }

  // 1. Write the six fields atomically. `updateRound`'s types are loose
  // (any-cast for supabase) so the extra fields beyond its declared
  // signature go through fine.
  await updateRound(roundId, {
    game_type: config.game_type,
    is_team_round: config.is_team_round,
    team_format: config.team_format,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema not regenerated for these columns
    round_format: config.round_format,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub_match_size: config.sub_match_size,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rules_override: config.rules_override,
  } as never);

  // 2. Reconcile sub-matches.
  if (config.round_format === 'split' && subMatches && subMatches.length > 0) {
    await replaceSubMatches({ roundId, subMatches });
  } else if (config.round_format === 'split' && !config.is_team_round) {
    // Singles split: clear any existing (likely team-vs-team) sub_matches so
    // the round starts from a clean slate. Organiser then sets up pairings
    // via EditPairingConfigSheet.
    await deleteAllSubMatchesForRound(roundId);
  } else if (currentRoundFormat === 'split' && config.round_format !== 'split') {
    // Transitioning split → combined: existing sub-matches are dead weight.
    await deleteAllSubMatchesForRound(roundId);
  }

  // 3. If the round was already finalized, its `round_results` rows hold
  // `competition_points` computed from the OLD rules. Recompute them so the
  // competition leaderboard reflects the new preset. No existing rows means
  // the round hasn't been finalized yet — the next scorecard submission will
  // pick up the new rules_override naturally, so nothing to do.
  const { data: existingResults } = await supabase
    .from('round_results')
    .select('id')
    .eq('round_id', roundId)
    .limit(1);

  if (existingResults && existingResults.length > 0) {
    await refinalizeRoundResults(roundId);
  }
}
