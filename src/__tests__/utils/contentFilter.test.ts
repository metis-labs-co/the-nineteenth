// src/__tests__/utils/contentFilter.test.ts
import { containsBlockedTerms } from '@/utils/contentFilter';

describe('containsBlockedTerms', () => {
  it('accepts ordinary golf chat', () => {
    expect(containsBlockedTerms('Great round mate, that putt on 17 was filthy')).toBe(false);
  });

  it('accepts an empty string', () => {
    expect(containsBlockedTerms('')).toBe(false);
  });

  it('rejects a blocked term regardless of case', () => {
    expect(containsBlockedTerms('you are a SLUR_EXAMPLE')).toBe(true);
    expect(containsBlockedTerms('slur_example')).toBe(true);
  });

  it('matches on word boundaries, not substrings', () => {
    // "scunthorpe problem": a term embedded in an innocent word must not match.
    expect(containsBlockedTerms('assess the lie before you swing')).toBe(false);
  });

  it('catches a term surrounded by punctuation', () => {
    expect(containsBlockedTerms('what a slur_example!')).toBe(true);
  });
});
