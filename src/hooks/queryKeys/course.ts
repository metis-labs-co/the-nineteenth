/**
 * Club, Course, Tee, Coordinate & Favorite Query Keys
 */

// =====================================================
// CLUBS (renamed from VENUES)
// =====================================================

export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters?: { state?: string; search?: string }) =>
    [...clubKeys.lists(), filters] as const,
  withCourses: () => [...clubKeys.all, 'with-courses'] as const,
  withCoursesFiltered: (filters?: { country?: string; state?: string; search?: string; featured?: boolean }) =>
    [...clubKeys.withCourses(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
  homeClub: (playerId: string) => [...clubKeys.all, 'home', playerId] as const,
} as const;

/**
 * @deprecated Use clubKeys instead
 */
export const venueKeys = clubKeys;

// =====================================================
// COURSES
// =====================================================

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters?: {
    state?: string;
    city?: string;
    search?: string;
    clubId?: string;
  }) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  search: (query: string) => [...courseKeys.all, 'search', query] as const,
  favorites: () => [...courseKeys.all, 'favorites'] as const,
  byClub: (clubId: string) => [...courseKeys.all, 'club', clubId] as const,
  // API-specific keys (GolfAPI.io)
  apiSearch: (query: string, state?: string) =>
    [...courseKeys.all, 'api-search', query, state] as const,
  detailWithApi: (id: string) => [...courseKeys.details(), id, 'with-api'] as const,
  importStatus: (apiId: string) => [...courseKeys.all, 'import', apiId] as const,
  cacheStats: () => [...courseKeys.all, 'cache-stats'] as const,
} as const;

// =====================================================
// TEES
// =====================================================

export const teeKeys = {
  all: ['tees'] as const,
  lists: () => [...teeKeys.all, 'list'] as const,
  byCourse: (courseId: string) => [...teeKeys.all, 'course', courseId] as const,
  details: () => [...teeKeys.all, 'detail'] as const,
  detail: (id: string) => [...teeKeys.details(), id] as const,
  withCourse: (courseId: string) => [...teeKeys.all, 'with-course', courseId] as const,
} as const;

// =====================================================
// HOLE COORDINATES
// =====================================================

export const coordinateKeys = {
  all: ['coordinates'] as const,
  lists: () => [...coordinateKeys.all, 'list'] as const,
  byCourse: (courseId: string) => [...coordinateKeys.all, 'course', courseId] as const,
  byHole: (courseId: string, holeNumber: number) =>
    [...coordinateKeys.byCourse(courseId), 'hole', holeNumber] as const,
  greenCenter: (courseId: string, holeNumber: number) =>
    [...coordinateKeys.byHole(courseId, holeNumber), 'green-center'] as const,
  teeBack: (courseId: string, holeNumber: number) =>
    [...coordinateKeys.byHole(courseId, holeNumber), 'tee-back'] as const,
  summary: (courseId: string) => [...coordinateKeys.byCourse(courseId), 'summary'] as const,
} as const;

// =====================================================
// FAVORITE COURSES
// =====================================================

export const favoriteKeys = {
  all: ['favorites'] as const,
  lists: () => [...favoriteKeys.all, 'list'] as const,
  list: (userId?: string) => [...favoriteKeys.lists(), userId] as const,
} as const;
