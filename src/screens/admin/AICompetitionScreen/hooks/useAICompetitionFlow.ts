/**
 * useAICompetitionFlow - Manages AI competition generation and creation flow
 *
 * Handles prompt validation, AI generation, and competition creation
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { parse, isValid } from 'date-fns';

import {
  useGenerateAICompetition,
  getAIErrorMessage,
  type GeneratedCompetition,
} from '@/hooks/useGenerateAICompetition';
import { useCreateCompetition } from '@/hooks/useCreateCompetition';
import type { TeamFormat } from '@/types/database.types';
import { useCreatePlaceholderPlayer } from '@/hooks/usePlaceholderPlayers';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { TEAM_ONLY_GAME_TYPES } from '@/services/rounds/resultsEngine';
import {
  aiOutputToWizardState,
  getRoundsWithMissingCourses,
  validateTeamFormation,
} from '@/utils/aiToWizardState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Screen states
export type ScreenState = 'input' | 'loading' | 'preview' | 'error';

// Dialog types for ConfirmationDialog
export type DialogType =
  | 'prompt_too_short'
  | 'creation_failed'
  | 'team_config_issue'
  | 'game_type_unavailable'
  | 'courses_not_found'
  | 'guest_players_warning'
  | null;

export interface DialogConfig {
  visible: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: 'primary' | 'destructive';
  showSecondaryAction?: boolean;
  secondaryActionLabel?: string;
  onConfirm: () => void;
  onSecondaryAction?: () => void;
  onCancel: () => void;
}

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : new Date();
};

// Note: friendsCount is no longer required - AI can create placeholder players when needed

interface UseAICompetitionFlowReturn {
  screenState: ScreenState;
  prompt: string;
  setPrompt: (value: string) => void;
  generatedCompetition: GeneratedCompetition | null;
  errorMessage: string;
  isGenerating: boolean;
  isCreating: boolean;
  dialogConfig: DialogConfig;
  handleSuggestionSelect: (suggestion: string) => void;
  handleGenerate: () => Promise<void>;
  handleCreateCompetition: () => Promise<void>;
  handleEditManually: () => void;
  handleBack: () => void;
  handleRetry: () => void;
  dismissDialog: () => void;
}

// Default dialog config
const defaultDialogConfig: DialogConfig = {
  visible: false,
  type: null,
  title: '',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  confirmVariant: 'primary',
  onConfirm: () => {},
  onCancel: () => {},
};

export function useAICompetitionFlow(): UseAICompetitionFlowReturn {
  const navigation = useNavigation<NavigationProp>();

  // State
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [prompt, setPrompt] = useState('');
  const [generatedCompetition, setGeneratedCompetition] =
    useState<GeneratedCompetition | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>(defaultDialogConfig);

  // Hooks
  const generateAI = useGenerateAICompetition();
  const createCompetition = useCreateCompetition();
  const createPlaceholder = useCreatePlaceholderPlayer();
  const checkFeature = useCheckFeature();

  // Dismiss dialog helper
  const dismissDialog = useCallback(() => {
    setDialogConfig(defaultDialogConfig);
  }, []);

  // Show dialog helper
  const showDialog = useCallback((config: Partial<DialogConfig> & { type: DialogType; title: string; message: string }) => {
    setDialogConfig({
      ...defaultDialogConfig,
      visible: true,
      ...config,
      onCancel: config.onCancel ?? (() => setDialogConfig(defaultDialogConfig)),
    });
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setPrompt(suggestion);
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (prompt.trim().length < 10) {
      showDialog({
        type: 'prompt_too_short',
        title: 'Prompt Too Short',
        message: 'Please provide more details about your competition (at least 10 characters).',
        confirmLabel: 'OK',
        onConfirm: dismissDialog,
      });
      return;
    }

    // Note: We no longer require friends - AI can create placeholder players if needed

    setScreenState('loading');
    setErrorMessage('');

    try {
      const result = await generateAI.mutateAsync(prompt);

      if (result.success) {
        setGeneratedCompetition(result.competition);
        setScreenState('preview');
      } else {
        setErrorMessage(getAIErrorMessage(result));
        setScreenState('error');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.'
      );
      setScreenState('error');
    }
  }, [prompt, generateAI, showDialog, dismissDialog]);

  // Actually create the competition
  const doCreateCompetition = useCallback(async () => {
    if (!generatedCompetition) return;

    try {
      // Step 1: Identify new placeholder players that need to be created
      const newPlaceholders = generatedCompetition.players.filter(
        (p) => p.isPlaceholder === true
      );

      // Step 2: Create new placeholder players and map temp IDs to real IDs
      const idMapping: Record<string, string> = {};

      if (newPlaceholders.length > 0) {
        for (const placeholder of newPlaceholders) {
          try {
            const created = await createPlaceholder.mutateAsync({
              name: placeholder.name,
              handicap: placeholder.handicap,
            });
            // Map the temporary AI-generated UUID to the real database UUID
            idMapping[placeholder.id] = created.id;
          } catch {
            throw new Error(`Failed to create guest player "${placeholder.name}". Please try again.`);
          }
        }
      }

      // Step 3: Build final players list with real IDs
      const finalPlayers = generatedCompetition.players.map((player) => ({
        id: idMapping[player.id] || player.id, // Use mapped ID for new placeholders
        name: player.name,
        email: '', // AI doesn't collect emails - admin can add later
        handicap: player.handicap ?? undefined,
      }));

      // Step 4: Create the competition
      const result = await createCompetition.mutateAsync({
        // Competition details
        name: generatedCompetition.name,
        description: generatedCompetition.description ?? undefined,
        competitionType: generatedCompetition.competitionType,
        startDate: parseAustralianDate(generatedCompetition.startDate),
        endDate: generatedCompetition.endDate
          ? parseAustralianDate(generatedCompetition.endDate)
          : undefined,
        handicapSystem: generatedCompetition.handicapSystem,
        visibility: generatedCompetition.visibility || 'private',

        // Team settings
        teamMode: generatedCompetition.teamMode,
        teamSize: generatedCompetition.teamSize ?? undefined,

        // Rounds - set team properties based on competition team mode and game type
        rounds: generatedCompetition.rounds.map((round) => {
          // Determine if this round should be a team round based on AI output or inference
          const isTeamGameType = (TEAM_ONLY_GAME_TYPES as string[]).includes(round.gameType);
          const hasTeams = generatedCompetition.teamMode !== 'none';
          const isTeamRound = round.isTeamRound ?? (hasTeams && isTeamGameType);

          // Use AI-provided teamFormat with fallback to inference
          const teamFormat = hasTeams
            ? ((round.teamFormat || (isTeamGameType ? round.gameType : undefined)) as TeamFormat | undefined)
            : undefined;

          return {
            courseName: round.courseName,
            courseId: round.courseId || undefined,
            date: parseAustralianDate(round.date),
            teeTime: round.teeTime || undefined,
            matchType: round.gameType,
            isTeamRound,
            teamFormat,
            scoringPairsRequired: round.scoringPairsRequired || false,
          };
        }),

        // Players (with real IDs for any new placeholders)
        players: finalPlayers,
      });

      // Navigate to competition detail
      navigation.replace('CompetitionDetail', { id: result.competition.id });
    } catch (error) {
      showDialog({
        type: 'creation_failed',
        title: 'Creation Failed',
        message: error instanceof Error
          ? error.message
          : 'Failed to create competition. Please try again.',
        confirmLabel: 'OK',
        onConfirm: dismissDialog,
      });
    }
  }, [generatedCompetition, createCompetition, createPlaceholder, navigation, showDialog, dismissDialog]);

  // Handle edit manually - navigate to wizard with pre-filled data
  const handleEditManually = useCallback(() => {
    if (!generatedCompetition) return;

    const wizardState = aiOutputToWizardState(generatedCompetition);

    // Navigate to CreateCompetition with initial state
    navigation.navigate('CreateCompetition', {
      initialState: wizardState,
    } as never);
  }, [generatedCompetition, navigation]);

  // Handle create competition with validation
  const handleCreateCompetition = useCallback(async () => {
    if (!generatedCompetition) return;

    // Check subscription: team formats
    if (generatedCompetition.teamMode !== 'none') {
      const teamAccess = checkFeature('team_formats');
      if (!teamAccess.allowed) {
        showDialog({
          type: 'team_config_issue',
          title: 'Team Format Unavailable',
          message: `Team competitions require a ${teamAccess.requiredTier ?? 'premium'} subscription. You can edit manually to switch to individual format, or upgrade your plan.`,
          confirmLabel: 'Edit Manually',
          cancelLabel: 'Cancel',
          onConfirm: () => {
            dismissDialog();
            handleEditManually();
          },
        });
        return;
      }
    }

    // Check subscription: game types in rounds
    for (const round of generatedCompetition.rounds) {
      const gameTypeAccess = checkFeature('game_type', { gameType: round.gameType });
      if (!gameTypeAccess.allowed) {
        showDialog({
          type: 'game_type_unavailable',
          title: 'Game Type Unavailable',
          message: gameTypeAccess.reason ?? `${round.gameType} requires a higher subscription tier. Edit manually to choose an available game type.`,
          confirmLabel: 'Edit Manually',
          cancelLabel: 'Cancel',
          onConfirm: () => {
            dismissDialog();
            handleEditManually();
          },
        });
        return;
      }
    }

    // Validate team formation
    const teamValidation = validateTeamFormation(generatedCompetition);
    if (!teamValidation.isValid) {
      showDialog({
        type: 'team_config_issue',
        title: 'Team Configuration Issue',
        message: teamValidation.reason ?? 'Invalid team configuration.',
        confirmLabel: 'Edit Manually',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          dismissDialog();
          handleEditManually();
        },
      });
      return;
    }

    // Warn about missing courses
    const missingCourseRounds = getRoundsWithMissingCourses(generatedCompetition);
    if (missingCourseRounds.length > 0) {
      showDialog({
        type: 'courses_not_found',
        title: 'Courses Not Found',
        message: `Round${missingCourseRounds.length > 1 ? 's' : ''} ${missingCourseRounds.join(', ')} ${missingCourseRounds.length > 1 ? 'have' : 'has'} courses that couldn't be found. You can edit manually to select courses, or create anyway and edit later.`,
        confirmLabel: 'Create Anyway',
        cancelLabel: 'Cancel',
        showSecondaryAction: true,
        secondaryActionLabel: 'Edit Manually',
        onConfirm: () => {
          dismissDialog();
          doCreateCompetition();
        },
        onSecondaryAction: () => {
          dismissDialog();
          handleEditManually();
        },
      });
      return;
    }

    // Check for new placeholder players and warn user
    const newPlaceholders = generatedCompetition.players.filter(
      (p) => p.isPlaceholder === true
    );

    if (newPlaceholders.length > 0) {
      const placeholderNames = newPlaceholders.map((p) => p.name).join(', ');
      showDialog({
        type: 'guest_players_warning',
        title: 'Guest Players Will Be Created',
        message: `${newPlaceholders.length} guest player${newPlaceholders.length > 1 ? 's' : ''} will be created: ${placeholderNames}.\n\nYou can link these to real players later, or update their names when editing the competition.`,
        confirmLabel: 'Create Competition',
        cancelLabel: 'Cancel',
        showSecondaryAction: true,
        secondaryActionLabel: 'Edit Manually',
        onConfirm: () => {
          dismissDialog();
          doCreateCompetition();
        },
        onSecondaryAction: () => {
          dismissDialog();
          handleEditManually();
        },
      });
      return;
    }

    doCreateCompetition();
  }, [generatedCompetition, handleEditManually, doCreateCompetition, showDialog, dismissDialog, checkFeature]);

  // Handle back
  const handleBack = useCallback(() => {
    if (screenState === 'preview' || screenState === 'error') {
      setScreenState('input');
      setGeneratedCompetition(null);
      setErrorMessage('');
    } else {
      navigation.goBack();
    }
  }, [screenState, navigation]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setScreenState('input');
    setErrorMessage('');
  }, []);

  return {
    screenState,
    prompt,
    setPrompt,
    generatedCompetition,
    errorMessage,
    isGenerating: generateAI.isPending,
    isCreating: createCompetition.isPending,
    dialogConfig,
    handleSuggestionSelect,
    handleGenerate,
    handleCreateCompetition,
    handleEditManually,
    handleBack,
    handleRetry,
    dismissDialog,
  };
}
