import { Platform } from 'react-native';

/** Minimum iOS version where DeclaredAgeRange returns a real answer. */
const MIN_TRUSTED_IOS_MAJOR = 26;

/**
 * Whether Android's Play Age Signals response can be trusted.
 *
 * TRUE, confirmed by reading AgeRangeModule.kt during the Task 1 spike: Android
 * rejects the promise when Play Age Signals is unavailable and throws on
 * cancellation, rather than fabricating an adult response. Any value that does
 * come back is real. The lowerBound: 18 trap is iOS-only. See spec §11.
 */
const ANDROID_SIGNAL_TRUSTED = true;

/**
 * Whether the platform age signal can be believed.
 *
 * ⚠️ Below iOS 26 `expo-age-range` returns a fabricated `lowerBound: 18` rather
 * than an error, so the return value alone cannot distinguish "unsupported OS"
 * from "genuine adult". This check must run BEFORE the module is called —
 * otherwise the gate is a silent no-op for every legacy-iOS user.
 */
export function isPlatformSignalTrusted(): boolean {
  if (Platform.OS === 'ios') {
    const major = parseInt(String(Platform.Version), 10);
    return Number.isFinite(major) && major >= MIN_TRUSTED_IOS_MAJOR;
  }
  if (Platform.OS === 'android') {
    return ANDROID_SIGNAL_TRUSTED;
  }
  return false;
}
