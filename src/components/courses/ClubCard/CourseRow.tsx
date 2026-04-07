/**
 * CourseRow - Individual course row for display in club cards
 *
 * Shows course name, location, hole count, ratings, and actions
 * (favorite toggle or selection chevron). Used both standalone
 * (single-course clubs) and nested (inside expanded multi-course clubs).
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { GolfBallLoader } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatDistanceKm } from '@/utils/gpsCalculations';
import { getSourceBadgeConfig } from './clubCardUtils';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface CourseRowProps {
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
  distanceMeters?: number; // Distance from user to this club in meters
}

// =====================================================
// COMPONENT
// =====================================================

export const CourseRow = React.memo(function CourseRow({
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
  distanceMeters,
}: CourseRowProps) {
  const colors = useThemeColors();
  const handlePress = useCallback(() => {
    onSelect?.(course, club);
  }, [course, club, onSelect]);

  const handleFavoritePress = useCallback(() => {
    onToggleFavorite?.(course);
  }, [course, onToggleFavorite]);

  const distanceLabel = distanceMeters != null ? formatDistanceKm(distanceMeters) : null;
  const locationText = [club.city, club.state, distanceLabel].filter(Boolean).join(' · ');

  // Get source badge config for single-course display
  const sourceBadge =
    showSource && !isNested ? getSourceBadgeConfig(club.source, colors) : null;

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
// STYLES
// =====================================================

const styles = StyleSheet.create({
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
