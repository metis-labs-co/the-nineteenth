/**
 * Derived age band for the current user.
 *
 * - 'unknown'  — no signal yet; social features stay closed
 * - 'under13'  — restricted mode
 * - 'eligible' — full access
 */
export type AgeStatus = 'unknown' | 'under13' | 'eligible';

/** Source of the resolved status, recorded for audit. */
export type AgeSource = 'declared_age_range' | 'self_declared';

/** The age gate this app checks against. */
export const AGE_THRESHOLD = 13;
