/**
 * useAICompetitionFlow - Manages AI competition generation and creation flow
 *
 * Handles prompt validation, AI generation, and competition creation
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
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
import { useCreatePlaceholderPlayer } from '@/hooks/usePlaceholderPlayers';
import {
  aiOutputToWizardState,
  getRoundsWithMissingCourses,
  validateTeamFormation,
} from '@/utils/aiToWizardState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Screen states
export type ScreenState = 'input' | 'loading' | 'preview' | 'error';

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
  handleSuggestionSelect: (suggestion: string) => void;
  handleGenerate: () => Promise<void>;
  handleCreateCompetition: () => Promise<void>;
  handleEditManually: () => void;
  handleBack: () => void;
  handleRetry: () => void;
}

export function useAICompetitionFlow(): UseAICompetitionFlowReturn {
  const navigation = useNavigation<NavigationProp>();

  // State
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [prompt, setPrompt] = useState('');
  const [generatedCompetition, setGeneratedCompetition] =
    useState<GeneratedCompetition | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Hooks
  const generateAI = useGenerateAICompetition();
  const createCompetition = useCreateCompetition();
  const createPlaceholder = useCreatePlaceholderPlayer();

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setPrompt(suggestion);
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (prompt.trim().length < 10) {
      Alert.alert(
        'Prompt Too Short',
        'Please provide more details about your competition (at least 10 characters).'
      );
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
  }, [prompt, generateAI]);

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
        console.log(`Creating ${newPlaceholders.length} placeholder players...`);

        for (const placeholder of newPlaceholders) {
          try {
            const created = await createPlaceholder.mutateAsync({
              name: placeholder.name,
              handicap: placeholder.handicap,
            });
            // Map the temporary AI-generated UUID to the real database UUID
            idMapping[placeholder.id] = created.id;
            console.log(`Created placeholder: ${placeholder.name} -> ${created.id}`);
          } catch (error) {
            console.error(`Failed to create placeholder ${placeholder.name}:`, error);
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
        visibility: 'private',

        // Team settings
        teamMode: generatedCompetition.teamMode,
        teamSize: generatedCompetition.teamSize ?? undefined,

        // Rounds
        rounds: generatedCompetition.rounds.map((round) => ({
          courseName: round.courseName,
          courseId: round.courseId || undefined,
          date: parseAustralianDate(round.date),
          teeTime: round.teeTime || undefined,
          matchType: round.gameType,
        })),

        // Players (with real IDs for any new placeholders)
        players: finalPlayers,
      });

      // Navigate to competition detail
      navigation.replace('CompetitionDetail', { id: result.competition.id });
    } catch (error) {
      console.error('Failed to create competition:', error);
      Alert.alert(
        'Creation Failed',
        error instanceof Error
          ? error.message
          : 'Failed to create competition. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [generatedCompetition, createCompetition, createPlaceholder, navigation]);

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

    // Validate team formation
    const teamValidation = validateTeamFormation(generatedCompetition);
    if (!teamValidation.isValid) {
      Alert.alert('Team Configuration Issue', teamValidation.reason, [
        { text: 'Edit Manually', onPress: handleEditManually },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    // Warn about missing courses
    const missingCourseRounds = getRoundsWithMissingCourses(generatedCompetition);
    if (missingCourseRounds.length > 0) {
      Alert.alert(
        'Courses Not Found',
        `Round${missingCourseRounds.length > 1 ? 's' : ''} ${missingCourseRounds.join(', ')} ${missingCourseRounds.length > 1 ? 'have' : 'has'} courses that couldn't be found. You can edit manually to select courses, or create anyway and edit later.`,
        [
          { text: 'Edit Manually', onPress: handleEditManually },
          { text: 'Create Anyway', onPress: doCreateCompetition },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // Check for new placeholder players and warn user
    const newPlaceholders = generatedCompetition.players.filter(
      (p) => p.isPlaceholder === true
    );

    if (newPlaceholders.length > 0) {
      const placeholderNames = newPlaceholders.map((p) => p.name).join(', ');
      Alert.alert(
        'Guest Players Will Be Created',
        `${newPlaceholders.length} guest player${newPlaceholders.length > 1 ? 's' : ''} will be created: ${placeholderNames}.\n\nYou can link these to real players later, or update their names when editing the competition.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit Manually', onPress: handleEditManually },
          {
            text: 'Create Competition',
            onPress: doCreateCompetition,
            style: 'default',
          },
        ]
      );
      return;
    }

    doCreateCompetition();
  }, [generatedCompetition, handleEditManually, doCreateCompetition]);

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
    handleSuggestionSelect,
    handleGenerate,
    handleCreateCompetition,
    handleEditManually,
    handleBack,
    handleRetry,
  };
}
