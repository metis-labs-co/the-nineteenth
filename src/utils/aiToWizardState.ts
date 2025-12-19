/**
 * AI to Wizard State Conversion Utilities
 *
 * Converts AI-generated competition data to the wizard form data structure,
 * enabling the "Edit Manually" flow from the AI Competition screen.
 */

import type {
  GeneratedCompetition,
  GeneratedRound,
  GeneratedPlayer,
} from '@/hooks/useGenerateAICompetition';
import type {
  CompetitionDetailsFormData,
  TeamSettingsFormData,
  RoundDetailsFormData,
  PlayerFormData,
  PointSystemEntry,
} from '@/schemas/competition';
import { DEFAULT_POINT_SYSTEM } from '@/schemas/competition';

/**
 * Wizard state structure matching CreateCompetitionScreen
 */
export interface WizardState {
  step1?: CompetitionDetailsFormData;
  step2?: TeamSettingsFormData;
  step3?: RoundDetailsFormData[];
  step4?: PlayerFormData[];
}

/**
 * Convert AI-generated competition to wizard state
 *
 * @param ai - The generated competition from Claude
 * @returns WizardState that can be passed to CreateCompetitionScreen
 *
 * @example
 * ```tsx
 * const { data } = useGenerateAICompetition();
 * if (data?.success) {
 *   const wizardState = aiOutputToWizardState(data.competition);
 *   navigation.navigate('CreateCompetition', { initialState: wizardState });
 * }
 * ```
 */
export function aiOutputToWizardState(ai: GeneratedCompetition): WizardState {
  return {
    step1: aiToCompetitionDetails(ai),
    step2: aiToTeamSettings(ai),
    step3: aiToRoundDetails(ai.rounds),
    step4: aiToPlayerFormData(ai.players),
  };
}

/**
 * Convert AI competition to Step 1 form data
 */
function aiToCompetitionDetails(
  ai: GeneratedCompetition
): CompetitionDetailsFormData {
  return {
    name: ai.name,
    description: ai.description || '',
    competitionType: ai.competitionType,
    startDate: ai.startDate, // Already in DD/MM/YYYY format
    endDate: ai.endDate || '', // Already in DD/MM/YYYY format or null
    handicapSystem: ai.handicapSystem,
    inviteCode: '', // Let the system generate this
  };
}

/**
 * Convert AI team settings to Step 2 form data
 */
function aiToTeamSettings(ai: GeneratedCompetition): TeamSettingsFormData {
  return {
    teamMode: ai.teamMode,
    teamSize: ai.teamSize ?? 2, // Default to 2 if null
    pointSystem: DEFAULT_POINT_SYSTEM as PointSystemEntry[],
  };
}

/**
 * Convert AI rounds to Step 3 form data
 */
function aiToRoundDetails(rounds: GeneratedRound[]): RoundDetailsFormData[] {
  return rounds.map((round) => ({
    courseId: round.courseId || '', // Empty string if not found
    courseName: round.courseName,
    date: round.date, // Already in DD/MM/YYYY format
    teeTime: round.teeTime || '', // Empty string if null
    matchType: round.gameType,
    scoringPairsRequired: false, // Default to false
    // Note: selectedTee is not included as AI doesn't select tees
  }));
}

/**
 * Convert AI players to Step 4 form data
 */
function aiToPlayerFormData(players: GeneratedPlayer[]): PlayerFormData[] {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    email: '', // Not provided by AI
    phone: '', // Not provided by AI
    handicap: player.handicap !== null ? player.handicap.toString() : '',
    golf_id: '', // Not provided by AI
  }));
}

/**
 * Validate that the wizard state is complete enough to navigate to wizard
 *
 * @param state - The wizard state to validate
 * @returns Object with isValid boolean and any validation errors
 */
export function validateWizardState(state: WizardState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!state.step1) {
    errors.push('Competition details are missing');
  } else {
    if (!state.step1.name || state.step1.name.length < 3) {
      errors.push('Competition name must be at least 3 characters');
    }
    if (!state.step1.startDate) {
      errors.push('Start date is required');
    }
  }

  if (!state.step2) {
    errors.push('Team settings are missing');
  }

  if (!state.step3 || state.step3.length === 0) {
    errors.push('At least one round is required');
  } else {
    state.step3.forEach((round, index) => {
      if (!round.courseName) {
        errors.push(`Round ${index + 1}: Course name is required`);
      }
      if (!round.date) {
        errors.push(`Round ${index + 1}: Date is required`);
      }
    });
  }

  if (!state.step4 || state.step4.length < 2) {
    errors.push('At least 2 players are required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if any rounds have missing courses (courseNotFound flag)
 *
 * @param ai - The generated competition from Claude
 * @returns Array of round numbers with missing courses
 */
export function getRoundsWithMissingCourses(
  ai: GeneratedCompetition
): number[] {
  return ai.rounds
    .filter((round) => round.courseNotFound || !round.courseId)
    .map((round) => round.roundNumber);
}

/**
 * Check if team formation is valid based on player count and team settings
 *
 * @param ai - The generated competition from Claude
 * @returns Validation result with isValid and reason if invalid
 */
export function validateTeamFormation(ai: GeneratedCompetition): {
  isValid: boolean;
  reason?: string;
} {
  // No teams - always valid
  if (ai.teamMode === 'none') {
    return { isValid: true };
  }

  const playerCount = ai.players.length;
  const teamSize = ai.teamSize || 2;

  // Check if player count divides evenly into teams
  if (playerCount % teamSize !== 0) {
    return {
      isValid: false,
      reason: `Cannot form teams of ${teamSize} with ${playerCount} players. Need ${teamSize - (playerCount % teamSize)} more player(s) or adjust team size.`,
    };
  }

  // Check if teams are properly formed
  if (ai.teams && ai.teams.length > 0) {
    const expectedTeamCount = playerCount / teamSize;
    if (ai.teams.length !== expectedTeamCount) {
      return {
        isValid: false,
        reason: `Expected ${expectedTeamCount} teams but got ${ai.teams.length}`,
      };
    }

    // Check each team has correct size
    for (const team of ai.teams) {
      if (team.playerIds.length !== teamSize) {
        return {
          isValid: false,
          reason: `Team "${team.name}" has ${team.playerIds.length} players but should have ${teamSize}`,
        };
      }
    }
  }

  return { isValid: true };
}
