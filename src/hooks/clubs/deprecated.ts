/**
 * Club Hooks - Deprecated Aliases
 *
 * This file contains deprecated type aliases and hook aliases
 * for backward compatibility during the venue→club naming migration.
 *
 * @deprecated All exports in this file are deprecated.
 * Use the new club-prefixed names instead.
 */

import type { ClubWithCourses, ClubCourseDisplayItem, CreateClubInput, FavoriteCourseWithClub } from './types';
import {
  useClubsWithCourses,
  useSearchClubs,
  useClubCourseDisplayItems,
  useFavoriteCoursesWithClubs,
} from './queries';
import { useCreateClub, useCreateClubWithCourse } from './mutations';

// =====================================================
// DEPRECATED TYPE ALIASES
// =====================================================

/**
 * @deprecated Use ClubWithCourses instead
 */
export type VenueWithCourses = ClubWithCourses;

/**
 * @deprecated Use ClubCourseDisplayItem instead
 */
export type VenueCourseDisplayItem = ClubCourseDisplayItem;

/**
 * @deprecated Use CreateClubInput instead
 */
export type CreateVenueInput = CreateClubInput;

/**
 * @deprecated Use FavoriteCourseWithClub instead
 */
export type FavoriteCourseWithVenue = FavoriteCourseWithClub;

// =====================================================
// DEPRECATED HOOK ALIASES
// =====================================================

/**
 * @deprecated Use useClubsWithCourses instead
 */
export const useVenuesWithCourses = useClubsWithCourses;

/**
 * @deprecated Use useSearchClubs instead
 */
export const useSearchVenues = useSearchClubs;

/**
 * @deprecated Use useClubCourseDisplayItems instead
 */
export const useVenueCourseDisplayItems = useClubCourseDisplayItems;

/**
 * @deprecated Use useFavoriteCoursesWithClubs instead
 */
export const useFavoriteCoursesWithVenues = useFavoriteCoursesWithClubs;

/**
 * @deprecated Use useCreateClub instead
 */
export const useCreateVenue = useCreateClub;

/**
 * @deprecated Use useCreateClubWithCourse instead
 */
export const useCreateVenueWithCourse = useCreateClubWithCourse;
