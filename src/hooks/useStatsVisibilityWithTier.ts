/**
 * Hook to get visibility settings for stats - respects subscription tier
 *
 * FIR/GIR tracking requires Premium tier (fir_gir_tracking).
 * Detailed stats (miss directions, bunkers, hazards) require Premium tier (detailed_stats).
 * Putts are always available.
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
  const showFairwayMissDirection = useSettingsStore((state) => state.showFairwayMissDirection);
  const showGreenMissDirection = useSettingsStore((state) => state.showGreenMissDirection);
  const showBunkerShots = useSettingsStore((state) => state.showBunkerShots);
  const showHazards = useSettingsStore((state) => state.showHazards);
  const isPremium = useIsPremium();

  const effectiveFairwayMissDirection = isPremium && showFairwayMissDirection;
  const effectiveGreenMissDirection = isPremium && showGreenMissDirection;
  const effectiveBunkerShots = isPremium && showBunkerShots;
  const effectiveHazards = isPremium && showHazards;

  return {
    showPutts,
    // FIR/GIR requires Premium - gracefully degrade for lower tiers
    showFairwayHit: isPremium && showFairwayHit,
    showGreenInRegulation: isPremium && showGreenInRegulation,
    // Detailed stats require Premium
    showFairwayMissDirection: effectiveFairwayMissDirection,
    showGreenMissDirection: effectiveGreenMissDirection,
    showBunkerShots: effectiveBunkerShots,
    showHazards: effectiveHazards,
    // Convenience: true if any detailed stat is enabled (controls "+" button visibility)
    hasAnyDetailedStats:
      effectiveFairwayMissDirection ||
      effectiveGreenMissDirection ||
      effectiveBunkerShots ||
      effectiveHazards,
  };
}
