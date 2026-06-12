/**
 * Player-count validation for standalone round presets.
 * partnerCount EXCLUDES the organiser; totals include them.
 */
import { ROUND_PRESETS, type RoundPresetId } from '@/constants/roundPresets';

export interface PlayerCountCheck {
  ok: boolean;
  required: { minPlayers: number; maxPlayers: number };
  totalPlayers: number;
  /** Human message when not ok, null when ok. */
  message: string | null;
}

export function checkPresetPlayerCount(
  presetId: RoundPresetId,
  partnerCount: number
): PlayerCountCheck {
  const preset = ROUND_PRESETS[presetId];
  const required = preset.standalone ?? { minPlayers: 1, maxPlayers: 4 };
  const totalPlayers = partnerCount + 1;

  if (totalPlayers < required.minPlayers) {
    const missing = required.minPlayers - totalPlayers;
    return {
      ok: false,
      required,
      totalPlayers,
      message: `${preset.shortTitle} needs at least ${required.minPlayers} players — add ${missing} more`,
    };
  }
  if (totalPlayers > required.maxPlayers) {
    return {
      ok: false,
      required,
      totalPlayers,
      message: `${preset.shortTitle} allows at most ${required.maxPlayers} players`,
    };
  }
  return { ok: true, required, totalPlayers, message: null };
}
