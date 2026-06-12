/**
 * CreateRoundBottomSheet - Full-screen wizard for starting a new round
 *
 * Features:
 * - Full-screen wizard with segmented progress bar
 * - Step 1: Select game format (preset catalog)
 * - Step 2: Search/select club and course
 * - Step 3: Select nine type (full 18, front 9, back 9)
 * - Step 4: Select playing partners (with inline tee pickers)
 * - Step 5: Configure scoring setup (group) or Your Setup (solo)
 * - Quick-start scoring
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFriends } from '@/hooks/useFriends';
import { useIsSuperAdmin, useIsSocial } from '@/store/subscriptionStore';
import { useCreateClubWithCourse, useCreateCourse } from '@/hooks/clubs/mutations';
import { useDeleteCourse } from '@/hooks/useDeleteCourse';
import { isLocalClub } from '@/hooks/clubs/helpers';
import { courseService } from '@/services/courses';
import { ClubAutocomplete } from '@/components/courses';
import { teesToTeeBoxes } from '@/utils/teeTransformers';
import { hasCompleteHoleData } from '@/services/api/golfApiTransformers';
import { clubKeys, courseKeys } from '@/hooks/queryKeys';
import type { Club } from '@/types/database.types';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { SearchResultItem } from '@/hooks/clubs/types';
import {
  useSearchClubs,
  useClubsWithCourses,
  useFavoriteCoursesWithClubs,
  toClubCourseDisplayItem,
  sortHomeClubFirst,
  sortByDistance,
} from '@/hooks/useClubs';
import { isGolfApiResult } from '@/hooks/courses';
import type { ClubCardItem } from '@/components/courses/ClubCard';
import { useOneShotLocation } from '@/hooks/useOneShotLocation';
import { FullScreenWizard, SystemModalTheme } from '@/components/common';
import type { UseWizardReturn, WizardStepConfig } from '@/components/common';

// Types
import type { CreateRoundBottomSheetProps } from './types';

// Hooks
import { useCreateRoundWizard } from './hooks';

// Steps
import {
  CourseSelectionStep,
  NineTypeStep,
  GameFormatStep,
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
  const queryClient = useQueryClient();
  const isSuperAdmin = useIsSuperAdmin();
  const isSocialOrHigher = useIsSocial();
  const { location: userLocation } = useOneShotLocation(visible);

  // Inline course creation state
  const [showCreateCourseForm, setShowCreateCourseForm] = useState(false);
  const [selectedExistingClub, setSelectedExistingClub] = useState<Club | null>(null);
  const [isNewClub, setIsNewClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  const [isImportingClub, setIsImportingClub] = useState(false);
  const [importingClubIds, setImportingClubIds] = useState<Set<string>>(new Set());
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

  // Course data refresh (when tee slope/CR is missing)
  const [isRefreshingCourseData, setIsRefreshingCourseData] = useState(false);

  const handleRefreshCourseData = useCallback(async () => {
    const golfapiId = wizard.data.selectedCourse?.golfapiCourseId;
    if (!golfapiId) return;

    setIsRefreshingCourseData(true);
    try {
      // Re-import course from GolfAPI.io (same as CourseDetailScreen refresh)
      const result = await courseService.importCourse(golfapiId);
      const freshTeeBoxes = teesToTeeBoxes(result.tees);

      // Update wizard state with fresh tee and hole data
      const currentTeeName = wizard.data.selectedTee?.name;
      wizard.setData((prev) => ({
        ...prev,
        selectedCourse: prev.selectedCourse
          ? {
              ...prev.selectedCourse,
              tees: freshTeeBoxes,
              holes: result.course.holes ?? prev.selectedCourse.holes,
            }
          : prev.selectedCourse,
        selectedTee: currentTeeName
          ? freshTeeBoxes.find((t) => t.name === currentTeeName) ?? freshTeeBoxes[0] ?? prev.selectedTee
          : freshTeeBoxes[0] ?? prev.selectedTee,
      }));
    } catch (error) {
      console.error('[CreateRound] Failed to refresh course data:', error);
    } finally {
      setIsRefreshingCourseData(false);
    }
  }, [wizard.data.selectedCourse?.golfapiCourseId, wizard.data.selectedTee?.name, wizard.setData]);

  // Courses we've already auto-refreshed this session, to avoid re-triggering
  // when the refresh completes but still doesn't return complete data.
  const autoRefreshedCourseIdsRef = useRef<Set<string>>(new Set());

  // Auto-refresh course data when selected course has incomplete hole data
  // and a golfapi_course_id is available to refresh from. Prevents the
  // scoring step from rendering with missing data (which previously crashed
  // in par calculations).
  useEffect(() => {
    const course = wizard.data.selectedCourse;
    if (!course?.golfapiCourseId) return;
    if (autoRefreshedCourseIdsRef.current.has(course.courseId)) return;
    if (isRefreshingCourseData) return;

    if (!hasCompleteHoleData(course.holes ?? null)) {
      autoRefreshedCourseIdsRef.current.add(course.courseId);
      void handleRefreshCourseData();
    }
  }, [wizard.data.selectedCourse, isRefreshingCourseData, handleRefreshCourseData]);

  // Clear inline-created course tracking when sheet becomes invisible
  // (round was started successfully — don't clean up the course)
  useEffect(() => {
    if (!visible) {
      setInlineCreatedCourse(null);
      autoRefreshedCourseIdsRef.current.clear();
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

  // User tapped a GolfAPI-only result from the search list. Import the full
  // club + courses + tees + coordinates, then auto-select if single-course.
  const handleSelectApiClub = useCallback(
    async (golfapiClubId: string) => {
      if (importingClubIds.has(golfapiClubId)) return;

      setImportingClubIds((prev) => {
        const next = new Set(prev);
        next.add(golfapiClubId);
        return next;
      });

      try {
        const result = await courseService.importClubWithCourses(golfapiClubId);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: clubKeys.all }),
          queryClient.invalidateQueries({ queryKey: courseKeys.all }),
        ]);

        // Single-course clubs: auto-select the imported course so the user
        // doesn't have to re-tap after the list refetches.
        if (result.courses.length === 1) {
          const imported = result.courses[0];
          const teeBoxes = teesToTeeBoxes(
            result.tees.filter((t) => t.course_id === imported.id)
          );
          const courseForWizard: CourseWithFavoriteStatus = {
            ...imported,
            tees: teeBoxes,
            is_favorite: false,
          };
          wizard.handleSelectCourse(courseForWizard, result.club);
        }
      } catch (error) {
        console.error('[CreateRound] Failed to import API club:', error);
      } finally {
        setImportingClubIds((prev) => {
          const next = new Set(prev);
          next.delete(golfapiClubId);
          return next;
        });
      }
    },
    [importingClubIds, queryClient, wizard]
  );

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

  // Display items preserve GolfAPI-only search results as-is (so ClubCard
  // routes them to ApiResultCard). Local DB clubs are transformed normally.
  const rawDisplayItems: ClubCardItem[] = useMemo(() => {
    if (wizard.data.searchQuery.trim().length >= 2) {
      return (searchResults ?? []).map((item) =>
        isGolfApiResult(item) ? item : toClubCourseDisplayItem(item)
      );
    }
    return (allClubs ?? []).map(toClubCourseDisplayItem);
  }, [wizard.data.searchQuery, searchResults, allClubs]);

  const { items: displayItems, distances: clubDistances } = useMemo(() => {
    if (userLocation) {
      return sortByDistance(rawDisplayItems, userLocation.latitude, userLocation.longitude);
    }
    return { items: sortHomeClubFirst(rawDisplayItems), distances: new Map<string, number>() };
  }, [rawDisplayItems, userLocation]);

  const coursesLoading =
    wizard.data.searchQuery.trim().length >= 2 ? searchLoading : clubsLoading;

  // Available tees from the selected course
  const availableTees = useMemo(
    () => wizard.data.selectedCourse?.tees ?? [],
    [wizard.data.selectedCourse?.tees]
  );

  // Compute dynamic step list for progress bar
  const dynamicStepKeys = useMemo(() => {
    let steps: string[];
    if (skipPartnerStep) {
      steps = ['gameFormat', 'course', 'nineType'];
    } else if (wizard.data.selectedPartners.length > 0) {
      steps = ['gameFormat', 'course', 'nineType', 'partners', 'scoringSetup'];
    } else if (wizard.currentStep === 'yourSetup') {
      steps = ['gameFormat', 'course', 'nineType', 'partners', 'yourSetup'];
    } else if (wizard.currentStep === 'ballCount') {
      steps = ['gameFormat', 'course', 'nineType', 'partners', 'ballCount'];
    } else {
      steps = ['gameFormat', 'course', 'nineType', 'partners'];
    }
    return initialMatchType ? steps.filter((s) => s !== 'gameFormat') : steps;
  }, [skipPartnerStep, wizard.data.selectedPartners.length, wizard.currentStep, initialMatchType]);

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

  // Build wizard-compatible object for FullScreenWizard
  const currentStepIndex = Math.max(0, dynamicStepKeys.indexOf(wizard.currentStep));
  const isFirstStep = currentStepIndex === 0 && !showCreateCourseForm;

  const wizardCompat = useMemo((): UseWizardReturn => {
    const titleMap: Record<string, string> = {
      gameFormat: 'Game Format',
      course: showCreateCourseForm ? 'Add New Course' : 'Select Course',
      nineType: 'Holes',
      partners: 'Playing Partners',
      yourSetup: 'Solo Round',
      ballCount: 'Solo Round',
      scoringSetup: 'Scoring Setup',
    };

    const steps: WizardStepConfig[] = dynamicStepKeys.map((key) => ({
      key,
      title: titleMap[key] || key,
      canProceed: true,
      render: () => null,
    }));

    const resolveBackHandler = () => {
      switch (wizard.currentStep) {
        case 'course': return initialMatchType ? undefined : wizard.handleBackToGameFormat;
        case 'nineType': return wizard.handleBackToCourse;
        case 'partners': return wizard.handleBackToNineType;
        case 'yourSetup': return wizard.handleBackToPartners;
        case 'ballCount': return wizard.handleBackToPartners;
        case 'scoringSetup': return wizard.handleBackToPartners;
        default: return undefined;
      }
    };

    return {
      currentStepIndex,
      currentStep: steps[currentStepIndex] || steps[0],
      steps,
      goNext: () => {},
      goBack: () => {
        if (showCreateCourseForm) {
          handleCancelCreateCourse();
        } else if (isFirstStep) {
          handleClose();
        } else {
          resolveBackHandler()?.();
        }
      },
      goToStep: () => {},
      isFirstStep,
      isLastStep: currentStepIndex === steps.length - 1,
      totalSteps: steps.length,
    };
  }, [dynamicStepKeys, currentStepIndex, isFirstStep, showCreateCourseForm, handleCancelCreateCourse, handleClose, wizard, initialMatchType]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SystemModalTheme>
      <FullScreenWizard
        title="Create Round"
        wizard={wizardCompat}
        showFooter={false}
        scrollable={false}
        onClose={handleClose}
      >
      {wizard.currentStep === 'course' && !showCreateCourseForm && (
        <CourseSelectionStep
          searchQuery={wizard.data.searchQuery}
          onSearchQueryChange={wizard.setSearchQuery}
          displayItems={displayItems}
          isLoading={coursesLoading}
          favoriteCourses={favoriteCourses}
          recentCourses={wizard.recentCourses}
          onSelectCourse={wizard.handleSelectCourse}
          onSelectFavoriteCourse={wizard.handleSelectFavoriteCourse}
          onSelectRecentCourse={wizard.handleSelectFavoriteCourse}
          isSuperAdmin={isSuperAdmin}
          onAddNewCourse={handleAddNewCourse}
          onSelectApiClub={handleSelectApiClub}
          importingClubIds={importingClubIds}
          clubDistances={clubDistances}
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

      {wizard.currentStep === 'gameFormat' && (
        <GameFormatStep
          selectedPresetId={wizard.data.selectedPresetId}
          onSelectPreset={wizard.handleSelectPreset}
        />
      )}

      {wizard.currentStep === 'partners' && wizard.data.selectedMatchType && (
        <PartnersStep
          selectedCourse={wizard.data.selectedCourse}
          selectedTee={wizard.data.selectedTee}
          selectedMatchType={wizard.data.selectedMatchType}
          selectedPartners={wizard.data.selectedPartners}
          selectedPresetId={wizard.data.selectedPresetId}
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
          currentUserHandicapOverride={wizard.data.currentUserHandicapOverride}
          onCurrentUserHandicapChange={wizard.handleCurrentUserHandicapChange}
          onPartnerHandicapChange={wizard.handlePartnerHandicapChange}
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
          currentUserHandicapOverride={wizard.data.currentUserHandicapOverride}
          onCurrentUserHandicapChange={wizard.handleCurrentUserHandicapChange}
          onRefreshCourseData={handleRefreshCourseData}
          isRefreshingCourseData={isRefreshingCourseData}
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
            onRefreshCourseData={handleRefreshCourseData}
            isRefreshingCourseData={isRefreshingCourseData}
          />
        )}
      </FullScreenWizard>
      </SystemModalTheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
