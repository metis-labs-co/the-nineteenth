/**
 * VenueCard - Hybrid display component for venues and courses
 *
 * Displays venues in two modes:
 * - Single-course venues: Shows course directly with venue as subtitle
 * - Multi-course venues: Shows expandable venue card with nested courses
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { GolfBallLoader } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { VenueCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useVenues';
import type { Venue } from '@/types/database.types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =====================================================
// PROPS INTERFACES
// =====================================================

interface VenueCardProps {
  item: VenueCourseDisplayItem;
  onCourseSelect?: (course: CourseWithFavoriteStatus, venue: Venue) => void;
  onVenuePress?: (venue: Venue) => void; // Navigate to venue details
  onToggleFavorite?: (course: CourseWithFavoriteStatus) => void;
  isTogglingFavorite?: string | null; // course ID being toggled
  showFavoriteButton?: boolean;
  selectionMode?: boolean; // When true, shows selection UI instead of favorite toggle
}

interface CourseRowProps {
  course: CourseWithFavoriteStatus;
  venue: Venue;
  onSelect?: (course: CourseWithFavoriteStatus, venue: Venue) => void;
  onToggleFavorite?: (course: CourseWithFavoriteStatus) => void;
  isTogglingFavorite?: boolean;
  showFavoriteButton?: boolean;
  isNested?: boolean; // true when shown inside expanded venue
  selectionMode?: boolean;
}

// =====================================================
// COURSE ROW COMPONENT
// =====================================================

const CourseRow = React.memo(function CourseRow({
  course,
  venue,
  onSelect,
  onToggleFavorite,
  isTogglingFavorite,
  showFavoriteButton = true,
  isNested = false,
  selectionMode = false,
}: CourseRowProps) {
  const colors = useThemeColors();
  const handlePress = useCallback(() => {
    onSelect?.(course, venue);
  }, [course, venue, onSelect]);

  const handleFavoritePress = useCallback(() => {
    onToggleFavorite?.(course);
  }, [course, onToggleFavorite]);

  const locationText = [venue.city, venue.state].filter(Boolean).join(', ');

  return (
    <TouchableOpacity
      style={[styles.courseRow, { backgroundColor: colors.surface }, isNested && { backgroundColor: colors.surfaceVariant, borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.courseRowContent}>
        {/* Golf Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }, isNested && styles.iconContainerSmall]}>
          <Icon source="golf" size={isNested ? 20 : 24} color={colors.primary} />
        </View>

        {/* Course Info */}
        <View style={styles.courseInfo}>
          <View style={styles.courseNameRow}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
              {course.name}
            </Text>
          </View>

          {/* Show venue name for non-nested (single course venues) */}
          {!isNested && locationText && (
            <Text style={[styles.venueSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {venue.name} · {locationText}
            </Text>
          )}

          {/* Show location for nested courses */}
          {isNested && course.description && (
            <Text style={[styles.courseDescription, { color: colors.textSecondary }]} numberOfLines={1}>
              {course.description}
            </Text>
          )}

          {/* Hole count and ratings - only render if there's data */}
          {((course.holes && course.holes.length > 0) || course.slope_rating) && (
            <View style={styles.courseMetaRow}>
              {course.holes && course.holes.length > 0 && (
                <Text style={[styles.courseMeta, { color: colors.primary }]}>
                  {course.holes.length} holes
                </Text>
              )}
              {course.slope_rating && (
                <Text style={[styles.courseMeta, { color: colors.primary }]}>
                  {course.holes && course.holes.length > 0 ? ' · ' : ''}Slope: {course.slope_rating}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.courseActions}>
          {showFavoriteButton && !selectionMode && (
            <TouchableOpacity
              style={[
                styles.favoriteButton,
                course.is_favorite && { backgroundColor: colors.warningLight + '30' },
              ]}
              onPress={handleFavoritePress}
              disabled={isTogglingFavorite}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isTogglingFavorite ? (
                <GolfBallLoader size="sm" />
              ) : (
                <Icon
                  source={course.is_favorite ? 'star' : 'star-outline'}
                  size={22}
                  color={course.is_favorite ? colors.warning : colors.gray400}
                />
              )}
            </TouchableOpacity>
          )}

          {selectionMode && (
            <Icon source="chevron-right" size={24} color={colors.gray400} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// =====================================================
// VENUE CARD COMPONENT
// =====================================================

export const VenueCard = React.memo(function VenueCard({
  item,
  onCourseSelect,
  onVenuePress,
  onToggleFavorite,
  isTogglingFavorite,
  showFavoriteButton = true,
  selectionMode = false,
}: VenueCardProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleVenuePress = useCallback(() => {
    onVenuePress?.(item.venue);
  }, [item.venue, onVenuePress]);

  // Single-course venue: render course directly
  if (item.type === 'single-course') {
    const course = item.courses[0];
    if (!course) return null;

    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CourseRow
          course={course}
          venue={item.venue}
          onSelect={onCourseSelect}
          onToggleFavorite={onToggleFavorite}
          isTogglingFavorite={isTogglingFavorite === course.id}
          showFavoriteButton={showFavoriteButton}
          selectionMode={selectionMode}
        />
      </View>
    );
  }

  // Multi-course venue: render expandable card
  const locationText = [item.venue.city, item.venue.state].filter(Boolean).join(', ');

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Venue Header (expandable) */}
      <TouchableOpacity
        style={[styles.venueHeader, { backgroundColor: colors.surface }]}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.venueHeaderContent}>
          {/* Venue Icon */}
          <View style={[styles.venueIconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="home-city" size={24} color={colors.primary} />
          </View>

          {/* Venue Info */}
          <View style={styles.venueInfo}>
            <View style={styles.venueNameRow}>
              <Text style={[styles.venueName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.venue.name}
              </Text>
              <View style={[styles.courseCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.courseCountText, { color: colors.textOnColored }]}>
                  {item.courses.length}
                </Text>
              </View>
            </View>
            {locationText && (
              <Text style={[styles.venueLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                {locationText}
              </Text>
            )}
            {item.venue.total_holes && (
              <Text style={[styles.venueHoles, { color: colors.primary }]}>
                {item.venue.total_holes} holes total
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.venueActions}>
            {/* Navigate to Venue Details */}
            {onVenuePress && (
              <TouchableOpacity
                style={styles.venueActionButton}
                onPress={handleVenuePress}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`View ${item.venue.name} details`}
              >
                <Icon source="information-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
            {/* Expand Icon */}
            <View style={styles.expandButton}>
              <Icon
                source={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.gray500}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Courses List */}
      {isExpanded && (
        <View style={[styles.coursesContainer, { borderTopColor: colors.gray200, backgroundColor: colors.gray50 }]}>
          {item.courses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              venue={item.venue}
              onSelect={onCourseSelect}
              onToggleFavorite={onToggleFavorite}
              isTogglingFavorite={isTogglingFavorite === course.id}
              showFavoriteButton={showFavoriteButton}
              isNested
              selectionMode={selectionMode}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // Venue Header (for multi-course venues)
  venueHeader: {
  },
  venueHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  venueIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  venueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  venueName: {
    ...typography.bodyBold,
    flex: 1,
  },
  courseCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  courseCountText: {
    ...typography.caption,
    fontWeight: '600',
  },
  venueLocation: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  venueHoles: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  venueActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Courses Container (for expanded venues)
  coursesContainer: {
    borderTopWidth: 1,
  },

  // Course Row
  courseRow: {
  },
  courseRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSmall: {
    width: 40,
    height: 40,
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
  venueSubtitle: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  courseDescription: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  courseMeta: {
    ...typography.caption,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VenueCard;
