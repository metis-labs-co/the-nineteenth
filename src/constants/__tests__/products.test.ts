import {
  PRODUCT_IDS,
  PRODUCT_ID_TO_TIER,
  TIER_TO_PRODUCT_IDS,
  DEFAULT_PRICING_AUD,
  getBillingPeriod,
  getTierFromProductId,
  isValidProductId,
} from '@/constants/products';

describe('lifetime products', () => {
  it('exposes lifetime product IDs', () => {
    expect(PRODUCT_IDS.SOCIAL_LIFETIME).toBe('the.nineteenth.social.lifetime');
    expect(PRODUCT_IDS.PREMIUM_LIFETIME).toBe('the.nineteenth.premium.lifetime');
  });

  it('maps lifetime products to their tier', () => {
    expect(PRODUCT_ID_TO_TIER[PRODUCT_IDS.SOCIAL_LIFETIME]).toBe('social');
    expect(PRODUCT_ID_TO_TIER[PRODUCT_IDS.PREMIUM_LIFETIME]).toBe('premium');
    expect(getTierFromProductId('the.nineteenth.premium.lifetime')).toBe('premium');
  });

  it('lists lifetime products under each tier', () => {
    expect(TIER_TO_PRODUCT_IDS.social).toContain(PRODUCT_IDS.SOCIAL_LIFETIME);
    expect(TIER_TO_PRODUCT_IDS.premium).toContain(PRODUCT_IDS.PREMIUM_LIFETIME);
  });

  it('detects the lifetime billing period', () => {
    expect(getBillingPeriod('the.nineteenth.social.lifetime')).toBe('lifetime');
    expect(getBillingPeriod('the.nineteenth.social.yearly')).toBe('yearly');
    expect(getBillingPeriod('the.nineteenth.social.monthly')).toBe('monthly');
  });

  it('has fallback pricing for lifetime products', () => {
    expect(DEFAULT_PRICING_AUD[PRODUCT_IDS.SOCIAL_LIFETIME].price).toBe(119.99);
    expect(DEFAULT_PRICING_AUD[PRODUCT_IDS.PREMIUM_LIFETIME].price).toBe(249.99);
  });

  it('treats lifetime IDs as valid', () => {
    expect(isValidProductId('the.nineteenth.premium.lifetime')).toBe(true);
  });
});
