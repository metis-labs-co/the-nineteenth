/**
 * Leagues API Types
 */

import type {
  LeagueType,
  EclecticScoring,
  LadderSeeding,
  PartnershipFormat,
} from '@/types/database';

export interface CreateLeagueInput {
  name: string;
  description?: string;
  league_type?: LeagueType;
  // Season fields
  start_date?: string;
  end_date?: string;
  // Round Limit fields
  max_rounds?: number;
  counting_rounds?: number;
  // Ladder fields
  challenge_range?: number;
  ladder_seeding?: LadderSeeding;
  // Eclectic fields
  course_id?: string;
  tee_id?: string;
  eclectic_scoring?: EclecticScoring;
  // Partnership fields
  partnership_format?: PartnershipFormat;
  // Visibility
  is_public?: boolean;
}

export interface EligibleScorecard {
  id: string;
  round_id: string | null;
  player_id: string;
  handicap_differential: number | null;
  status: string;
  created_at: string;
  course_name: string | null;
  club_name: string | null;
  total_gross: number | null;
  course_id?: string | null;
  needs_recalculation?: boolean;
}
