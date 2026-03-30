/**
 * CreateRoundBottomSheet - Slide-up drawer for starting a new round
 *
 * Features:
 * - Slides up from bottom of screen
 * - Step 1: Search/select club and course
 * - Step 2: Select nine type (full 18, front 9, back 9)
 * - Step 3: Select match type (Stableford, Stroke, Match Play)
 * - Step 4: Select playing partners (with inline tee pickers)
 * - Step 5: Configure scoring setup (group) or Your Setup (solo)
 * - Quick-start scoring
 * - Backdrop dismissal
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFriends } from '@/hooks/useFriends';
import { useIsSuperAdmin, useIsSocial } from '@/store/subscriptionStore';
import { useCreateClubWithCourse, useCreateCourse } from '@/hooks/clubs/mutations';
import { useDeleteCourse } from '@/hooks/useDeleteCourse';
import { isLocalClub } from '@/hooks/clubs/helpers';
import { courseService } from '@/services/courses';
import { ClubAutocomplete } from '@/components/courses';
import type { Club } from '@/types/database.types';
import type { SearchResultItem } from '@/hooks/clubs/types';
import {
  useSearchClubs,
  useClubsWithCourses,
  useFavoriteCoursesWithClubs,
  toClubCourseDisplayItem,
  sortHomeClubFirst,
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
  NineTypeStep,
  MatchTypeStep,
  PartnersStep,
  ScoringSetupStep,
  BallCountStep,
  YourSetupStep,
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
  initialPartners,
  initialMatchType,
  skipPartnerStep,
}: CreateRoundBottomSheetProps) {
  const colors = useThemeColors();
  const isSuperAdmin = useIsSuperAdmin();
  const isSocialOrHigher = useIsSocial();

  // Inline course creation state
  const [showCreateCourseForm, setShowCreateCourseForm] = useState(false);
  const [selectedExistingClub, setSelectedExistingClub] = useState<Club | null>(null);
  const [isNewClub, setIsNewClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  const [isImportingClub, setIsImportingClub] = useState(false);
  const createClubWithCourse = useCreateClubWithCourse();
  const createCourse = useCreateCourse();
  const deleteCourseMutation = useDeleteCourse();

  // Track inline-created course for orphan cleanup on cancel
  // clubId is null when attaching to an existing club (don't delete the club)
  const [inlineCreatedCourse, setInlineCreatedCourse] = useState<{
    courseId: string;
    clubId: string | null;
  } | null>(null);

  // Wizard state
  const wizard = useCreateRoundWizard({
    visible,
    initialCourse,
    initialPartners,
    initialMatchType,
    skipPartnerStep,
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
    setSelectedExistingClub(null);
    setIsNewClub(false);
    setNewClubName('');
    setNewCourseName('');
    setNumHoles(18);
    setIsImportingClub(false);
  }, []);

  // Autocomplete: user selected an existing club from dropdown
  const handleSelectClubFromAutocomplete = useCallback(
    async (item: SearchResultItem) => {
      if (isLocalClub(item)) {
        setSelectedExistingClub(item as Club);
        setIsNewClub(false);
      } else {
        // API result — import the club first
        setIsImportingClub(true);
        try {
          const result = await courseService.importClubWithCourses(item.golfapi_club_id);
          setSelectedExistingClub(result.club);
          setIsNewClub(false);
        } catch (error) {
          console.error('[CreateRound] Failed to import club:', error);
        } finally {
          setIsImportingClub(false);
        }
      }
    },
    []
  );

  // Autocomplete: user chose "Create new"
  const handleCreateNewClub = useCallback((name: string) => {
    setIsNewClub(true);
    setNewClubName(name);
    setSelectedExistingClub(null);
  }, []);

  // Autocomplete: user cleared their selection
  const handleClearClubSelection = useCallback(() => {
    setSelectedExistingClub(null);
    setIsNewClub(false);
    setNewClubName('');
    setNewCourseName('');
    setNumHoles(18);
  }, []);

  // Helper to finish course creation — auto-selects and starts build-as-you-play
  const finishCourseCreation = useCallback(
    (courseId: string, courseName: string, club: Club, courseNumHoles: 9 | 18 = 18) => {
      wizard.setSearchQuery('');
      wizard.setBuildAsYouPlay(true);

      const courseData = { id: courseId, name: courseName, tees: null };
      wizard.handleSelectCourse(
        courseData as Parameters<typeof wizard.handleSelectCourse>[0],
        club
      );

      // Auto-select front9 for 9-hole courses
      if (courseNumHoles === 9) {
        wizard.handleSelectNineType('front9');
      }

      setShowCreateCourseForm(false);
    },
    [wizard]
  );

  // Handle creating course — branches on existing vs new club
  const handleCreateCourse = useCallback(async () => {
    try {
      if (selectedExistingClub) {
        // Path A: Add course to existing club
        const courseName = newCourseName.trim();
        if (!courseName) return;

        const course = await createCourse.mutateAsync({
          club_id: selectedExistingClub.id,
          name: courseName,
          holes: [],
          num_holes: numHoles,
        });

        // Only track courseId — don't delete the existing club on cancel
        setInlineCreatedCourse({ courseId: course.id, clubId: null });
        finishCourseCreation(course.id, course.name, selectedExistingClub, numHoles);
      } else if (isNewClub) {
        // Path B: Create new club + course
        if (!newClubName.trim()) return;

        const result = await createClubWithCourse.mutateAsync({
          club: { name: newClubName.trim(), total_holes: numHoles },
          course: {
            name: newCourseName.trim() || newClubName.trim(),
            holes: [],
            num_holes: numHoles,
          },
        });

        // Track both for orphan cleanup
        setInlineCreatedCourse({ courseId: result.course.id, clubId: result.club.id });
        finishCourseCreation(result.course.id, result.course.name, result.club, numHoles);
      }
    } catch (error) {
      console.error('[CreateRound] Error creating course:', error);
    }
  }, [
    selectedExistingClub,
    isNewClub,
    newClubName,
    newCourseName,
    numHoles,
    createCourse,
    createClubWithCourse,
    finishCourseCreation,
  ]);

  // Cancel inline form
  const handleCancelCreateCourse = useCallback(() => {
    setShowCreateCourseForm(false);
    setSelectedExistingClub(null);
    setIsNewClub(false);
    setNewClubName('');
    setNewCourseName('');
    setNumHoles(18);
    setIsImportingClub(false);
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

  // Transform clubs to display items (for both search and full list), home club first
  const displayItems: ClubCourseDisplayItem[] = sortHomeClubFirst(
    wizard.data.searchQuery.trim().length >= 2
      ? (searchResults ?? []).map(toClubCourseDisplayItem)
      : (allClubs ?? []).map(toClubCourseDisplayItem)
  );

  const coursesLoading =
    wizard.data.searchQuery.trim().length >= 2 ? searchLoading : clubsLoading;

  // Available tees from the selected course
  const availableTees = useMemo(
    () => wizard.data.selectedCourse?.tees ?? [],
    [wizard.data.selectedCourse?.tees]
  );

  // Get back button handler based on current step
  const getBackHandler = () => {
    switch (wizard.currentStep) {
      case 'nineType':
        return wizard.handleBackToCourse;
      case 'matchType':
        return wizard.handleBackToNineType;
      case 'partners':
        return wizard.handleBackToMatchType;
      case 'yourSetup':
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
      case 'nineType':
        return 'Holes';
      case 'matchType':
        return 'Match Type';
      case 'partners':
        return 'Playing Partners';
      case 'yourSetup':
        return 'Solo Round';
      case 'ballCount':
        return 'Solo Round';
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
        {
          courseId: inlineCreatedCourse.courseId,
          clubId: inlineCreatedCourse.clubId ?? undefined,
        },
        {
          onError: (error) => {
            console.warn('[CreateRound] Failed to clean up orphan course:', error);
          },
        }
      );
      setInlineCreatedCourse(null);
    }

    setShowCreateCourseForm(false);
    setSelectedExistingClub(null);
    setIsNewClub(false);
    setNewClubName('');
    setNewCourseName('');
    setNumHoles(18);
    setIsImportingClub(false);
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
          // - With partners: course → nineType → matchType → partners → scoringSetup
          // - Solo with yourSetup step: course → nineType → matchType → partners → yourSetup
          // - Solo without yourSetup: course → nineType → matchType → partners
          // - When initialMatchType is set: matchType step is skipped
          // - When skipPartnerStep is set: partners/scoringSetup/yourSetup steps are skipped
          (() => {
            let steps: readonly string[];
            if (skipPartnerStep) {
              steps = ['course', 'nineType', 'matchType'];
            } else if (wizard.data.selectedPartners.length > 0) {
              steps = ['course', 'nineType', 'matchType', 'partners', 'scoringSetup'];
            } else if (wizard.currentStep === 'yourSetup') {
              steps = ['course', 'nineType', 'matchType', 'partners', 'yourSetup'];
            } else if (wizard.currentStep === 'ballCount') {
              steps = ['course', 'nineType', 'matchType', 'partners', 'ballCount'];
            } else {
              steps = ['course', 'nineType', 'matchType', 'partners'];
            }
            return initialMatchType ? steps.filter((s) => s !== 'matchType') : steps;
          })()
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
          {/* Club autocomplete */}
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
            Club
          </Text>
          {isNewClub ? (
            <View style={[styles.chipContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Text
                style={[styles.chipText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {newClubName} (new)
              </Text>
              <TouchableOpacity onPress={handleClearClubSelection} hitSlop={8}>
                <Text style={[styles.chipClear, { color: colors.textSecondary }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ClubAutocomplete
              selectedClub={selectedExistingClub}
              onSelectClub={handleSelectClubFromAutocomplete}
              onCreateNew={handleCreateNewClub}
              onClearSelection={handleClearClubSelection}
              isImporting={isImportingClub}
            />
          )}

          {/* Course name — shown once a club is selected or "Create new" is chosen */}
          {(selectedExistingClub || isNewClub) && (
            <>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Course Name{' '}
                {isNewClub && (
                  <Text style={{ color: colors.textDisabled, fontWeight: '400' }}>
                    (optional)
                  </Text>
                )}
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
                placeholder={
                  selectedExistingClub
                    ? 'e.g. Championship Course'
                    : 'Defaults to club name'
                }
                placeholderTextColor={colors.textDisabled}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateCourse}
              />

              {/* 9/18 Holes Toggle (Super Admin only) */}
              {isSuperAdmin && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                    Number of Holes
                  </Text>
                  <View style={styles.numHolesToggle}>
                    <TouchableOpacity
                      onPress={() => setNumHoles(9)}
                      style={[
                        styles.numHolesPill,
                        { borderColor: colors.primary },
                        numHoles === 9
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.numHolesPillText,
                          { color: numHoles === 9 ? colors.white : colors.primary },
                        ]}
                      >
                        9 Holes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setNumHoles(18)}
                      style={[
                        styles.numHolesPill,
                        { borderColor: colors.primary },
                        numHoles === 18
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.numHolesPillText,
                          { color: numHoles === 18 ? colors.white : colors.primary },
                        ]}
                      >
                        18 Holes
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity
                onPress={handleCreateCourse}
                disabled={
                  (selectedExistingClub && !newCourseName.trim()) ||
                  (isNewClub && !newClubName.trim()) ||
                  createClubWithCourse.isPending ||
                  createCourse.isPending
                }
                style={[
                  styles.createButton,
                  {
                    backgroundColor:
                      ((selectedExistingClub && newCourseName.trim()) ||
                        (isNewClub && newClubName.trim())) &&
                      !createClubWithCourse.isPending &&
                      !createCourse.isPending
                        ? colors.primary
                        : colors.gray300,
                  },
                  shadows.sm,
                ]}
              >
                {createClubWithCourse.isPending || createCourse.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.createButtonText, { color: colors.white }]}>
                    {selectedExistingClub ? 'Add Course' : 'Create Course'}
                  </Text>
                )}
              </TouchableOpacity>

              {(createClubWithCourse.isError || createCourse.isError) && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Failed to create course. Please try again.
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {wizard.currentStep === 'nineType' && (
        <NineTypeStep
          selectedNineType={wizard.data.nineType}
          onSelectNineType={wizard.handleSelectNineType}
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
          availableTees={availableTees}
          currentUserTee={wizard.data.selectedTee}
          onCurrentUserTeeChange={wizard.handleCurrentUserTeeChange}
          onPartnerTeeChange={wizard.handlePlayerTeeChange}
        />
      )}

      {wizard.currentStep === 'yourSetup' && wizard.data.selectedMatchType && (
        <YourSetupStep
          selectedCourse={wizard.data.selectedCourse}
          selectedTee={wizard.data.selectedTee}
          selectedMatchType={wizard.data.selectedMatchType}
          availableTees={availableTees}
          onTeeChange={wizard.handleCurrentUserTeeChange}
          ballCount={wizard.data.ballCount}
          onBallCountChange={wizard.handleSelectBallCount}
          handicapSource={wizard.data.handicapSource}
          onHandicapSourceChange={wizard.setHandicapSource}
          onStartRound={wizard.handleStartSoloRound}
          isSocialOrHigher={isSocialOrHigher}
        />
      )}

      {wizard.currentStep === 'ballCount' && wizard.data.selectedMatchType && (
        <BallCountStep
          selectedCourse={wizard.data.selectedCourse}
          selectedTee={wizard.data.selectedTee}
          selectedMatchType={wizard.data.selectedMatchType}
          ballCount={wizard.data.ballCount}
          onBallCountChange={wizard.handleSelectBallCount}
          handicapSource={wizard.data.handicapSource}
          onHandicapSourceChange={wizard.setHandicapSource}
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
            handicapSource={wizard.data.handicapSource}
            onHandicapSourceChange={wizard.setHandicapSource}
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
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  chipText: {
    ...typography.body,
    flex: 1,
  },
  chipClear: {
    ...typography.smallBold,
  },
  numHolesToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numHolesPill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numHolesPillText: {
    ...typography.bodyBold,
  },
});
