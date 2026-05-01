/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2. The FAB writes the most recent shot id and a dismiss
 * deadline; LogShotUndoToast subscribes and renders accordingly.
 */

import { create } from 'zustand';

interface ShotLoggingUiState {
  /** Most recent successfully logged shot id (for the Undo action). */
  lastShotId: string | null;
  /** Round + hole context for the undo mutation. */
  lastShotContext: { roundId: string; holeNumber: number } | null;
  /** Sequence number shown in the toast copy ("Shot N logged"). */
  lastSequence: number | null;
  /** Epoch ms when the toast should auto-dismiss. */
  dismissAt: number | null;
  /** Push a new shot into the toast slot, replacing any prior one. */
  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    durationMs?: number;
  }) => void;
  /** Clear toast (after dismiss/undo). */
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set) => ({
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  dismissAt: null,
  showToast: ({ shotId, sequence, roundId, holeNumber, durationMs }) =>
    set({
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      dismissAt: Date.now() + (durationMs ?? DEFAULT_DURATION_MS),
    }),
  clearToast: () =>
    set({
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      dismissAt: null,
    }),
}));
