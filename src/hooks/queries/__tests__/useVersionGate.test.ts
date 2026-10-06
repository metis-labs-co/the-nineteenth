import { resolveGateStatus } from '../useVersionGate';
import type { AppVersionConfig } from '@/types';

const cfg = (min: string, latest: string): AppVersionConfig => ({
  platform: 'ios',
  minimumVersion: min,
  latestVersion: latest,
  storeUrl: 'https://example.com',
  message: null,
});

describe('resolveGateStatus', () => {
  it('fails open to ok when config is null', () => {
    expect(resolveGateStatus('1.0.0', null)).toBe('ok');
  });

  it('returns hard when running is below minimum', () => {
    expect(resolveGateStatus('1.12.0', cfg('1.13.0', '1.13.1'))).toBe('hard');
  });

  it('returns soft when at/above minimum but below latest', () => {
    expect(resolveGateStatus('1.13.0', cfg('1.13.0', '1.13.1'))).toBe('soft');
  });

  it('returns ok when at latest', () => {
    expect(resolveGateStatus('1.13.1', cfg('1.13.0', '1.13.1'))).toBe('ok');
  });

  it('returns ok when newer than latest', () => {
    expect(resolveGateStatus('1.14.0', cfg('1.13.0', '1.13.1'))).toBe('ok');
  });

  it('hard takes precedence (numeric, not lexical)', () => {
    expect(resolveGateStatus('1.9.0', cfg('1.10.0', '1.10.0'))).toBe('hard');
  });
});
