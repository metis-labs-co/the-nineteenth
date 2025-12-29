/**
 * Types for EditCompetitionScreen
 */

import type { CompetitionType, TeamMode } from '@/types/database.types';

export interface CompetitionFormData {
  name: string;
  description: string | null;
  competitionType: CompetitionType;
  teamMode: TeamMode;
  startDate: string;
  endDate: string | null;
}

export interface CompetitionUpdateInput {
  name?: string;
  description?: string | null;
  competition_type?: CompetitionType;
  team_mode?: TeamMode;
  start_date?: string;
  end_date?: string | null;
}
