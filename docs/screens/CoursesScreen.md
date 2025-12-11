# CoursesScreen

**File:** `src/screens/courses/CoursesScreen.tsx`

## Overview

Browse and manage golf courses. Features search functionality, Australian state filtering, favorites management, manual course creation, and API search for importing courses from external databases.

## Features

- **Course List**: Cards with name, location, holes, and source badge
- **Search**: Filter courses by name
- **State Filters**: Filter by Australian state (NSW, VIC, QLD, etc.)
- **Favorites Toggle**: Show only favorite courses
- **Add Course**: Manual course creation modal
- **API Search**: Import courses from external database
- **Favorite/Unfavorite**: Star/unstar courses
- **Pull-to-Refresh**: Refresh course list

## Navigation

No outbound navigation (courses are selected via other screens).

## Data Dependencies

### Hooks Used
- `useCourses()` - Fetch all courses
- `useSearchCourses(query, state)` - Search with filters
- `useFavoriteCourses()` - Fetch user's favorites
- `useAddFavorite()` - Add course to favorites
- `useRemoveFavorite()` - Remove from favorites
- `useCreateCourse()` - Create new course
- `useIsApiAvailable()` - Check if external API is configured

### Data Types
```typescript
interface CourseWithFavorite {
  id: string;
  name: string;
  city?: string;
  state?: AustralianState;
  source: 'api' | 'manual';
  holes?: Hole[];
  is_favorite: boolean;
}
```

## Component Structure

```
CoursesScreen
├── Header
│   ├── Title ("Courses")
│   └── HeaderActions
│       ├── ApiSearchButton (conditional)
│       └── AddCourseButton
├── SearchSection
│   └── SearchInputWrapper (magnify + input + clear)
├── FilterSection
│   ├── FilterScrollView
│   │   ├── FavoritesChip
│   │   └── StateChips (8 states)
│   └── ClearFiltersButton (conditional)
└── Content
    ├── LoadingContainer (conditional)
    ├── EmptyState (conditional)
    └── CourseList (FlatList)
        └── CourseCards
├── AddCourseModal
└── ApiSearchModal
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `searchQuery` | `string` | Course name search |
| `selectedState` | `AustralianState \| undefined` | State filter |
| `showFavoritesOnly` | `boolean` | Toggle favorites view |
| `showAddModal` | `boolean` | Add course modal |
| `showApiSearchModal` | `boolean` | API search modal |
| `togglingFavoriteId` | `string \| null` | Currently toggling course |

## Australian States

```typescript
const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
];
```

## Internal Components

### CourseCard
Memoized course display card:
- Golf icon in primary-lighter container
- Course name with source badge (API/Manual)
- Location (city, state)
- Hole count if available
- Star/unfavorite button

### AddCourseModal
Modal for manual course creation:
- Course name (required, min 2 chars)
- City (optional)
- State (optional, chip selection)
- Info box about adding holes later
- "Add Course" button

## Course Display Logic

```typescript
const displayedCourses = useMemo(() => {
  if (showFavoritesOnly) return favoriteCourses;
  if (isSearchActive) return searchResults;
  return allCourses;
}, [...]);
```

Where `isSearchActive` = `searchQuery.length >= 2 || !!selectedState`

## Source Badge Colors

| Source | Background | Text |
|--------|------------|------|
| `api` | primaryLighter | primary |
| `manual` | gray100 | gray500 |

## Favorite Toggle

```typescript
const handleToggleFavorite = async (course) => {
  setTogglingFavoriteId(course.id);
  try {
    if (course.is_favorite) {
      await removeFavorite.mutateAsync(course.id);
    } else {
      await addFavorite.mutateAsync(course.id);
    }
  } finally {
    setTogglingFavoriteId(null);
  }
};
```

## Empty States

| Condition | Title | Message | Action |
|-----------|-------|---------|--------|
| Favorites only, none | "No favorite courses" | "Star courses to add them to your favorites" | - |
| Search active, no results | "No courses found" | "No courses match [query]. Try searching online..." | "Search Online" |
| No courses | "No courses yet" | "Search the online database or add manually..." | "Add Course" |

## API Search Feature

Conditionally shown when `isApiAvailable`:
- Cloud search icon in header
- Opens `ApiSearchModal` component
- Imports courses from external database

## Loading & Error States

### Loading
- Centered activity indicator

### Error
- Header shown
- `ErrorState` component with retry button
- Title: "Couldn't load courses"

### Searching
- Activity indicator with "Searching..." text

## UI Components Used

- `View`, `ScrollView`, `RefreshControl`, `Pressable`, `TextInput`, `FlatList`, `ActivityIndicator`, `Modal`, `KeyboardAvoidingView` - React Native core
- `Text`, `Icon`, `Avatar`, `Chip`, `Button` - React Native Paper
- `useSafeAreaInsets` - Safe area context
- `EmptyState`, `ErrorState` - Custom components
- `ApiSearchModal` - Custom modal component

## Styling Highlights

- White header with border bottom
- Circular add button with primary-lighter background
- Search input with gray50 background
- Horizontal scrolling filter chips
- Selected chips invert to primary color
- Course cards with shadow and rounded corners
- Source badges inline with course name
- Star icon: outline gray when not favorite, filled warning when favorite
- Active favorite button has light warning background

## Accessibility

- Add button with accessibility label
- API search button with label
- Search input with label
- Filter chips with roles and states
- Clear filters button with label
- Favorite buttons with descriptive labels
- Close button in modal with label
- State chips in modal with selection states
