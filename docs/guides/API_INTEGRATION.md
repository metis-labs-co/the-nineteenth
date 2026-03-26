# Golf Course API Integration

**The Nineteenth** - Mobile Golf Competition App

> Complete guide to integrating with GolfAPI.io for golf course data

---

## Overview

The app integrates with GolfAPI.io to provide comprehensive course information, including hole-by-hole data, tee ratings, and location details. This guide covers the API integration strategy, data flow, and implementation.

---

## API Strategy

### GolfAPI.io + Cache Architecture

```typescript
interface CourseDataStrategy {
  primary: 'golfapi.io';           // Full course data with holes and tees
  fallback: 'manual-entry';        // Admin can add courses manually
  cache: 'postgresql';             // Store all data locally (30-day TTL)
}
```

**Implementation Flow:**
1. Admin searches course via GolfAPI.io
2. Import full course data including holes and tee ratings
3. Store in PostgreSQL with 30-day cache TTL
4. Auto-refresh stale course data on access

---

## Primary API: GolfAPI.io

### Details

- **Provider**: GolfAPI.io
- **Coverage**: 42,000+ courses globally (includes Australia)
- **Documentation**: https://www.golfapi.io/

### Features

✅ Search by course name or GPS coordinates
✅ Filter by state/country
✅ Complete scorecard data (hole-by-hole)
✅ Pars and stroke indexes for each hole
✅ Multiple tees with distances (yardages)
✅ Slope and course ratings per tee
✅ GPS coordinates (tee box and green locations)
✅ Course designer and facilities

### Data Available

| Data Type | Available | Notes |
|-----------|-----------|-------|
| Course name & location | ✅ | Address, city, state, coordinates |
| Contact info | ✅ | Phone, email, website |
| Hole-by-hole data | ✅ | All 18 holes with par, stroke index |
| Tee boxes | ✅ | Multiple tees (color, name, gender) |
| Yardages | ✅ | Per hole, per tee |
| Slope rating | ✅ | Per tee |
| Course rating | ✅ | Per tee |
| Course style | ✅ | Links, parkland, etc. |

---

## Implementation

### File Structure

```
src/services/
├── api/
│   ├── golfApiClient.ts      # HTTP client for GolfAPI.io
│   ├── golfApiTypes.ts       # TypeScript type definitions
│   └── golfApiTransformers.ts # Transform API responses to app types
├── courses/
│   ├── courseService.ts      # Unified course service (cache + API)
│   └── cacheService.ts       # PostgreSQL caching layer
```

### API Client

Located at `src/services/api/golfApiClient.ts`:

```typescript
const golfApiClient = {
  // Search courses by name/location/state
  searchClubs(params: GolfApiSearchParams): Promise<GolfApiClubResponse[]>;

  // Get club details with list of courses
  getClub(clubId: string): Promise<GolfApiClubResponse>;

  // Get full course with hole-by-hole data
  getCourseDetails(courseId: string): Promise<GolfApiCourseDetail>;

  // Location-based search
  searchNearby(lat: number, lng: number, radiusKm?: number): Promise<GolfApiClubResponse[]>;

  // Search by Australian state
  searchByState(state: string, query?: string): Promise<GolfApiClubResponse[]>;
};
```

### Type Definitions

Located at `src/services/api/golfApiTypes.ts`:

```typescript
// Search parameters
interface GolfApiSearchParams {
  query?: string;
  country?: string;  // Default: 'AU'
  state?: string;
  city?: string;
  location?: { lat: number; lng: number };
  radius?: number;
}

// Club response (stored in 'clubs' table)
interface GolfApiClubResponse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  location: { lat: number; lng: number };
  courses: GolfApiCourseBasic[];  // List of courses at this club
}

// Full course details
interface GolfApiCourseDetail {
  id: string;
  name: string;
  holes: GolfApiHole[];
  tees: GolfApiTee[];
  courseRating?: number;
  slopeRating?: number;
  par: number;
  designer?: string;
  yearOpened?: number;
  style?: string;
  facilities?: string[];
}

// Individual hole data
interface GolfApiHole {
  number: number;
  par: number;
  strokeIndex: number;
  yardages: GolfApiHoleYardage[];
  coordinates?: {
    tee: { lat: number; lng: number };
    green: { lat: number; lng: number };
  };
}

// Tee box information
interface GolfApiTee {
  id: string;
  name: string;
  color: string;
  courseRating?: number;
  slopeRating?: number;
  totalYardage: number;
  par: number;
  gender?: 'men' | 'women' | 'unisex';
}
```

### Data Transformers

Located at `src/services/api/golfApiTransformers.ts`:

```typescript
// Transform API club to app Course type (for search results)
transformClubToCourse(club: GolfApiClubResponse): Course;

// Transform API course detail to app Course type (full import)
transformCourseDetail(club: GolfApiClubResponse, course: GolfApiCourseDetail): Course;

// Transform API hole to app Hole type
transformHole(apiHole: GolfApiHole): Hole;

// Transform API tee to app TeeBox type
transformTee(apiTee: GolfApiTee): TeeBox;
```

---

## Course Service Layer

Located at `src/services/courses/courseService.ts`:

### Search Flow

```typescript
async function searchCourses(params: CourseSearchParams): Promise<CourseSearchResult> {
  // 1. Always search local cache first (PostgreSQL)
  const cachedResults = await courseCacheService.searchCachedCourses(params);

  // 2. Fetch from GolfAPI.io (with graceful fallback)
  let apiResults: Course[] = [];
  let apiError: Error | null = null;

  try {
    const apiClubs = await golfApiClient.searchClubs(params);
    apiResults = transformClubSearchResults(apiClubs);
  } catch (error) {
    apiError = error;
    // Continue with cache results only
  }

  // 3. Return combined results
  return {
    cached: cachedResults,
    api: apiResults,
    error: apiError,
  };
}
```

### Import Flow

```typescript
async function importCourse(apiCourseId: string, clubId: string): Promise<ImportCourseResult> {
  // 1. Fetch club info
  const club = await golfApiClient.getClub(clubId);

  // 2. Fetch full course details (holes, tees, ratings)
  const courseDetails = await golfApiClient.getCourseDetails(apiCourseId);

  // 3. Transform to app types
  const course = transformCourseDetail(club, courseDetails);

  // 4. Cache in PostgreSQL
  await courseCacheService.cacheCourse(course);

  return {
    course,
    hasHoleData: course.holes.length > 0,
    hasTeeData: course.tees.length > 0,
  };
}
```

---

## Caching Strategy

Located at `src/services/courses/cacheService.ts`:

### Cache Configuration

- **TTL**: 30 days (configurable via `CACHE_TTL_DAYS`)
- **Storage**: PostgreSQL with `last_synced` timestamp
- **Source tracking**: `source` field ('api' or 'manual')

### Cache Operations

```typescript
// Upsert course data
cacheCourse(courseData: Course): Promise<void>;

// Batch cache
cacheCourses(courses: Course[]): Promise<void>;

// Get by internal ID
getCachedCourse(id: string): Promise<Course | null>;

// Get by external API ID
getCachedCourseByApiId(apiId: string): Promise<Course | null>;

// Search cached courses
searchCachedCourses(params: SearchParams): Promise<Course[]>;

// Get stale courses for refresh
getStaleCourses(limit: number): Promise<Course[]>;
```

### Auto-Refresh

```typescript
async function getCourseWithDetails(
  courseId: string,
  forceRefresh: boolean = false
): Promise<Course | null> {
  const cached = await getCachedCourse(courseId);

  // Check if refresh needed (stale or forced)
  const needsRefresh = forceRefresh || isStale(cached);

  if (needsRefresh && cached?.apiId) {
    try {
      return await refreshCourseData(courseId);
    } catch (error) {
      // Return stale cache on API failure
      return cached;
    }
  }

  return cached;
}
```

---

## React Query Integration

Located at `src/hooks/useApiCourses.ts`:

### Available Hooks

```typescript
// Search with cache + optional API
useApiCourseSearch(query: string, state?: string, options?: Options);

// Import full course with details
useImportCourse(): UseMutationResult;

// Get course with auto-refresh
useCourseWithDetails(courseId: string);

// Force refresh course data
useRefreshCourseData(): UseMutationResult;

// Check API availability
useIsApiAvailable(): boolean;

// Combined search (cache + API results)
useCombinedCourseSearch(query: string, state?: string, enableApiSearch?: boolean);
```

### Example Usage

```typescript
function CourseSearchScreen() {
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useCombinedCourseSearch(query, 'VIC', true);
  const importCourse = useImportCourse();

  const handleImport = async (club: GolfApiClubResponse, courseId: string) => {
    await importCourse.mutateAsync({
      apiCourseId: courseId,
      clubId: club.id,
    });
  };

  return (
    // ... UI
  );
}
```

---

## Manual Entry Fallback

If a course is not found via GolfAPI.io, admins can add courses manually:

```typescript
// src/services/courses/manualEntry.ts
async function createManualCourse(courseData: Partial<Course>): Promise<Course> {
  const course: Course = {
    id: generateUuid(),
    source: 'manual',
    apiId: undefined,
    name: courseData.name!,
    state: courseData.state,
    city: courseData.city,
    // ... other fields
    holes: courseData.holes || [],  // Admin enters manually
    tees: courseData.tees || [],    // Admin enters manually
    lastSynced: new Date(),
  };

  await cacheCourse(course);
  return course;
}
```

Manual entry includes fields for:
- Course name and location
- Hole-by-hole data (par, stroke index, yardage)
- Tee boxes with slope/course ratings

---

## Environment Variables

```bash
# .env
EXPO_PUBLIC_GOLFAPI_IO_URL=https://api.golfapi.io/v1
EXPO_PUBLIC_GOLFAPI_IO_KEY=your_golfapi_key_here
```

---

## Error Handling

### Graceful Fallback

```typescript
async function searchCoursesWithFallback(searchTerm: string): Promise<Course[]> {
  try {
    // Try API first
    const apiResults = await golfApiClient.searchClubs({ query: searchTerm });
    return transformClubSearchResults(apiResults);
  } catch (error) {
    console.error('API search failed, falling back to cache:', error);

    // Fallback to cached courses
    return await courseCacheService.searchCachedCourses({
      name: searchTerm,
    });
  }
}
```

### Rate Limit Detection

The API client detects 429 responses and throws `RateLimitError`:

```typescript
if (response.status === 429) {
  throw new RateLimitError('GolfAPI.io rate limit exceeded');
}
```

---

## Daily Handicap Integration

GolfAPI.io provides the data needed for WHS Daily Handicap calculation:

| Required Data | Source |
|---------------|--------|
| Slope Rating | `tee.slopeRating` |
| Course Rating | `tee.courseRating` |
| Par | Sum of `hole.par` values |
| Stroke Index | `hole.strokeIndex` |

When importing a course, ensure tee data is captured for daily handicap calculation.

---

## Related Documentation

- **[DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)** - Course table schema
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview
- **[ALGORITHMS.md](./ALGORITHMS.md)** - Scoring and handicap calculations

---

*Last Updated: February 2026*
