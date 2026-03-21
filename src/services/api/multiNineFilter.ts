/**
 * Filters multi-nine club courses from GolfAPI.io imports.
 *
 * 27-hole clubs (3 nines) return 9 course combinations from GolfAPI.
 * Only 3 are valid playable courses — the forward-circular combos:
 * (1st+2nd, 2nd+3rd, 3rd+1st).
 *
 * This module detects multi-nine clubs by course naming pattern and
 * filters to only the valid combinations.
 */

/** Parsed ordinal pair from a course name like "1st + 2nd" */
interface NinePair {
  first: number;
  second: number;
}

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
export function parseNinePair(courseName: string): NinePair | null {
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
 * Returns null if not a multi-nine club.
 */
export function detectNineCount(courses: CourseSummary[]): number | null {
  if (!isMultiNineClub(courses)) return null;
  return Math.sqrt(courses.length);
}

/**
 * Get valid forward-circular combinations for n nines.
 * For n=3: [[1,2], [2,3], [3,1]]
 * For n=2: [[1,2], [2,1]]
 */
function getValidCombinations(nineCount: number): [number, number][] {
  const combos: [number, number][] = [];
  for (let i = 1; i <= nineCount; i++) {
    const next = (i % nineCount) + 1;
    combos.push([i, next]);
  }
  return combos;
}

/**
 * Filter multi-nine club courses to only valid playable combinations.
 * Returns the original array unchanged for normal clubs.
 */
export function filterMultiNineCourses<T extends CourseSummary>(courses: T[]): T[] {
  const nineCount = detectNineCount(courses);
  if (!nineCount) return courses;

  const validCombos = getValidCombinations(nineCount);
  const validSet = new Set(validCombos.map(([a, b]) => `${a},${b}`));

  return courses.filter((c) => {
    const pair = parseNinePair(c.courseName);
    return pair && validSet.has(`${pair.first},${pair.second}`);
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

// =====================================================
// CLUB-SPECIFIC NINE NAME OVERRIDES
// =====================================================

/**
 * Static lookup: golfapi_club_id → nine number → display name.
 * Used to rename "1st + 2nd" → "South/North Course" for known clubs.
 */
const CLUB_NINE_NAMES: Record<string, Record<number, string>> = {
  // The Eastern Golf Club, Yering VIC
  '141519519758903234': { 1: 'South', 2: 'North', 3: 'East' },
};

/**
 * Get display name for a course, applying club-specific nine name overrides.
 * E.g., for The Eastern: "1st + 2nd" → "South/North Course"
 * Returns the original name if no override exists.
 */
export function getDisplayCourseName(
  golfapiClubId: string | undefined | null,
  originalName: string
): string {
  if (!golfapiClubId) return originalName;

  const nineNames = CLUB_NINE_NAMES[golfapiClubId];
  if (!nineNames) return originalName;

  const pair = parseNinePair(originalName);
  if (!pair) return originalName;

  const firstName = nineNames[pair.first];
  const secondName = nineNames[pair.second];

  if (firstName && secondName) {
    return `${firstName}/${secondName} Course`;
  }

  return originalName;
}
