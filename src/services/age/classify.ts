import { AGE_THRESHOLD, type AgeStatus } from './types';

/**
 * Classify a date of birth into an age band.
 *
 * The DOB is never persisted — callers pass it in, take the band, and discard it.
 * Comparison uses local-time components, matching how a person reads their own
 * birthday.
 */
export function classifyDateOfBirth(dob: Date, now: Date = new Date()): AgeStatus {
  if (Number.isNaN(dob.getTime())) return 'unknown';
  if (dob.getTime() > now.getTime()) return 'unknown';

  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= AGE_THRESHOLD ? 'eligible' : 'under13';
}

/**
 * Classify a Declared Age Range / Play Age Signals response.
 *
 * ⚠️ Callers MUST only pass responses from a platform where the signal is trusted.
 * Below iOS 26 the native module fabricates `lowerBound: 18` rather than failing,
 * so this function cannot tell a real adult from an unsupported OS. That check
 * belongs upstream — see `platformSignal.ts`.
 */
export function classifyAgeRangeResponse(r: {
  lowerBound: number | null;
  upperBound: number | null;
}): AgeStatus {
  if (r.lowerBound != null && r.lowerBound >= AGE_THRESHOLD) return 'eligible';
  if (r.upperBound != null && r.upperBound < AGE_THRESHOLD) return 'under13';
  return 'unknown';
}
