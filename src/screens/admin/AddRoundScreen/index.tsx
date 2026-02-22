/**
 * AddRoundScreen - Add a new round to an existing competition
 *
 * Multi-step wizard:
 * - Step 1: Course & Schedule (course, tee, date, time)
 * - Step 2: Game Format (game type, team round, team format)
 * - Step 3: Options (scoring pairs, skins, wolf)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useTeams } from '@/hooks/useTeams';
import { ConfirmationDialog } from '@/components/common';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import {
  SkinsConfigBottomSheet,
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
} from '@/components/skins';
import {
  WolfConfigBottomSheet,
  WolfDisclaimerModal,
  hasAcceptedWolfDisclaimer,
} from '@/components/wolf';

// Local imports
import { useAddRoundForm } from './hooks';
import { CourseSelectionModal, ScoringPairsPromptModal } from './components';
import { CourseScheduleStep, GameFormatStep, OptionsStep } from './steps';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRound'>;

type Step = 1 | 2 | 3;
const TOTAL_STEPS = 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Course & Schedule',
  2: 'Game Format',
  3: 'Options',
};

export default function AddRoundScreen({ navigation, route }: Props) {
  const { competitionId } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { limits } = useSubscriptionContext();

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showScoringPairsPrompt, setShowScoringPairsPrompt] = useState(false);
  const [createdRoundId, setCreatedRoundId] = useState<string | null>(null);

  // Skins modal state
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showSkinsDisclaimer, setShowSkinsDisclaimer] = useState(false);

  // Wolf modal state
  const [showWolfConfigSheet, setShowWolfConfigSheet] = useState(false);
  const [showWolfDisclaimer, setShowWolfDisclaimer] = useState(false);

  // Fetch teams for team pairing preview
  const { data: teams = [] } = useTeams(competitionId);

  // Form hook
  const form = useAddRoundForm({
    competitionId,
    onSuccess: (roundId, scoringPairsRequired) => {
      if (scoringPairsRequired) {
        setCreatedRoundId(roundId);
        setShowScoringPairsPrompt(true);
      } else {
        navigation.goBack();
      }
    },
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  }, [currentStep]);

  // Handle course selection
  const handleCourseSelect = useCallback(
    (course: CourseWithFavorite) => {
      form.handleCourseSelect(course);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    [form]
  );

  // Handle scoring pairs prompt responses
  const handleConfigureScoringPairsNow = useCallback(() => {
    setShowScoringPairsPrompt(false);
    if (createdRoundId) {
      navigation.replace('ScoringPairs', { roundId: createdRoundId, competitionId });
    }
  }, [createdRoundId, competitionId, navigation]);

  const handleConfigureScoringPairsLater = useCallback(() => {
    setShowScoringPairsPrompt(false);
    navigation.goBack();
  }, [navigation]);

  // ===== Skins handlers =====
  const handleSkinsTogglePress = useCallback(async () => {
    if (form.formData.skinsEnabled) {
      form.handleSkinsEnabledChange(false);
    } else {
      const accepted = await hasAcceptedSkinsDisclaimer();
      if (accepted) {
        setShowSkinsConfigSheet(true);
      } else {
        setShowSkinsDisclaimer(true);
      }
    }
  }, [form]);

  const handleSkinsDisclaimerAccept = useCallback(() => {
    setShowSkinsDisclaimer(false);
    setShowSkinsConfigSheet(true);
  }, []);

  const handleSkinsDisclaimerCancel = useCallback(() => {
    setShowSkinsDisclaimer(false);
  }, []);

  const handleSkinsConfigSave = useCallback(
    (config: SkinsConfig) => {
      form.handleSkinsConfigChange(config);
      form.handleSkinsEnabledChange(true);
      setShowSkinsConfigSheet(false);
    },
    [form]
  );

  const handleSkinsConfigDismiss = useCallback(() => {
    setShowSkinsConfigSheet(false);
  }, []);

  const handleSkinsEditPress = useCallback(() => {
    setShowSkinsConfigSheet(true);
  }, []);

  // ===== Wolf handlers =====
  const handleWolfTogglePress = useCallback(async () => {
    if (form.formData.wolfEnabled) {
      form.handleWolfEnabledChange(false);
    } else {
      const accepted = await hasAcceptedWolfDisclaimer();
      if (accepted) {
        setShowWolfConfigSheet(true);
      } else {
        setShowWolfDisclaimer(true);
      }
    }
  }, [form]);

  const handleWolfDisclaimerAccept = useCallback(() => {
    setShowWolfDisclaimer(false);
    setShowWolfConfigSheet(true);
  }, []);

  const handleWolfDisclaimerCancel = useCallback(() => {
    setShowWolfDisclaimer(false);
  }, []);

  const handleWolfConfigSave = useCallback(
    (config: WolfConfig) => {
      form.handleWolfConfigChange(config);
      form.handleWolfEnabledChange(true);
      setShowWolfConfigSheet(false);
    },
    [form]
  );

  const handleWolfConfigDismiss = useCallback(() => {
    setShowWolfConfigSheet(false);
  }, []);

  const handleWolfEditPress = useCallback(() => {
    setShowWolfConfigSheet(true);
  }, []);

  // Validate current step before proceeding
  const canProceed = (() => {
    if (currentStep === 1) {
      return !!form.formData.courseId && !!form.formData.date;
    }
    if (currentStep === 2) {
      if (form.formData.isTeamRound && !form.formData.teamFormat) {
        return false;
      }
      return true;
    }
    return true;
  })();

  // Render step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {([1, 2, 3] as Step[]).map((step, index) => (
        <React.Fragment key={step}>
          <View
            style={[
              styles.stepDot,
              { backgroundColor: colors.gray300 },
              currentStep === step && {
                backgroundColor: colors.primary,
                width: 10,
                height: 10,
              },
              currentStep > step && {
                backgroundColor: colors.primary,
              },
            ]}
          />
          {index < TOTAL_STEPS - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: currentStep > step ? colors.primary : colors.gray200 },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CourseScheduleStep
            formData={form.formData}
            errors={form.errors}
            disabled={form.isPending}
            onOpenCourseModal={() => setShowCourseModal(true)}
            onTeeSelect={form.handleTeeSelect}
            onDateChange={form.handleDateChange}
            onTimeChange={form.handleTimeChange}
            onClearTime={form.clearTeeTime}
            getSelectedDate={form.getSelectedDate}
            getSelectedTime={form.getSelectedTime}
          />
        );
      case 2:
        return (
          <GameFormatStep
            gameType={form.formData.gameType}
            isTeamRound={form.formData.isTeamRound}
            teamFormat={form.formData.teamFormat}
            teams={teams}
            supportsTeams={form.supportsTeams}
            teamFormatError={form.errors.teamFormat}
            disabled={form.isPending}
            allowedGameTypes={limits?.allowedGameTypes}
            onGameTypeChange={form.handleGameTypeChange}
            onTeamRoundToggle={form.handleTeamRoundToggle}
            onTeamFormatChange={form.handleTeamFormatChange}
            onUpgradePress={() => navigation.navigate('Subscription')}
          />
        );
      case 3:
        return (
          <OptionsStep
            scoringPairsRequired={form.formData.scoringPairsRequired}
            isTeamMatchPlay={form.isTeamMatchPlay}
            onScoringPairsToggle={form.handleScoringPairsToggle}
            skinsEnabled={form.formData.skinsEnabled}
            skinsConfig={form.formData.skinsConfig}
            onSkinsTogglePress={handleSkinsTogglePress}
            onSkinsEditPress={handleSkinsEditPress}
            poolSource={form.formData.skinsPoolSource}
            canEnableSkins={form.canEnableSkins}
            skinsDisabledReason={form.skinsDisabledReason}
            wolfEnabled={form.formData.wolfEnabled}
            wolfConfig={form.formData.wolfConfig}
            isTeamRound={form.formData.isTeamRound}
            onWolfTogglePress={handleWolfTogglePress}
            onWolfEditPress={handleWolfEditPress}
            canEnableWolf={form.canEnableWolf}
            wolfDisabledReason={form.wolfDisabledReason}
            disabled={form.isPending}
            supportsTeams={form.supportsTeams}
            competitionPlayerCount={form.competitionPlayerCount}
            onUpgradePress={() => navigation.navigate('Subscription')}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.white,
            borderBottomColor: colors.gray200,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel={currentStep > 1 ? 'Go back' : 'Close'}
          accessibilityRole="button"
        >
          <Icon
            source={currentStep > 1 ? 'chevron-left' : 'close'}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {STEP_TITLES[currentStep]}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Step {currentStep} of {TOTAL_STEPS}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.lg + 80 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form Section */}
        <View style={[styles.formSection, { backgroundColor: colors.white }]}>
          {renderStepContent()}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.white,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        {currentStep < TOTAL_STEPS ? (
          // Next button
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canProceed || form.isPending}
            style={[
              styles.nextButton,
              {
                backgroundColor:
                  !canProceed || form.isPending ? colors.gray300 : colors.primary,
              },
            ]}
            activeOpacity={0.7}
            accessibilityLabel="Next step"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canProceed || form.isPending }}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>Next</Text>
            <Icon source="chevron-right" size={20} color={colors.white} />
          </TouchableOpacity>
        ) : (
          // Final step: Cancel and Add Round buttons
          <View style={styles.footerButtons}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={form.isPending}
              style={[
                styles.cancelButton,
                { borderColor: colors.gray300 },
                form.isPending && { opacity: 0.5 },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              accessibilityState={{ disabled: form.isPending }}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={form.handleSubmit}
              disabled={form.isPending}
              style={[
                styles.saveButton,
                { backgroundColor: form.isPending ? colors.gray300 : colors.primary },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Add Round"
              accessibilityRole="button"
              accessibilityState={{ disabled: form.isPending, busy: form.isPending }}
            >
              {form.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>Add Round</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Course Selection Modal */}
      <CourseSelectionModal
        visible={showCourseModal}
        onClose={() => {
          setShowCourseModal(false);
          setCourseSearchQuery('');
        }}
        onSelect={handleCourseSelect}
        searchQuery={courseSearchQuery}
        onSearchQueryChange={setCourseSearchQuery}
      />

      {/* Scoring Pairs Configuration Prompt Modal */}
      <ScoringPairsPromptModal
        visible={showScoringPairsPrompt}
        onConfigureNow={handleConfigureScoringPairsNow}
        onConfigureLater={handleConfigureScoringPairsLater}
      />

      {/* Confirmation Dialog - Error messages */}
      <ConfirmationDialog {...form.dialogConfig} onCancel={form.dismissDialog} />

      {/* Skins Bottom Sheet & Disclaimer - rendered at root for proper z-index */}
      <SkinsConfigBottomSheet
        visible={showSkinsConfigSheet}
        onDismiss={handleSkinsConfigDismiss}
        initialConfig={form.formData.skinsConfig}
        onSave={handleSkinsConfigSave}
      />
      <SkinsDisclaimerModal
        visible={showSkinsDisclaimer}
        onAccept={handleSkinsDisclaimerAccept}
        onCancel={handleSkinsDisclaimerCancel}
      />

      {/* Wolf Bottom Sheet & Disclaimer - rendered at root for proper z-index */}
      <WolfConfigBottomSheet
        visible={showWolfConfigSheet}
        onDismiss={handleWolfConfigDismiss}
        initialConfig={form.formData.wolfConfig}
        onSave={handleWolfConfigSave}
        participants={[]}
      />
      <WolfDisclaimerModal
        visible={showWolfDisclaimer}
        onAccept={handleWolfDisclaimerAccept}
        onCancel={handleWolfDisclaimerCancel}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSubtitle: {
    ...typography.caption,
  },
  headerSpacer: {
    width: 44,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.sm,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nextButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyBold,
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
