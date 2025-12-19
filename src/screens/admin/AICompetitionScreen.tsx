/**
 * AICompetitionScreen - AI-powered competition creation
 *
 * Allows users to describe a competition in natural language
 * and have it automatically generated using Claude AI.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';

// AI Components
import { PromptInput, GeneratedPreview, SuggestionChips } from '@/components/ai';

// Hooks
import {
  useGenerateAICompetition,
  getAIErrorMessage,
  type GeneratedCompetition,
  type AICompetitionResponse,
} from '@/hooks/useGenerateAICompetition';
import { useCreateCompetition } from '@/hooks/useCreateCompetition';
import { useFriends } from '@/hooks/useFriends';
import { useSubscriptionContext } from '@/context/SubscriptionContext';

// Utils
import {
  aiOutputToWizardState,
  getRoundsWithMissingCourses,
  validateTeamFormation,
} from '@/utils/aiToWizardState';
import { parse, isValid } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Screen states
type ScreenState = 'input' | 'loading' | 'preview' | 'error';

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : new Date();
};

export default function AICompetitionScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  // State
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [prompt, setPrompt] = useState('');
  const [generatedCompetition, setGeneratedCompetition] =
    useState<GeneratedCompetition | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState(0);

  // Animation refs
  const spinValue = useRef(new Animated.Value(0)).current;
  const dotOpacity1 = useRef(new Animated.Value(1)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.3)).current;

  // Hooks
  const generateAI = useGenerateAICompetition();
  const createCompetition = useCreateCompetition();
  const { data: friends = [] } = useFriends();
  const { limits, tier } = useSubscriptionContext();

  // Loading animations
  useEffect(() => {
    if (screenState === 'loading') {
      // Reset loading step
      setLoadingStep(0);

      // Spin animation for the progress circle
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      // Dots animation
      const dotsAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dotOpacity1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dotOpacity1, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dotOpacity2, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      dotsAnimation.start();

      // Progress through loading steps
      const stepTimers = [
        setTimeout(() => setLoadingStep(1), 1500),
        setTimeout(() => setLoadingStep(2), 3500),
      ];

      return () => {
        spinAnimation.stop();
        dotsAnimation.stop();
        stepTimers.forEach(clearTimeout);
        spinValue.setValue(0);
      };
    }
  }, [screenState, spinValue, dotOpacity1, dotOpacity2, dotOpacity3]);

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

    // Check if user has friends
    if (friends.length === 0) {
      Alert.alert(
        'No Friends Added',
        'Please add some friends first before creating a competition with AI. The AI needs players to assign to your competition.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Friends',
            onPress: () => navigation.navigate('Friends' as never),
          },
        ]
      );
      return;
    }

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
  }, [prompt, friends.length, generateAI, navigation]);

  // Handle create competition
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

    doCreateCompetition();
  }, [generatedCompetition]);

  // Actually create the competition
  const doCreateCompetition = useCallback(async () => {
    if (!generatedCompetition) return;

    try {
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

        // Players
        players: generatedCompetition.players.map((player) => ({
          id: player.id,
          name: player.name,
          email: '', // AI doesn't collect emails - admin can add later
          handicap: player.handicap ?? undefined,
        })),
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
  }, [generatedCompetition, createCompetition, navigation]);

  // Handle edit manually - navigate to wizard with pre-filled data
  const handleEditManually = useCallback(() => {
    if (!generatedCompetition) return;

    const wizardState = aiOutputToWizardState(generatedCompetition);

    // Navigate to CreateCompetition with initial state
    navigation.navigate('CreateCompetition', {
      initialState: wizardState,
    } as never);
  }, [generatedCompetition, navigation]);

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

  // Render content based on state
  const renderContent = () => {
    switch (screenState) {
      case 'loading': {
        const spin = spinValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        const loadingSteps = [
          'Analyzing your requirements',
          'Configuring competition settings',
          'Finalizing details',
        ];

        return (
          <View style={styles.centerContainer}>
            {/* Circular progress with sparkle */}
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressRing, { borderColor: colors.gray200 }]}
              />
              <Animated.View
                style={[
                  styles.progressRingActive,
                  {
                    borderColor: colors.primary,
                    transform: [{ rotate: spin }],
                  },
                ]}
              />
              <View style={styles.sparkleContainer}>
                <Icon source="creation" size={32} color={colors.primary} />
              </View>
            </View>

            {/* Generating title with animated dots */}
            <View style={styles.generatingTitleContainer}>
              <Text style={[styles.generatingTitle, { color: colors.textPrimary }]}>
                Generating
              </Text>
              <View style={styles.dotsContainer}>
                <Animated.Text
                  style={[
                    styles.dot,
                    { color: colors.textPrimary, opacity: dotOpacity1 },
                  ]}
                >
                  .
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.dot,
                    { color: colors.textPrimary, opacity: dotOpacity2 },
                  ]}
                >
                  .
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.dot,
                    { color: colors.textPrimary, opacity: dotOpacity3 },
                  ]}
                >
                  .
                </Animated.Text>
              </View>
            </View>

            <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
              Creating your competition with AI
            </Text>

            {/* Loading steps checklist */}
            <View style={styles.stepsContainer}>
              {loadingSteps.map((step, index) => {
                const isCompleted = loadingStep > index;
                const isActive = loadingStep === index;
                const isPending = loadingStep < index;

                return (
                  <View key={step} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepIndicator,
                        isCompleted && { borderColor: colors.success },
                        isActive && { borderColor: colors.primary },
                        isPending && { borderColor: colors.gray300 },
                      ]}
                    >
                      {isCompleted && (
                        <Icon source="check" size={14} color={colors.success} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepText,
                        {
                          color: isPending
                            ? colors.textTertiary
                            : isActive
                              ? colors.primary
                              : colors.success,
                        },
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }

      case 'preview':
        if (!generatedCompetition) return null;
        return (
          <GeneratedPreview
            competition={generatedCompetition}
            onCreateCompetition={handleCreateCompetition}
            onEditManually={handleEditManually}
            isCreating={createCompetition.isPending}
          />
        );

      case 'error':
        return (
          <View style={styles.centerContainer}>
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: colors.errorLight },
              ]}
            >
              <Icon source="alert-circle" size={48} color={colors.error} />
              <Text style={[styles.errorTitle, { color: colors.error }]}>
                Generation Failed
              </Text>
              <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
                {errorMessage}
              </Text>
            </View>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleRetry}
              >
                <Icon source="refresh" size={20} color={colors.white} />
                <Text style={[styles.retryButtonText, { color: colors.white }]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'input':
      default:
        return (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <PromptInput
              value={prompt}
              onChangeText={setPrompt}
              onSubmit={handleGenerate}
              isLoading={generateAI.isPending}
            />

            <View style={styles.suggestionsContainer}>
              <SuggestionChips
                onSelect={handleSuggestionSelect}
                disabled={generateAI.isPending}
              />
            </View>

            {/* Info card */}
            <View
              style={[styles.infoCard, { backgroundColor: colors.infoLight }]}
            >
              <Icon source="information" size={20} color={colors.info} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.info }]}>
                  How it works
                </Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Describe your competition in plain English. The AI will create
                  rounds, assign players from your friends list, and configure
                  teams based on your description.
                </Text>
              </View>
            </View>

            {/* Limitations note */}
            <View
              style={[
                styles.limitationsCard,
                { backgroundColor: colors.gray100 },
              ]}
            >
              <Text
                style={[styles.limitationsTitle, { color: colors.textSecondary }]}
              >
                Current limitations
              </Text>
              <Text
                style={[styles.limitationsText, { color: colors.textSecondary }]}
              >
                • Only courses in your database can be auto-selected{'\n'}
                • Only friends you&apos;ve added can be assigned{'\n'}
                • Game types limited to your subscription tier ({tier})
              </Text>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              source={screenState === 'input' ? 'close' : 'arrow-left'}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {screenState === 'preview'
              ? 'Review Competition'
              : 'Create with AI'}
          </Text>

          <View style={styles.headerRight}>
            <View style={[styles.betaPill, { backgroundColor: colors.gray200 }]}>
              <Text style={[styles.betaText, { color: colors.textSecondary }]}>Beta</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h4,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  betaPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  betaText: {
    ...typography.caption,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  suggestionsContainer: {
    marginTop: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    ...typography.bodyBold,
  },
  infoText: {
    ...typography.small,
    lineHeight: 20,
  },
  limitationsCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  limitationsTitle: {
    ...typography.small,
    fontWeight: '600',
  },
  limitationsText: {
    ...typography.caption,
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  progressContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  progressRingActive: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  sparkleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatingTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    width: 24,
  },
  dot: {
    ...typography.h3,
    fontWeight: '700',
  },
  loadingSubtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  stepsContainer: {
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    ...typography.body,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    maxWidth: 300,
  },
  errorTitle: {
    ...typography.h4,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  errorActions: {
    marginTop: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  retryButtonText: {
    ...typography.bodyBold,
  },
});
