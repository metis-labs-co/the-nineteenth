import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WelcomeScreenId = 'rounds' | 'competitions' | 'leagues' | 'courses' | 'leagueDetail';

interface ScreenInfoState {
  screensSeen: Record<WelcomeScreenId, boolean>;
  markScreenSeen: (id: WelcomeScreenId) => void;
  resetAllScreensSeen: () => void;
}

const DEFAULT_SCREENS_SEEN: Record<WelcomeScreenId, boolean> = {
  rounds: false,
  competitions: false,
  leagues: false,
  courses: false,
  leagueDetail: false,
};

export const useScreenInfoStore = create<ScreenInfoState>()(
  persist(
    (set) => ({
      screensSeen: { ...DEFAULT_SCREENS_SEEN },
      markScreenSeen: (id) =>
        set((state) => ({
          screensSeen: { ...state.screensSeen, [id]: true },
        })),
      resetAllScreensSeen: () =>
        set({ screensSeen: { ...DEFAULT_SCREENS_SEEN } }),
    }),
    {
      name: 'screen-info-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
