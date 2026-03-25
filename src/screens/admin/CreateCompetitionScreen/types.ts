/**
 * Shared types for CreateCompetitionScreen
 */

import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
  PlayerFormData,
} from '@/schemas/competition';

// Wizard state - simplified 4-step flow (5-step with prize pool)
export interface WizardState {
  step1?: CompetitionDetailsFormData; // Competition details + team toggle + prize pool toggle
  step2?: SimplifiedRoundFormData[]; // Simplified rounds (can be blank)
  players?: PlayerFormData[]; // Players (optional, skippable)
  prizePoolConfig?: PrizePoolConfigFormData; // Prize pool config (when enabled)
}

// Base steps - prize pool step dynamically inserted when enabled
export const BASE_STEPS = [
  { number: 1, title: 'Details', description: 'Name, dates, team toggle' },
  { number: 2, title: 'Rounds', description: 'Configure rounds' },
  { number: 3, title: 'Players', description: 'Add players (optional)' },
  { number: 4, title: 'Review', description: 'Review and create' },
];

// Prize pool step (inserted between Players and Review when enabled)
export const PRIZE_POOL_STEP = { number: 4, title: 'Prize Pool', description: 'Configure prize pool' };

// Parse DD/MM/YYYY string to Date object
import { parse, isValid } from 'date-fns';

export const parseAustralianDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : new Date();
};
