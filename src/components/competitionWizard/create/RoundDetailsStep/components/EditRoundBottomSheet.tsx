/**
 * EditRoundBottomSheet - Bottom sheet for editing round details in simplified wizard
 * All fields are optional to allow creating "blank" placeholder rounds
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, TextInput, Button } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { BottomSheet } from '@/components/common/BottomSheet';
import { DatePicker } from '@/components/common/DatePicker';
import { Pill } from '@/components/common';
import type { SimplifiedRoundFormData, GameType } from '@/schemas/competition';
import { CourseSelectionModal } from './CourseSelectionModal';
import { GameTypeModal } from './GameTypeModal';
import { TeeSelectionModal } from './TeeSelectionModal';
import { GAME_TYPE_LABELS, getFilteredGameTypes } from '../types';
import type { TeeBox, Club } from '@/types/database.types';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem } from '@/hooks/useClubs';
import { useClubsWithCourses, useSearchClubs, useFavoriteCoursesWithClubs, toClubCourseDisplayItem } from '@/hooks/useClubs';
import type { FavoriteCourseWithClub } from '../types';

export interface EditRoundBottomSheetProps {
  visible: boolean;
  round: SimplifiedRoundFormData;
  roundNumber: number;
  onClose: () => void;
  onSave: (round: SimplifiedRoundFormData) => void;
  allowedGameTypes?: GameType[];
}

export function EditRoundBottomSheet({
  visible,
  round,
  roundNumber,
  onClose,
  onSave,
  allowedGameTypes,
}: EditRoundBottomSheetProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const [localRound, setLocalRound] = useState<SimplifiedRoundFormData>(round);

  // Course search state
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showGameTypeModal, setShowGameTypeModal] = useState(false);
  const [showTeeModal, setShowTeeModal] = useState(false);
  const [availableTees, setAvailableTees] = useState<TeeBox[]>([]);

  // Course search query
  const [clubSearchQuery, setClubSearchQuery] = useState('');

  // Club/Course data hooks
  const { data: allClubs = [], isLoading: isClubsLoading } = useClubsWithCourses();
  const { data: favoriteCourses = [], isLoading: isFavoritesLoading } = useFavoriteCoursesWithClubs();
  const { data: searchResults = [], isLoading: isSearching } = useSearchClubs(
    clubSearchQuery,
    undefined
  );

  // Transform clubs to display items
  const displayItems: ClubCourseDisplayItem[] = React.useMemo(() => {
    const clubs = clubSearchQuery.length >= 2 ? searchResults : allClubs;
    return (clubs ?? []).map(toClubCourseDisplayItem);
  }, [clubSearchQuery, searchResults, allClubs]);

  // Reset local state when round changes
  useEffect(() => {
    setLocalRound(round);
  }, [round]);

  // Handle course selection
  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, club: Club) => {
      setLocalRound((prev) => ({
        ...prev,
        courseId: course.id,
        courseName: `${course.name}${club.name !== course.name ? ` (${club.name})` : ''}`,
        selectedTee: undefined, // Reset tee when course changes
        isConfigured: true,
      }));
      // Set available tees from course
      setAvailableTees(course.tees || []);
      setShowCourseModal(false);
    },
    []
  );

  // Handle game type selection
  const handleGameTypeSelect = useCallback((gameType: GameType) => {
    setLocalRound((prev) => ({
      ...prev,
      matchType: gameType,
      isConfigured: true,
    }));
    setShowGameTypeModal(false);
  }, []);

  // Handle tee selection
  const handleTeeSelect = useCallback((tee: TeeBox) => {
    setLocalRound((prev) => ({
      ...prev,
      selectedTee: {
        name: tee.name,
        color: tee.color,
        totalYardage: tee.totalYardage ?? undefined, // Convert null to undefined
        courseRating: tee.courseRating,
        slopeRating: tee.slopeRating,
      },
      isConfigured: true,
    }));
    setShowTeeModal(false);
  }, []);

  // Handle save
  const handleSave = () => {
    onSave({
      ...localRound,
      isConfigured: true,
    });
  };

  // Handle clear course
  const handleClearCourse = () => {
    setLocalRound((prev) => ({
      ...prev,
      courseId: undefined,
      courseName: undefined,
      selectedTee: undefined,
    }));
    setAvailableTees([]);
  };

  // Get available game types
  const availableGameTypes = getFilteredGameTypes(allowedGameTypes);

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        height={0.85}
        title={`Round ${roundNumber}`}
        showCloseButton
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.infoLight }]}>
            <Icon source="information-outline" size={20} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info }]}>
              All fields are optional. You can configure round details now or after creating the
              competition.
            </Text>
          </View>

          {/* Course Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Course</Text>
            <TouchableOpacity onPress={() => setShowCourseModal(true)} activeOpacity={0.7}>
              <TextInput
                placeholder="Select a course (optional)"
                value={localRound.courseName || ''}
                mode="outlined"
                editable={false}
                pointerEvents="none"
                style={[styles.input, { backgroundColor: colors.surface }]}
                outlineColor={colors.gray300}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                right={
                  localRound.courseId ? (
                    <TextInput.Icon
                      icon="close-circle"
                      onPress={handleClearCourse}
                      color={colors.gray500}
                    />
                  ) : (
                    <TextInput.Icon
                      icon="chevron-down"
                      onPress={() => setShowCourseModal(true)}
                      color={colors.primary}
                    />
                  )
                }
              />
            </TouchableOpacity>
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {localRound.courseId
                ? 'Course selected. Clear to choose a different one.'
                : 'Leave blank to set up later'}
            </Text>
          </View>

          {/* Tee Selection - Only show if course selected and has tees */}
          {localRound.courseId && availableTees.length > 0 && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Playing Tees</Text>
              <TouchableOpacity onPress={() => setShowTeeModal(true)} activeOpacity={0.7}>
                <View
                  style={[
                    styles.teeSelector,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.gray300,
                    },
                  ]}
                >
                  {localRound.selectedTee ? (
                    <View style={styles.selectedTeeDisplay}>
                      <View
                        style={[
                          styles.teeColorDot,
                          {
                            backgroundColor: localRound.selectedTee.color || colors.gray400,
                          },
                        ]}
                      />
                      <Text style={[styles.selectedTeeName, { color: colors.textPrimary }]}>
                        {localRound.selectedTee.name}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.teePlaceholder, { color: colors.textTertiary }]}>
                      Select tees (optional)
                    </Text>
                  )}
                  <Icon source="chevron-down" size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Round Date */}
          <DatePicker
            value={localRound.date || ''}
            onChange={(value) =>
              setLocalRound((prev) => ({ ...prev, date: value, isConfigured: true }))
            }
            mode="date"
            label="Round Date"
            placeholder="Select a date (optional)"
            hint="Leave blank to set up later"
            minimumDate={new Date()}
            showClear={!!localRound.date}
          />

          {/* Tee Time */}
          <DatePicker
            value={localRound.teeTime || ''}
            onChange={(value) =>
              setLocalRound((prev) => ({ ...prev, teeTime: value, isConfigured: true }))
            }
            mode="time"
            label="Tee Time"
            placeholder="Select a time (optional)"
            hint="Leave blank to set up later"
            showClear={!!localRound.teeTime}
          />

          {/* Game Type Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Game Type</Text>
            <TouchableOpacity onPress={() => setShowGameTypeModal(true)} activeOpacity={0.7}>
              <TextInput
                value={GAME_TYPE_LABELS[(localRound.matchType as GameType) || 'stableford']}
                mode="outlined"
                editable={false}
                pointerEvents="none"
                style={[styles.input, { backgroundColor: colors.surface }]}
                outlineColor={colors.gray300}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                right={
                  <TextInput.Icon
                    icon="chevron-down"
                    onPress={() => setShowGameTypeModal(true)}
                    color={colors.primary}
                  />
                }
              />
            </TouchableOpacity>
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Defaults to Stableford if not changed
            </Text>
          </View>

          {/* Scoring Pairs Toggle (Premium only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Scoring Pairs</Text>
            {isPremium ? (
              <TouchableOpacity
                onPress={() =>
                  setLocalRound((prev) => ({
                    ...prev,
                    scoringPairsRequired: !prev.scoringPairsRequired,
                    isConfigured: true,
                  }))
                }
                style={[
                  styles.scoringPairsToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: localRound.scoringPairsRequired ? colors.primary : colors.gray300,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.scoringPairsToggleContent}>
                  <Icon
                    source="swap-horizontal"
                    size={20}
                    color={localRound.scoringPairsRequired ? colors.primary : colors.gray400}
                  />
                  <View style={styles.scoringPairsToggleText}>
                    <Text style={[styles.scoringPairsToggleLabel, { color: colors.textPrimary }]}>
                      Require Scoring Pairs
                    </Text>
                    <Text
                      style={[styles.scoringPairsToggleDescription, { color: colors.textSecondary }]}
                    >
                      Assign designated markers
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: localRound.scoringPairsRequired
                        ? colors.primary
                        : colors.surface,
                      borderColor: localRound.scoringPairsRequired ? colors.primary : colors.gray300,
                    },
                  ]}
                >
                  {localRound.scoringPairsRequired && (
                    <Icon source="check" size={14} color={colors.white} />
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.scoringPairsToggle,
                  styles.scoringPairsToggleLocked,
                  { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                ]}
              >
                <View style={styles.scoringPairsToggleContent}>
                  <Icon source="lock" size={20} color={colors.gray500} />
                  <View style={styles.scoringPairsToggleText}>
                    <View style={styles.scoringPairsLabelRow}>
                      <Text
                        style={[styles.scoringPairsToggleLabel, { color: colors.textSecondary }]}
                      >
                        Scoring Pairs
                      </Text>
                      <Pill label="Premium" variant="warning" filled size="sm" />
                    </View>
                    <Text
                      style={[styles.scoringPairsToggleDescription, { color: colors.textTertiary }]}
                    >
                      Upgrade to use this feature
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.gray200 }]}>
          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.footerButton}
            textColor={colors.textPrimary}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.footerButton}
            buttonColor={colors.primary}
          >
            Save Round
          </Button>
        </View>
      </BottomSheet>

      {/* Course Selection Modal */}
      <CourseSelectionModal
        visible={showCourseModal}
        displayItems={displayItems}
        favoriteCourses={favoriteCourses}
        courseSearchQuery={clubSearchQuery}
        isLoading={isClubsLoading || isFavoritesLoading}
        isSearching={isSearching}
        onCourseSelect={handleCourseSelect}
        onSearchChange={setClubSearchQuery}
        onClose={() => setShowCourseModal(false)}
      />

      {/* Game Type Modal */}
      <GameTypeModal
        visible={showGameTypeModal}
        selectedGameType={(localRound.matchType as GameType) || 'stableford'}
        availableGameTypes={availableGameTypes}
        onSelect={handleGameTypeSelect}
        onClose={() => setShowGameTypeModal(false)}
      />

      {/* Tee Selection Modal */}
      <TeeSelectionModal
        visible={showTeeModal}
        availableTees={availableTees}
        selectedTeeName={localRound.selectedTee?.name}
        onSelect={handleTeeSelect}
        onClose={() => setShowTeeModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  teeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  selectedTeeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  teeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  selectedTeeName: {
    ...typography.body,
  },
  teePlaceholder: {
    ...typography.body,
  },
  scoringPairsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  scoringPairsToggleLocked: {
    opacity: 0.8,
  },
  scoringPairsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  scoringPairsToggleText: {
    flex: 1,
  },
  scoringPairsToggleLabel: {
    ...typography.bodyBold,
  },
  scoringPairsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoringPairsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});
