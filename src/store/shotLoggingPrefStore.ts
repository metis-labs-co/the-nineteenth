/**
 * Per-round "Track shots" preference store.
 *
 * Phase C2 spec leaves this client-side (Zustand) for v1 to avoid a
 * `rounds.track_shots` migration. If multi-device sync becomes a real
 * complaint, swap the implementation for a server column.
 */

import { create } from 'zustand';

interface ShotLoggingPrefState {
  /** roundId → trackShots flag. Default false when missing. */
  byRound: Record<string, boolean>;
  setTrackShots: (roundId: string, trackShots: boolean) => void;
  isTracking: (roundId: string) => boolean;
  clear: (roundId: string) => void;
}

export const useShotLoggingPrefStore = create<ShotLoggingPrefState>((set, get) => ({
  byRound: {},
  setTrackShots: (roundId, trackShots) =>
    set((state) => ({
      byRound: { ...state.byRound, [roundId]: trackShots },
    })),
  isTracking: (roundId) => get().byRound[roundId] === true,
  clear: (roundId) =>
    set((state) => {
      const { [roundId]: _, ...rest } = state.byRound;
      return { byRound: rest };
    }),
}));
