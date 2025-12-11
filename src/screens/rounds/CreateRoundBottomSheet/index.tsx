/**
 * CreateRoundBottomSheet - Slide-up drawer for starting a new round
 *
 * Features:
 * - Slides up from bottom of screen
 * - Step 1: Search/select venue and course
 * - Step 2: Select tee box (optional)
 * - Step 3: Select match type (Stableford, Stroke, Match Play)
 * - Step 4: Select playing partners (up to 3 from friends)
 * - Step 5: Configure scoring setup
 * - Quick-start scoring
 * - Backdrop dismissal
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconX, IconChevronLeft } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { useFriends } from '@/hooks/useFriends';
import { useSearchVenues, useVenueCourseDisplayItems, useFavoriteCoursesWithVenues } from '@/hooks/useVenues';
import type { VenueCourseDisplayItem } from '@/hooks/useVenues';

// Types
import type { CreateRoundBottomSheetProps } from './types';
export type { CreateRoundBottomSheetProps, ScoringPairsConfig, PlayingPartner } from './types';

// Hooks
import { useCreateRoundWizard, useBottomSheetAnimation, SHEET_HEIGHT } from './hooks';

// Steps
import {
  CourseSelectionStep,
  TeeSelectionStep,
  MatchTypeStep,
  PartnersStep,
  ScoringSetupStep,
} from './steps';

export default function CreateRoundBottomSheet({
  visible,
  onClose,
  onStartRound,
  initialCourse,
}: CreateRoundBottomSheetProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();

  // Animation
  const { translateY, backdropOpacity, sheetHeight } = useBottomSheetAnimation({ visible });

  // Wizard state
  const wizard = useCreateRoundWizard({
    visible,
    initialCourse,
    onStartRound,
    onClose,
  });

  // Data fetching
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const { data: favoriteCourses } = useFavoriteCoursesWithVenues();

  // Venue/course search
  const { data: searchResults, isLoading: searchLoading } = useSearchVenues(
    wizard.data.searchQuery.trim(),
    undefined
  );
  const { data: allVenues, isLoading: venuesLoading } = useVenueCourseDisplayItems();

  // Transform search results to display items
  const displayItems: VenueCourseDisplayItem[] = wizard.data.searchQuery.trim().length >= 2
    ? (searchResults ?? []).map((venue) => ({
        type: venue.is_multi_course ? 'multi-course-venue' : 'single-course',
        venue: {
          id: venue.id,
          source: venue.source,
          api_id: venue.api_id,
          name: venue.name,
          state: venue.state,
          city: venue.city,
          address: venue.address,
          phone: venue.phone,
          email: venue.email,
          website: venue.website,
          location: venue.location,
          total_holes: venue.total_holes,
          last_synced: venue.last_synced,
          created_at: venue.created_at,
          updated_at: venue.updated_at,
        },
        courses: venue.courses,
      }))
    : (allVenues ?? []);

  const coursesLoading = wizard.data.searchQuery.trim().length >= 2 ? searchLoading : venuesLoading;

  // Get back button handler based on current step
  const getBackHandler = () => {
    switch (wizard.currentStep) {
      case 'tee':
        return wizard.handleBackToCourse;
      case 'matchType':
        return wizard.data.selectedCourse?.tees?.length
          ? wizard.handleBackToTee
          : wizard.handleBackToCourse;
      case 'partners':
        return wizard.handleBackToMatchType;
      case 'scoringSetup':
        return wizard.handleBackToPartners;
      default:
        return undefined;
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (wizard.currentStep) {
      case 'course':
        return 'Select Course';
      case 'tee':
        return 'Select Tee';
      case 'matchType':
        return 'Match Type';
      case 'partners':
        return 'Playing Partners';
      case 'scoringSetup':
        return 'Scoring Setup';
    }
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={wizard.handleClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            transform: [{ translateY }],
            backgroundColor: colors.white,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            {wizard.currentStep !== 'course' && (
              <TouchableOpacity
                onPress={getBackHandler()}
                style={styles.backButton}
                accessibilityLabel="Go back"
              >
                <IconChevronLeft size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <Text
              style={[
                styles.headerTitle,
                wizard.currentStep === 'course' && styles.headerTitleCentered,
                { color: colors.textPrimary },
              ]}
            >
              {getStepTitle()}
            </Text>
            <TouchableOpacity
              onPress={wizard.handleClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <IconX size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {(['course', 'tee', 'matchType', 'partners', 'scoringSetup'] as const).map(
              (step, index, arr) => (
                <React.Fragment key={step}>
                  <View
                    style={[
                      styles.stepDot,
                      { backgroundColor: colors.gray300 },
                      wizard.currentStep === step && {
                        backgroundColor: colors.primary,
                        width: 10,
                        height: 10,
                      },
                    ]}
                  />
                  {index < arr.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: colors.gray200 }]} />
                  )}
                </React.Fragment>
              )
            )}
          </View>

          {/* Step Content */}
          {wizard.currentStep === 'course' && (
            <CourseSelectionStep
              searchQuery={wizard.data.searchQuery}
              onSearchQueryChange={wizard.setSearchQuery}
              displayItems={displayItems}
              isLoading={coursesLoading}
              favoriteCourses={favoriteCourses}
              onSelectCourse={wizard.handleSelectCourse}
              onSelectFavoriteCourse={wizard.handleSelectFavoriteCourse}
            />
          )}

          {wizard.currentStep === 'tee' && wizard.data.selectedCourse && (
            <TeeSelectionStep
              selectedCourse={wizard.data.selectedCourse}
              selectedTee={wizard.data.selectedTee}
              onSelectTee={wizard.handleSelectTee}
              onSkipTeeSelection={wizard.handleSkipTeeSelection}
            />
          )}

          {wizard.currentStep === 'matchType' && (
            <MatchTypeStep
              selectedCourse={wizard.data.selectedCourse}
              selectedTee={wizard.data.selectedTee}
              selectedMatchType={wizard.data.selectedMatchType}
              onSelectMatchType={wizard.handleSelectMatchType}
            />
          )}

          {wizard.currentStep === 'partners' && (
            <PartnersStep
              selectedCourse={wizard.data.selectedCourse}
              selectedTee={wizard.data.selectedTee}
              selectedMatchType={wizard.data.selectedMatchType}
              selectedPartners={wizard.data.selectedPartners}
              friendSearchQuery={wizard.data.friendSearchQuery}
              onFriendSearchQueryChange={wizard.setFriendSearchQuery}
              friends={friends}
              friendsLoading={friendsLoading}
              onTogglePartner={wizard.handleTogglePartner}
              onRemovePartner={wizard.handleRemovePartner}
              isPartnerSelected={wizard.isPartnerSelected}
              onContinue={wizard.handleContinueToScoringSetup}
            />
          )}

          {wizard.currentStep === 'scoringSetup' && (
            <ScoringSetupStep
              selectedCourse={wizard.data.selectedCourse}
              selectedTee={wizard.data.selectedTee}
              selectedMatchType={wizard.data.selectedMatchType}
              selectedPartners={wizard.data.selectedPartners}
              isPremium={isPremium}
              scoringPairsEnabled={wizard.data.scoringPairsEnabled}
              scoringPairs={wizard.data.scoringPairs}
              onScoringPairsEnabledChange={wizard.setScoringPairsEnabled}
              onScoringPairsChange={wizard.handleScoringPairsChange}
              onStartScoring={wizard.handleStartScoring}
            />
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    ...shadows.xl,
  },
  keyboardView: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
  },
  headerTitleCentered: {
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
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
    borderRadius: 4,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
});
