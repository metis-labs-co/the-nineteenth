/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2. The FAB writes the most recent shot id and a dismiss
 * deadline; LogShotUndoToast subscribes and renders accordingly.
 *
 * Auto-bunker (May 2026): toast can render a "Bunker shot logged" variant
 * when the inserted row's from_bunker flag is true.
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
  /** True when the shot was auto-detected as originating from a bunker. */
  lastFromBunker: boolean;
  /** Free-form error message used when variant === 'error'. */
  errorMessage: string | null;
  /** Epoch ms when the toast should auto-dismiss. */
  dismissAt: number | null;

  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    fromBunker?: boolean;
    durationMs?: number;
  }) => void;
  showErrorToast: (input: { message: string; durationMs?: number }) => void;
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 6_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set) => ({
  variant: 'success',
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  lastFromBunker: false,
  errorMessage: null,
  dismissAt: null,

  showToast: ({ shotId, sequence, roundId, holeNumber, fromBunker, durationMs }) =>
    set({
      variant: 'success',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      lastFromBunker: fromBunker ?? false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? DEFAULT_DURATION_MS),
    }),

  showErrorToast: ({ message, durationMs }) =>
    set({
      variant: 'error',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: message,
      dismissAt: Date.now() + (durationMs ?? ERROR_DURATION_MS),
    }),

  clearToast: () =>
    set({
      variant: 'success',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: null,
    }),
}));
