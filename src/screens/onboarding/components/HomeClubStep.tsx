/**
 * HomeClubStep - Home club selection during onboarding
 *
 * Allows users to optionally set their home club (golf club).
 * This is the final step - fully skippable with "Maybe later".
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  Modal,
} from 'react-native';
import { Text, Icon, IconButton } from 'react-native-paper';
import { OnboardingCard } from './OnboardingCard';
import { GolfBallLoader, SearchBar } from '@/components/common';
import { ClubCard } from '@/components/courses/ClubCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  useClubsWithCourses,
  useSearchClubs,
  toClubCourseDisplayItem,
} from '@/hooks/useClubs';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';
import type { StepProps } from '../OnboardingScreen';

export function HomeClubStep({
  onNext,
  setHomeClubId,
  isSubmitting,
}: StepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Modal state
  const [showClubModal, setShowClubModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected club state
  const [selectedClub, setSelectedClub] = useState<{
    id: string;
    name: string;
    courseCount: number;
  } | null>(null);

  // Hooks
  const { data: allClubs = [], isLoading: isLoadingClubs } = useClubsWithCourses();
  const { data: searchResults = [], isLoading: isSearching } = useSearchClubs(searchQuery);

  // Get display items based on search
  const displayItems: ClubCourseDisplayItem[] = (
    searchQuery.length >= 2 ? searchResults : allClubs
  ).map(toClubCourseDisplayItem);

  const handleOpenModal = () => {
    setShowClubModal(true);
  };

  const handleCloseModal = () => {
    setShowClubModal(false);
    setSearchQuery('');
  };

  // When user selects a course, we save the club as home
  const handleCourseSelect = useCallback((course: CourseWithFavoriteStatus, club: Club) => {
    setSelectedClub({
      id: club.id,
      name: club.name,
      courseCount: 1, // We'll update this from the display items
    });
    handleCloseModal();
  }, []);

  // Handle club press for multi-course clubs (select club directly)
  const handleClubPress = useCallback((club: Club) => {
    // Find the club in display items to get course count
    const clubData = displayItems.find(item => item.club.id === club.id);
    setSelectedClub({
      id: club.id,
      name: club.name,
      courseCount: clubData?.courses.length ?? 0,
    });
    handleCloseModal();
  }, [displayItems]);

  const handleContinue = () => {
    if (isSubmitting) return;
    setHomeClubId(selectedClub?.id);
    onNext();
  };

  const handleSkip = () => {
    setHomeClubId(undefined);
    onNext();
  };

  const renderClubItem = useCallback(
    ({ item }: { item: ClubCourseDisplayItem }) => (
      <ClubCard
        item={item}
        onCourseSelect={handleCourseSelect}
        onClubPress={handleClubPress}
        showFavoriteButton={false}
        selectionMode
      />
    ),
    [handleCourseSelect, handleClubPress]
  );

  return (
    <>
      <OnboardingCard
        illustration={
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.successLight },
            ]}
          >
            <Icon source="home" size={80} color={colors.success} />
          </View>
        }
        title="Set Your Home Club"
        description="Choose your home golf club to pre-fill it when creating rounds and competitions. You can change this anytime in your profile."
        actions={
          <View style={styles.actionsContainer}>
            {/* Selected Club Display */}
            {selectedClub && (
              <View
                style={[
                  styles.selectedClubCard,
                  { backgroundColor: colors.surface, borderColor: colors.success },
                ]}
              >
                <View style={styles.selectedClubContent}>
                  <Icon source="home" size={20} color={colors.success} />
                  <View style={styles.selectedClubText}>
                    <Text
                      style={[styles.selectedClubName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {selectedClub.name}
                    </Text>
                    {selectedClub.courseCount > 1 && (
                      <Text
                        style={[styles.selectedClubCourses, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {selectedClub.courseCount} courses
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedClub(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon source="close-circle" size={20} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            )}

            {/* Select Club Button */}
            {!selectedClub && (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={handleOpenModal}
                accessibilityLabel="Select home club"
                accessibilityRole="button"
                disabled={isSubmitting}
              >
                <Icon source="magnify" size={20} color={colors.textSecondary} />
                <Text style={[styles.selectButtonText, { color: colors.textSecondary }]}>
                  Search for a golf club...
                </Text>
              </TouchableOpacity>
            )}

            {/* Get Started Button */}
            <TouchableOpacity
              style={[
                styles.getStartedButton,
                { backgroundColor: colors.primary },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              accessibilityLabel={selectedClub ? 'Set home club and continue' : 'Continue'}
              accessibilityRole="button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <GolfBallLoader size="sm" />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                    Next
                  </Text>
                  <Icon source="arrow-right" size={20} color={colors.textInverse} />
                </>
              )}
            </TouchableOpacity>

            {/* Skip option */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              accessibilityLabel="Skip setting home club"
              accessibilityRole="button"
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.skipButtonText,
                  { color: isSubmitting ? colors.textDisabled : colors.textSecondary },
                ]}
              >
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Club Selection Modal */}
      <Modal visible={showClubModal} animationType="slide" onRequestClose={handleCloseModal}>
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top, backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Select Home Club
            </Text>
            <IconButton icon="close" onPress={handleCloseModal} iconColor={colors.textPrimary} />
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search golf clubs..."
            accessibilityLabel="Search golf clubs"
            hideBorder
          />

          {/* Loading State */}
          {(isLoadingClubs || isSearching) && (
            <View style={styles.loadingContainer}>
              <GolfBallLoader size="sm" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading clubs...
              </Text>
            </View>
          )}

          {/* Club List */}
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.club.id}
            renderItem={renderClubItem}
            contentContainerStyle={styles.clubList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            ListEmptyComponent={
              !isLoadingClubs && !isSearching ? (
                <View style={styles.emptyState}>
                  <Icon source="home-city" size={48} color={colors.gray400} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery.length >= 2 ? 'No clubs found' : 'No clubs available'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                    {searchQuery.length >= 2
                      ? 'Try a different search term'
                      : 'Add clubs from the Courses tab'}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </>
  );
}

/**
 * @deprecated Use HomeClubStep instead
 */
export const HomeVenueStep = HomeClubStep;

const styles = StyleSheet.create({
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedClubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    ...shadows.sm,
  },
  selectedClubContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  selectedClubText: {
    flex: 1,
  },
  selectedClubName: {
    ...typography.bodyBold,
  },
  selectedClubCourses: {
    ...typography.small,
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectButtonText: {
    ...typography.body,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
  },
  buttonText: {
    ...typography.bodyBold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    ...typography.body,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  clubList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listSeparator: {
    height: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default HomeClubStep;
