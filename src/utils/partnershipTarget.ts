/**
 * Partnership Target Calculation Engine
 *
 * Calculates expected combined scores and target levels for partnership leagues.
 * Supports Combined Stroke, Scramble, Shamble, and Best Ball formats.
 */

import type { PartnershipFormat, DifficultyLevel } from '@/types/database';
import { calculateTeamHandicap } from './teamScoring';

// ============================================================================
// Types
// ============================================================================

export interface TargetLevel {
  level: DifficultyLevel;
  label: string;
  target: number;
  buffer: number;
  description: string;
  color: string;
}

// ============================================================================
// Target Calculation
// ============================================================================

/**
 * Calculate the expected combined score for a partnership format.
 *
 * @param format - Partnership format
 * @param hcp1 - Player 1 handicap
 * @param hcp2 - Player 2 handicap
 * @param courseRating - Course rating for the tee
 * @param slopeRating - Slope rating for the tee
 * @param par - Course par
 * @returns Expected combined score (rounded to nearest integer)
 */
export function calculatePartnershipTarget(
  format: PartnershipFormat,
  hcp1: number,
  hcp2: number,
  courseRating: number,
  slopeRating: number,
  par: number
): number {
  const slope = slopeRating || 113;

  switch (format) {
    case 'combined_stroke': {
      // Both play own balls, scores summed
      // Player_Expected = Course Rating + (Handicap × Slope / 113)
      const p1Expected = courseRating + (hcp1 * slope) / 113;
      const p2Expected = courseRating + (hcp2 * slope) / 113;
      return Math.round(p1Expected + p2Expected);
    }

    case 'scramble': {
      // One team ball — use team handicap formula
      const teamHcp = calculateTeamHandicap([
        { playerId: 'p1', handicap: hcp1 },
        { playerId: 'p2', handicap: hcp2 },
      ]);
      return Math.round(courseRating + (teamHcp * slope) / 113);
    }

    case 'best_ball': {
      // Best net per hole — approximation uses lower handicap × 0.85
      const minHcp = Math.min(hcp1, hcp2);
      return Math.round(courseRating + (minHcp * 0.85 * slope) / 113);
    }

    case 'shamble': {
      // Best drive, then own balls — approximation uses avg handicap × 0.6
      const avgHcp = (hcp1 + hcp2) / 2;
      return Math.round(courseRating + (avgHcp * 0.6 * slope) / 113);
    }

    default:
      return par * 2; // fallback
  }
}

// ============================================================================
// Difficulty Levels
// ============================================================================

/**
 * Difficulty level configurations by format category.
 */
const DIFFICULTY_BUFFERS: Record<
  'combined' | 'team',
  { level: DifficultyLevel; label: string; buffer: number; description: string; color: string }[]
> = {
  combined: [
    { level: 'easy', label: 'Easy', buffer: 4, description: '+4 above expected', color: '#4CAF50' },
    { level: 'standard', label: 'Standard', buffer: 0, description: 'At expected score', color: '#2196F3' },
    { level: 'challenge', label: 'Challenge', buffer: -3, description: '3 below expected', color: '#FF9800' },
    { level: 'heroic', label: 'Heroic', buffer: -6, description: '6 below expected', color: '#F44336' },
  ],
  team: [
    { level: 'easy', label: 'Easy', buffer: 3, description: '+3 above expected', color: '#4CAF50' },
    { level: 'standard', label: 'Standard', buffer: 0, description: 'At expected score', color: '#2196F3' },
    { level: 'challenge', label: 'Challenge', buffer: -2, description: '2 below expected', color: '#FF9800' },
    { level: 'heroic', label: 'Heroic', buffer: -4, description: '4 below expected', color: '#F44336' },
  ],
};

/**
 * Get target levels for a partnership format and expected score.
 *
 * @param format - Partnership format
 * @param expectedScore - Base expected score from calculatePartnershipTarget()
 * @returns Array of 4 target levels with calculated targets
 */
export function getTargetLevels(
  format: PartnershipFormat,
  expectedScore: number
): TargetLevel[] {
  const category = format === 'combined_stroke' ? 'combined' : 'team';
  const buffers = DIFFICULTY_BUFFERS[category];

  return buffers.map((b) => ({
    level: b.level,
    label: b.label,
    target: expectedScore + b.buffer,
    buffer: b.buffer,
    description: b.description,
    color: b.color,
  }));
}

/**
 * Calculate the target differential for a completed round.
 *
 * @param combinedGross - Combined gross score
 * @param targetScore - Target score for the round
 * @returns Differential (negative = under target = good)
 */
export function calculateTargetDifferential(
  combinedGross: number,
  targetScore: number
): number {
  return combinedGross - targetScore;
}

/**
 * Get the format display label.
 */
export function getPartnershipFormatLabel(format: PartnershipFormat): string {
  switch (format) {
    case 'combined_stroke':
      return 'Combined Stroke';
    case 'scramble':
      return 'Scramble';
    case 'shamble':
      return 'Shamble';
    case 'best_ball':
      return 'Best Ball';
    default:
      return 'Unknown';
  }
}

/**
 * Get a short description of how a partnership format works.
 */
export function getPartnershipFormatDescription(format: PartnershipFormat): string {
  switch (format) {
    case 'combined_stroke':
      return 'Both players play their own ball. Scores are added together.';
    case 'scramble':
      return 'One team ball. Pick the best shot each time.';
    case 'shamble':
      return 'Best drive, then each player plays their own ball.';
    case 'best_ball':
      return 'Both play their own ball. Best net score counts each hole.';
    default:
      return '';
  }
}
