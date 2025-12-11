/**
 * CourseSelectionModal - Modal for selecting a course
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Searchbar,
  ActivityIndicator,
  Icon,
} from 'react-native-paper';
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
      const locationText = '';
      const isFromApi = false;

      return (
        <Pressable onPress={() => handleSelect(item)}>
          <View style={[styles.courseCard, { backgroundColor: colors.white }]}>
            <View style={styles.courseCardContent}>
              <View style={[styles.courseIconContainer, { backgroundColor: colors.primaryLighter }]}>
                <Icon source="golf" size={24} color={colors.primary} />
              </View>
              <View style={styles.courseInfo}>
                <View style={styles.courseNameRow}>
                  <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.sourceBadge,
                      { backgroundColor: isFromApi ? colors.infoLight : colors.gray200 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceBadgeText,
                        { color: isFromApi ? colors.infoDark : colors.gray600 },
                      ]}
                    >
                      {isFromApi ? 'API' : 'Manual'}
                    </Text>
                  </View>
                </View>
                {locationText && (
                  <Text style={[styles.courseLocation, { color: colors.textSecondary }]}>
                    {locationText}
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
        </Pressable>
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
          <Pressable onPress={handleClose} style={styles.modalCloseButton}>
            <Icon source="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.white }]}>
          <Searchbar
            placeholder="Search courses..."
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            style={[styles.searchBar, { backgroundColor: colors.gray100 }]}
            inputStyle={styles.searchInput}
            iconColor={colors.gray400}
          />
        </View>

        {/* Course List */}
        {isLoadingCourses || isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading courses...
            </Text>
          </View>
        ) : displayCourses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon source="golf" size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No courses found</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'Add courses from the Courses tab'}
            </Text>
          </View>
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
  searchContainer: {
    padding: spacing.md,
  },
  searchBar: {
    borderRadius: borderRadius.md,
    elevation: 0,
  },
  searchInput: {
    ...typography.body,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginTop: spacing.md,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  courseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseName: {
    ...typography.bodyBold,
    flex: 1,
  },
  sourceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  sourceBadgeText: {
    ...typography.caption,
    fontWeight: '600',
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
