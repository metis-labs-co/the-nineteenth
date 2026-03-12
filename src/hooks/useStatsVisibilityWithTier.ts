/**
 * Hook to get visibility settings for stats - respects subscription tier
 *
 * FIR/GIR tracking requires Premium tier. This hook automatically returns
 * false for showFairwayHit and showGreenInRegulation if user is not Premium,
 * regardless of their settings preference.
 *
 * Use this hook in scorecard entry and display components.
 * Use useStatsVisibility() for the Settings screen itself.
 *
 * Extracted from settingsStore to break the require cycle:
 * settingsStore -> SubscriptionContext -> useSubscription -> useAuth -> AuthContext -> settingsStore
 */

import { useSettingsStore } from '@/store/settingsStore';
import { useIsPremium } from '@/context/SubscriptionContext';

export function useStatsVisibilityWithTier() {
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);
  const isPremium = useIsPremium();

  return {
    showPutts,
    // FIR/GIR requires Premium - gracefully degrade for lower tiers
    showFairwayHit: isPremium && showFairwayHit,
    showGreenInRegulation: isPremium && showGreenInRegulation,
  };
}
