/**
 * Types for CreateRoundBottomSheet wizard
 */

import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { Club, TeeBox, GameType } from '@/types/database.types';
import type { HandicapSource, Hole } from '@/types/database';
import type { SubscriptionTier } from '@/types/subscription.types';
import type { BallCount } from '@/types/multiball.types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { NineType } from '@/types/database/enums';

/**
 * Skins configuration for standalone rounds
 * Wrapper to indicate if skins is enabled along with configuration
 */
export interface StandaloneSkinsConfig {
  enabled: boolean;
  config: SkinsConfig;
}

/**
 * Wolf configuration for standalone rounds
 * Wrapper to indicate if Wolf is enabled along with configuration
 */
export interface StandaloneWolfConfig {
  enabled: boolean;
  config: WolfConfig;
}

/**
 * Wizard step identifiers
 */
export type WizardStep = 'course' | 'nineType' | 'matchType' | 'partners' | 'ballCount' | 'scoringSetup' | 'yourSetup';

/**
 * Playing partner selected for the round
 */
export interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number | undefined;
  /** Social Handicap Index (calculated from app rounds) */
  handicapIndex?: number | undefined;
  /** Player gender for WHS daily handicap consistency factor */
  gender?: 'male' | 'female' | undefined;
  /** Per-player tee override */
  selectedTee?: TeeBox;
}

/**
 * Course selection state
 */
export interface SelectedCourse {
  courseId: string;
  courseName: string;
  club: Club;
  /** @deprecated Use club instead */
  venue?: Club;
  tees?: TeeBox[] | null;
  /** Course holes for par calculation (daily handicap) */
  holes?: Hole[] | null;
  /** GolfAPI.io course ID (for refreshing course data from API) */
  golfapiCourseId?: string | null;
}

/**
 * Initial course passed to skip course selection
 */
export interface InitialCourse {
  courseId: string;
  courseName: string;
  club: Club;
  /** @deprecated Use club instead */
  venue?: Club;
  tees?: TeeBox[] | null;
}

/**
 * Scoring pairs configuration for the round
 */
export interface ScoringPairsConfig {
  enabled: boolean;
  pairs: ScoringPairCreateInput[];
  pairingType: 'reciprocal' | 'circular';
}

/**
 * Scramble team for wizard state (includes full player objects)
 */
export interface ScrambleTeam {
  id: string;
  name: string; // "Team 1", "Team 2"
  members: PlayingPartner[];
}

/**
 * Team configuration for database storage (uses player UUIDs only)
 * Stored in rounds.team_config JSONB column for standalone scramble rounds
 */
export interface TeamConfig {
  teams: {
    id: string;
    name: string;
    memberIds: string[]; // Player UUIDs
  }[];
}

/**
 * Match type option for display
 */
export interface MatchTypeOption {
  value: GameType;
  label: string;
  description: string;
  /** Minimum tier required to use this game type */
  requiredTier: SubscriptionTier;
}

/**
 * Complete wizard data state
 */
export interface WizardData {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType | null;
  selectedPartners: PlayingPartner[];
  searchQuery: string;
  friendSearchQuery: string;
  scoringPairsEnabled: boolean;
  scoringPairs: ScoringPairCreateInput[];
  scoringPairingType: 'reciprocal' | 'circular';
  /** Number of balls to score per hole (1-4). Solo rounds only. Default: 1 */
  ballCount: BallCount;
  /** Whether skins game is enabled for this round */
  skinsEnabled: boolean;
  /** Skins game configuration (pot type, value, scoring type) */
  skinsConfig: SkinsConfig | null;
  /** Scramble teams when split into smaller teams */
  teams: ScrambleTeam[];
  /** Whether teams are locked (true when using competition teams, prevents shuffling) */
  teamsLocked: boolean;
  /** Whether to split players into smaller teams for scramble (default: false = all play as one team) */
  splitIntoTeams: boolean;
  /** Whether Wolf game is enabled for this round (requires 3-4 players) */
  wolfEnabled: boolean;
  /** Wolf game configuration (scoring type, blind wolf, pot) */
  wolfConfig: WolfConfig | null;
  /** Whether this round uses build-as-you-play course creation (super admin only) */
  isBuildAsYouPlay: boolean;
  /** Handicap source for daily HC calculation (Premium feature) */
  handicapSource: HandicapSource;
  /** Nine type selection for 9-hole rounds */
  nineType: NineType;
  /**
   * Current user's WHS handicap override for this round. Null means use the
   * profile value as-is. When set, the round-start flow writes this back to
   * `players.handicap` as part of the Start Round transaction.
   */
  currentUserHandicapOverride: number | null;
}

/**
 * Props for the main CreateRoundBottomSheet component
 */
export interface CreateRoundBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onStartRound: (
    courseId: string,
    courseName: string,
    partners: PlayingPartner[],
    selectedTee?: TeeBox,
    gameType?: GameType,
    scoringPairs?: ScoringPairsConfig,
    ballCount?: BallCount,
    skinsConfig?: StandaloneSkinsConfig,
    teamConfig?: TeamConfig,
    wolfConfig?: StandaloneWolfConfig,
    isBuildAsYouPlay?: boolean,
    handicapSource?: HandicapSource,
    nineType?: NineType,
    currentUserHandicapOverride?: number | null
  ) => void;
  /** Pre-selected course to skip directly to tee selection */
  initialCourse?: InitialCourse;
  /** Pre-selected partners to add to the round automatically */
  initialPartners?: PlayingPartner[];
  /** Pre-selected match type — locks the match type step (skips it) */
  initialMatchType?: GameType;
  /** Skip the partner selection step entirely — starts the round after tee selection */
  skipPartnerStep?: boolean;
}

/**
 * All available match types with tier requirements
 */
export const MATCH_TYPES: MatchTypeOption[] = [
  {
    value: 'stableford',
    label: 'Stableford',
    description: 'Points-based scoring (most common)',
    requiredTier: 'free',
  },
  {
    value: 'stroke',
    label: 'Stroke Play',
    description: 'Lowest total strokes wins',
    requiredTier: 'social',
  },
  {
    value: 'par',
    label: 'Par',
    description: 'Win/lose each hole (+1, 0, -1 scoring)',
    requiredTier: 'social',
  },
  {
    value: 'match-play',
    label: 'Match Play',
    description: 'Hole-by-hole competition',
    requiredTier: 'social',
  },
  {
    value: 'best-ball',
    label: 'Best Ball',
    description: 'Team format - best score counts',
    requiredTier: 'premium',
  },
  {
    value: 'scramble',
    label: 'Scramble',
    description: 'Team format - everyone plays from best shot',
    requiredTier: 'premium',
  },
  {
    value: 'shamble',
    label: 'Shamble',
    description: 'Best drive, then individual play - sum all points',
    requiredTier: 'premium',
  },
];

/**
 * Display names for subscription tiers
 */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  enterprise: 'Enterprise',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

/**
 * Maximum number of playing partners allowed
 */
export const MAX_PARTNERS = 3;

/**
 * Map tee color names to actual colors
 */
export const getTeeColor = (
  color: string,
  fallbackColor: string
): string => {
  if (!color) return fallbackColor;
  if (color.startsWith('#')) return color;

  const colorMap: Record<string, string> = {
    black: '#1a1a1a',
    blue: '#2563eb',
    white: '#f5f5f5',
    gold: '#eab308',
    yellow: '#facc15',
    red: '#dc2626',
    green: '#16a34a',
    silver: '#9ca3af',
    orange: '#ea580c',
  };
  return colorMap[color.toLowerCase()] ?? fallbackColor;
};
