/**
 * CourseSelectionModal - Modal for selecting a course
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, SearchBar, EmptyState } from '@/components/common';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCourses, useSearchCourses, type CourseWithFavorite } from '@/hooks/useCourses';

interface CourseSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (course: CourseWithFavorite) => void;
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

  // Course data hooks
  const { data: allCourses = [], isLoading: isLoadingCourses } = useCourses();
  const { data: searchResults = [], isLoading: isSearching } = useSearchCourses(
    searchQuery,
    undefined
  );

  // Get courses to display
  const displayCourses = searchQuery.length >= 2 ? searchResults : allCourses;

  const handleClose = useCallback(() => {
    onSearchQueryChange('');
    onClose();
  }, [onClose, onSearchQueryChange]);

  const handleSelect = useCallback(
    (course: CourseWithFavorite) => {
      onSelect(course);
      handleClose();
    },
    [onSelect, handleClose]
  );

  // Render course item
  const renderCourseItem = useCallback(
    ({ item }: { item: CourseWithFavorite }) => {
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
          accessibilityLabel={`Select ${item.name}`}
          accessibilityRole="button"
        >
          <View style={[styles.courseCard, { backgroundColor: colors.white }]}>
            <View style={styles.courseCardContent}>
              <View style={[styles.courseIconContainer, { backgroundColor: colors.primaryLighter }]}>
                <Icon source="golf" size={24} color={colors.primary} />
              </View>
              <View style={styles.courseInfo}>
                <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.description && (
                  <Text style={[styles.courseLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                {item.holes && item.holes.length > 0 && (
                  <Text style={[styles.courseHoles, { color: colors.textSecondary }]}>
                    {item.holes.length} holes
                  </Text>
                )}
              </View>
              <View style={styles.courseActions}>
                {item.is_favorite && <Icon source="star" size={20} color={colors.warning} />}
                <Icon source="chevron-right" size={24} color={colors.gray400} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleSelect, colors]
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
        <View style={[styles.modalHeader, { backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
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
          placeholder="Search courses..."
        />

        {/* Course List */}
        {isLoadingCourses || isSearching ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" message="Loading courses..." />
          </View>
        ) : displayCourses.length === 0 ? (
          <EmptyState
            title="No courses found"
            message={searchQuery ? 'Try a different search term' : 'Add courses from the Courses tab'}
            icon="golf"
            compact
          />
        ) : (
          <FlatList
            data={displayCourses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.courseList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
});

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
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  courseList: {
    padding: spacing.md,
  },
  courseCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  courseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  courseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseName: {
    ...typography.bodyBold,
  },
  courseLocation: {
    ...typography.small,
    marginTop: 2,
  },
  courseHoles: {
    ...typography.caption,
    marginTop: 2,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
