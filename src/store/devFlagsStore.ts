/**
 * Dev Flags Store - persistent toggles for previewing UI states that would
 * otherwise require fresh accounts or contrived data.
 *
 * Flags are persisted via AsyncStorage so they survive reloads, but every
 * consumer must gate reads behind `__DEV__` so they are inert in release
 * builds even if a value somehow ended up persisted.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DevFlagsState {
  // Force the Home screen to render its NewUserFallback empty state, even
  // when the signed-in account has rounds, competitions, friends, etc.
  forceNewUserHome: boolean;

  setForceNewUserHome: (value: boolean) => void;
  toggleForceNewUserHome: () => void;
}

export const useDevFlagsStore = create<DevFlagsState>()(
  persist(
    (set, get) => ({
      forceNewUserHome: false,

      setForceNewUserHome: (value) => set({ forceNewUserHome: value }),
      toggleForceNewUserHome: () =>
        set({ forceNewUserHome: !get().forceNewUserHome }),
    }),
    {
      name: 'dev-flags-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        forceNewUserHome: state.forceNewUserHome,
      }),
    }
  )
);
