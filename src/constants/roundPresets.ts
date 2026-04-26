/**
 * Round Presets
 *
 * A preset is the canonical shape of "how this round is played" — a single
 * choice (e.g. "2v2 Pairs Better Ball", "Team Scramble") that resolves to
 * the six fields the engine actually consumes:
 *
 *   game_type, is_team_round, team_format, round_format, sub_match_size,
 *   rules_override.
 *
 * Historically each of those fields was edited independently, which made
 * invalid combinations easy to produce (e.g. `team_format='scramble'` on
 * `round_format='split'`, or a scramble rules_override saved against a
 * stableford round). Presets lift the combination into a single unit and
 * stop invalid states from being representable in the edit UI.
 *
 * The preset id is NOT persisted — there's no `preset_id` column. Instead:
 *   - Writing a preset: `applyPresetToRound` copies the preset's `config`
 *     into the existing columns atomically.
 *   - Reading a preset: `inferPresetIdFromRound` walks the catalog and
 *     returns the first preset whose config matches the round exactly,
 *     or `null` for legacy / hand-crafted combinations ("Custom").
 *
 * The four rules-override templates that used to live in `roundTemplates.ts`
 * are still the source of truth for their RoundRulesOverride payloads —
 * this file just references them so the override shape stays in one place.
 */

import {
  PAIRS_BETTER_BALL,
  PAIRS_SCRAMBLE,
  QUALIFYING_MATCH_PLAY,
  TEAM_SCRAMBLE_FIXED_POINTS,
  TEAM_STABLEFORD_BEST_N_OF_M,
} from './roundTemplates';
import type {
  GameType,
  RoundFormat,
  TeamFormat,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';
import { TIER_HIERARCHY, type SubscriptionTier } from '@/types/subscription.types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RoundPresetId =
  | 'individual_stableford'
  | 'individual_stroke'
  | 'individual_par'
  | 'individual_match_play'
  | 'individual_match_play_seeded'
  | 'team_stableford_aggregate'
  | 'team_stableford_best_n'
  | 'team_best_ball'
  | 'team_shamble'
  | 'team_scramble'
  | 'team_match_play'
  | 'pairs_better_ball_2v2'
  | 'pairs_scramble_2v2'
  | 'ryder_cup_singles'
  | 'ryder_cup_foursomes_2v2';

export type RoundPresetGroup = 'individual' | 'team_combined' | 'sub_matches';

/** The tuple written to the rounds row when this preset is applied. */
export interface RoundPresetConfig {
  game_type: GameType;
  is_team_round: boolean;
  team_format: TeamFormat | null;
  round_format: RoundFormat;
  sub_match_size: number | null;
  rules_override: RoundRulesOverride | null;
}

export interface RoundPreset {
  id: RoundPresetId;
  /** Full title used in the picker list. */
  title: string;
  /** Short title used in the Round Type row pill. */
  shortTitle: string;
  /** One-line description shown under the title in the picker. */
  summary: string;
  /** Expanded blurb shown when the preset is selected in the picker. */
  longDescription: string;
  /** MaterialCommunityIcons name. */
  icon: string;
  /** Minimum tier needed to APPLY this preset. Viewing is always allowed. */
  tier: SubscriptionTier;
  group: RoundPresetGroup;
  config: RoundPresetConfig;
  /**
   * When true, this preset only makes sense on a competition round with
   * teams already configured (e.g. split sub-matches need 2+ team rosters
   * to generate pairings). Standalone rounds hide these.
   */
  requiresCompetitionTeams?: boolean;
  /**
   * When true, the preset is shown but cannot be selected — surfaced with a
   * "Coming Soon" pill in the picker. Used to gate formats that haven't been
   * fully validated yet, independent of the user's subscription tier.
   */
  comingSoon?: boolean;
}

// -----------------------------------------------------------------------------
// Catalog — INDIVIDUAL
// -----------------------------------------------------------------------------

export const INDIVIDUAL_STABLEFORD: RoundPreset = {
  id: 'individual_stableford',
  title: 'Individual Stableford',
  shortTitle: 'Stableford',
  summary: 'Points-based scoring (2 for par, 3 for birdie).',
  longDescription:
    'Every player plays their own ball. Hole scores convert to Stableford points and the highest total wins.',
  icon: 'star-outline',
  tier: 'free',
  group: 'individual',
  config: {
    game_type: 'stableford',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
};

export const INDIVIDUAL_STROKE: RoundPreset = {
  id: 'individual_stroke',
  title: 'Individual Stroke Play',
  shortTitle: 'Stroke Play',
  summary: 'Lowest total strokes wins.',
  longDescription:
    'Every player plays their own ball. Total strokes (net or gross) decides placement.',
  icon: 'counter',
  tier: 'social',
  group: 'individual',
  config: {
    game_type: 'stroke',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
};

export const INDIVIDUAL_PAR: RoundPreset = {
  id: 'individual_par',
  title: 'Par',
  shortTitle: 'Par',
  summary: 'Win/lose each hole (+1, 0, -1 scoring).',
  longDescription:
    'Each hole is won, lost, or halved vs. par. Final score is the signed sum of hole results.',
  icon: 'plus-minus',
  tier: 'social',
  group: 'individual',
  config: {
    game_type: 'par',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
};

export const INDIVIDUAL_MATCH_PLAY: RoundPreset = {
  id: 'individual_match_play',
  title: 'Singles Match Play',
  shortTitle: 'Match Play',
  summary: 'Head-to-head, one hole at a time.',
  longDescription:
    'One-vs-one match play. Each hole is won, halved, or lost. The match ends when one player is up by more holes than remain.',
  icon: 'sword-cross',
  tier: 'premium',
  group: 'individual',
  config: {
    game_type: 'match-play',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
};

export const INDIVIDUAL_MATCH_PLAY_SEEDED: RoundPreset = {
  id: 'individual_match_play_seeded',
  title: 'Qualifying Match Play',
  shortTitle: 'Qualifying MP',
  summary: 'Auto-seeded bracket from qualifying-round standings.',
  longDescription:
    'Each player plays one 1v1 match. The bracket is seeded from the cumulative individual leaderboard of the competition’s qualifying rounds.',
  icon: 'tournament',
  tier: 'premium',
  group: 'individual',
  config: {
    game_type: 'match-play',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: QUALIFYING_MATCH_PLAY.override,
  },
  requiresCompetitionTeams: false,
};

// -----------------------------------------------------------------------------
// Catalog — TEAM, WHOLE MATCH
// -----------------------------------------------------------------------------

export const TEAM_STABLEFORD_AGGREGATE: RoundPreset = {
  id: 'team_stableford_aggregate',
  title: 'Team Stableford (aggregate)',
  shortTitle: 'Team Stableford',
  summary: 'Every player’s Stableford points sum into the team total.',
  longDescription:
    'Individual Stableford. Team total is the sum of every member’s Stableford points. Highest team total wins.',
  icon: 'account-group-outline',
  tier: 'social',
  group: 'team_combined',
  config: {
    game_type: 'stableford',
    is_team_round: true,
    team_format: 'aggregate',
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
  requiresCompetitionTeams: true,
};

export const TEAM_STABLEFORD_BEST_N: RoundPreset = {
  id: 'team_stableford_best_n',
  title: 'Team Stableford: Best 3 of 4',
  shortTitle: 'Best 3 of 4',
  summary: 'Drop the worst score each round. 2/1/0 team points.',
  longDescription:
    'Every player plays individual Stableford. Team total uses the best three scores on the team (worst is dropped). Winning team earns 2 points, 1 each on a tie.',
  icon: 'account-group',
  tier: 'premium',
  group: 'team_combined',
  config: {
    game_type: 'stableford',
    is_team_round: true,
    team_format: 'aggregate',
    round_format: 'combined',
    sub_match_size: null,
    rules_override: TEAM_STABLEFORD_BEST_N_OF_M.override,
  },
  requiresCompetitionTeams: true,
};

export const TEAM_BEST_BALL: RoundPreset = {
  id: 'team_best_ball',
  title: 'Team Best Ball',
  shortTitle: 'Team Best Ball',
  summary: 'Lowest score on the team counts each hole.',
  longDescription:
    'Every player plays their own ball. On each hole the team takes the lowest net score. Good when team members have mixed handicaps.',
  icon: 'golf',
  tier: 'premium',
  group: 'team_combined',
  config: {
    game_type: 'best-ball',
    is_team_round: true,
    team_format: 'best-ball',
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

export const TEAM_SHAMBLE: RoundPreset = {
  id: 'team_shamble',
  title: 'Team Shamble',
  shortTitle: 'Shamble',
  summary: 'Best drive, then everyone plays individual.',
  longDescription:
    'The team tees off; everyone plays their second shot from the best drive; then each player finishes the hole on their own ball.',
  icon: 'golf-tee',
  tier: 'premium',
  group: 'team_combined',
  config: {
    game_type: 'shamble',
    is_team_round: true,
    team_format: 'shamble',
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

export const TEAM_SCRAMBLE: RoundPreset = {
  id: 'team_scramble',
  title: 'Team Scramble',
  shortTitle: 'Scramble',
  summary: 'Everyone plays from the best shot. 2/1/0 team points.',
  longDescription:
    'All team members play from the best shot each stroke. Uses the standard scramble handicap calculation. Winning team earns 2 points, 1 each on a tie. Does not feed the individual leaderboard.',
  icon: 'account-multiple',
  tier: 'premium',
  group: 'team_combined',
  config: {
    game_type: 'scramble',
    is_team_round: true,
    team_format: 'scramble',
    round_format: 'combined',
    sub_match_size: null,
    rules_override: TEAM_SCRAMBLE_FIXED_POINTS.override,
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

export const TEAM_MATCH_PLAY: RoundPreset = {
  id: 'team_match_play',
  title: 'Team Match Play',
  shortTitle: 'Team Match Play',
  summary: 'Whole team vs whole team, hole by hole.',
  longDescription:
    'Two teams play a single match. Each hole is won by the team with the lowest net score; the match ends when one side is up by more holes than remain.',
  icon: 'shield-sword',
  tier: 'premium',
  group: 'team_combined',
  config: {
    game_type: 'match-play',
    is_team_round: true,
    team_format: 'match-play-team',
    round_format: 'combined',
    sub_match_size: null,
    // team_points drives the win/tie/loss allocation written by
    // finalizeTeamMatchPlayRound. Default mirrors the Ryder-Cup convention
    // (1 / 0.5 / 0) so combined and split team match play feel consistent.
    rules_override: {
      team_points: { win: 1, tie: 0.5, loss: 0 },
      contributes_to_individual_leaderboard: false,
      contributes_to_team_leaderboard: true,
    },
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

// -----------------------------------------------------------------------------
// Catalog — SUB-MATCHES (Ryder Cup style)
// -----------------------------------------------------------------------------

export const PAIRS_BETTER_BALL_2V2: RoundPreset = {
  id: 'pairs_better_ball_2v2',
  title: '2v2 Pairs Better Ball',
  shortTitle: '2v2 Better Ball',
  summary: 'Multiple independent 2v2 matches aggregated Ryder-Cup style.',
  longDescription:
    'The round is split into 2v2 sub-matches. Each pair uses its members’ better Stableford score on every hole. Winning pair earns 1 point per sub-match (0.5 on a tie). Individual Stableford still feeds the individual leaderboard.',
  icon: 'account-multiple-outline',
  tier: 'social',
  group: 'sub_matches',
  config: {
    game_type: 'stableford',
    is_team_round: true,
    team_format: 'best-ball',
    round_format: 'split',
    sub_match_size: 2,
    rules_override: PAIRS_BETTER_BALL.override,
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

export const PAIRS_SCRAMBLE_2V2: RoundPreset = {
  id: 'pairs_scramble_2v2',
  title: '2v2 Pairs Scramble',
  shortTitle: '2v2 Scramble',
  summary: 'Two 2v2 scramble sub-matches, Ryder-Cup aggregated.',
  longDescription:
    'Each team of 4 splits into 2 pairs. The round runs as two independent 2v2 scramble sub-matches — every pair plays their best shot each stroke against the opposing pair. Winning pair earns 1 point per sub-match (0.5 on a tie). Does not feed the individual leaderboard.',
  icon: 'account-multiple-outline',
  tier: 'premium',
  group: 'sub_matches',
  config: {
    game_type: 'scramble',
    is_team_round: true,
    team_format: 'scramble',
    round_format: 'split',
    sub_match_size: 2,
    rules_override: PAIRS_SCRAMBLE.override,
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

export const RYDER_CUP_SINGLES: RoundPreset = {
  id: 'ryder_cup_singles',
  title: '1v1 Singles Match Play',
  shortTitle: '1v1 Singles',
  summary: 'Every player plays one singles match against the other team.',
  longDescription:
    'The round is split into 1v1 sub-matches, one per player. Each match scores 1 point for a win, 0.5 for a half. Team aggregate decides the day.',
  icon: 'sword-cross',
  tier: 'premium',
  group: 'sub_matches',
  config: {
    game_type: 'match-play',
    is_team_round: true,
    team_format: 'match-play-team',
    round_format: 'split',
    sub_match_size: 1,
    // Without `pair_points`, finalizePairResults skips this round and the
    // team competition leaderboard never sees the result. Each 1v1 sub-match
    // counts as one Ryder-Cup point (0.5 on a halve). Individual match-play
    // results still rank on the individual leaderboard.
    rules_override: {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      contributes_to_individual_leaderboard: true,
      contributes_to_team_leaderboard: true,
    },
  },
  requiresCompetitionTeams: true,
};

export const RYDER_CUP_FOURSOMES_2V2: RoundPreset = {
  id: 'ryder_cup_foursomes_2v2',
  title: '2v2 Foursomes Match Play',
  shortTitle: '2v2 Foursomes',
  summary: 'Pair vs pair, sub-match stack.',
  longDescription:
    'The round is split into 2v2 match-play sub-matches. Each pair plays as a team against the opposing pair; winners earn 1 point per sub-match (0.5 on a tie).',
  icon: 'shield-half-full',
  tier: 'premium',
  group: 'sub_matches',
  config: {
    game_type: 'match-play',
    is_team_round: true,
    team_format: 'match-play-team',
    round_format: 'split',
    sub_match_size: 2,
    // 2v2 foursomes is one ball alternating shots — there are no per-player
    // results to feed the individual leaderboard. Pair points (1/0.5/0) drive
    // the team competition leaderboard via finalizePairResults.
    rules_override: {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      contributes_to_individual_leaderboard: false,
      contributes_to_team_leaderboard: true,
    },
  },
  requiresCompetitionTeams: true,
  comingSoon: true,
};

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

export const ROUND_PRESETS: Record<RoundPresetId, RoundPreset> = {
  individual_stableford: INDIVIDUAL_STABLEFORD,
  individual_stroke: INDIVIDUAL_STROKE,
  individual_par: INDIVIDUAL_PAR,
  individual_match_play: INDIVIDUAL_MATCH_PLAY,
  individual_match_play_seeded: INDIVIDUAL_MATCH_PLAY_SEEDED,
  team_stableford_aggregate: TEAM_STABLEFORD_AGGREGATE,
  team_stableford_best_n: TEAM_STABLEFORD_BEST_N,
  team_best_ball: TEAM_BEST_BALL,
  team_shamble: TEAM_SHAMBLE,
  team_scramble: TEAM_SCRAMBLE,
  team_match_play: TEAM_MATCH_PLAY,
  pairs_better_ball_2v2: PAIRS_BETTER_BALL_2V2,
  pairs_scramble_2v2: PAIRS_SCRAMBLE_2V2,
  ryder_cup_singles: RYDER_CUP_SINGLES,
  ryder_cup_foursomes_2v2: RYDER_CUP_FOURSOMES_2V2,
};

/** Display order — matches the grouped sections in the picker. */
export const ROUND_PRESET_ORDER: RoundPresetId[] = [
  // Individual
  'individual_stableford',
  'individual_stroke',
  'individual_par',
  'individual_match_play',
  'individual_match_play_seeded',
  // Team, whole match
  'team_stableford_aggregate',
  'team_stableford_best_n',
  'team_best_ball',
  'team_shamble',
  'team_scramble',
  'team_match_play',
  // Sub-matches
  'pairs_better_ball_2v2',
  'pairs_scramble_2v2',
  'ryder_cup_singles',
  'ryder_cup_foursomes_2v2',
];

export const ROUND_PRESET_GROUP_ORDER: RoundPresetGroup[] = [
  'individual',
  'team_combined',
  'sub_matches',
];

export const ROUND_PRESET_GROUP_LABELS: Record<RoundPresetGroup, string> = {
  individual: 'Individual',
  team_combined: 'Team — whole match',
  sub_matches: 'Sub-matches (Ryder Cup style)',
};

// -----------------------------------------------------------------------------
// Lookups & inference
// -----------------------------------------------------------------------------

export function getRoundPreset(id: RoundPresetId): RoundPreset {
  return ROUND_PRESETS[id];
}

/**
 * Minimal round shape needed to infer a preset. Narrow on purpose so the
 * helper works against RoundWithCourse, Round, and test fixtures without
 * forcing any one of those to satisfy the other.
 */
export interface RoundShapeForPresets {
  game_type: GameType;
  is_team_round: boolean;
  team_format: TeamFormat | null;
  round_format: RoundFormat;
  sub_match_size: number | null;
  rules_override: RoundRulesOverride | null;
}

/**
 * Does this round's fields match this preset's config exactly?
 *
 * Matching is intentionally strict — if a round has a lingering
 * `team_aggregation` from an older override the caller doesn't want to
 * keep, we'd rather return `null` and let the UI show "Custom" so the
 * organiser can re-pick a canonical preset.
 */
export function matchesPreset(
  round: RoundShapeForPresets,
  preset: RoundPreset
): boolean {
  const c = preset.config;
  if (round.game_type !== c.game_type) return false;
  if (round.is_team_round !== c.is_team_round) return false;
  if ((round.team_format ?? null) !== (c.team_format ?? null)) return false;
  if (round.round_format !== c.round_format) return false;
  if ((round.sub_match_size ?? null) !== (c.sub_match_size ?? null)) return false;

  // rules_override comparison — compare by template_id only. Two rounds
  // whose overrides share a template_id are considered equivalent for
  // preset-matching even if other (currently unused) knobs diverge.
  const roundTemplateId = round.rules_override?.template_id ?? null;
  const presetTemplateId = c.rules_override?.template_id ?? null;
  if (roundTemplateId !== presetTemplateId) return false;

  return true;
}

export function inferPresetIdFromRound(
  round: RoundShapeForPresets
): RoundPresetId | null {
  for (const id of ROUND_PRESET_ORDER) {
    if (matchesPreset(round, ROUND_PRESETS[id])) return id;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Availability (tier + context gating)
// -----------------------------------------------------------------------------

export interface PresetAvailabilityContext {
  /** Current user's tier. Used to surface locked presets with an upgrade CTA. */
  tier: SubscriptionTier;
  /** When true, the round lives outside a competition — hide presets that
   *  need team rosters. */
  isStandalone: boolean;
  /**
   * Competition-level flag. When false, `rules_override` is ignored at
   * finalization — presets carrying a rules_override are still listed
   * (selecting one would be a no-op) but flagged via the return value.
   * Reflects `competitions.per_round_rules_enabled`.
   */
  perRoundRulesEnabled: boolean;
}

export interface PresetAvailability {
  preset: RoundPreset;
  /** User has enough tier to apply this preset. */
  tierAllowed: boolean;
  /** Preset works given the round's context (standalone vs competition). */
  contextAllowed: boolean;
  /**
   * Preset carries a rules_override but the competition has per-round
   * rules disabled. Selecting it would save an override the engine
   * ignores — callers should surface an explanatory note.
   */
  rulesWouldBeIgnored: boolean;
  /**
   * Preset is flagged as not-yet-released. Pickers show it with a
   * "Coming Soon" pill and block selection regardless of tier.
   */
  comingSoon: boolean;
}

export function isTierAllowed(
  userTier: SubscriptionTier,
  required: SubscriptionTier
): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[required];
}

export function getPresetAvailability(
  preset: RoundPreset,
  context: PresetAvailabilityContext
): PresetAvailability {
  const tierAllowed = isTierAllowed(context.tier, preset.tier);
  const contextAllowed = !(preset.requiresCompetitionTeams && context.isStandalone);
  const rulesWouldBeIgnored =
    !context.perRoundRulesEnabled && preset.config.rules_override !== null;
  // Dev builds (Expo Go, simulator, dev client) bypass the "Coming Soon" lock
  // so unfinished formats can be exercised end-to-end in testing. Production
  // bundles keep the lock until the format is fully validated.
  const comingSoon = preset.comingSoon === true && !__DEV__;

  return { preset, tierAllowed, contextAllowed, rulesWouldBeIgnored, comingSoon };
}
