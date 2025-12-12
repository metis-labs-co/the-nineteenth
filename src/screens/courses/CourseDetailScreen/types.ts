/**
 * Type definitions for CourseDetailScreen
 */

import type { Hole, TeeBox, Venue } from '@/types/database.types';

export interface TeeSelectorProps {
  tees: TeeBox[];
  selectedTee: string | null;
  onSelectTee: (teeName: string) => void;
}

export interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
}

export interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number;
}

export interface InitialCourseData {
  courseId: string;
  courseName: string;
  venue: Venue;
  tees?: TeeBox[];
}
