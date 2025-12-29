/**
 * Type definitions for CourseDetailScreen
 */

import type { Hole, TeeBox, Venue } from '@/types/database.types';

export interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
  /** Whether the user is a super admin (enables edit functionality) */
  isSuperAdmin?: boolean;
  /** Callback when super admin taps a hole row to edit */
  onHolePress?: (hole: Hole) => void;
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
