import { renderHook } from '@testing-library/react-native';
import type { SubscriptionTier } from '@/types/subscription.types';
import { useMapTier } from '@/hooks/useMapTier';
import { useTier } from '@/context/SubscriptionContext';

jest.mock('@/context/SubscriptionContext', () => ({
  useTier: jest.fn(),
}));

const mockedUseTier = useTier as jest.MockedFunction<typeof useTier>;

describe('useMapTier', () => {
  beforeEach(() => {
    mockedUseTier.mockReset();
  });

  const cases: Array<[SubscriptionTier, 'free' | 'social' | 'premium']> = [
    ['free', 'free'],
    ['social', 'social'],
    ['premium', 'premium'],
    ['enterprise', 'premium'],
    ['super_admin', 'premium'],
    ['developer', 'premium'],
  ];

  it.each(cases)('maps subscription tier %s -> map tier %s', (sub, expected) => {
    mockedUseTier.mockReturnValue(sub);
    const { result } = renderHook(() => useMapTier());
    expect(result.current).toBe(expected);
  });
});
