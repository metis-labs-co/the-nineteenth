# Golf Course API Integration

**The Nineteenth** - Mobile Golf Competition App

> Complete guide to integrating with golf course data APIs for Australian courses

---

## Overview

The app integrates with external golf course APIs to provide course information, hole details, and location data. This guide covers the API integration strategy, endpoints, and implementation.

---

## API Strategy

### Hybrid Approach

```typescript
interface CourseDataStrategy {
  primary: 'australia-golf-course-finder-api';  // Basic course info
  fallback: 'manual-entry';                     // Admin can add courses
  enhancement: 'golfapi.io';                    // Future: detailed scorecards
  cache: 'postgresql';                          // Store all data locally
}
```

**Implementation Flow:**
1. Admin searches course via API
2. Import basic data + allow manual entry of holes/pars
3. Store in PostgreSQL (we own the data)
4. Update from API periodically or on-demand

---

## Primary API: Australia Golf Course Finder (Zyla Labs)

### Details

- **Provider**: Zyla Labs
- **Coverage**: Australian golf courses
- **Cost**: Tiered pricing (~$10-50/month)
- **Documentation**: https://zylalabs.com/api/3176

### Features

✅ Search by course name or GPS coordinates
✅ Filter by state/province
✅ Course location and contact info
✅ Basic course details

❌ No hole-by-hole data (add manually)
❌ No pars or stroke indexes (add manually)

---

## API Endpoints

### 1. Search Courses by Coordinates

**Endpoint:**
```
GET /golf-courses-by-coordinates
```

**Parameters:**
| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `latitude` | number | Yes      | Latitude coordinate |
| `longitude`| number | Yes      | Longitude coordinate |
| `radius`   | number | No       | Search radius in km (default: 20) |

**Example Request:**
```typescript
const response = await fetch(
  'https://zylalabs.com/api/3176/golf-courses-by-coordinates?' +
  'radius=20&latitude=-37.8136&longitude=144.9631',
  {
    headers: {
      'Authorization': `Bearer ${process.env.AUSTRALIA_GOLF_API_KEY}`,
    },
  }
);

const courses = await response.json();
```

**Response:**
```json
{
  "courses": [
    {
      "id": "12345",
      "name": "Royal Melbourne Golf Club",
      "address": "Cheltenham Rd, Black Rock VIC 3193",
      "city": "Black Rock",
      "state": "VIC",
      "phone": "+61 3 9598 6755",
      "email": "info@royalmelbourne.com.au",
      "website": "https://www.royalmelbourne.com.au",
      "latitude": -37.9847,
      "longitude": 145.0175,
      "distance": 15.2
    }
  ]
}
```

---

### 2. Search Courses by State

**Endpoint:**
```
GET /golf-clubs-by-state-or-province
```

**Parameters:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `state`   | string | Yes      | Australian state code (NSW, VIC, QLD, SA, WA, TAS, NT, ACT) |

**Example Request:**
```typescript
const response = await fetch(
  'https://zylalabs.com/api/3176/golf-clubs-by-state-or-province?state=Victoria',
  {
    headers: {
      'Authorization': `Bearer ${process.env.AUSTRALIA_GOLF_API_KEY}`,
    },
  }
);

const courses = await response.json();
```

---

### 3. Get Course by Name

**Endpoint:**
```
GET /course-data-by-course-name
```

**Parameters:**
| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `name`    | string | Yes      | Course name (partial match supported) |

**Example Request:**
```typescript
const response = await fetch(
  'https://zylalabs.com/api/3176/course-data-by-course-name?' +
  'name=Royal Melbourne',
  {
    headers: {
      'Authorization': `Bearer ${process.env.AUSTRALIA_GOLF_API_KEY}`,
    },
  }
);

const course = await response.json();
```

---

## Implementation

### API Client Setup

```typescript
// src/services/api/golfCoursesClient.ts
import axios from 'axios';

const golfCoursesClient = axios.create({
  baseURL: process.env.AUSTRALIA_GOLF_API_URL || 'https://zylalabs.com/api/3176',
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${process.env.AUSTRALIA_GOLF_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Error handling
golfCoursesClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Golf Course API Error:', error);
    throw new Error('Failed to fetch course data');
  }
);

export default golfCoursesClient;
```

### Search Courses

```typescript
// src/services/api/courses.ts
import golfCoursesClient from './golfCoursesClient';
import { Course } from '@types/index';

export async function searchCoursesByLocation(
  latitude: number,
  longitude: number,
  radius: number = 20
): Promise<Course[]> {
  const response = await golfCoursesClient.get('/golf-courses-by-coordinates', {
    params: { latitude, longitude, radius },
  });

  // Transform API response to our Course type
  return response.data.courses.map((apiCourse: any) => ({
    id: apiCourse.id,
    source: 'api' as const,
    apiId: apiCourse.id,
    name: apiCourse.name,
    state: parseState(apiCourse.state),
    city: apiCourse.city,
    address: apiCourse.address,
    phone: apiCourse.phone,
    email: apiCourse.email,
    website: apiCourse.website,
    latitude: apiCourse.latitude,
    longitude: apiCourse.longitude,
    holes: [], // Not provided by API - must be added manually
    lastSynced: new Date(),
  }));
}

export async function searchCoursesByState(
  state: string
): Promise<Course[]> {
  const response = await golfCoursesClient.get('/golf-clubs-by-state-or-province', {
    params: { state },
  });

  return response.data.courses.map((apiCourse: any) => ({
    // ... same transformation
  }));
}

export async function searchCoursesByName(
  name: string
): Promise<Course[]> {
  const response = await golfCoursesClient.get('/course-data-by-course-name', {
    params: { name },
  });

  return Array.isArray(response.data)
    ? response.data.map((apiCourse: any) => ({ /* ... */ }))
    : [response.data].map((apiCourse: any) => ({ /* ... */ }));
}

// Helper to parse state abbreviations
function parseState(state: string): AustralianState {
  const stateMap: Record<string, AustralianState> = {
    'Victoria': 'VIC',
    'New South Wales': 'NSW',
    'Queensland': 'QLD',
    'South Australia': 'SA',
    'Western Australia': 'WA',
    'Tasmania': 'TAS',
    'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT',
  };

  return stateMap[state] || state as AustralianState;
}
```

---

## React Query Integration

### Custom Hooks

```typescript
// src/hooks/useCourses.ts
import { useQuery } from '@tanstack/react-query';
import { searchCoursesByLocation, searchCoursesByName } from '@services/api/courses';

export function useNearbyC ourses(
  latitude: number,
  longitude: number,
  radius?: number
) {
  return useQuery({
    queryKey: ['courses', 'nearby', latitude, longitude, radius],
    queryFn: () => searchCoursesByLocation(latitude, longitude, radius),
    enabled: !!latitude && !!longitude,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useCourseSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['courses', 'search', searchTerm],
    queryFn: () => searchCoursesByName(searchTerm),
    enabled: searchTerm.length >= 3,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
```

---

## Caching Strategy

### Store in Supabase

After fetching from API, cache in PostgreSQL:

```typescript
// src/services/courses/cacheService.ts
import { supabase } from '@services/supabase';
import { Course } from '@types/index';

export async function cacheCourse(course: Course): Promise<void> {
  await supabase.from('courses').upsert({
    id: course.id,
    source: course.source,
    api_id: course.apiId,
    name: course.name,
    state: course.state,
    city: course.city,
    address: course.address,
    phone: course.phone,
    email: course.email,
    website: course.website,
    location: `POINT(${course.longitude} ${course.latitude})`,
    holes: course.holes,
    last_synced: new Date().toISOString(),
  });
}

export async function getCachedCourse(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error || !data) return null;

  return transformDbCourseToType(data);
}
```

### Check Cache First

```typescript
// src/services/courses/index.ts
export async function getCourseById(courseId: string): Promise<Course | null> {
  // 1. Check cache first
  const cached = await getCachedCourse(courseId);

  if (cached) {
    // If cached within 30 days, use it
    const cacheAge = Date.now() - new Date(cached.lastSynced).getTime();
    if (cacheAge < 1000 * 60 * 60 * 24 * 30) {
      return cached;
    }
  }

  // 2. Otherwise fetch from API
  try {
    const course = await fetchCourseFromAPI(courseId);
    await cacheCourse(course);
    return course;
  } catch (error) {
    // 3. Fallback to stale cache if API fails
    return cached;
  }
}
```

---

## Manual Entry Fallback

If course not found in API, admin can add manually:

```typescript
// src/services/courses/manualEntry.ts
export async function createManualCourse(
  courseData: Partial<Course>
): Promise<Course> {
  const course: Course = {
    id: generateUuid(),
    source: 'manual',
    apiId: undefined,
    name: courseData.name!,
    state: courseData.state,
    city: courseData.city,
    address: courseData.address,
    phone: courseData.phone,
    email: courseData.email,
    website: courseData.website,
    latitude: courseData.latitude || 0,
    longitude: courseData.longitude || 0,
    holes: courseData.holes || [],
    lastSynced: new Date(),
  };

  // Save to database
  await cacheCourse(course);

  return course;
}
```

---

## Secondary API: GolfAPI.io (Future Enhancement)

### Details

- **Provider**: GolfAPI.io
- **Coverage**: 42,000+ courses globally (includes Australia)
- **Cost**: Contact for pricing
- **Documentation**: https://www.golfapi.io/

### Features

✅ Complete scorecard data (hole-by-hole)
✅ Pars and stroke indexes
✅ Multiple tees with distances
✅ Slope and course ratings
✅ GPS coordinates

### When to Use

Use GolfAPI.io when you need:
- Detailed hole-by-hole data for handicap calculations
- Multiple tee box options
- Official slope and course ratings
- More comprehensive course coverage

### Implementation (Phase 2+)

```typescript
// Future: Hybrid API approach
export async function getCompleteCourseData(
  courseName: string
): Promise<Course> {
  // 1. Get basic info from Australia Golf API
  const basicInfo = await searchCoursesByName(courseName);

  // 2. Enhance with hole data from GolfAPI.io
  const detailedData = await fetchFromGolfAPI(courseName);

  // 3. Merge and return
  return mergeCourseData(basicInfo[0], detailedData);
}
```

---

## Environment Variables

```bash
# .env
AUSTRALIA_GOLF_API_KEY=your_zyla_labs_key_here
AUSTRALIA_GOLF_API_URL=https://zylalabs.com/api/3176

# Future
GOLFAPI_IO_KEY=your_golfapi_key_here
GOLFAPI_IO_URL=https://api.golfapi.io/v1
```

---

## Error Handling

### Handle API Failures Gracefully

```typescript
export async function searchCoursesWithFallback(
  searchTerm: string
): Promise<Course[]> {
  try {
    // Try API first
    return await searchCoursesByName(searchTerm);
  } catch (error) {
    console.error('API search failed, falling back to cache:', error);

    // Fallback to cached courses
    const { data } = await supabase
      .from('courses')
      .select('*')
      .ilike('name', `%${searchTerm}%`);

    return data || [];
  }
}
```

### Rate Limiting

```typescript
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'hour',
});

export async function searchWithRateLimit(
  searchTerm: string
): Promise<Course[]> {
  await limiter.removeTokens(1);
  return searchCoursesByName(searchTerm);
}
```

---

## Testing

### Mock API Responses

```typescript
// src/services/api/__mocks__/golfCoursesClient.ts
export default {
  get: jest.fn((url: string, config: any) => {
    if (url.includes('golf-courses-by-coordinates')) {
      return Promise.resolve({
        data: {
          courses: [
            {
              id: 'mock-1',
              name: 'Mock Golf Club',
              state: 'VIC',
              latitude: -37.8136,
              longitude: 144.9631,
            },
          ],
        },
      });
    }
  }),
};
```

---

## Related Documentation

- **[DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)** - Course table schema
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview
- **[PROJECT_SETUP.md](../../PROJECT_SETUP.md)** - Environment setup

---

*Last Updated: January 2025*
