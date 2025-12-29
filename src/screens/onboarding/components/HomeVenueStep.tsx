/**
 * HomeVenueStep - Home venue selection during onboarding
 *
 * Allows users to optionally set their home venue (golf club).
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
import { VenueCard } from '@/components/courses/VenueCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSetHomeVenue } from '@/hooks/useHomeVenue';
import {
  useVenuesWithCourses,
  useSearchVenues,
} from '@/hooks/useVenues';
import type { CourseWithFavoriteStatus, VenueCourseDisplayItem } from '@/hooks/useVenues';
import type { Venue } from '@/types/database.types';
import type { StepProps } from '../OnboardingScreen';

export function HomeVenueStep({
  onComplete,
  isSubmitting,
}: StepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Modal state
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected venue state
  const [selectedVenue, setSelectedVenue] = useState<{
    id: string;
    name: string;
    courseCount: number;
  } | null>(null);

  // Hooks
  const setHomeVenue = useSetHomeVenue();
  const { data: allVenues = [], isLoading: isLoadingVenues } = useVenuesWithCourses();
  const { data: searchResults = [], isLoading: isSearching } = useSearchVenues(searchQuery);

  // Get display items based on search
  const displayItems: VenueCourseDisplayItem[] = (
    searchQuery.length >= 2 ? searchResults : allVenues
  ).map((venue) => ({
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
    is_home: venue.is_home,
  }));

  const handleOpenModal = () => {
    setShowVenueModal(true);
  };

  const handleCloseModal = () => {
    setShowVenueModal(false);
    setSearchQuery('');
  };

  // When user selects a course, we save the venue as home
  const handleCourseSelect = useCallback((course: CourseWithFavoriteStatus, venue: Venue) => {
    setSelectedVenue({
      id: venue.id,
      name: venue.name,
      courseCount: 1, // We'll update this from the display items
    });
    handleCloseModal();
  }, []);

  // Handle venue press for multi-course venues (select venue directly)
  const handleVenuePress = useCallback((venue: Venue) => {
    // Find the venue in display items to get course count
    const venueData = displayItems.find(item => item.venue.id === venue.id);
    setSelectedVenue({
      id: venue.id,
      name: venue.name,
      courseCount: venueData?.courses.length ?? 0,
    });
    handleCloseModal();
  }, [displayItems]);

  const handleGetStarted = async () => {
    if (isSubmitting || setHomeVenue.isPending) return;

    try {
      // Set home venue if one was selected
      if (selectedVenue) {
        await setHomeVenue.mutateAsync(selectedVenue.id);
      }

      // Complete onboarding
      await onComplete(false);
    } catch (error) {
      console.error('[HomeVenueStep] Error completing:', error);
    }
  };

  const handleSkip = async () => {
    // Skip without setting home venue
    await onComplete(false);
  };

  const renderVenueItem = useCallback(
    ({ item }: { item: VenueCourseDisplayItem }) => (
      <VenueCard
        item={item}
        onCourseSelect={handleCourseSelect}
        onVenuePress={handleVenuePress}
        showFavoriteButton={false}
        selectionMode
      />
    ),
    [handleCourseSelect, handleVenuePress]
  );

  const isProcessing = isSubmitting || setHomeVenue.isPending;

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
            {/* Selected Venue Display */}
            {selectedVenue && (
              <View
                style={[
                  styles.selectedVenueCard,
                  { backgroundColor: colors.surface, borderColor: colors.success },
                ]}
              >
                <View style={styles.selectedVenueContent}>
                  <Icon source="home" size={20} color={colors.success} />
                  <View style={styles.selectedVenueText}>
                    <Text
                      style={[styles.selectedVenueName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {selectedVenue.name}
                    </Text>
                    {selectedVenue.courseCount > 1 && (
                      <Text
                        style={[styles.selectedVenueCourses, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {selectedVenue.courseCount} courses
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedVenue(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon source="close-circle" size={20} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            )}

            {/* Select Venue Button */}
            {!selectedVenue && (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={handleOpenModal}
                accessibilityLabel="Select home club"
                accessibilityRole="button"
                disabled={isProcessing}
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
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={handleGetStarted}
              accessibilityLabel={selectedVenue ? 'Set home club and get started' : 'Get started'}
              accessibilityRole="button"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <GolfBallLoader size="sm" />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                    Get Started
                  </Text>
                  <Icon source="check" size={20} color={colors.textInverse} />
                </>
              )}
            </TouchableOpacity>

            {/* Skip option */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              accessibilityLabel="Skip setting home club"
              accessibilityRole="button"
              disabled={isProcessing}
            >
              <Text
                style={[
                  styles.skipButtonText,
                  { color: isProcessing ? colors.textDisabled : colors.textSecondary },
                ]}
              >
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Venue Selection Modal */}
      <Modal visible={showVenueModal} animationType="slide" onRequestClose={handleCloseModal}>
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
          {(isLoadingVenues || isSearching) && (
            <View style={styles.loadingContainer}>
              <GolfBallLoader size="sm" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading venues...
              </Text>
            </View>
          )}

          {/* Venue List */}
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.venue.id}
            renderItem={renderVenueItem}
            contentContainerStyle={styles.venueList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            ListEmptyComponent={
              !isLoadingVenues && !isSearching ? (
                <View style={styles.emptyState}>
                  <Icon source="home-city" size={48} color={colors.gray400} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery.length >= 2 ? 'No venues found' : 'No venues available'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                    {searchQuery.length >= 2
                      ? 'Try a different search term'
                      : 'Add venues from the Courses tab'}
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
  selectedVenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    ...shadows.sm,
  },
  selectedVenueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  selectedVenueText: {
    flex: 1,
  },
  selectedVenueName: {
    ...typography.bodyBold,
  },
  selectedVenueCourses: {
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
  venueList: {
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

export default HomeVenueStep;
