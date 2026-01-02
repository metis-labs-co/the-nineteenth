/**
 * Settings Store - Zustand state management for user preferences
 *
 * Manages user preferences including:
 * - Distance units (yards/metres)
 * - Scoring entry toggles (putts, FIR, GIR)
 * - Persisted to AsyncStorage for offline support
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsPremium } from '@/context/SubscriptionContext';

export type DistanceUnit = 'yards' | 'metres';

interface SettingsState {
  // Distance preferences
  distanceUnit: DistanceUnit;

  // Scoring entry toggles
  showPutts: boolean;
  showFairwayHit: boolean;
  showGreenInRegulation: boolean;

  // Developer settings
  debugModeEnabled: boolean;

  // Actions
  setDistanceUnit: (unit: DistanceUnit) => void;
  setShowPutts: (show: boolean) => void;
  setShowFairwayHit: (show: boolean) => void;
  setShowGreenInRegulation: (show: boolean) => void;
  setDebugModeEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS = {
  distanceUnit: 'metres' as DistanceUnit, // Default for Australian market
  showPutts: true,
  showFairwayHit: false,
  showGreenInRegulation: false,
  debugModeEnabled: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state with defaults
      ...DEFAULT_SETTINGS,

      // Actions
      setDistanceUnit: (unit) => set({ distanceUnit: unit }),

      setShowPutts: (show) => set({ showPutts: show }),

      setShowFairwayHit: (show) => set({ showFairwayHit: show }),

      setShowGreenInRegulation: (show) => set({ showGreenInRegulation: show }),

      setDebugModeEnabled: (enabled) => set({ debugModeEnabled: enabled }),

      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Hook to get formatted distance with unit
 */
export function useFormattedDistance() {
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);

  return {
    formatDistance: (yards: number): string => {
      if (distanceUnit === 'metres') {
        // Convert yards to metres (1 yard = 0.9144 metres)
        const metres = Math.round(yards * 0.9144);
        return `${metres}m`;
      }
      return `${yards}yd`;
    },
    unit: distanceUnit,
    unitLabel: distanceUnit === 'metres' ? 'm' : 'yd',
  };
}

/**
 * Hook to get visibility settings for stats
 */
export function useStatsVisibility() {
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);

  return {
    showPutts,
    showFairwayHit,
    showGreenInRegulation,
  };
}

/**
 * Hook to get visibility settings for stats - respects subscription tier
 *
 * FIR/GIR tracking requires Premium tier. This hook automatically returns
 * false for showFairwayHit and showGreenInRegulation if user is not Premium,
 * regardless of their settings preference.
 *
 * Use this hook in scorecard entry and display components.
 * Use useStatsVisibility() for the Settings screen itself.
 */
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

/**
 * Hook to get debug mode settings
 */
export function useDebugMode() {
  const debugModeEnabled = useSettingsStore((state) => state.debugModeEnabled);
  const setDebugModeEnabled = useSettingsStore((state) => state.setDebugModeEnabled);

  return {
    debugModeEnabled,
    setDebugModeEnabled,
    toggleDebugMode: () => setDebugModeEnabled(!debugModeEnabled),
  };
}
