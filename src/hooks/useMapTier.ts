import { useTier } from '@/context/SubscriptionContext';

export type MapTier = 'free' | 'social' | 'premium';

export function useMapTier(): MapTier {
  const tier = useTier();
  if (
    tier === 'premium' ||
    tier === 'enterprise' ||
    tier === 'super_admin' ||
    tier === 'developer'
  ) {
    return 'premium';
  }
  if (tier === 'social') return 'social';
  return 'free';
}
