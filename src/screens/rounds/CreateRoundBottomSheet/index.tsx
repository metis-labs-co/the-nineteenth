/**
 * CreateRoundBottomSheet - Slide-up drawer for starting a new round
 *
 * Features:
 * - Slides up from bottom of screen
 * - Step 1: Search/select club and course
 * - Step 2: Select tee box (optional)
 * - Step 3: Select match type (Stableford, Stroke, Match Play)
 * - Step 4: Select playing partners (up to 3 from friends)
 * - Step 5: Configure scoring setup
 * - Quick-start scoring
 * - Backdrop dismissal
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFriends } from '@/hooks/useFriends';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useCreateClubWithCourse } from '@/hooks/clubs/mutations';
import { useDeleteCourse } from '@/hooks/useDeleteCourse';
import {
  useSearchClubs,
  useClubsWithCourses,
  useFavoriteCoursesWithClubs,
  toClubCourseDisplayItem,
} from '@/hooks/useClubs';
import type { ClubCourseDisplayItem } from '@/hooks/useClubs';
import { BottomSheet } from '@/components/common';

// Types
import type { CreateRoundBottomSheetProps } from './types';

// Hooks
import { useCreateRoundWizard } from './hooks';

// Steps
import {
  CourseSelectionStep,
  TeeSelectionStep,
  MatchTypeStep,
  PartnersStep,
  ScoringSetupStep,
  BallCountStep,
} from './steps';
export type {
  CreateRoundBottomSheetProps,
  ScoringPairsConfig,
  PlayingPartner,
  StandaloneSkinsConfig,
  StandaloneWolfConfig,
  TeamConfig,
} from './types';

export default function CreateRoundBottomSheet({
  visible,
  onClose,
  onStartRound,
  initialCourse,
}: CreateRoundBottomSheetProps) {
  const colors = useThemeColors();
  const isSuperAdmin = useIsSuperAdmin();

  // Inline course creation state
  const [showCreateCourseForm, setShowCreateCourseForm] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const createClubWithCourse = useCreateClubWithCourse();
  const deleteCourseMutation = useDeleteCourse();

  // Track inline-created course for orphan cleanup on cancel
  const [inlineCreatedCourse, setInlineCreatedCourse] = useState<{
    courseId: string;
    clubId: string;
  } | null>(null);

  // Wizard state
  const wizard = useCreateRoundWizard({
    visible,
    initialCourse,
    onStartRound,
    onClose,
  });

  // Clear inline-created course tracking when sheet becomes invisible
  // (round was started successfully — don't clean up the course)
  useEffect(() => {
    if (!visible) {
      setInlineCreatedCourse(null);
    }
  }, [visible]);

  // Handle "Add New Course" button press
  const handleAddNewCourse = useCallback(() => {
    setShowCreateCourseForm(true);
    setNewClubName('');
    setNewCourseName('');
  }, []);

  // Handle creating the new club+course
  const handleCreateCourse = useCallback(async () => {
    if (!newClubName.trim()) return;

    try {
      const result = await createClubWithCourse.mutateAsync({
        club: { name: newClubName.trim() },
        course: {
          name: newCourseName.trim() || newClubName.trim(),
          holes: [],
        },
      });

      // Track created course for orphan cleanup if wizard is cancelled
      setInlineCreatedCourse({ courseId: result.course.id, clubId: result.club.id });

      // Auto-select the new course and mark as build-as-you-play
      wizard.setSearchQuery('');
      wizard.setBuildAsYouPlay(true);

      // Simulate course selection — new course has no tees, skip to matchType
      const courseData = {
        id: result.course.id,
        name: result.course.name,
        tees: null,
      };
      wizard.handleSelectCourse(
        courseData as Parameters<typeof wizard.handleSelectCourse>[0],
        result.club
      );

      setShowCreateCourseForm(false);
    } catch (error) {
      console.error('[CreateRound] Error creating club+course:', error);
    }
  }, [newClubName, newCourseName, createClubWithCourse, wizard]);

  // Cancel inline form
  const handleCancelCreateCourse = useCallback(() => {
    setShowCreateCourseForm(false);
    setNewClubName('');
    setNewCourseName('');
  }, []);

  // Data fetching
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const { data: favoriteCourses } = useFavoriteCoursesWithClubs();

  // Club/course search
  const { data: searchResults, isLoading: searchLoading } = useSearchClubs(
    wizard.data.searchQuery.trim(),
    undefined
  );
  const { data: allClubs, isLoading: clubsLoading } = useClubsWithCourses();

  // Transform clubs to display items (for both search and full list)
  const displayItems: ClubCourseDisplayItem[] =
    wizard.data.searchQuery.trim().length >= 2
      ? (searchResults ?? []).map(toClubCourseDisplayItem)
      : (allClubs ?? []).map(toClubCourseDisplayItem);

  const coursesLoading =
    wizard.data.searchQuery.trim().length >= 2 ? searchLoading : clubsLoading;

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
      case 'ballCount':
        return wizard.handleBackToPartners;
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
        return showCreateCourseForm ? 'Add New Course' : 'Select Course';
      case 'tee':
        return 'Select Tee';
      case 'matchType':
        return 'Match Type';
      case 'partners':
        return 'Playing Partners';
      case 'ballCount':
        return 'Practice Mode';
      case 'scoringSetup':
        return 'Scoring Setup';
    }
  };

  // Render back button for header
  const renderBackButton = () => {
    if (wizard.currentStep === 'course' && !showCreateCourseForm) return null;

    const backHandler = showCreateCourseForm ? handleCancelCreateCourse : getBackHandler();
    return (
      <TouchableOpacity
        onPress={backHandler}
        style={styles.backButton}
        accessibilityLabel="Go back"
      >
        <IconChevronLeft size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  // Wrap close to also reset inline form state and clean up orphan courses
  const handleClose = useCallback(() => {
    // If a course was created inline but the wizard is being closed without
    // starting a round, clean up the orphan course+club
    if (inlineCreatedCourse) {
      deleteCourseMutation.mutate(
        { courseId: inlineCreatedCourse.courseId, clubId: inlineCreatedCourse.clubId },
        {
          onError: (error) => {
            console.warn('[CreateRound] Failed to clean up orphan course:', error);
          },
        }
      );
      setInlineCreatedCourse(null);
    }

    setShowCreateCourseForm(false);
    setNewClubName('');
    setNewCourseName('');
    wizard.handleClose();
  }, [wizard, inlineCreatedCourse, deleteCourseMutation]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height={0.8}
      title={getStepTitle()}
      headerLeft={renderBackButton()}
      enableSwipeToDismiss={wizard.currentStep === 'course' && !showCreateCourseForm}
      testID="create-round-bottom-sheet"
    >
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {(
          // Adjust steps based on flow:
          // - With partners: course → tee → matchType → partners → scoringSetup
          // - Solo with ballCount step: course → tee → matchType → partners → ballCount
          // - Solo without ballCount: course → tee → matchType → partners
          wizard.data.selectedPartners.length > 0
            ? (['course', 'tee', 'matchType', 'partners', 'scoringSetup'] as const)
            : wizard.currentStep === 'ballCount'
              ? (['course', 'tee', 'matchType', 'partners', 'ballCount'] as const)
              : (['course', 'tee', 'matchType', 'partners'] as const)
        ).map((step, index, arr) => (
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
              <View
                style={[styles.stepLine, { backgroundColor: colors.gray200 }]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Step Content */}
      {wizard.currentStep === 'course' && !showCreateCourseForm && (
        <CourseSelectionStep
          searchQuery={wizard.data.searchQuery}
          onSearchQueryChange={wizard.setSearchQuery}
          displayItems={displayItems}
          isLoading={coursesLoading}
          favoriteCourses={favoriteCourses}
          onSelectCourse={wizard.handleSelectCourse}
          onSelectFavoriteCourse={wizard.handleSelectFavoriteCourse}
          isSuperAdmin={isSuperAdmin}
          onAddNewCourse={handleAddNewCourse}
        />
      )}

      {/* Inline course creation form */}
      {wizard.currentStep === 'course' && showCreateCourseForm && (
        <View style={styles.createCourseForm}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
            Club Name
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surfaceVariant,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={newClubName}
            onChangeText={setNewClubName}
            placeholder="e.g. Royal Melbourne"
            placeholderTextColor={colors.textDisabled}
            autoFocus
            returnKeyType="next"
          />

          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
            Course Name{' '}
            <Text style={{ color: colors.textDisabled, fontWeight: '400' }}>
              (optional)
            </Text>
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surfaceVariant,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={newCourseName}
            onChangeText={setNewCourseName}
            placeholder="Defaults to club name"
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
            onSubmitEditing={handleCreateCourse}
          />

          <TouchableOpacity
            onPress={handleCreateCourse}
            disabled={!newClubName.trim() || createClubWithCourse.isPending}
            style={[
              styles.createButton,
              {
                backgroundColor:
                  newClubName.trim() && !createClubWithCourse.isPending
                    ? colors.primary
                    : colors.gray300,
              },
              shadows.sm,
            ]}
          >
            {createClubWithCourse.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.createButtonText, { color: colors.white }]}>
                Create Course
              </Text>
            )}
          </TouchableOpacity>

          {createClubWithCourse.isError && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              Failed to create course. Please try again.
            </Text>
          )}
        </View>
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

      {wizard.currentStep === 'partners' && wizard.data.selectedMatchType && (
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

      {wizard.currentStep === 'ballCount' && wizard.data.selectedMatchType && (
        <BallCountStep
          selectedCourse={wizard.data.selectedCourse}
          selectedTee={wizard.data.selectedTee}
          selectedMatchType={wizard.data.selectedMatchType}
          ballCount={wizard.data.ballCount}
          onBallCountChange={wizard.handleSelectBallCount}
          onStartRound={wizard.handleStartSoloRound}
        />
      )}

      {wizard.currentStep === 'scoringSetup' &&
        wizard.data.selectedMatchType && (
          <ScoringSetupStep
            selectedCourse={wizard.data.selectedCourse}
            selectedTee={wizard.data.selectedTee}
            selectedMatchType={wizard.data.selectedMatchType}
            selectedPartners={wizard.data.selectedPartners}
            scoringPairsEnabled={wizard.data.scoringPairsEnabled}
            scoringPairs={wizard.data.scoringPairs}
            onScoringPairsEnabledChange={wizard.setScoringPairsEnabled}
            onScoringPairsChange={wizard.handleScoringPairsChange}
            teams={wizard.data.teams}
            teamsLocked={wizard.data.teamsLocked}
            splitIntoTeams={wizard.data.splitIntoTeams}
            onShuffleTeams={wizard.shuffleTeams}
            onSplitIntoTeamsChange={wizard.setSplitIntoTeams}
            skinsEnabled={wizard.data.skinsEnabled}
            skinsConfig={wizard.data.skinsConfig}
            onSkinsEnabledChange={wizard.setSkinsEnabled}
            onSkinsConfigChange={wizard.handleSkinsConfigChange}
            wolfEnabled={wizard.data.wolfEnabled}
            wolfConfig={wizard.data.wolfConfig}
            onWolfEnabledChange={wizard.setWolfEnabled}
            onWolfConfigChange={wizard.handleWolfConfigChange}
            onStartScoring={wizard.handleStartScoring}
          />
        )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  backButton: {
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
    borderRadius: borderRadius.sm,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  createCourseForm: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  formLabel: {
    ...typography.smallBold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  formInput: {
    height: 48,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    borderWidth: 1,
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    marginTop: spacing.xl,
  },
  createButtonText: {
    ...typography.bodyBold,
  },
  errorText: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
