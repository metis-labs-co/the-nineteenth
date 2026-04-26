/**
 * Types for AddRoundScreen
 */

import type { TeamWithMembers, TeeBox } from '@/types/database.types';
import type { RootStackScreenProps } from '@/navigation/types';
import type { RoundPresetId } from '@/constants/roundPresets';
import type { SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type {
  BracketSeedingStyle,
  PairingSource,
  QualifyingMetric,
} from '@/types/database/enums';

/**
 * Form data for adding a new round.
 *
 * The round's "format" is represented by a single `presetId` from
 * `ROUND_PRESETS`, which resolves to the six format columns (game_type,
 * is_team_round, team_format, round_format, sub_match_size, rules_override)
 * at write time. This mirrors the View Round screen's RoundTypeSheet.
 */
export interface RoundFormData {
  courseId: string;
  courseName: string;
  courseTees: TeeBox[]; // Available tees for selected course
  selectedTee: TeeBox | null; // Selected tee (with slope/course ratings for daily handicap)
  date: string;
  teeTime: string;
  /** Canonical round preset id (resolves to all six format columns). */
  presetId: RoundPresetId;
  scoringPairsRequired: boolean;
  // Pairing source — only meaningful for the three 1v1 match-play presets.
  // 'manual' (default) leaves pairings to the organiser. 'current_standings'
  // auto-pairs from the cumulative individual leaderboard of completed prior
  // rounds, using the chosen style + metric.
  pairingSource: PairingSource;
  pairingStyle: BracketSeedingStyle;
  pairingMetric: QualifyingMetric;
  // Skins game configuration
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  // Wolf game configuration
  wolfEnabled: boolean;
  wolfConfig: WolfConfig | null;
}

/**
 * Initial form data values
 */
export const INITIAL_FORM_DATA: RoundFormData = {
  courseId: '',
  courseName: '',
  courseTees: [],
  selectedTee: null,
  date: '',
  teeTime: '',
  presetId: 'individual_stableford',
  scoringPairsRequired: false,
  // Default to manual; the wizard flips to 'current_standings' automatically
  // when the user picks the individual_match_play_seeded preset, and exposes
  // a toggle for the other two 1v1 match-play presets.
  pairingSource: 'manual',
  pairingStyle: 'standard',
  pairingMetric: 'competition_points',
  skinsEnabled: false,
  skinsConfig: null,
  wolfEnabled: false,
  wolfConfig: null,
};

/**
 * Form validation errors
 */
export type FormErrors = Record<string, string>;

/**
 * Props for AddRoundScreen
 */
export type AddRoundScreenProps = RootStackScreenProps<'AddRound'>;

/**
 * Props for TeamPreviewCard
 */
export interface TeamPreviewCardProps {
  team: TeamWithMembers;
}
