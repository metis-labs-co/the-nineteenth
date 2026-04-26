/**
 * Decay Models for Point System Quick-Setup
 *
 * Given a 1st-place value and a position count, produce an ordered array of
 * point values for positions 1..N. Used by the Competition General Rules
 * editor's "Quick setup" mode so organisers don't have to fill every cell.
 *
 * All four models clamp to >= 0 and round to whole points. They never
 * return negative values.
 */

/** Shape used by the Scaled Standard model — matches the existing Standard preset. */
const STANDARD_SHAPE = [10, 8, 6, 5, 4, 3, 2, 1] as const;

export type DecayModelId =
  | 'scaled_standard'
  | 'linear_to_one'
  | 'linear_minus_two'
  | 'halving_pairs';

export interface DecayModel {
  id: DecayModelId;
  title: string;
  summary: string;
}

/** UI-facing metadata. Kept alongside the helpers so the picker stays in sync. */
export const DECAY_MODELS: DecayModel[] = [
  {
    id: 'scaled_standard',
    title: 'Scaled Standard',
    summary: 'Keeps the Standard preset shape — front-loaded top 4.',
  },
  {
    id: 'linear_to_one',
    title: 'Linear to 1',
    summary: 'Evenly spread from 1st-place value down to 1.',
  },
  {
    id: 'linear_minus_two',
    title: 'Linear −2',
    summary: 'Fixed −2 drop per position. Simplest mental model.',
  },
  {
    id: 'halving_pairs',
    title: 'Halving Pairs',
    summary: 'Same points per two positions, halving each pair.',
  },
];

// ---------------------------------------------------------------------------
// Individual models
// ---------------------------------------------------------------------------

/**
 * Preserve the STANDARD_SHAPE proportions but scale by `value / 10`.
 *
 * When `positions` > 8 (the shape length), we extrapolate by linearly
 * continuing the last two entries' drop — the shape loses its curve past
 * the end but still produces non-negative values.
 */
export function scaledStandard(value: number, positions = 8): number[] {
  const v = Math.max(0, value);
  const out: number[] = [];
  for (let i = 0; i < positions; i++) {
    if (i < STANDARD_SHAPE.length) {
      out.push(Math.max(0, Math.round((v * STANDARD_SHAPE[i]) / 10)));
    } else {
      // Linearly extend past the shape. Use the last two points' slope.
      const prev = out[out.length - 1];
      const prevPrev = out[out.length - 2] ?? prev + 1;
      const next = prev - (prevPrev - prev);
      out.push(Math.max(0, next));
    }
  }
  return out;
}

/**
 * Linear decay from `value` at position 1 down to 1 at the last position.
 * Each step is (value - 1) / (positions - 1), rounded.
 */
export function linearToOne(value: number, positions = 8): number[] {
  const v = Math.max(0, value);
  if (positions <= 0) return [];
  if (positions === 1) return [v];
  const step = (v - 1) / (positions - 1);
  const out: number[] = [];
  for (let i = 0; i < positions; i++) {
    out.push(Math.max(0, Math.round(v - step * i)));
  }
  return out;
}

/**
 * Fixed decrement of 2 per position, clamped at 0 once values go negative.
 */
export function linearMinusTwo(value: number, positions = 8): number[] {
  const v = Math.max(0, value);
  const out: number[] = [];
  for (let i = 0; i < positions; i++) {
    out.push(Math.max(0, v - i * 2));
  }
  return out;
}

/**
 * Halving-pairs decay: positions (1,2) get `value`, (3,4) get half, (5,6)
 * get a quarter, etc. Rounded to whole points with a floor of 0.
 */
export function halvingPairs(value: number, positions = 8): number[] {
  const v = Math.max(0, value);
  const out: number[] = [];
  for (let i = 0; i < positions; i++) {
    const pairIndex = Math.floor(i / 2);
    const pairValue = Math.round(v / Math.pow(2, pairIndex));
    out.push(Math.max(0, pairValue));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function applyDecayModel(
  model: DecayModelId,
  value: number,
  positions = 8
): number[] {
  switch (model) {
    case 'scaled_standard':
      return scaledStandard(value, positions);
    case 'linear_to_one':
      return linearToOne(value, positions);
    case 'linear_minus_two':
      return linearMinusTwo(value, positions);
    case 'halving_pairs':
      return halvingPairs(value, positions);
  }
}
