/**
 * ClubCard Utility Functions and Types
 *
 * Shared type guard and utility for club/course display components.
 */

import type { ClubCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';
import type { Club } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * ClubCard accepts either:
 * - ClubCourseDisplayItem: Local DB club with courses (from useClubsWithCourses/useSearchClubs)
 * - GolfApiSearchResultItem: API search result (from useGolfApiSearch, not yet imported)
 */
export type ClubCardItem = ClubCourseDisplayItem | GolfApiSearchResultItem;

export interface ClubCardProps {
  item: ClubCardItem;
  onCourseSelect?: (course: CourseWithFavoriteStatus, club: Club) => void;
  onClubPress?: (club: Club) => void; // Navigate to club details (also used for API result selection)
  onToggleFavorite?: (course: CourseWithFavoriteStatus) => void;
  isTogglingFavorite?: string | null; // course ID being toggled
  showFavoriteButton?: boolean;
  selectionMode?: boolean; // When true, shows selection UI instead of favorite toggle
  showSource?: boolean; // Show API/Manual/Legacy source badge
  isImporting?: boolean; // Show loading indicator during API import
  distanceMeters?: number; // Distance from user to this club in meters
}

/** @deprecated Use ClubCardProps instead */
export type VenueCardProps = ClubCardProps;

// =====================================================
// UTILITIES
// =====================================================

/**
 * Type guard to check if item is from GolfAPI.io (not yet imported)
 */
export function isApiResult(item: ClubCardItem): item is GolfApiSearchResultItem {
  return 'source' in item && item.source === 'golfapi';
}

/**
 * Get source badge configuration for a club
 */
export function getSourceBadgeConfig(
  source: string | undefined | null,
  colors: {
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    textSecondary: string;
    gray200: string;
  }
): { label: string; color: string; bgColor: string } | null {
  if (source === 'api') {
    return { label: 'API', color: colors.success, bgColor: colors.successLight + '30' };
  } else if (source === 'legacy') {
    return { label: 'Legacy', color: colors.warning, bgColor: colors.warningLight + '30' };
  }
  return { label: 'Manual', color: colors.textSecondary, bgColor: colors.gray200 };
}
