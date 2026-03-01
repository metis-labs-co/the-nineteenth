/**
 * CourseCard - Display component for a course at a venue
 *
 * Shows course details including:
 * - Course name and description
 * - Hole count, par, slope/course rating
 * - Tee box information
 * - Favorite status toggle
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { GolfBallLoader } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFormattedDistance } from '@/store/settingsStore';
import type { Course, Hole } from '@/types/database.types';

// =====================================================
// PROPS INTERFACES
// =====================================================

interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

interface CourseCardProps {
  course: CourseWithFavorite;
  onPress?: (course: CourseWithFavorite) => void;
  onToggleFavorite?: (course: CourseWithFavorite) => void;
  isTogglingFavorite?: boolean;
  showFavoriteButton?: boolean;
  showChevron?: boolean;
  /** Optional venue name to display below the course name */
  venueName?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate total par from holes array
 */
function calculateTotalPar(holes: Hole[] | null | undefined): number | null {
  if (!Array.isArray(holes) || holes.length === 0) return null;
  return holes.reduce((sum, hole) => sum + hole.par, 0);
}

/**
 * Get sorted tee yardages for display
 */
function getSortedTeeYardages(tees: Course['tees']): number[] {
  if (!tees || tees.length === 0) return [];

  return tees
    .map((tee) => tee.totalYardage)
    .filter((y): y is number => y != null)
    .sort((a, b) => a - b);
}

// =====================================================
// COURSE CARD COMPONENT
// =====================================================

export const CourseCard = React.memo(function CourseCard({
  course,
  onPress,
  onToggleFavorite,
  isTogglingFavorite,
  showFavoriteButton = true,
  showChevron = true,
  venueName,
}: CourseCardProps) {
  const colors = useThemeColors();
  const { formatDistance } = useFormattedDistance();

  const handlePress = useCallback(() => {
    onPress?.(course);
  }, [course, onPress]);

  const handleFavoritePress = useCallback(() => {
    onToggleFavorite?.(course);
  }, [course, onToggleFavorite]);

  const holeCount = course.holes?.length ?? 0;
  const totalPar = calculateTotalPar(course.holes);
  const teeYardages = getSortedTeeYardages(course.tees);

  // Build tee box summary with user's preferred distance unit
  const teeBoxSummary = teeYardages.length === 0
    ? null
    : teeYardages.length === 1
      ? formatDistance(teeYardages[0])
      : `${formatDistance(teeYardages[0])} - ${formatDistance(teeYardages[teeYardages.length - 1])}`;

  return (
    <TouchableOpacity
      style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${course.name}, ${holeCount} holes${totalPar ? `, par ${totalPar}` : ''}`}
      accessibilityHint="Tap to view course details"
    >
      <View style={styles.cardContent}>
        {/* Golf Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
          <Icon source="golf" size={24} color={colors.primary} />
        </View>

        {/* Course Info */}
        <View style={styles.courseInfo}>
          <View style={styles.courseNameRow}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
              {course.name}
            </Text>
          </View>

          {venueName && (
            <Text style={[styles.venueName, { color: colors.textSecondary }]} numberOfLines={1}>
              {venueName}
            </Text>
          )}

          {course.description && (
            <Text style={[styles.courseDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {course.description}
            </Text>
          )}

          {/* Course Stats Row */}
          <View style={styles.statsRow}>
            {holeCount > 0 && (
              <View style={styles.statItem}>
                <Icon source="flag" size={14} color={colors.primary} />
                <Text style={[styles.statText, { color: colors.primary }]}>
                  {holeCount} holes
                </Text>
              </View>
            )}

            {totalPar && (
              <View style={styles.statItem}>
                <Text style={[styles.statText, { color: colors.primary }]}>
                  Par {totalPar}
                </Text>
              </View>
            )}

            {course.slope_rating && (
              <View style={styles.statItem}>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  Slope: {course.slope_rating}
                </Text>
              </View>
            )}

            {course.course_rating && (
              <View style={styles.statItem}>
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  CR: {course.course_rating}
                </Text>
              </View>
            )}
          </View>

          {/* Tee Box Summary */}
          {teeBoxSummary && (
            <View style={styles.teeBoxRow}>
              <Icon source="tee" size={12} color={colors.textTertiary} />
              <Text style={[styles.teeBoxText, { color: colors.textTertiary }]}>
                {course.tees?.length} tee{course.tees?.length !== 1 ? 's' : ''}: {teeBoxSummary}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {showFavoriteButton && (
            <TouchableOpacity
              style={[
                styles.favoriteButton,
                course.is_favorite && { backgroundColor: colors.warningLight + '30' },
              ]}
              onPress={handleFavoritePress}
              disabled={isTogglingFavorite}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={course.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
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

          {showChevron && (
            <Icon source="chevron-right" size={24} color={colors.gray400} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardContent: {
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
  courseInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  courseName: {
    ...typography.bodyBold,
    flex: 1,
  },
  venueName: {
    ...typography.small,
    marginTop: 2,
  },
  courseDescription: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
  },
  teeBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  teeBoxText: {
    ...typography.caption,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CourseCard;
