/**
 * Types for CreateRoundBottomSheet wizard
 */

import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { Club, TeeBox, GameType } from '@/types/database.types';
import type { SubscriptionTier } from '@/types/subscription.types';
import type { BallCount } from '@/types/multiball.types';

/**
 * Skins configuration for standalone rounds
 * Wrapper to indicate if skins is enabled along with configuration
 */
export interface StandaloneSkinsConfig {
  enabled: boolean;
  config: SkinsConfig;
}

/**
 * Wizard step identifiers
 */
export type WizardStep = 'course' | 'tee' | 'matchType' | 'partners' | 'ballCount' | 'scoringSetup';

/**
 * Playing partner selected for the round
 */
export interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number;
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
    skinsConfig?: StandaloneSkinsConfig
  ) => void;
  /** Pre-selected course to skip directly to tee selection */
  initialCourse?: InitialCourse;
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
    value: 'match-play',
    label: 'Match Play',
    description: 'Hole-by-hole competition',
    requiredTier: 'social',
  },
  {
    value: 'ambrose',
    label: 'Ambrose',
    description: 'Team format - best drive, then all play',
    requiredTier: 'premium',
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
];

/**
 * Display names for subscription tiers
 */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  super_admin: 'Super Admin',
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
