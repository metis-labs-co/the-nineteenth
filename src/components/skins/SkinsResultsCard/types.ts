/**
 * SkinsResultsCard Types
 *
 * Shared types for the SkinsResultsCard component and its sub-components.
 */

import type {
  SkinsResultWithWinner,
  SkinsPotType,
  SkinsScoringType,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database';

/** Accumulated totals for a participant (player or team) */
export interface ParticipantTotal {
  id: string;
  name: string;
  holesWon: number;
  totalWinnings: number;
  /** For team skins: number of members for per-member calculation */
  memberCount?: number;
}

/** Props for the SkinsResultsCard component */
export interface SkinsResultsCardProps {
  /** Array of skins results with winner details */
  results: SkinsResultWithWinner[];
  /** How the pot is calculated */
  potType: SkinsPotType;
  /** Dollar value (per hole or total) */
  potValue: number;
  /** Scoring method (gross or net) */
  scoringType: SkinsScoringType;
  /** Optional par values for each hole (1-18 indexed) */
  parValues?: Record<number, number>;
  /** Optional list of all participants (to show players with zero skins) */
  participants?: SkinsParticipant[];
  /** Whether this is a team skins game */
  isTeamSkins?: boolean;
  /** Team participants (for team skins) */
  teams?: SkinsTeamParticipant[];
  /** Test ID for testing */
  testID?: string;
}

/** Row type for FlatList rendering */
export type ResultRow =
  | { type: 'header' }
  | { type: 'hole'; result: SkinsResultWithWinner }
  | { type: 'subtotal'; label: string; value: number; holeRange: string }
  | { type: 'total'; value: number; unsettledCarryover: number }
  | { type: 'participantTotals'; totals: ParticipantTotal[]; isTeamSkins: boolean };
