/**
 * Type definitions for EditRoundScreen
 */

import type { GameType, Round, TeeBox, Course } from '@/types/database.types';

export interface RoundFormData {
  date: string;
  teeTime: string;
  gameType: GameType;
  selectedTee: TeeBox | null;
  scoringPairsRequired: boolean;
}

export interface RoundWithCourse extends Round {
  courses: Course | null;
}

export interface TeeSelectorProps {
  tees: TeeBox[];
  selectedTee: TeeBox | null;
  onSelect: (tee: TeeBox) => void;
  disabled?: boolean;
}
