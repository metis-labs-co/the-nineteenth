import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { Text, Snackbar, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useCreateCompetition } from '@/hooks/useCreateCompetition';
import { useCreatePrizePool } from '@/hooks/usePrizePool';
import { useAuth } from '@/hooks/useAuth';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { parse, isValid } from 'date-fns';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useCompetitionCount } from '@/hooks/useSubscription';
import { UpgradePrompt, UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
import { useCompetitionWizardStore, clearWizardDraft } from '@/store/competitionWizardStore';

// Step components - simplified 4-step wizard (5-step with prize pool)
import CompetitionDetailsStep from '@/components/competitionWizard/create/CompetitionDetailsStep';
import SimplifiedRoundDetailsStep from '@/components/competitionWizard/create/RoundDetailsStep/SimplifiedRoundDetailsStep';
import AddPlayersStep from '@/components/competitionWizard/create/AddPlayersStep';
import { PrizePoolSetupStep } from '@/components/competitionWizard/create/PrizePoolSetupStep';
import { SimplifiedReviewStep } from '@/components/competitionWizard/create/SimplifiedReviewStep';
import { DEFAULT_POINT_SYSTEM } from '@/schemas/competition';

// Form data types
import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
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

// Wizard state - simplified 4-step flow (5-step with prize pool)
export interface WizardState {
  step1?: CompetitionDetailsFormData; // Competition details + team toggle + prize pool toggle
  step2?: SimplifiedRoundFormData[]; // Simplified rounds (can be blank)
  players?: PlayerFormData[]; // Players (optional, skippable)
  prizePoolConfig?: PrizePoolConfigFormData; // Prize pool config (when enabled)
}

// Base steps - prize pool step dynamically inserted when enabled
const BASE_STEPS = [
  { number: 1, title: 'Details', description: 'Name, dates, team toggle' },
  { number: 2, title: 'Rounds', description: 'Configure rounds' },
  { number: 3, title: 'Players', description: 'Add players (optional)' },
  { number: 4, title: 'Review', description: 'Review and create' },
];

// Prize pool step (inserted between Players and Review when enabled)
const PRIZE_POOL_STEP = { number: 4, title: 'Prize Pool', description: 'Configure prize pool' };

export default function CreateCompetitionScreen() {
  const colors = useThemeColors();
  const _insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const createCompetition = useCreateCompetition();
  const createPrizePool = useCreatePrizePool();
  const { user } = useAuth();

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

  // Confirmation dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

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

  // Wizard state - from Zustand store for session persistence
  const {
    currentStep,
    wizardData,
    setCurrentStep,
    setStep1,
    setStep2,
    setPlayers,
    setPrizePoolConfig,
    initializeFromRouteParams,
    hasDraft,
  } = useCompetitionWizardStore();

  // Initialize store from route params (from AI competition flow)
  useEffect(() => {
    if (initialState && !hasDraft) {
      initializeFromRouteParams(initialState);
    }
  }, [initialState, hasDraft, initializeFromRouteParams]);

  // Check if prize pool is enabled to determine step count
  const hasPrizePool = wizardData.step1?.enablePrizePool ?? false;

  // Build dynamic steps array based on prize pool toggle
  const STEPS = useMemo(() => {
    if (hasPrizePool) {
      return [
        BASE_STEPS[0], // Details
        BASE_STEPS[1], // Rounds
        BASE_STEPS[2], // Players
        PRIZE_POOL_STEP, // Prize Pool (inserted)
        { ...BASE_STEPS[3], number: 5 }, // Review (renumbered)
      ];
    }
    return BASE_STEPS;
  }, [hasPrizePool]);

  // Total step count
  const _totalSteps = STEPS.length;

  // Get the review step number (last step)
  const _reviewStepNumber = hasPrizePool ? 5 : 4;

  // Handle step completion - dynamic step flow
  const handleStep1Complete = (data: CompetitionDetailsFormData) => {
    setStep1(data);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: SimplifiedRoundFormData[]) => {
    setStep2(data);
    // Go to Players step (step 3)
    setCurrentStep(3);
  };

  const handlePlayersComplete = (data: PlayerFormData[]) => {
    // Convert PlayerFormData to WizardPlayerData
    const wizardPlayers = data.map((p) => ({
      id: p.id || '',
      name: p.name,
      email: p.email || null,
      handicap: p.handicap ? parseFloat(p.handicap) : null,
      photo_url: null,
      is_placeholder: false,
    }));
    setPlayers(wizardPlayers);
    // If prize pool enabled, go to prize pool step, otherwise go to review
    const prizePoolEnabled = wizardData.step1?.enablePrizePool ?? false;
    setCurrentStep(prizePoolEnabled ? 4 : 4);
    // Note: Step numbers are now:
    // - With prize pool: 1=Details, 2=Rounds, 3=Players, 4=PrizePool, 5=Review
    // - Without prize pool: 1=Details, 2=Rounds, 3=Players, 4=Review
  };

  const handlePlayersSkip = () => {
    // Clear any previously selected players and proceed
    setPlayers([]);
    const prizePoolEnabled = wizardData.step1?.enablePrizePool ?? false;
    setCurrentStep(prizePoolEnabled ? 4 : 4);
  };

  const handlePrizePoolComplete = (data: PrizePoolConfigFormData) => {
    setPrizePoolConfig(data);
    setCurrentStep(5); // Go to review (step 5 when prize pool is enabled)
  };

  // Handle final submission - dynamic step flow with prize pool
  const handleSubmit = async () => {
    console.log('[CreateCompetition] handleSubmit called');
    console.log('[CreateCompetition] wizardData.step1:', JSON.stringify(wizardData.step1, null, 2));
    console.log('[CreateCompetition] wizardData.step2:', JSON.stringify(wizardData.step2, null, 2));
    console.log('[CreateCompetition] wizardData.players:', JSON.stringify(wizardData.players, null, 2));
    console.log('[CreateCompetition] wizardData.prizePoolConfig:', JSON.stringify(wizardData.prizePoolConfig, null, 2));

    if (!wizardData.step1 || !wizardData.step2) {
      console.warn('[CreateCompetition] Missing step data - step1:', !!wizardData.step1, 'step2:', !!wizardData.step2);
      showAlert('Error', 'Please complete all steps');
      return;
    }

    // If prize pool enabled but not configured, show error
    if (wizardData.step1.enablePrizePool && !wizardData.prizePoolConfig) {
      console.warn('[CreateCompetition] Prize pool enabled but not configured');
      showAlert('Error', 'Please configure the prize pool');
      return;
    }

    try {
      // Build the mutation input for logging
      const parsedStartDate = parseAustralianDate(wizardData.step1.startDate);
      const parsedEndDate = wizardData.step1.endDate
        ? parseAustralianDate(wizardData.step1.endDate)
        : undefined;

      const mutationInput = {
        // Step 1: Competition details
        name: wizardData.step1.name,
        description: wizardData.step1.description,
        competitionType: wizardData.step1.competitionType,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        handicapSystem: wizardData.step1.handicapSystem,
        inviteCode: wizardData.step1.inviteCode,
        visibility: 'private' as const,

        // Team settings from enableTeams toggle (defaults)
        teamMode: wizardData.step1.enableTeams ? ('fixed' as const) : ('none' as const),
        teamSize: wizardData.step1.enableTeams ? 2 : undefined,
        pointSystem: DEFAULT_POINT_SYSTEM,

        // Step 2: Simplified rounds (can be blank/unconfigured)
        rounds: wizardData.step2.map((round) => ({
          courseName: round.courseName || undefined,
          courseId: round.courseId || undefined, // Can be undefined for blank rounds
          date: round.date
            ? parseAustralianDate(round.date)
            : parseAustralianDate(wizardData.step1!.startDate),
          teeTime: round.teeTime || undefined,
          matchType: round.matchType || 'stableford',
          scoringPairsRequired: round.scoringPairsRequired ?? false,
        })),

        // Step 3: Players (optional - may be empty if skipped)
        players: (wizardData.players || []).map((player) => ({
          id: player.id || undefined,
          name: player.name,
          email: player.email || '',
          handicap: player.handicap ?? undefined,
        })),
      };

      console.log('[CreateCompetition] Parsed dates - start:', parsedStartDate, 'end:', parsedEndDate);
      console.log('[CreateCompetition] Rounds input:', JSON.stringify(mutationInput.rounds, null, 2));
      console.log('[CreateCompetition] Players input:', JSON.stringify(mutationInput.players, null, 2));
      console.log('[CreateCompetition] Calling createCompetition.mutateAsync...');

      const result = await createCompetition.mutateAsync(mutationInput);
      console.log('[CreateCompetition] Competition created successfully:', result.competition.id);
      console.log('[CreateCompetition] Invite code:', result.inviteCode);
      console.log('[CreateCompetition] Rounds created:', result.rounds.length);

      // If prize pool is enabled, create it after competition creation
      if (wizardData.step1.enablePrizePool && wizardData.prizePoolConfig && user) {
        try {
          await createPrizePool.mutateAsync({
            competition_id: result.competition.id,
            funding_type: wizardData.prizePoolConfig.fundingType,
            funding_amount: wizardData.prizePoolConfig.fundingAmount,
            skins_allocation_percent: wizardData.prizePoolConfig.skinsAllocationPercent,
            winner_allocation_percent: wizardData.prizePoolConfig.winnerAllocationPercent,
            other_allocation_percent: wizardData.prizePoolConfig.otherAllocationPercent,
            auto_split_skins: wizardData.prizePoolConfig.autoSplitSkins,
            created_by: user.id,
            player_count: 0, // No players added yet during creation
          });
        } catch (poolError) {
          // Log pool creation error but don't fail the whole process
          console.warn('Failed to create prize pool:', poolError);
          // Competition was created successfully, just show a warning
          showAlert(
            'Warning',
            'Competition created, but prize pool setup failed. You can configure it later from competition settings.'
          );
        }
      }

      // Show success toast
      setToastMessage('Competition Created!');
      setToastInviteCode(result.inviteCode);
      setToastVisible(true);

      // Clear the wizard draft after successful creation
      clearWizardDraft();

      // Navigate to competition detail after short delay
      setTimeout(() => {
        navigation.replace('CompetitionDetail', { id: result.competition.id });
      }, 2000);
    } catch (error) {
      console.error('[CreateCompetition] Failed to create competition:', error);
      console.error('[CreateCompetition] Error type:', typeof error);
      console.error('[CreateCompetition] Error name:', error instanceof Error ? error.name : 'N/A');
      console.error('[CreateCompetition] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[CreateCompetition] Error stack:', error instanceof Error ? error.stack : 'N/A');
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('[CreateCompetition] Error code:', (error as { code: unknown }).code);
      }
      if (error && typeof error === 'object' && 'details' in error) {
        console.error('[CreateCompetition] Error details:', (error as { details: unknown }).details);
      }

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
        showAlert(
          'Error',
          `Failed to create competition. Please try again.\n\nDetails: ${errorMessage}`
        );
      }
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else if (hasPrizePool && currentStep === 5) {
      // From review step with prize pool, go back to prize pool step
      setCurrentStep(4);
    } else if (!hasPrizePool && currentStep === 4) {
      // From review step without prize pool, go back to players step
      setCurrentStep(3);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle upgrade navigation (for non-premium users trying to use prize pool)
  const handleUpgrade = () => {
    setShowUpgradePrompt(false);
    navigation.navigate('Subscription' as never);
  };

  // Handle form reset
  const handleReset = () => {
    showDialog({
      title: 'Reset Form',
      message: 'Are you sure you want to reset the form? All entered data will be lost.',
      confirmLabel: 'Reset',
      confirmVariant: 'destructive',
      icon: 'refresh',
      onConfirm: () => {
        dismissDialog();
        clearWizardDraft();
        setCurrentStep(1);
      },
    });
  };

  // Render current step - dynamic wizard with optional prize pool step
  const renderStep = () => {
    // Step 1: Competition Details
    if (currentStep === 1) {
      return (
        <CompetitionDetailsStep
          initialData={wizardData.step1}
          onComplete={handleStep1Complete}
          onBack={handleBack}
          onUpgradePress={handleUpgrade}
        />
      );
    }

    // Step 2: Rounds Configuration
    if (currentStep === 2) {
      return (
        <SimplifiedRoundDetailsStep
          initialData={wizardData.step2}
          onComplete={handleStep2Complete}
          onBack={handleBack}
          allowedGameTypes={limits?.allowedGameTypes}
          maxRoundsPerCompetition={limits?.maxRoundsPerCompetition}
          competitionStartDate={wizardData.step1?.startDate}
        />
      );
    }

    // Step 3: Players (skippable)
    if (currentStep === 3) {
      // Convert wizard player data to PlayerFormData format for initial data
      const initialPlayersData = wizardData.players?.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: '',
        handicap: p.handicap?.toString() || '',
        golf_id: '',
      }));

      return (
        <AddPlayersStep
          initialData={initialPlayersData}
          onComplete={handlePlayersComplete}
          onBack={handleBack}
          onSkip={handlePlayersSkip}
          maxPlayersPerCompetition={limits?.maxPlayersPerCompetition}
        />
      );
    }

    // Step 4: Either Prize Pool (if enabled) or Review (if not enabled)
    if (currentStep === 4) {
      if (hasPrizePool) {
        // Prize Pool Setup Step
        return (
          <PrizePoolSetupStep
            initialData={wizardData.prizePoolConfig}
            playerCount={wizardData.players?.length ?? 0}
            roundCount={wizardData.step2?.length ?? 1}
            onComplete={handlePrizePoolComplete}
            onBack={handleBack}
          />
        );
      } else {
        // Review Step (no prize pool)
        return (
          <SimplifiedReviewStep
            competitionData={wizardData.step1!}
            roundsData={wizardData.step2!}
            playersData={wizardData.players}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isSubmitting={createCompetition.isPending || createPrizePool.isPending}
          />
        );
      }
    }

    // Step 5: Review (only when prize pool is enabled)
    if (currentStep === 5 && hasPrizePool) {
      return (
        <SimplifiedReviewStep
          competitionData={wizardData.step1!}
          roundsData={wizardData.step2!}
          playersData={wizardData.players}
          prizePoolData={wizardData.prizePoolConfig}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isSubmitting={createCompetition.isPending || createPrizePool.isPending}
        />
      );
    }

    return null;
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
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.gray100 }]}
                onPress={handleReset}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon source="refresh" size={16} color={colors.textSecondary} />
                <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>
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
          {/* Title Row with Reset Button */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.gray900 }]}>Create Competition</Text>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.gray100 }]}
              onPress={handleReset}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon source="refresh" size={16} color={colors.textSecondary} />
              <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
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
    borderRadius: borderRadius.full,
  },
  stepLine: {
    width: 32,
    height: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  resetButtonText: {
    ...typography.smallBold,
  },
});
