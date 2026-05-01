/**
 * CourseSelectionModal - Full-screen modal for selecting a course
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Text, IconButton, Icon } from 'react-native-paper';
import { GolfBallLoader, SearchBar } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ClubCard } from '@/components/courses/ClubCard';
import type { ClubCourseDisplayItem } from '@/hooks/useClubs';
import type { CourseSelectionModalProps } from '../types';

export const CourseSelectionModal = React.memo(function CourseSelectionModal({
  visible,
  displayItems,
  favoriteCourses,
  courseSearchQuery,
  isLoading,
  isSearching,
  onCourseSelect,
  onSearchChange,
  onClose,
}: CourseSelectionModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const renderClubItem = useCallback(
    ({ item }: { item: ClubCourseDisplayItem }) => (
      <ClubCard item={item} onCourseSelect={onCourseSelect} showFavoriteButton={false} selectionMode />
    ),
    [onCourseSelect]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[styles.modalContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}
      >
        {/* Modal Header */}
        <View
          style={[
            styles.modalHeader,
            {
              backgroundColor: colors.surfaceElevated,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Course</Text>
          <IconButton icon="close" onPress={onClose} iconColor={colors.textPrimary} />
        </View>

        {/* Search Bar */}
        <SearchBar
          value={courseSearchQuery}
          onChangeText={onSearchChange}
          placeholder="Search courses..."
          accessibilityLabel="Search courses"
          hideBorder
        />

        {/* Favorites Section */}
        {favoriteCourses.length > 0 && courseSearchQuery.length < 2 && (
          <View
            style={[
              styles.favoritesSection,
              {
                backgroundColor: colors.surfaceElevated,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Favourites</Text>
            <FlatList
              horizontal
              data={favoriteCourses}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favoritesContainer}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => onCourseSelect(item, item.club)} activeOpacity={0.7}>
                  <View
                    style={[
                      styles.favoriteChip,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Icon source="star" size={14} color={colors.warning} />
                    <Text
                      style={[styles.favoriteChipText, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.name === item.club.name
                        ? item.name
                        : `${item.name} @ ${item.club.name}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Loading State */}
        {(isLoading || isSearching) && (
          <View style={styles.loadingContainer}>
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading courses...
            </Text>
          </View>
        )}

        {/* Club/Course List */}
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.club.id}
          renderItem={renderClubItem}
          contentContainerStyle={styles.courseList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          ListEmptyComponent={
            !isLoading && !isSearching ? (
              <View style={styles.emptyState}>
                <Icon source="golf" size={48} color={colors.gray400} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {courseSearchQuery.length >= 2 ? 'No clubs found' : 'No clubs available'}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                  {courseSearchQuery.length >= 2
                    ? 'Try a different search term'
                    : 'Add clubs from the Courses tab'}
                </Text>
              </View>
            ) : null
          }
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h4,
  },
  favoritesSection: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    ...typography.smallBold,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  favoritesContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  favoriteChipText: {
    ...typography.small,
    maxWidth: 120,
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
  courseList: {
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
