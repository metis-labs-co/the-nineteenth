import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { LoadingSpinner } from '@/components/common';
import { Text, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useCreateCompetition } from '@/hooks/useCreateCompetition';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { parse, isValid } from 'date-fns';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useCompetitionCount } from '@/hooks/useSubscription';
import { TierBadge } from '@/components/subscription/TierBadge';
import { UpgradePrompt, UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';

// Step components
import CompetitionDetailsStep from '@/components/competitionWizard/create/CompetitionDetailsStep';
import TeamSettingsStep from '@/components/competitionWizard/create/TeamSettingsStep';
import RoundDetailsStep from '@/components/competitionWizard/create/RoundDetailsStep';
import AddPlayersStep from '@/components/competitionWizard/create/AddPlayersStep';
import ReviewStep from '@/components/competitionWizard/create/ReviewStep';

// Form data types
import type {
  CompetitionDetailsFormData,
  TeamSettingsFormData,
  RoundDetailsFormData,
  PlayerFormData,
} from '@/schemas/competition';

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : new Date();
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'CreateCompetition'>;

// Wizard state - also exported for AI integration
export interface WizardState {
  step1?: CompetitionDetailsFormData;
  step2?: TeamSettingsFormData; // Team settings (new Step 2)
  step3?: RoundDetailsFormData[]; // Round details (was Step 2, now Step 3)
  step4?: PlayerFormData[]; // Players (was Step 3, now Step 4)
}

const STEPS = [
  { number: 1, title: 'Competition', description: 'Name, dates, handicap system' },
  { number: 2, title: 'Teams', description: 'Team format and points' },
  { number: 3, title: 'Rounds', description: 'Course and date' },
  { number: 4, title: 'Players', description: 'Add players to compete' },
  { number: 5, title: 'Review', description: 'Review and generate invite code' },
];

export default function CreateCompetitionScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const createCompetition = useCreateCompetition();

  // Get initial state from route params (from AI competition flow)
  const initialState = route.params?.initialState;

  // Subscription context for tier checking
  const {
    tier,
    limits,
    checkCanCreateCompetition,
    isLoading: isSubscriptionLoading,
  } = useSubscriptionContext();

  // Get user's competition count
  const { data: competitionCount = 0, isLoading: isCountLoading } = useCompetitionCount();

  // Toast state (replaces useToast from NativeBase)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastInviteCode, setToastInviteCode] = useState('');

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptConfig, setUpgradePromptConfig] = useState<UpgradePromptConfig | null>(null);
  const [isAtCompetitionLimit, setIsAtCompetitionLimit] = useState(false);

  // Check if user is at competition limit on mount
  useEffect(() => {
    if (!isSubscriptionLoading && !isCountLoading && limits) {
      const access = checkCanCreateCompetition(competitionCount);
      if (!access.allowed) {
        setIsAtCompetitionLimit(true);
        // Set up upgrade prompt config
        const targetTier = tier === 'free' ? 'social' : 'premium';
        const benefits = targetTier === 'social'
          ? [
              'Create up to 5 competitions',
              'Up to 16 players per competition',
              'Stroke Play game type',
              'Score distribution analytics',
            ]
          : [
              'Unlimited competitions',
              'Up to 40 players per competition',
              'All game types including Match Play',
              'Advanced analytics & trends',
            ];
        setUpgradePromptConfig({
          feature: 'create_competition',
          title: 'Competition Limit Reached',
          message: `You've reached your limit of ${limits.maxCompetitionsOwned} competition${limits.maxCompetitionsOwned === 1 ? '' : 's'} on the ${limits.displayName} plan.`,
          targetTier,
          benefits,
        });
      }
    }
  }, [isSubscriptionLoading, isCountLoading, limits, competitionCount, checkCanCreateCompetition, tier]);

  // Wizard state - initialize from AI-generated data if available
  const [currentStep, setCurrentStep] = useState(() => {
    // If we have AI-generated initial state, start at review step
    if (initialState?.step1 && initialState?.step2 && initialState?.step3 && initialState?.step4) {
      return 5; // Review step
    }
    return 1;
  });
  const [wizardData, setWizardData] = useState<WizardState>(() => initialState || {});


  // Handle step completion
  const handleStep1Complete = (data: CompetitionDetailsFormData) => {
    setWizardData((prev) => ({ ...prev, step1: data }));
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: TeamSettingsFormData) => {
    setWizardData((prev) => ({ ...prev, step2: data }));
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: RoundDetailsFormData[]) => {
    setWizardData((prev) => ({ ...prev, step3: data }));
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: PlayerFormData[]) => {
    setWizardData((prev) => ({ ...prev, step4: data }));
    setCurrentStep(5);
  };

  // Handle final submission
  const handleSubmit = async () => {
    if (!wizardData.step1 || !wizardData.step2 || !wizardData.step3 || !wizardData.step4) {
      Alert.alert('Error', 'Please complete all steps');
      return;
    }

    try {
      const result = await createCompetition.mutateAsync({
        // Step 1: Competition details
        name: wizardData.step1.name,
        description: wizardData.step1.description,
        competitionType: wizardData.step1.competitionType,
        startDate: parseAustralianDate(wizardData.step1.startDate),
        endDate: wizardData.step1.endDate
          ? parseAustralianDate(wizardData.step1.endDate)
          : undefined,
        handicapSystem: wizardData.step1.handicapSystem,
        inviteCode: wizardData.step1.inviteCode,
        visibility: 'private',

        // Step 2: Team settings
        teamMode: wizardData.step2.teamMode,
        teamSize: wizardData.step2.teamSize,
        pointSystem: wizardData.step2.pointSystem,

        // Step 3: Rounds (supports multiple)
        rounds: wizardData.step3.map((round) => ({
          courseName: round.courseName,
          courseId: round.courseId,
          date: parseAustralianDate(round.date),
          teeTime: round.teeTime,
          matchType: round.matchType || 'stableford',
          scoringPairsRequired: round.scoringPairsRequired ?? false,
        })),

        // Step 4: Players
        players: wizardData.step4.map((player) => ({
          id: player.id, // Pass through player ID for existing players (friends)
          name: player.name,
          email: player.email || '',
          phone: player.phone || '',
          handicap: player.handicap ? parseFloat(player.handicap) : undefined,
        })),
      });

      // Show success toast
      setToastMessage('Competition Created!');
      setToastInviteCode(result.inviteCode);
      setToastVisible(true);

      // Navigate to competition detail after short delay
      setTimeout(() => {
        navigation.replace('CompetitionDetail', { id: result.competition.id });
      }, 2000);
    } catch (error) {
      console.error('Failed to create competition:', error);

      // Check if this is a permission/tier limit error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('competition limit') || errorMessage.includes('cannot create more competitions')) {
        // Show upgrade prompt for permission errors
        const targetTier = tier === 'free' ? 'social' : 'premium';
        const benefits = targetTier === 'social'
          ? [
              'Create up to 5 competitions',
              'Up to 16 players per competition',
              'Stroke Play game type',
            ]
          : [
              'Unlimited competitions',
              'Up to 40 players per competition',
              'All game types',
            ];
        setUpgradePromptConfig({
          feature: 'create_competition',
          title: 'Competition Limit Reached',
          message: errorMessage,
          targetTier,
          benefits,
        });
        setShowUpgradePrompt(true);
      } else {
        Alert.alert(
          'Error',
          'Failed to create competition. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CompetitionDetailsStep
            initialData={wizardData.step1}
            onComplete={handleStep1Complete}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <TeamSettingsStep
            initialData={wizardData.step2}
            onComplete={handleStep2Complete}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <RoundDetailsStep
            initialData={wizardData.step3}
            onComplete={handleStep3Complete}
            onBack={handleBack}
            allowedGameTypes={limits?.allowedGameTypes}
            maxRoundsPerCompetition={limits?.maxRoundsPerCompetition}
            competitionStartDate={wizardData.step1?.startDate}
          />
        );
      case 4:
        return (
          <AddPlayersStep
            initialData={wizardData.step4}
            onComplete={handleStep4Complete}
            onBack={handleBack}
            maxPlayersPerCompetition={limits?.maxPlayersPerCompetition}
          />
        );
      case 5:
        return (
          <ReviewStep
            competitionData={wizardData.step1!}
            teamSettingsData={wizardData.step2!}
            roundsData={wizardData.step3!}
            playersData={wizardData.step4!}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isSubmitting={createCompetition.isPending}
          />
        );
      default:
        return null;
    }
  };

  // Handle upgrade navigation
  const handleUpgrade = () => {
    setShowUpgradePrompt(false);
    // Navigate to subscription screen (or show in-app purchase flow in future)
    navigation.navigate('Subscription' as never);
  };

  // Show loading state while fetching subscription data
  if (isSubscriptionLoading || isCountLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading..." />
      </View>
    );
  }

  // Show upgrade prompt if at competition limit
  if (isAtCompetitionLimit && upgradePromptConfig) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.gray900 }]}>Create Competition</Text>
              <TierBadge size="small" />
            </View>
          </View>
        </View>

        {/* Limit Reached Message */}
        <View style={styles.limitReachedContainer}>
          <View style={[styles.limitReachedCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.limitReachedTitle, { color: colors.textPrimary }]}>
              Competition Limit Reached
            </Text>
            <Text style={[styles.limitReachedMessage, { color: colors.textSecondary }]}>
              You&apos;ve created {competitionCount} of {limits?.maxCompetitionsOwned ?? 1} competition{(limits?.maxCompetitionsOwned ?? 1) === 1 ? '' : 's'} on the {limits?.displayName ?? 'Free'} plan.
            </Text>
            <Text style={[styles.limitReachedHint, { color: colors.textSecondary }]}>
              Upgrade your plan to create more competitions and unlock additional features.
            </Text>
          </View>
        </View>

        {/* Full-screen Upgrade Prompt */}
        <UpgradePrompt
          config={upgradePromptConfig}
          onUpgrade={handleUpgrade}
          onDismiss={() => navigation.goBack()}
          visible={true}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Stepper */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          {/* Title Row with TierBadge */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.gray900 }]}>Create Competition</Text>
            <TierBadge size="small" />
          </View>

          {/* Current Step Title */}
          <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>
            Step {currentStep}: {STEPS[currentStep - 1].title}
          </Text>

          {/* Step Indicator - Dot-based */}
          <View style={styles.stepIndicator}>
            {STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <View
                  style={[
                    styles.stepDot,
                    { backgroundColor: colors.gray300 },
                    currentStep === step.number && {
                      backgroundColor: colors.primary,
                      width: 10,
                      height: 10,
                    },
                    currentStep > step.number && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
                {index < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: colors.gray200 },
                      currentStep > step.number && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      {/* Step Content - Each step manages its own scrolling for sticky footer */}
      <View style={styles.stepContent}>
        {renderStep()}
      </View>

      {/* Toast/Snackbar */}
      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setToastVisible(false),
        }}
      >
        {`${toastMessage}${toastInviteCode ? ` Invite code: ${toastInviteCode}` : ''}`}
      </Snackbar>

      {/* Upgrade Prompt Modal (shown on permission errors) */}
      {showUpgradePrompt && upgradePromptConfig && (
        <UpgradePrompt
          config={upgradePromptConfig}
          onUpgrade={handleUpgrade}
          onDismiss={() => setShowUpgradePrompt(false)}
          visible={showUpgradePrompt}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  header: {
    ...shadows.sm,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
  },
  // Limit reached styles
  limitReachedContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  limitReachedCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  limitReachedTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  limitReachedMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  limitReachedHint: {
    ...typography.small,
    textAlign: 'center',
  },
  stepTitle: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
  },
  stepLine: {
    width: 32,
    height: 2,
  },
});
