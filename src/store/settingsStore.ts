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

  // GPS distance-to-pin feature
  showGpsDistance: boolean;

  // Country override (null = auto-detect)
  countryOverride: string | null;

  // Security
  biometricEnabled: boolean;

  // Developer settings
  debugModeEnabled: boolean;

  // Pending league tags: roundId → leagueId (auto-tag after scorecard submission)
  pendingLeagueTags: Record<string, string>;

  // Actions
  setDistanceUnit: (unit: DistanceUnit) => void;
  setShowPutts: (show: boolean) => void;
  setShowFairwayHit: (show: boolean) => void;
  setShowGreenInRegulation: (show: boolean) => void;
  setShowGpsDistance: (show: boolean) => void;
  setCountryOverride: (country: string | null) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setDebugModeEnabled: (enabled: boolean) => void;
  setPendingLeagueTag: (roundId: string, leagueId: string) => void;
  clearPendingLeagueTag: (roundId: string) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS = {
  distanceUnit: 'metres' as DistanceUnit, // Default for Australian market
  showPutts: true,
  showFairwayHit: false,
  showGreenInRegulation: false,
  showGpsDistance: false, // GPS distance-to-pin disabled by default (feature not yet available)
  countryOverride: null as string | null,
  biometricEnabled: false,
  debugModeEnabled: false,
  pendingLeagueTags: {} as Record<string, string>,
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

      setShowGpsDistance: (show) => set({ showGpsDistance: show }),

      setCountryOverride: (country) => set({ countryOverride: country }),

      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),

      setDebugModeEnabled: (enabled) => set({ debugModeEnabled: enabled }),

      setPendingLeagueTag: (roundId, leagueId) =>
        set((state) => ({
          pendingLeagueTags: { ...state.pendingLeagueTags, [roundId]: leagueId },
        })),

      clearPendingLeagueTag: (roundId) =>
        set((state) => {
          const { [roundId]: _, ...rest } = state.pendingLeagueTags;
          return { pendingLeagueTags: rest };
        }),

      resetToDefaults: () => set((state) => ({ ...DEFAULT_SETTINGS, biometricEnabled: state.biometricEnabled })),
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
 * Hook to get visibility settings gated by subscription tier.
 * FIR and GIR require Premium; putts are always available.
 */
export function useStatsVisibilityWithTier() {
  const { showPutts, showFairwayHit, showGreenInRegulation } = useStatsVisibility();
  const isPremium = useIsPremium();

  return {
    showPutts,
    showFairwayHit: isPremium ? showFairwayHit : false,
    showGreenInRegulation: isPremium ? showGreenInRegulation : false,
  };
}

/**
 * Hook to get biometric lock setting
 */
export function useBiometricSetting() {
  const biometricEnabled = useSettingsStore((state) => state.biometricEnabled);
  const setBiometricEnabled = useSettingsStore((state) => state.setBiometricEnabled);
  return { biometricEnabled, setBiometricEnabled };
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
