/**
 * Type definitions for EditRoundScreen
 */

import type { GameType, Round, TeeBox, Course, SkinsConfig, SkinsPoolSource } from '@/types/database.types';
import type { WolfConfig } from '@/types/database/wolf.types';

// Re-export SkinsEditState from shared component for backwards compatibility
export type { SkinsEditState, PoolSourceData } from '@/components/skins';
export type { WolfEditState } from '@/components/wolf';

export interface RoundFormData {
  date: string;
  teeTime: string;
  gameType: GameType;
  selectedTee: TeeBox | null;
  scoringPairsRequired: boolean;
  courseId: string | null;
  courseName: string;
  // Skins configuration
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  // Pool source for skins (Phase 2: Prize Pool integration)
  skinsPoolSource: SkinsPoolSource;
  // Wolf configuration
  wolfEnabled: boolean;
  wolfConfig: WolfConfig | null;
}

export interface RoundWithCourse extends Round {
  courses: Course | null;
}
