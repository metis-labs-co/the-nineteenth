/**
 * Home screen UI state — persisted dismissals for one-off prompts.
 *
 * `gettingStartedDismissed`: user closed the "Getting started" card from the
 * Home screen. Once dismissed, the card stays hidden across sessions even if
 * tasks remain incomplete.
 *
 * `handicapUpsellDismissed`: user closed the compact Social Handicap Index
 * upsell row shown to tiers without handicap history. Only ever consulted
 * while the feature is locked, so upgrading brings the full card back.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeUiState {
  gettingStartedDismissed: boolean;
  dismissGettingStarted: () => void;
  resetGettingStartedDismissed: () => void;
  handicapUpsellDismissed: boolean;
  dismissHandicapUpsell: () => void;
  resetHandicapUpsellDismissed: () => void;
}

export const useHomeUiStore = create<HomeUiState>()(
  persist(
    (set) => ({
      gettingStartedDismissed: false,
      dismissGettingStarted: () => set({ gettingStartedDismissed: true }),
      resetGettingStartedDismissed: () =>
        set({ gettingStartedDismissed: false }),
      handicapUpsellDismissed: false,
      dismissHandicapUpsell: () => set({ handicapUpsellDismissed: true }),
      resetHandicapUpsellDismissed: () =>
        set({ handicapUpsellDismissed: false }),
    }),
    {
      name: 'home-ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        gettingStartedDismissed: state.gettingStartedDismissed,
        handicapUpsellDismissed: state.handicapUpsellDismissed,
      }),
    }
  )
);
