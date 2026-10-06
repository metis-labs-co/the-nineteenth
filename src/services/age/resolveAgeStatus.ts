import * as AgeRange from 'expo-age-range';

import { classifyAgeRangeResponse } from './classify';
import { isPlatformSignalTrusted } from './platformSignal';
import { AGE_THRESHOLD, type AgeStatus } from './types';

/**
 * Resolve the current user's age band from the platform signal.
 *
 * Returns 'unknown' for every failure path — declined, unavailable, unsupported
 * OS — because 'unknown' is closed for social features. Failures deny rather
 * than grant. Callers fall back to the date-of-birth prompt on 'unknown'.
 *
 * The platform trust check runs first and short-circuits: on iOS below 26 the
 * module is never called at all, because it would answer with a fabricated
 * adult range rather than an error.
 */
export async function resolveAgeStatus(): Promise<AgeStatus> {
  if (!isPlatformSignalTrusted()) return 'unknown';

  try {
    const response = await AgeRange.requestAgeRangeAsync({ threshold1: AGE_THRESHOLD });
    return classifyAgeRangeResponse(response);
  } catch (error) {
    console.warn('[age] platform signal unavailable:', error);
    return 'unknown';
  }
}
