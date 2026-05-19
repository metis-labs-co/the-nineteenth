import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LoadingSpinner, ConfirmationDialog, FullScreenWizard } from '@/components/common';
import type { UseWizardReturn, WizardStepConfig } from '@/components/common';
import { Text, Snackbar, Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';

// Step components
import CompetitionDetailsStep from '@/components/competitionWizard/create/CompetitionDetailsStep';
import SimplifiedRoundDetailsStep from '@/components/competitionWizard/create/RoundDetailsStep/SimplifiedRoundDetailsStep';
import AddPlayersStep from '@/components/competitionWizard/create/AddPlayersStep';
import { PrizePoolSetupStep } from '@/components/competitionWizard/create/PrizePoolSetupStep';
import { SimplifiedReviewStep } from '@/components/competitionWizard/create/SimplifiedReviewStep';

// Hooks
import {
  useCompetitionLimitCheck,
  useCompetitionFormSubmit,
  useCompetitionWizardState,
} from './hooks';
import type { WizardData } from '@/store/competitionWizardStore';

// Re-export WizardState type for consumers
export type { WizardState } from './types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'CreateCompetition'>;

export default function CreateCompetitionScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();

  // Get initial state from route params (from AI competition flow)
  const initialState = route.params?.initialState as WizardData | undefined;

  // Subscription limit check
  const {
    tier,
    limits,
    competitionCount,
    isSubscriptionLoading,
    isCountLoading,
    showUpgradePrompt,
    setShowUpgradePrompt,
    upgradePromptConfig,
    setUpgradePromptConfig,
    isAtCompetitionLimit,
  } = useCompetitionLimitCheck();

  // Wizard step management
  const {
    currentStep,
    wizardData,
    STEPS,
    handleStep1Complete,
    handleStep2Complete,
    handlePlayersComplete,
    handlePlayersSkip,
    handlePrizePoolComplete,
    handleBack,
    handleReset,
    dialogConfig,
    showAlert,
    dismissDialog,
  } = useCompetitionWizardState({
    initialState,
    onGoBack: () => navigation.goBack(),
  });

  // Form submission
  const {
    handleSubmit: submitForm,
    isSubmitting,
    toastVisible,
    setToastVisible,
    toastMessage,
    toastInviteCode,
  } = useCompetitionFormSubmit({
    showAlert,
    setShowUpgradePrompt,
    setUpgradePromptConfig,
    tier,
    onSuccess: (competitionId) => {
      navigation.replace('CompetitionDetail', { id: competitionId });
    },
  });

  // Wire up the submit handler to current wizard data
  const handleSubmit = () => {
    submitForm(
      wizardData.step1,
      wizardData.step2,
      wizardData.players,
      wizardData.prizePoolConfig
    );
  };

  // Handle upgrade navigation
  const handleUpgrade = () => {
    setShowUpgradePrompt(false);
    navigation.navigate('Subscription' as never);
  };

  // Render current step
  const renderStep = () => {
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

    if (currentStep === 2) {
      return (
        <SimplifiedRoundDetailsStep
          initialData={wizardData.step2}
          onComplete={handleStep2Complete}
          onBack={handleBack}
          allowedGameTypes={limits?.allowedGameTypes}
          maxRoundsPerCompetition={limits?.maxRoundsPerCompetition}
          competitionStartDate={wizardData.step1?.startDate}
          enableTeams={wizardData.step1?.enableTeams}
        />
      );
    }

    if (currentStep === 3) {
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
          organizerIsPlayer={wizardData.step1?.organizerIsPlayer !== false}
          competitionMaxPlayers={wizardData.step1?.maxPlayers ?? null}
        />
      );
    }

    if (currentStep === 4) {
      return (
        <PrizePoolSetupStep
          initialData={wizardData.prizePoolConfig}
          playerCount={wizardData.players?.length ?? 0}
          roundCount={wizardData.step2?.length ?? 1}
          enableTeams={wizardData.step1?.enableTeams ?? false}
          onComplete={handlePrizePoolComplete}
          onBack={handleBack}
        />
      );
    }

    if (currentStep === 5) {
      return (
        <SimplifiedReviewStep
          competitionData={wizardData.step1!}
          roundsData={wizardData.step2!}
          playersData={wizardData.players}
          prizePoolData={wizardData.prizePoolConfig}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      );
    }

    return null;
  };

  // Build wizard-compatible object for FullScreenWizard (must be before early returns)
  const wizardCompat = useMemo((): UseWizardReturn => {
    const steps: WizardStepConfig[] = STEPS.map((step) => ({
      key: `step-${step.number}`,
      title: step.title,
      canProceed: true,
      render: () => null,
    }));
    const currentIndex = currentStep - 1;

    return {
      currentStepIndex: currentIndex,
      currentStep: steps[currentIndex] || steps[0],
      steps,
      goNext: () => {},
      goBack: handleBack,
      goToStep: () => {},
      isFirstStep: currentStep === 1,
      isLastStep: currentIndex === steps.length - 1,
      totalSteps: steps.length,
    };
  }, [STEPS, currentStep, handleBack]);

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
    <>
      <FullScreenWizard
        title="Create Competition"
        wizard={wizardCompat}
        showFooter={false}
        scrollable={false}
        onClose={() => navigation.goBack()}
      >
        <View style={styles.stepContent}>
          {renderStep()}
        </View>
      </FullScreenWizard>

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
    </>
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
  stepContent: {
    flex: 1,
  },
  header: {},
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
