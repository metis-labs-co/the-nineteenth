/**
 * CourseSelectionModal - Modal for selecting a course (grouped by club)
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, SearchBar, EmptyState } from '@/components/common';
import { ClubCard } from '@/components/courses/ClubCard';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  useClubsWithCourses,
  useSearchClubs,
  toClubCourseDisplayItem,
  sortHomeClubFirst,
} from '@/hooks/useClubs';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';

interface CourseSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (course: CourseWithFavoriteStatus, club: Club) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const CourseSelectionModal = memo(function CourseSelectionModal({
  visible,
  onClose,
  onSelect,
  searchQuery,
  onSearchQueryChange,
}: CourseSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Club data hooks
  const { data: allClubs, isLoading: isLoadingClubs } = useClubsWithCourses();
  const { data: searchResults, isLoading: isSearching } = useSearchClubs(searchQuery);

  // Transform to display items, home club first
  const displayItems: ClubCourseDisplayItem[] = useMemo(() => {
    const clubs = searchQuery.length >= 2 ? searchResults : allClubs;
    return sortHomeClubFirst((clubs ?? []).map(toClubCourseDisplayItem));
  }, [searchQuery, searchResults, allClubs]);

  const handleClose = useCallback(() => {
    onSearchQueryChange('');
    onClose();
  }, [onClose, onSearchQueryChange]);

  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, club: Club) => {
      onSelect(course, club);
      handleClose();
    },
    [onSelect, handleClose]
  );

  const renderClubItem = useCallback(
    ({ item }: { item: ClubCourseDisplayItem }) => (
      <ClubCard
        item={item}
        onCourseSelect={handleCourseSelect}
        showFavoriteButton={false}
        selectionMode
      />
    ),
    [handleCourseSelect]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Course</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.modalCloseButton}
            activeOpacity={0.7}
            accessibilityLabel="Close course selection"
            accessibilityRole="button"
          >
            <Icon source="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder="Search clubs or courses..."
        />

        {/* Course List */}
        {isLoadingClubs || isSearching ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" message="Loading courses..." />
          </View>
        ) : displayItems.length === 0 ? (
          <EmptyState
            title="No clubs found"
            message={searchQuery ? 'Try a different search term' : 'Add courses from the Courses tab'}
            icon="golf"
            compact
          />
        ) : (
          <FlatList
            data={displayItems}
            renderItem={renderClubItem}
            keyExtractor={(item) => item.club.id}
            contentContainerStyle={styles.courseList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ListSeparator}
          />
        )}
      </View>
    </Modal>
  );
});

const ListSeparator = () => <View style={styles.listSeparator} />;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  courseList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listSeparator: {
    height: spacing.sm,
  },
});
