import * as AgeRange from 'expo-age-range';

import { resolveAgeStatus } from '@/services/age/resolveAgeStatus';
import { isPlatformSignalTrusted } from '@/services/age/platformSignal';

jest.mock('expo-age-range', () => ({ requestAgeRangeAsync: jest.fn() }));
jest.mock('@/services/age/platformSignal', () => ({ isPlatformSignalTrusted: jest.fn() }));

const mockTrusted = isPlatformSignalTrusted as jest.Mock;
const mockRequest = AgeRange.requestAgeRangeAsync as jest.Mock;

describe('resolveAgeStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  // REGRESSION: the module must not even be called on an untrusted platform.
  // Below iOS 26 it answers lowerBound: 18, so calling it and reading the result
  // would classify every legacy-iOS user as an adult.
  it('returns unknown WITHOUT calling the module on an untrusted platform', async () => {
    mockTrusted.mockReturnValue(false);
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns eligible for an adult range', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockResolvedValue({ lowerBound: 18, upperBound: null });
    await expect(resolveAgeStatus()).resolves.toBe('eligible');
    expect(mockRequest).toHaveBeenCalledWith({ threshold1: 13 });
  });

  it('returns eligible for a 13-15 range', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockResolvedValue({ lowerBound: 13, upperBound: 15 });
    await expect(resolveAgeStatus()).resolves.toBe('eligible');
  });

  it('returns under13 when the upper bound is below the threshold', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockResolvedValue({ lowerBound: null, upperBound: 12 });
    await expect(resolveAgeStatus()).resolves.toBe('under13');
  });

  it('returns unknown when the user declines (the module throws)', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockRejectedValue(new Error('AgeRangeUserDeclinedException'));
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
  });

  it('returns unknown when the module is unavailable', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockRejectedValue(new Error('AgeRangeNotAvailableException'));
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
  });

  it('returns unknown when both bounds come back null', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockResolvedValue({ lowerBound: null, upperBound: null });
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
  });
});
