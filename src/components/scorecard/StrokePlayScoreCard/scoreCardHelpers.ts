/**
 * StrokePlayScoreCard Helpers
 *
 * Constants and formatting helpers shared across the StrokePlayScoreCard
 * component and its sub-components.
 */

/** Score button definition with relative-to-par value */
export interface ScoreButton {
  label: string;
  shortLabel: string;
  relativeToPar: number;
  colorKey: 'eagle' | 'birdie' | 'par' | 'bogey' | 'doubleBogey';
}

/** Pre-defined score buttons for relative-to-par quick entry */
export const SCORE_BUTTONS: ScoreButton[] = [
  { label: 'Eagle', shortLabel: 'EAG', relativeToPar: -2, colorKey: 'eagle' },
  { label: 'Birdie', shortLabel: 'BIR', relativeToPar: -1, colorKey: 'birdie' },
  { label: 'Par', shortLabel: 'PAR', relativeToPar: 0, colorKey: 'par' },
  { label: 'Bogey', shortLabel: 'BOG', relativeToPar: 1, colorKey: 'bogey' },
  { label: 'Double', shortLabel: 'DBL', relativeToPar: 2, colorKey: 'doubleBogey' },
  { label: 'Triple', shortLabel: 'TRP', relativeToPar: 3, colorKey: 'doubleBogey' },
];

/** Format a relative-to-par value for display (e.g., +2, -1, E) */
export function formatRelativeToPar(value: number | null, includeSign = true): string {
  if (value === null) return '-';
  if (value === 0) return 'E';
  if (includeSign) {
    return value > 0 ? `+${value}` : `${value}`;
  }
  return `${value}`;
}

/** Format a par game score for display (e.g., +1, -2, E) */
export function formatParScoreDisplay(value: number): string {
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
}

/** Get label for a par game score (Win, Square, Loss) */
export function getParScoreLabel(parScore: number | null): string {
  if (parScore === null) return '';
  if (parScore === 1) return 'Win';
  if (parScore === 0) return 'Square';
  return 'Loss';
}
