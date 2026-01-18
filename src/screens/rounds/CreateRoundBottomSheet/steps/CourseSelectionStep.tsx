/**
 * CourseSelectionStep - First step in the create round wizard
 *
 * Features:
 * - Search for courses
 * - Display favorite courses as pills
 * - List all clubs
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import { SearchBar } from '@/components/common';
import { ClubCard } from '@/components/courses/ClubCard';
import type { Club } from '@/types/database.types';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem } from '@/hooks/useClubs';

interface CourseSelectionStepProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  displayItems: ClubCourseDisplayItem[];
  isLoading: boolean;
  favoriteCourses?: (CourseWithFavoriteStatus & { club: Club })[];
  onSelectCourse: (course: CourseWithFavoriteStatus, club: Club) => void;
  onSelectFavoriteCourse: (course: CourseWithFavoriteStatus & { club: Club }) => void;
}

export const CourseSelectionStep = memo(function CourseSelectionStep({
  searchQuery,
  onSearchQueryChange,
  displayItems,
  isLoading,
  favoriteCourses,
  onSelectCourse,
  onSelectFavoriteCourse,
}: CourseSelectionStepProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Search Input */}
      <SearchBar
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        placeholder="Search courses..."
        accessibilityLabel="Search courses"
        hideBorder
      />

      {/* Favorite Courses Pills */}
      {favoriteCourses && favoriteCourses.length > 0 && (
        <View style={styles.favoritesContainer}>
          <View style={styles.favoritesHeader}>
            <Icon source="star" size={14} color={colors.warning} />
            <Text style={[styles.favoritesLabel, { color: colors.textSecondary }]}>
              Favourites
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoritesScroll}
          >
            {favoriteCourses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.favoritePill,
                  { backgroundColor: withOpacity(colors.warningLight, 0.13), borderColor: withOpacity(colors.warning, 0.25) },
                ]}
                onPress={() => onSelectFavoriteCourse(course)}
                activeOpacity={0.7}
              >
                <Icon source="golf" size={14} color={colors.warning} />
                <Text
                  style={[styles.favoritePillText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {course.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Course List */}
      <View style={styles.listContainer}>
        <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
          {searchQuery ? 'Search Results' : 'All Clubs'}
        </Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading clubs...
            </Text>
          </View>
        ) : displayItems && displayItems.length > 0 ? (
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.club.id}
            renderItem={({ item }) => (
              <View style={styles.clubCardWrapper}>
                <ClubCard
                  item={item}
                  onCourseSelect={onSelectCourse}
                  showFavoriteButton={false}
                  selectionMode
                />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.clubCardSeparator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No clubs found' : 'No clubs available yet'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    paddingVertical: spacing.sm,
  },
  favoritesContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  favoritesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  favoritesLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoritesScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  favoritePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    maxWidth: 180,
  },
  favoritePillText: {
    ...typography.small,
    fontWeight: '500',
    flexShrink: 1,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  clubCardWrapper: {
    marginHorizontal: -spacing.lg,
  },
  clubCardSeparator: {
    height: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
