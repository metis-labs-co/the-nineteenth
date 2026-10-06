import { Platform } from 'react-native';
import { isPlatformSignalTrusted } from '@/services/age/platformSignal';

describe('isPlatformSignalTrusted', () => {
  const setPlatform = (os: string, version: string | number) => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
  };

  it('trusts iOS 26 and above', () => {
    setPlatform('ios', '26.0');
    expect(isPlatformSignalTrusted()).toBe(true);
    setPlatform('ios', 27);
    expect(isPlatformSignalTrusted()).toBe(true);
  });

  // REGRESSION: below iOS 26 the native module returns a fabricated lowerBound of 18
  // (AgeRangeRecords.swift: "limited response used by iOS < 26, simulating an adult").
  // Trusting it would silently classify every legacy-iOS user as an adult and the
  // date-of-birth fallback would never run.
  it('does NOT trust iOS below 26, where the module fakes an adult', () => {
    setPlatform('ios', '15.1');
    expect(isPlatformSignalTrusted()).toBe(false);
    setPlatform('ios', '25.4');
    expect(isPlatformSignalTrusted()).toBe(false);
  });

  it('does not trust web', () => {
    setPlatform('web', 0);
    expect(isPlatformSignalTrusted()).toBe(false);
  });

  // Android rejects the promise when Play Age Signals is unavailable rather than
  // fabricating an adult, so any value that does arrive is real.
  it('trusts android', () => {
    setPlatform('android', 34);
    expect(isPlatformSignalTrusted()).toBe(true);
  });

  it('does not trust a malformed iOS version', () => {
    setPlatform('ios', 'not-a-version');
    expect(isPlatformSignalTrusted()).toBe(false);
  });
});
