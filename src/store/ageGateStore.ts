/**
 * Age-gate prompt state — persisted dismissals for the age confirmation sheet.
 *
 * Dismissal is capped rather than permanent. Someone who swipes the sheet away
 * would otherwise sit at `age_status = 'unknown'` forever with social features
 * off and no visible cause, so the sheet returns after a week, up to three
 * times, after which the Settings row is the only route back.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AgeGateState {
  dismissCount: number;
  lastDismissedAt: string | null;
  recordDismissal: () => void;
  reset: () => void;
}

export const useAgeGateStore = create<AgeGateState>()(
  persist(
    (set) => ({
      dismissCount: 0,
      lastDismissedAt: null,
      recordDismissal: () =>
        set((s) => ({
          dismissCount: s.dismissCount + 1,
          lastDismissedAt: new Date().toISOString(),
        })),
      reset: () => set({ dismissCount: 0, lastDismissedAt: null }),
    }),
    {
      name: 'age-gate-prompt',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dismissCount: state.dismissCount,
        lastDismissedAt: state.lastDismissedAt,
      }),
    }
  )
);
