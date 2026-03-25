/**
 * Filters multi-nine club courses from GolfAPI.io imports.
 *
 * 27-hole clubs (3 nines) return 9 course combinations from GolfAPI.
 * Only 3 are valid playable courses. This module detects multi-nine clubs
 * and filters to the valid combinations.
 *
 * For clubs with known overrides, uses a curated course ID → display name map.
 * For unknown multi-nine clubs, falls back to keeping courses where tee ratings exist.
 */

/** Course summary shape matching GolfAPI response */
interface CourseSummary {
  courseID: string;
  courseName: string;
  numHoles: number;
}

const ORDINAL_PAIR_REGEX = /^(\d+)(?:st|nd|rd|th)\s*\+\s*(\d+)(?:st|nd|rd|th)$/i;

/**
 * Parse "1st + 2nd" → { first: 1, second: 2 }, or null if not a nine-pair name.
 */
export function parseNinePair(courseName: string): { first: number; second: number } | null {
  const match = courseName.trim().match(ORDINAL_PAIR_REGEX);
  if (!match) return null;
  return { first: parseInt(match[1], 10), second: parseInt(match[2], 10) };
}

/**
 * Check if a set of courses represents a multi-nine club.
 * True when ALL course names match the ordinal pattern AND count = n² for some n ≥ 2.
 */
export function isMultiNineClub(courses: CourseSummary[]): boolean {
  if (courses.length < 4) return false;
  const n = Math.sqrt(courses.length);
  if (!Number.isInteger(n) || n < 2) return false;
  return courses.every((c) => parseNinePair(c.courseName) !== null);
}

/**
 * Get the number of nines for a multi-nine club.
 */
export function detectNineCount(courses: CourseSummary[]): number | null {
  if (!isMultiNineClub(courses)) return null;
  return Math.sqrt(courses.length);
}

// =====================================================
// CLUB-SPECIFIC OVERRIDES
// =====================================================

/**
 * Curated mapping: golfapi_club_id → { golfapi_course_id → display name }.
 * Defines which courses are valid and what they should be named.
 * The forward-circular heuristic doesn't work for all clubs (e.g., The Eastern
 * uses 1st+2nd, 1st+3rd, 3rd+1st — not 1st+2nd, 2nd+3rd, 3rd+1st).
 *
 * NOTE: The Eastern's North/East (2nd+3rd, course 023) is excluded here because
 * GolfAPI has a data bug — the back 9 pars/SI return South nine data instead of
 * East nine. North/East is seeded via scripts/seed-eastern.ts as a composite.
 * Do not add 023 here until the API provider fixes the bug.
 */
const CLUB_COURSE_OVERRIDES: Record<string, Record<string, string>> = {
  // The Eastern Golf Club, Yering VIC — nines: 1st=South, 2nd=North, 3rd=East
  '141519519758903234': {
    '0121769153723593685': 'South/North Course', // 1st + 2nd
    '0311769153723593685': 'East/South Course', // 3rd + 1st
    // North/East (2nd+3rd, 023) omitted — API data bug, seeded separately
  },
};

/**
 * Filter multi-nine club courses to only valid playable combinations.
 *
 * - If the club has a curated override, uses that.
 * - Otherwise for detected multi-nine clubs, excludes self-combinations (1st+1st etc).
 * - Returns the original array unchanged for normal clubs.
 */
export function filterMultiNineCourses<T extends CourseSummary>(
  courses: T[],
  golfapiClubId?: string | null
): T[] {
  // Check for club-specific override first
  if (golfapiClubId && CLUB_COURSE_OVERRIDES[golfapiClubId]) {
    const overrides = CLUB_COURSE_OVERRIDES[golfapiClubId];
    return courses.filter((c) => c.courseID in overrides);
  }

  // Generic multi-nine detection
  if (!isMultiNineClub(courses)) return courses;

  // Exclude self-combinations (1st+1st, 2nd+2nd, etc.)
  return courses.filter((c) => {
    const pair = parseNinePair(c.courseName);
    return pair && pair.first !== pair.second;
  });
}

/**
 * For detected multi-nine clubs, returns nineCount × 9 (e.g., 27).
 * Returns null for normal clubs.
 */
export function getMultiNineTotalHoles(courses: CourseSummary[]): number | null {
  const nineCount = detectNineCount(courses);
  return nineCount ? nineCount * 9 : null;
}

/**
 * Get display name for a course, applying club-specific overrides.
 * Returns the original name if no override exists.
 */
export function getDisplayCourseName(
  golfapiClubId: string | undefined | null,
  originalCourseId: string | undefined | null,
  originalName: string
): string {
  if (!golfapiClubId || !originalCourseId) return originalName;

  const overrides = CLUB_COURSE_OVERRIDES[golfapiClubId];
  if (!overrides) return originalName;

  return overrides[originalCourseId] || originalName;
}
