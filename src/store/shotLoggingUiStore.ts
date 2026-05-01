/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2. The FAB writes the most recent shot id and a dismiss
 * deadline; LogShotUndoToast subscribes and renders accordingly.
 */

import { create } from 'zustand';

export type ShotToastVariant = 'success' | 'error';

interface ShotLoggingUiState {
  variant: ShotToastVariant;
  /** Most recent successfully logged shot id (for the Undo action). */
  lastShotId: string | null;
  /** Round + hole context for the undo mutation. */
  lastShotContext: { roundId: string; holeNumber: number } | null;
  /** Sequence number shown in the toast copy ("Shot N logged"). */
  lastSequence: number | null;
  /** Free-form error message used when variant === 'error'. */
  errorMessage: string | null;
  /** Epoch ms when the toast should auto-dismiss. */
  dismissAt: number | null;

  /** Push a success toast: "Shot N logged" + Undo. */
  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    durationMs?: number;
  }) => void;
  /** Push an error toast (no Undo). */
  showErrorToast: (input: { message: string; durationMs?: number }) => void;
  /** Clear toast (after dismiss/undo). */
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 6_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set) => ({
  variant: 'success',
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  errorMessage: null,
  dismissAt: null,

  showToast: ({ shotId, sequence, roundId, holeNumber, durationMs }) =>
    set({
      variant: 'success',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? DEFAULT_DURATION_MS),
    }),

  showErrorToast: ({ message, durationMs }) =>
    set({
      variant: 'error',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      errorMessage: message,
      dismissAt: Date.now() + (durationMs ?? ERROR_DURATION_MS),
    }),

  clearToast: () =>
    set({
      variant: 'success',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      errorMessage: null,
      dismissAt: null,
    }),
}));
