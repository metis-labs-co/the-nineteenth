/**
 * CourseSelectionStep - First step in the create round wizard
 *
 * Features:
 * - Search for courses
 * - Display favorite courses as pills
 * - List all venues
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
} from 'react-native';
import { IconSearch, IconX } from '@tabler/icons-react-native';
import { Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { VenueCard } from '@/components/courses/VenueCard';
import type { Venue } from '@/types/database.types';
import type { CourseWithFavoriteStatus, VenueCourseDisplayItem } from '@/hooks/useVenues';

interface CourseSelectionStepProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  displayItems: VenueCourseDisplayItem[];
  isLoading: boolean;
  favoriteCourses?: (CourseWithFavoriteStatus & { venue: Venue })[];
  onSelectCourse: (course: CourseWithFavoriteStatus, venue: Venue) => void;
  onSelectFavoriteCourse: (course: CourseWithFavoriteStatus & { venue: Venue }) => void;
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
      <View style={[styles.searchContainer, { backgroundColor: colors.gray100 }]}>
        <IconSearch size={20} color={colors.gray400} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search courses..."
          placeholderTextColor={colors.gray400}
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchQueryChange('')}>
            <IconX size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Favorite Courses Pills */}
      {favoriteCourses && favoriteCourses.length > 0 && (
        <View style={styles.favoritesContainer}>
          <View style={styles.favoritesHeader}>
            <Icon source="star" size={14} color={colors.warning} />
            <Text style={[styles.favoritesLabel, { color: colors.textSecondary }]}>
              Favorites
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
                  { backgroundColor: colors.warningLight + '20', borderColor: colors.warning + '40' },
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
          {searchQuery ? 'Search Results' : 'All Venues'}
        </Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading venues...
            </Text>
          </View>
        ) : displayItems && displayItems.length > 0 ? (
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.venue.id}
            renderItem={({ item }) => (
              <View style={styles.venueCardWrapper}>
                <VenueCard
                  item={item}
                  onCourseSelect={onSelectCourse}
                  showFavoriteButton={false}
                  selectionMode
                />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.venueCardSeparator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No venues found' : 'No venues available yet'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
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
  venueCardWrapper: {
    marginHorizontal: -spacing.lg,
  },
  venueCardSeparator: {
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
