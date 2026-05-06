/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2 + V2 Phase B. Three toast variants:
 *  - 'success'      — "Shot N logged · Undo" or (if from_bunker) "Bunker shot N logged · Undo"
 *  - 'error'        — error message + Dismiss
 *  - 'bunkerPrompt' — "Was that a bunker shot? · Yes · No" (under-mapped courses only)
 *
 * Bunker-prompt cooldown: a Set keyed by `${roundId}:${holeNumber}` —
 * dismissing the prompt (No or auto-dismiss to No) adds the pair to
 * the set, suppressing further prompts on that hole for the rest of
 * the round. Tapping Yes does NOT add to the set — the engaged user
 * may have more bunker shots to come.
 */

import { create } from 'zustand';

export type ShotToastVariant = 'success' | 'error' | 'bunkerPrompt';

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

  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    fromBunker?: boolean;
    durationMs?: number;
  }) => void;
  showErrorToast: (input: { message: string; durationMs?: number }) => void;
  showBunkerPrompt: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    durationMs?: number;
  }) => void;
  dismissBunkerPrompt: (input: { confirmed: boolean }) => void;
  clearBunkerCooldownForRound: (roundId: string) => void;
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 6_000;
const BUNKER_PROMPT_DURATION_MS = 8_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set) => ({
  variant: 'success',
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  lastFromBunker: false,
  errorMessage: null,
  dismissAt: null,
  bunkerPromptCooldown: new Set<string>(),

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
