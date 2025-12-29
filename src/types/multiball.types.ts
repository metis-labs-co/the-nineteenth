/**
 * Multi-Ball Scoring Types
 *
 * Types and utilities for solo practice rounds where players
 * can score multiple balls (2-4) per hole.
 * Feature requires Social tier or higher subscription.
 */

/**
 * Valid ball counts for multi-ball scoring
 * 1 = normal single-ball round
 * 2-4 = multi-ball practice round
 */
export type BallCount = 1 | 2 | 3 | 4;

/**
 * Ball number within a multi-ball round (1-indexed)
 */
export type BallNumber = 1 | 2 | 3 | 4;

/**
 * Ball count selection options for round creation UI
 */
export interface BallCountOption {
  value: BallCount;
  label: string;
  description: string;
}

/**
 * Available ball count options for the selection UI
 * Single ball is always available; multi-ball requires Social tier+
 */
export const BALL_COUNT_OPTIONS: BallCountOption[] = [
  {
    value: 1,
    label: 'Single Ball',
    description: 'Standard round scoring one ball',
  },
  {
    value: 2,
    label: '2 Balls',
    description: 'Score two balls per hole',
  },
  {
    value: 3,
    label: '3 Balls',
    description: 'Score three balls per hole',
  },
  {
    value: 4,
    label: '4 Balls',
    description: 'Score four balls per hole',
  },
];

/**
 * Get multi-ball options only (excludes single ball)
 * Use for displaying upgrade-gated options
 */
export const MULTI_BALL_OPTIONS = BALL_COUNT_OPTIONS.filter(
  (option) => option.value > 1
);

/**
 * Get display label for a ball by its index (0-indexed)
 * @param ballIndex - Zero-based ball index
 * @returns "Ball 1", "Ball 2", etc.
 */
export function getBallLabel(ballIndex: number): string {
  return `Ball ${ballIndex + 1}`;
}

/**
 * Get display label for a ball by its number (1-indexed)
 * @param ballNumber - One-based ball number
 * @returns "Ball 1", "Ball 2", etc.
 */
export function getBallLabelByNumber(ballNumber: BallNumber): string {
  return `Ball ${ballNumber}`;
}

/**
 * Check if a ball count represents a multi-ball round
 * @param ballCount - The ball count to check
 * @returns true if ball count is > 1
 */
export function isMultiBallRound(ballCount: number): boolean {
  return ballCount > 1 && ballCount <= 4;
}

/**
 * Validate that a ball count is within the allowed range
 * @param ballCount - The ball count to validate
 * @returns true if valid (1-4)
 */
export function isValidBallCount(ballCount: number): ballCount is BallCount {
  return ballCount >= 1 && ballCount <= 4;
}

/**
 * Get an array of ball indices for a given ball count
 * @param ballCount - Number of balls (1-4)
 * @returns Array of 0-indexed ball indices, e.g., [0, 1, 2] for 3 balls
 */
export function getBallIndices(ballCount: BallCount): number[] {
  return Array.from({ length: ballCount }, (_, i) => i);
}

/**
 * Get an array of ball numbers for a given ball count
 * @param ballCount - Number of balls (1-4)
 * @returns Array of 1-indexed ball numbers, e.g., [1, 2, 3] for 3 balls
 */
export function getBallNumbers(ballCount: BallCount): BallNumber[] {
  return Array.from({ length: ballCount }, (_, i) => (i + 1) as BallNumber);
}
