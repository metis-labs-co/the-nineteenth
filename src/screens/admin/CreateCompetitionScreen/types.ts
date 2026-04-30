/**
 * Shared types for CreateCompetitionScreen
 */

import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
  PlayerFormData,
} from '@/schemas/competition';

/** Configured pools collected during the wizard */
export interface WizardPrizePoolConfig {
  individual: PrizePoolConfigFormData | null;
  team: PrizePoolConfigFormData | null;
}

// Wizard state — 5-step flow (prize pool step is always shown)
export interface WizardState {
  step1?: CompetitionDetailsFormData; // Competition details + team toggle
  step2?: SimplifiedRoundFormData[]; // Simplified rounds (can be blank)
  players?: PlayerFormData[]; // Players (optional, skippable)
  prizePoolConfig?: WizardPrizePoolConfig; // Both pool drafts (either side may be null)
}

// All wizard steps — prize pool step is always present
export const BASE_STEPS = [
  { number: 1, title: 'Details', description: 'Name, dates, team toggle' },
  { number: 2, title: 'Rounds', description: 'Configure rounds' },
  { number: 3, title: 'Players', description: 'Add players (optional)' },
  { number: 4, title: 'Prize Pool', description: 'Configure prize pool (optional)' },
  { number: 5, title: 'Review', description: 'Review and create' },
];

// Parse DD/MM/YYYY string to Date object
import { parse, isValid } from 'date-fns';

export const parseAustralianDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : new Date();
};
