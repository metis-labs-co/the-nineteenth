/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2 + V2 Phase B. Five toast variants:
 *  - 'success'      — "Shot N logged · Undo" or (if from_bunker) "Bunker shot N logged · Undo"
 *  - 'error'        — error message + Dismiss
 *  - 'warning'      — "Shot N logged with weak GPS · Undo" (low-accuracy reading)
 *  - 'bunkerPrompt' — "Was that a bunker shot? · Yes · No" (under-mapped courses only)
 *  - 'shotPrompt'   — "Did you just take a shot? · Yes · Dismiss" (dwell-based)
 *
 * Bunker-prompt cooldown: a Set keyed by `${roundId}:${holeNumber}` —
 * dismissing the prompt (No or auto-dismiss to No) adds the pair to
 * the set, suppressing further prompts on that hole for the rest of
 * the round. Tapping Yes does NOT add to the set — the engaged user
 * may have more bunker shots to come.
 */

import { create } from 'zustand';

export type ShotToastVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'bunkerPrompt'
  | 'shotPrompt';

export interface DwellPosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

interface ShotLoggingUiState {
  variant: ShotToastVariant;
  lastShotId: string | null;
  lastShotContext: { roundId: string; holeNumber: number } | null;
  lastSequence: number | null;
  lastFromBunker: boolean;
  errorMessage: string | null;
  dismissAt: number | null;
  /** (roundId:holeNumber) pairs where the user dismissed the bunker prompt this round. */
  bunkerPromptCooldown: Set<string>;
  /**
   * Dwell-based shot prompt state. `dwellPosition` is the GPS captured at
   * the moment the prompt fired; `confirmedDwellPosition` is set after the
   * user taps Yes and is consumed by LogShotInline to open the club picker.
   */
  dwellPosition: DwellPosition | null;
  confirmedDwellPosition: DwellPosition | null;
  /** Last time the dwell prompt was fired or dismissed (epoch ms). */
  lastDwellEventAt: number | null;

  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    fromBunker?: boolean;
    durationMs?: number;
  }) => void;
  showErrorToast: (input: { message: string; durationMs?: number }) => void;
  showWarningToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    fromBunker?: boolean;
    durationMs?: number;
  }) => void;
  showBunkerPrompt: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    durationMs?: number;
  }) => void;
  dismissBunkerPrompt: (input: { confirmed: boolean }) => void;
  clearBunkerCooldownForRound: (roundId: string) => void;
  showShotPrompt: (input: {
    position: DwellPosition;
    durationMs?: number;
  }) => void;
  confirmShotPrompt: () => void;
  dismissShotPrompt: () => void;
  consumeConfirmedDwellPosition: () => DwellPosition | null;
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 6_000;
const WARNING_DURATION_MS = 7_000;
const BUNKER_PROMPT_DURATION_MS = 8_000;
const SHOT_PROMPT_DURATION_MS = 12_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set, get) => ({
  variant: 'success',
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  lastFromBunker: false,
  errorMessage: null,
  dismissAt: null,
  bunkerPromptCooldown: new Set<string>(),
  dwellPosition: null,
  confirmedDwellPosition: null,
  lastDwellEventAt: null,

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

  showWarningToast: ({ shotId, sequence, roundId, holeNumber, fromBunker, durationMs }) =>
    set({
      variant: 'warning',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      lastFromBunker: fromBunker ?? false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? WARNING_DURATION_MS),
    }),

  showBunkerPrompt: ({ shotId, sequence, roundId, holeNumber, durationMs }) =>
    set({
      variant: 'bunkerPrompt',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? BUNKER_PROMPT_DURATION_MS),
    }),

  dismissBunkerPrompt: ({ confirmed }) =>
    set((state) => {
      if (confirmed) {
        // Morph the toast into a success "Bunker shot logged" for the
        // remainder of the dismissal window — small reinforcement that
        // the action took effect. Cooldown is NOT added.
        return {
          variant: 'success',
          lastFromBunker: true,
          // dismissAt and other fields stay
        };
      }
      // No / auto-dismiss: cooldown the (round, hole) pair and clear the toast.
      const ctx = state.lastShotContext;
      const nextCooldown = new Set(state.bunkerPromptCooldown);
      if (ctx) {
        nextCooldown.add(`${ctx.roundId}:${ctx.holeNumber}`);
      }
      return {
        variant: 'success',
        lastShotId: null,
        lastShotContext: null,
        lastSequence: null,
        lastFromBunker: false,
        errorMessage: null,
        dismissAt: null,
        bunkerPromptCooldown: nextCooldown,
      };
    }),

  clearBunkerCooldownForRound: (roundId) =>
    set((state) => {
      const prefix = `${roundId}:`;
      const next = new Set<string>();
      for (const key of state.bunkerPromptCooldown) {
        if (!key.startsWith(prefix)) next.add(key);
      }
      return { bunkerPromptCooldown: next };
    }),

  showShotPrompt: ({ position, durationMs }) =>
    set({
      variant: 'shotPrompt',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? SHOT_PROMPT_DURATION_MS),
      dwellPosition: position,
      confirmedDwellPosition: null,
      lastDwellEventAt: Date.now(),
    }),

  confirmShotPrompt: () =>
    set((state) => ({
      variant: 'success',
      dismissAt: null,
      confirmedDwellPosition: state.dwellPosition,
      dwellPosition: null,
      lastDwellEventAt: Date.now(),
    })),

  dismissShotPrompt: () =>
    set({
      variant: 'success',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: null,
      dwellPosition: null,
      confirmedDwellPosition: null,
      lastDwellEventAt: Date.now(),
    }),

  consumeConfirmedDwellPosition: () => {
    const pos = get().confirmedDwellPosition;
    if (pos) set({ confirmedDwellPosition: null });
    return pos;
  },

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
