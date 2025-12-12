/**
 * Utility functions for CourseDetailScreen
 */

import type { Hole } from '@/types/database.types';

/**
 * Get tee color from tee name/color
 */
export function getTeeColor(color: string, fallback: string): string {
  const teeColors: Record<string, string> = {
    black: '#1f2937',
    blue: '#3b82f6',
    white: '#e5e7eb',
    yellow: '#fbbf24',
    gold: '#f59e0b',
    red: '#ef4444',
    green: '#22c55e',
  };
  return teeColors[color.toLowerCase()] || fallback;
}

/**
 * Default holes for courses without hole data
 */
export const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));
