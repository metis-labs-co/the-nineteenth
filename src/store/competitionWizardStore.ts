/**
 * Competition Wizard Store - Zustand state management for wizard draft persistence
 *
 * Manages wizard form data during the current session:
 * - Step 1: Competition details
 * - Step 2: Rounds configuration
 * - Prize Pool: Prize pool configuration (when enabled)
 *
 * Session-only storage (no AsyncStorage persistence).
 * Draft clears on:
 * - Successful competition creation
 * - App restart
 */

import { create } from 'zustand';
import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
} from '@/schemas/competition';

/**
 * Player data for wizard (simplified from PlayerFormData)
 */
export interface WizardPlayerData {
  id: string;
  name: string;
  email?: string | null;
  handicap?: number | null;
  photo_url?: string | null;
  is_placeholder?: boolean;
}

/** Both pool drafts collected during the wizard (either side may be null) */
export interface WizardPrizePoolConfig {
  individual: PrizePoolConfigFormData | null;
  team: PrizePoolConfigFormData | null;
}

/**
 * Wizard data structure matching CreateCompetitionScreen's WizardState
 */
export interface WizardData {
  step1?: CompetitionDetailsFormData;
  step2?: SimplifiedRoundFormData[];
  players?: WizardPlayerData[];
  prizePoolConfig?: WizardPrizePoolConfig;
}

interface CompetitionWizardState {
  // State
  currentStep: number;
  wizardData: WizardData;
  hasDraft: boolean;
  lastModified: number | null;

  // Actions
  setStep1: (data: CompetitionDetailsFormData) => void;
  setStep2: (data: SimplifiedRoundFormData[]) => void;
  setPlayers: (data: WizardPlayerData[]) => void;
  setPrizePoolConfig: (data: WizardPrizePoolConfig) => void;
  setCurrentStep: (step: number) => void;
  clearDraft: () => void;
  initializeFromRouteParams: (initialState?: WizardData) => void;
}

/**
 * Type-guard for the new dual prizePoolConfig shape. Defends against stale
 * drafts that still hold the old single-pool shape.
 */
function isDualPrizePoolConfig(value: unknown): value is WizardPrizePoolConfig {
  if (!value || typeof value !== 'object') return false;
  return 'individual' in value && 'team' in value;
}

const DEFAULT_STATE = {
  currentStep: 1,
  wizardData: {},
  hasDraft: false,
  lastModified: null,
};

export const useCompetitionWizardStore = create<CompetitionWizardState>((set, get) => ({
  // Initial state with defaults
  ...DEFAULT_STATE,

  // Actions
  setStep1: (data) =>
    set({
      wizardData: { ...get().wizardData, step1: data },
      hasDraft: true,
      lastModified: Date.now(),
    }),

  setStep2: (data) =>
    set({
      wizardData: { ...get().wizardData, step2: data },
      hasDraft: true,
      lastModified: Date.now(),
    }),

  setPlayers: (data) =>
    set({
      wizardData: { ...get().wizardData, players: data },
      hasDraft: true,
      lastModified: Date.now(),
    }),

  setPrizePoolConfig: (data) =>
    set({
      wizardData: { ...get().wizardData, prizePoolConfig: data },
      hasDraft: true,
      lastModified: Date.now(),
    }),

  setCurrentStep: (step) =>
    set({
      currentStep: step,
      hasDraft: true,
      lastModified: Date.now(),
    }),

  clearDraft: () => set(DEFAULT_STATE),

  initializeFromRouteParams: (initialState) => {
    // Only initialize if store is empty and initialState is provided
    if (initialState && !get().hasDraft) {
      // Calculate initial step based on what's provided
      // Steps: 1=Details, 2=Rounds, 3=Players, 4=PrizePool, 5=Review
      let startStep = 1;
      if (initialState.step1 && initialState.step2 && initialState.players) {
        startStep = 4;
      } else if (initialState.step1 && initialState.step2) {
        startStep = 3;
      } else if (initialState.step1) {
        startStep = 2;
      }

      // Discard a stale prizePoolConfig that doesn't match the current shape
      const sanitized: WizardData = { ...initialState };
      if (sanitized.prizePoolConfig && !isDualPrizePoolConfig(sanitized.prizePoolConfig)) {
        delete sanitized.prizePoolConfig;
      }

      set({
        currentStep: startStep,
        wizardData: sanitized,
        hasDraft: true,
        lastModified: Date.now(),
      });
    }
  },
}));

// ============================================
// Selector Hooks
// ============================================

/**
 * Check if a draft exists in the wizard store
 */
export function useHasWizardDraft(): boolean {
  return useCompetitionWizardStore((state) => state.hasDraft);
}

/**
 * Get the current step in the wizard
 */
export function useWizardCurrentStep(): number {
  return useCompetitionWizardStore((state) => state.currentStep);
}

/**
 * Get step 1 data (competition details)
 */
export function useWizardStep1Data(): CompetitionDetailsFormData | undefined {
  return useCompetitionWizardStore((state) => state.wizardData.step1);
}

/**
 * Get step 2 data (rounds configuration)
 */
export function useWizardStep2Data(): SimplifiedRoundFormData[] | undefined {
  return useCompetitionWizardStore((state) => state.wizardData.step2);
}

/**
 * Get players data
 */
export function useWizardPlayersData(): WizardPlayerData[] | undefined {
  return useCompetitionWizardStore((state) => state.wizardData.players);
}

/**
 * Get prize pool configuration data (both targets)
 */
export function useWizardPrizePoolData(): WizardPrizePoolConfig | undefined {
  return useCompetitionWizardStore((state) => state.wizardData.prizePoolConfig);
}

// ============================================
// Non-hook Helpers
// ============================================

/**
 * Clear the wizard draft outside of React components.
 * Use this in callbacks, event handlers, or non-React code.
 */
export function clearWizardDraft(): void {
  useCompetitionWizardStore.getState().clearDraft();
}
