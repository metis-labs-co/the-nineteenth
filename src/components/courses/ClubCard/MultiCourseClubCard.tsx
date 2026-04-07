/**
 * MultiCourseClubCard - Expandable card for clubs with multiple courses
 *
 * Shows club header with name, location, course count, and expand/collapse toggle.
 * When expanded, renders nested CourseRow items for each course.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatDistanceKm } from '@/utils/gpsCalculations';
import { getSourceBadgeConfig } from './clubCardUtils';
import { CourseRow } from './CourseRow';
import type { ClubCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

interface MultiCourseClubCardProps {
  displayItem: ClubCourseDisplayItem;
  onCourseSelect?: (course: CourseWithFavoriteStatus, club: Club) => void;
  onClubPress?: (club: Club) => void;
  onToggleFavorite?: (course: CourseWithFavoriteStatus) => void;
  isTogglingFavorite?: string | null;
  showFavoriteButton: boolean;
  selectionMode: boolean;
  showSource: boolean;
  distanceMeters?: number;
}

// =====================================================
// COMPONENT
// =====================================================

export const MultiCourseClubCard = React.memo(function MultiCourseClubCard({
  displayItem,
  onCourseSelect,
  onClubPress,
  onToggleFavorite,
  isTogglingFavorite,
  showFavoriteButton,
  selectionMode,
  showSource,
  distanceMeters,
}: MultiCourseClubCardProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClubPress = useCallback(() => {
    onClubPress?.(displayItem.club);
  }, [displayItem.club, onClubPress]);

  // Source badge config
  const sourceBadge = showSource
    ? getSourceBadgeConfig(displayItem.club.source, colors)
    : null;

  const distanceLabel = distanceMeters != null ? formatDistanceKm(distanceMeters) : null;
  const locationText = [displayItem.club.city, displayItem.club.state, distanceLabel]
    .filter(Boolean)
    .join(' · ');

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
  courseCountText: {
    ...typography.caption,
    fontWeight: '600',
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
  coursesContainer: {
    borderTopWidth: 1,
  },
});
