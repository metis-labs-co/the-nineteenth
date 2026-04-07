/**
 * Club Hooks - Helper Functions
 *
 * Utility functions for club and course data transformations.
 */

import { teeToTeeBox } from '@/utils/teeTransformers';
import { calculateDistance } from '@/utils/gpsCalculations';
import type { Club, Course, CourseSource } from '@/types/database.types';
import type { SupabaseCourseWithTees, ClubWithCourses, ClubCourseDisplayItem, SearchResultItem } from './types';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';

/**
 * Merge tees from the tees table into the course's tees field
 * Prioritizes tees from the table over legacy JSONB tees
 */
export function mergeTees(course: SupabaseCourseWithTees): Course {
  const teesFromTable = course.tees_from_table ?? [];
  const legacyTees = course.tees ?? [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tees_from_table, ...courseWithoutTeesFromTable } = course;

  return {
    ...courseWithoutTeesFromTable,
    // Prefer tees from table, fallback to legacy JSONB tees
    tees: teesFromTable.length > 0 ? teesFromTable.map(teeToTeeBox) : legacyTees,
  };
}

/**
 * Type guard to check if a search result is from local DB
 */
export function isLocalClub(item: SearchResultItem): item is ClubWithCourses {
  return !('source' in item) || item.source !== 'golfapi';
}

/**
 * Transform a SearchResultItem (which may be a local ClubWithCourses or a GolfApiSearchResultItem)
 * into a ClubCourseDisplayItem for UI display.
 *
 * Safely handles the union type by providing defaults for properties
 * that only exist on the full Club type.
 */
export function toClubCourseDisplayItem(item: SearchResultItem): ClubCourseDisplayItem {
  const clubData: Club = isLocalClub(item)
    ? {
        id: item.id,
        source: item.source,
        golfapi_club_id: item.golfapi_club_id,
        name: item.name,
        state: item.state,
        city: item.city,
        address: item.address,
        postal_code: item.postal_code,
        country: item.country,
        continent: item.continent,
        phone: item.phone,
        email: item.email,
        website: item.website,
        latitude: item.latitude,
        longitude: item.longitude,
        location: item.location,
        total_holes: item.total_holes,
        is_featured: item.is_featured,
        last_synced: item.last_synced,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
    : {
        id: item.id,
        source: 'api' as CourseSource,
        golfapi_club_id: item.golfapi_club_id,
        name: item.name,
        state: item.state,
        city: item.city,
        address: null,
        postal_code: null,
        country: 'Australia',
        continent: null,
        phone: null,
        email: null,
        website: null,
        latitude: item.latitude,
        longitude: item.longitude,
        location: null,
        total_holes: null,
        is_featured: false,
        last_synced: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  return {
    type: item.is_multi_course ? 'multi-course-club' : 'single-course',
    club: clubData,
    venue: clubData,
    courses: item.courses,
    is_home: item.is_home,
  };
}

/**
 * Sort display items with home club first, then alphabetically by name.
 * Works with ClubCourseDisplayItem and GolfApiSearchResultItem.
 */
export function sortHomeClubFirst<T extends ClubCourseDisplayItem | GolfApiSearchResultItem>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aIsHome = 'is_home' in a ? a.is_home : false;
    const bIsHome = 'is_home' in b ? b.is_home : false;
    if (aIsHome && !bIsHome) return -1;
    if (!aIsHome && bIsHome) return 1;

    const aName = 'club' in a && a.club ? a.club.name : (a as GolfApiSearchResultItem).name;
    const bName = 'club' in b && b.club ? b.club.name : (b as GolfApiSearchResultItem).name;
    return aName.localeCompare(bName);
  });
}

/**
 * Get latitude/longitude from either a ClubCourseDisplayItem or GolfApiSearchResultItem
 */
function getItemCoords(item: ClubCourseDisplayItem | GolfApiSearchResultItem): { lat: number; lng: number } | null {
  if ('club' in item && item.club) {
    const { latitude, longitude } = item.club;
    if (latitude != null && longitude != null) return { lat: latitude, lng: longitude };
  } else {
    const api = item as GolfApiSearchResultItem;
    if (api.latitude != null && api.longitude != null) return { lat: api.latitude, lng: api.longitude };
  }
  return null;
}

/**
 * Get the club ID from either item type
 */
function getItemClubId(item: ClubCourseDisplayItem | GolfApiSearchResultItem): string {
  if ('club' in item && item.club) return item.club.id;
  return (item as GolfApiSearchResultItem).id;
}

/**
 * Sort display items by distance from user's location.
 *
 * Priority: home club first → clubs with coords sorted by distance → clubs without coords alphabetically.
 * Returns sorted items and a Map of clubId → distance in meters for UI display.
 */
export function sortByDistance<T extends ClubCourseDisplayItem | GolfApiSearchResultItem>(
  items: T[],
  userLat: number,
  userLng: number
): { items: T[]; distances: Map<string, number> } {
  const distances = new Map<string, number>();

  // Pre-compute distances
  for (const item of items) {
    const coords = getItemCoords(item);
    if (coords) {
      distances.set(getItemClubId(item), calculateDistance(userLat, userLng, coords.lat, coords.lng));
    }
  }

  const sorted = [...items].sort((a, b) => {
    // Home club always first
    const aIsHome = 'is_home' in a ? a.is_home : false;
    const bIsHome = 'is_home' in b ? b.is_home : false;
    if (aIsHome && !bIsHome) return -1;
    if (!aIsHome && bIsHome) return 1;

    const aId = getItemClubId(a);
    const bId = getItemClubId(b);
    const aDist = distances.get(aId);
    const bDist = distances.get(bId);

    // Both have distance → sort by distance
    if (aDist != null && bDist != null) return aDist - bDist;
    // Only one has distance → it comes first
    if (aDist != null) return -1;
    if (bDist != null) return 1;

    // Neither has distance → alphabetical
    const aName = 'club' in a && a.club ? a.club.name : (a as GolfApiSearchResultItem).name;
    const bName = 'club' in b && b.club ? b.club.name : (b as GolfApiSearchResultItem).name;
    return aName.localeCompare(bName);
  });

  return { items: sorted, distances };
}
