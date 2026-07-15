/**
 * ClubCard - Hybrid display component for clubs and courses
 *
 * Displays clubs in two modes:
 * - Single-course clubs: Shows course directly with club as subtitle
 * - Multi-course clubs: Shows expandable club card with nested courses
 *
 * Also handles GolfAPI.io search results (not yet imported to local DB).
 *
 * @deprecated Use Club terminology instead of Venue (renamed in GolfAPI integration)
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Platform, UIManager } from 'react-native';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { isApiResult } from './clubCardUtils';
import { CourseRow } from './CourseRow';
import { ApiResultCard } from './ApiResultCard';
import { MultiCourseClubCard } from './MultiCourseClubCard';
import type { ClubCardProps } from './clubCardUtils';
import type { ClubCourseDisplayItem } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';

// Re-export types and utilities for consumers
export type { ClubCardItem, ClubCardProps, VenueCardProps } from './clubCardUtils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  distanceMeters,
}: ClubCardProps) {
  const colors = useThemeColors();

  // Check if this is an API result (not yet imported to local DB)
  const isApiItem = isApiResult(item);

  // For local items, get the club; for API items, this will be unused
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
  if (isApiItem) {
    return (
      <ApiResultCard
        item={item as import('@/hooks/useGolfApiSearch').GolfApiSearchResultItem}
        onPress={handleClubPress}
        isImporting={isImporting}
        selectionMode={selectionMode}
        distanceMeters={distanceMeters}
      />
    );
  }

  // From here on, item is a ClubCourseDisplayItem (local DB result)
  const displayItem = localItem!;

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
          distanceMeters={distanceMeters}
        />
      </View>
    );
  }

  // Multi-course club: render expandable card
  return (
    <MultiCourseClubCard
      displayItem={displayItem}
      onCourseSelect={onCourseSelect}
      onClubPress={onClubPress}
      onToggleFavorite={onToggleFavorite}
      isTogglingFavorite={isTogglingFavorite}
      showFavoriteButton={showFavoriteButton}
      selectionMode={selectionMode}
      showSource={showSource}
      distanceMeters={distanceMeters}
    />
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
});

export default ClubCard;
