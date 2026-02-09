/**
 * OnboardingScreen - Multi-step onboarding flow
 *
 * Shows to authenticated users who haven't set their handicap yet.
 * 7 steps: Welcome -> Create Competitions -> Notifications -> Location -> Biometric -> Handicap Capture -> Home Venue
 *
 * Features:
 * - Swipeable cards (FlatList with pagingEnabled)
 * - Skip button (always visible)
 * - Progress dots
 * - Push notification permission request
 * - GPS location permission request
 * - Handicap input with validation (0-54)
 * - Home venue selection (optional)
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// Step components
import WelcomeStep from './components/WelcomeStep';
import CreateCompetitionsStep from './components/CreateCompetitionsStep';
import NotificationsStep from './components/NotificationsStep';
import LocationStep from './components/LocationStep';
import BiometricStep from './components/BiometricStep';
import HandicapCaptureStep from './components/HandicapCaptureStep';
import HomeClubStep from './components/HomeClubStep';
import OnboardingDots from './components/OnboardingDots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StepItem {
  key: string;
  component: React.ComponentType<StepProps>;
}

export interface StepProps {
  onNext: () => void;
  onComplete: (skipHandicap?: boolean) => Promise<void>;
  onSkip: () => void;
  isLastStep: boolean;
  handicap: string;
  setHandicap: (value: string) => void;
  isSubmitting: boolean;
}

const STEPS: StepItem[] = [
  { key: 'welcome', component: WelcomeStep },
  { key: 'competitions', component: CreateCompetitionsStep },
  { key: 'notifications', component: NotificationsStep },
  { key: 'location', component: LocationStep },
  { key: 'biometric', component: BiometricStep },
  { key: 'handicap', component: HandicapCaptureStep },
  { key: 'homeClub', component: HomeClubStep },
];

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { updateProfile } = useAuth();

  const flatListRef = useRef<FlatList>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [handicap, setHandicap] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle viewable items change (for progress dots)
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentStep(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentStep + 1,
        animated: true,
      });
    }
  }, [currentStep]);

  // Complete onboarding (with or without handicap)
  const handleComplete = useCallback(
    async (skipHandicap = false) => {
      console.log('[OnboardingScreen] handleComplete called, skipHandicap:', skipHandicap, 'handicap:', handicap);

      if (isSubmitting) {
        console.log('[OnboardingScreen] Already submitting, ignoring');
        return;
      }

      setIsSubmitting(true);
      try {
        const handicapValue =
          skipHandicap || !handicap ? 54 : parseFloat(handicap);

        console.log('[OnboardingScreen] Updating profile with handicap:', handicapValue);

        await updateProfile({
          handicap: handicapValue,
        });

        console.log('[OnboardingScreen] Profile updated successfully');
        // Navigation handled automatically by RootNavigator
      } catch (error) {
        console.error('[OnboardingScreen] Failed to complete onboarding:', error);
        // Could show error toast here
        setIsSubmitting(false);
      }
      // Note: Don't set isSubmitting to false on success - let navigation happen
    },
    [handicap, updateProfile, isSubmitting]
  );

  // Skip entire onboarding
  const handleSkip = useCallback(async () => {
    console.log('[OnboardingScreen] Skip pressed');
    await handleComplete(true);
  }, [handleComplete]);

  // Navigate to specific step via dots
  const handleDotPress = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // Render each step
  const renderStep = useCallback(
    ({ item, index }: { item: StepItem; index: number }) => {
      const StepComponent = item.component;

      return (
        <View style={[styles.stepContainer, { width: SCREEN_WIDTH }]}>
          <StepComponent
            onNext={handleNext}
            onComplete={handleComplete}
            onSkip={handleSkip}
            isLastStep={index === STEPS.length - 1}
            handicap={handicap}
            setHandicap={setHandicap}
            isSubmitting={isSubmitting}
          />
        </View>
      );
    },
    [handleNext, handleComplete, handleSkip, handicap, isSubmitting]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip Button (top-right) */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + spacing.md }]}
        onPress={handleSkip}
        accessibilityLabel="Skip onboarding"
        accessibilityRole="button"
        disabled={isSubmitting}
      >
        <Text
          style={[
            styles.skipText,
            { color: isSubmitting ? colors.textDisabled : colors.textSecondary },
          ]}
        >
          Skip
        </Text>
      </TouchableOpacity>

      {/* Swipeable Steps */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        renderItem={renderStep}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={!isSubmitting}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Progress Dots */}
      <View
        style={[styles.dotsContainer, { bottom: insets.bottom + spacing.xxxl }]}
      >
        <OnboardingDots
          totalSteps={STEPS.length}
          currentStep={currentStep}
          onDotPress={handleDotPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.bodyBold,
  },
  stepContainer: {
    flex: 1,
  },
  dotsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
