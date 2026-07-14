/**
 * Per-(round, hole) tee origin override.
 *
 * GolfAPI gives us only `tee_back` and `tee_front` GPS points — there's no
 * data telling us which tees a player actually played from on a given round.
 * Default behavior: use `tee_back` if available, falling back to `tee_front`.
 *
 * If a player played from a different tee than the default, this store lets
 * them flip the origin (back ↔ front) for that specific hole. The choice
 * persists across app launches via AsyncStorage but is intentionally local-
 * only — shot tracking is a solo feature so multi-device sync isn't needed.
 *
 * Consumers (per-club stats, shot log list, hole map) read overrides through
 * `pickTeeCoordWithOverride` so shot 1's distance recomputes from the chosen
 * origin everywhere.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-(round, hole) tee origin selection.
 *
 * - `'back'` / `'front'`: pick the GolfAPI-provided tee coordinate
 * - any other string: a `custom_hole_tees.id` UUID (user-defined custom tee)
 *
 * The `(string & {})` member preserves literal autocomplete for back/front
 * while still allowing arbitrary UUID strings.
 */
export type TeeOverride = 'back' | 'front' | (string & Record<never, never>);

interface TeeOverrideState {
  /** `${roundId}::${holeNumber}` → chosen tee. Missing key = use default. */
  byRoundHole: Record<string, TeeOverride>;
  setOverride: (roundId: string, holeNumber: number, tee: TeeOverride) => void;
  clearOverride: (roundId: string, holeNumber: number) => void;
  getOverride: (roundId: string, holeNumber: number) => TeeOverride | null;
}

const keyFor = (roundId: string, holeNumber: number) =>
  `${roundId}::${holeNumber}`;

export const useTeeOverrideStore = create<TeeOverrideState>()(
  persist(
    (set, get) => ({
      byRoundHole: {},

      setOverride: (roundId, holeNumber, tee) =>
        set((state) => ({
          byRoundHole: { ...state.byRoundHole, [keyFor(roundId, holeNumber)]: tee },
        })),

      clearOverride: (roundId, holeNumber) =>
        set((state) => {
          const key = keyFor(roundId, holeNumber);
          if (!(key in state.byRoundHole)) return state;
          const { [key]: _, ...rest } = state.byRoundHole;
          return { byRoundHole: rest };
        }),

      getOverride: (roundId, holeNumber) =>
        get().byRoundHole[keyFor(roundId, holeNumber)] ?? null,
    }),
    {
      name: 'tee-override-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byRoundHole: state.byRoundHole }),
    }
  )
);
