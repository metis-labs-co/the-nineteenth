/**
 * ClubCard - Hybrid display component for clubs and courses
 *
 * Displays clubs in two modes:
 * - Single-course clubs: Shows course directly with club as subtitle
 * - Multi-course clubs: Shows expandable club card with nested courses
 *
 * @deprecated Use Club terminology instead of Venue (renamed in GolfAPI integration)
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
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { ClubCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';
import type { Club } from '@/types/database.types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =====================================================
// PROPS INTERFACES
// =====================================================

/**
 * ClubCard accepts either:
 * - ClubCourseDisplayItem: Local DB club with courses (from useClubsWithCourses/useSearchClubs)
 * - GolfApiSearchResultItem: API search result (from useGolfApiSearch, not yet imported)
 */
export type ClubCardItem = ClubCourseDisplayItem | GolfApiSearchResultItem;

interface ClubCardProps {
  item: ClubCardItem;
  onCourseSelect?: (course: CourseWithFavoriteStatus, club: Club) => void;
  onClubPress?: (club: Club) => void; // Navigate to club details (also used for API result selection)
  onToggleFavorite?: (course: CourseWithFavoriteStatus) => void;
  isTogglingFavorite?: string | null; // course ID being toggled
  showFavoriteButton?: boolean;
  selectionMode?: boolean; // When true, shows selection UI instead of favorite toggle
  showSource?: boolean; // Show API/Manual/Legacy source badge
  isImporting?: boolean; // Show loading indicator during API import
}

/** @deprecated Use ClubCardProps instead */
export type VenueCardProps = ClubCardProps;

/**
 * Type guard to check if item is from GolfAPI.io (not yet imported)
 */
function isApiResult(item: ClubCardItem): item is GolfApiSearchResultItem {
  return 'source' in item && item.source === 'golfapi';
}

interface CourseRowProps {
  course: CourseWithFavoriteStatus;
  club: Club;
  onSelect?: (course: CourseWithFavoriteStatus, club: Club) => void;
  onToggleFavorite?: (course: CourseWithFavoriteStatus) => void;
  isTogglingFavorite?: boolean;
  showFavoriteButton?: boolean;
  isNested?: boolean; // true when shown inside expanded club
  selectionMode?: boolean;
  isHomeClub?: boolean; // true if this club is the user's home club
  showSource?: boolean; // Show API/Manual/Legacy source badge
}

// =====================================================
// COURSE ROW COMPONENT
// =====================================================

const CourseRow = React.memo(function CourseRow({
  course,
  club,
  onSelect,
  onToggleFavorite,
  isTogglingFavorite,
  showFavoriteButton = true,
  isNested = false,
  selectionMode = false,
  isHomeClub = false,
  showSource = false,
}: CourseRowProps) {
  const colors = useThemeColors();
  const handlePress = useCallback(() => {
    onSelect?.(course, club);
  }, [course, club, onSelect]);

  const handleFavoritePress = useCallback(() => {
    onToggleFavorite?.(course);
  }, [course, onToggleFavorite]);

  const locationText = [club.city, club.state].filter(Boolean).join(', ');

  // Get source badge config for single-course display
  const getSourceBadge = () => {
    if (!showSource || isNested) return null; // Only show on single-course cards, not nested
    const source = club.source;
    if (source === 'api') {
      return { label: 'API', color: colors.success, bgColor: colors.successLight + '30' };
    } else if (source === 'legacy') {
      return { label: 'Legacy', color: colors.warning, bgColor: colors.warningLight + '30' };
    }
    return { label: 'Manual', color: colors.textSecondary, bgColor: colors.gray200 };
  };
  const sourceBadge = getSourceBadge();

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
              {/* For single-course clubs, show "Club Name - Course Name" for full context */}
              {!isNested ? `${club.name} - ${course.name}` : course.name}
            </Text>
            {/* Home badge for single-course clubs */}
            {!isNested && isHomeClub && (
              <View style={[styles.homeBadge, { backgroundColor: colors.primaryLighter }]}>
                <Icon source="home" size={14} color={colors.primary} />
              </View>
            )}
            {/* Source badge for single-course clubs */}
            {sourceBadge && (
              <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bgColor }]}>
                <Text style={[styles.sourceBadgeText, { color: sourceBadge.color }]}>
                  {sourceBadge.label}
                </Text>
              </View>
            )}
          </View>

          {/* Show location for non-nested (single course clubs) */}
          {!isNested && locationText && (
            <Text style={[styles.clubSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {locationText}
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
// CLUB CARD COMPONENT
// =====================================================

export const ClubCard = React.memo(function ClubCard({
  item,
  onCourseSelect,
  onClubPress,
  onToggleFavorite,
  isTogglingFavorite,
  showFavoriteButton = true,
  selectionMode = false,
  showSource = false,
  isImporting = false,
}: ClubCardProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if this is an API result (not yet imported to local DB)
  const isApiItem = isApiResult(item);

  // All hooks must be called before any conditional returns
  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  // For local items, get the club; for API items, this will be unused but we need consistent hook calls
  const localItem = isApiItem ? null : (item as ClubCourseDisplayItem);

  const handleClubPress = useCallback(() => {
    if (isApiItem) {
      // For API results, pass the item as-is (will be imported on selection)
      onClubPress?.(item as unknown as Club);
    } else if (localItem) {
      onClubPress?.(localItem.club);
    }
  }, [isApiItem, item, localItem, onClubPress]);

  // Handle API results (from GolfAPI.io search, not yet imported)
  // These have empty courses array, so we render a simplified card
  if (isApiItem) {
    const apiItem = item as GolfApiSearchResultItem;
    const locationText = [apiItem.city, apiItem.state].filter(Boolean).join(', ');
    const isSingleCourse = !apiItem.is_multi_course;

    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.courseRow}
          onPress={handleClubPress}
          disabled={isImporting}
          activeOpacity={0.7}
        >
          <View style={styles.courseRowContent}>
            {/* Icon - golf for single course, home-city for multi-course */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
              <Icon source={isSingleCourse ? 'golf' : 'home-city'} size={24} color={colors.primary} />
            </View>

            {/* Info */}
            <View style={styles.courseInfo}>
              <View style={styles.courseNameRow}>
                <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {apiItem.name}
                </Text>
                {/* Multi-course badge */}
                {!isSingleCourse && (
                  <View style={[styles.courseCountBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.courseCountText, { color: colors.textOnColored }]}>
                      {apiItem.course_count || '?'}
                    </Text>
                  </View>
                )}
              </View>
              {locationText && (
                <Text style={[styles.clubSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {locationText}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.courseActions}>
              {isImporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : selectionMode ? (
                <Icon source="chevron-right" size={24} color={colors.gray400} />
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // From here on, item is a ClubCourseDisplayItem (local DB result)
  // localItem is guaranteed to be non-null here since isApiItem is false
  const displayItem = localItem!;

  // Get source badge config
  const getSourceBadge = () => {
    if (!showSource) return null;
    const source = displayItem.club.source;
    if (source === 'api') {
      return { label: 'API', color: colors.success, bgColor: colors.successLight + '30' };
    } else if (source === 'legacy') {
      return { label: 'Legacy', color: colors.warning, bgColor: colors.warningLight + '30' };
    }
    return { label: 'Manual', color: colors.textSecondary, bgColor: colors.gray200 };
  };
  const sourceBadge = getSourceBadge();

  // Single-course club: render course directly
  if (displayItem.type === 'single-course') {
    const course = displayItem.courses[0];
    if (!course) return null;

    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CourseRow
          course={course}
          club={displayItem.club}
          onSelect={onCourseSelect}
          onToggleFavorite={onToggleFavorite}
          isTogglingFavorite={isTogglingFavorite === course.id}
          showFavoriteButton={showFavoriteButton}
          selectionMode={selectionMode}
          isHomeClub={displayItem.is_home}
          showSource={showSource}
        />
      </View>
    );
  }

  // Multi-course club: render expandable card
  const locationText = [displayItem.club.city, displayItem.club.state].filter(Boolean).join(', ');

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Club Header (expandable) */}
      <TouchableOpacity
        style={[styles.clubHeader, { backgroundColor: colors.surface }]}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.clubHeaderContent}>
          {/* Club Icon */}
          <View style={[styles.clubIconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="home-city" size={24} color={colors.primary} />
          </View>

          {/* Club Info */}
          <View style={styles.clubInfo}>
            <View style={styles.clubNameRow}>
              <Text style={[styles.clubName, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayItem.club.name}
              </Text>
              {/* Home badge for multi-course clubs */}
              {displayItem.is_home && (
                <View style={[styles.homeBadge, { backgroundColor: colors.primaryLighter }]}>
                  <Icon source="home" size={14} color={colors.primary} />
                </View>
              )}
              {/* Source badge */}
              {sourceBadge && (
                <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bgColor }]}>
                  <Text style={[styles.sourceBadgeText, { color: sourceBadge.color }]}>
                    {sourceBadge.label}
                  </Text>
                </View>
              )}
              <View style={[styles.courseCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.courseCountText, { color: colors.textOnColored }]}>
                  {displayItem.courses.length}
                </Text>
              </View>
            </View>
            {locationText && (
              <Text style={[styles.clubLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                {locationText}
              </Text>
            )}
            {displayItem.club.total_holes && (
              <Text style={[styles.clubHoles, { color: colors.primary }]}>
                {displayItem.club.total_holes} holes total
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.clubActions}>
            {/* Navigate to Club Details */}
            {onClubPress && (
              <TouchableOpacity
                style={styles.clubActionButton}
                onPress={handleClubPress}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`View ${displayItem.club.name} details`}
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
          {displayItem.courses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              club={displayItem.club}
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

/** @deprecated Use ClubCard instead */
export const VenueCard = ClubCard;

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

  // Club Header (for multi-course clubs)
  clubHeader: {
  },
  clubHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  clubIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clubName: {
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
  homeBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sourceBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  courseCountText: {
    ...typography.caption,
    fontWeight: '600',
  },
  clubLocation: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  clubHoles: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  clubActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubActionButton: {
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

  // Courses Container (for expanded clubs)
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
  clubSubtitle: {
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

export default ClubCard;
