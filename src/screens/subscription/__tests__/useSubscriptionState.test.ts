import { computeIsLifetime } from '../useSubscriptionState';

describe('computeIsLifetime', () => {
  it('is true for an active paid sub with no expiry', () => {
    expect(computeIsLifetime({ status: 'active', expiresAt: null }, 'premium')).toBe(true);
    expect(computeIsLifetime({ status: 'active', expiresAt: null }, 'social')).toBe(true);
  });

  it('is false for free tier even with no expiry', () => {
    expect(computeIsLifetime({ status: 'active', expiresAt: null }, 'free')).toBe(false);
  });

  it('is false when an expiry date exists (normal yearly sub)', () => {
    expect(computeIsLifetime({ status: 'active', expiresAt: new Date() }, 'premium')).toBe(false);
  });

  it('is false when not active', () => {
    expect(computeIsLifetime({ status: 'expired', expiresAt: null }, 'premium')).toBe(false);
  });

  it('is false when there is no subscription', () => {
    expect(computeIsLifetime(null, 'premium')).toBe(false);
  });
});
