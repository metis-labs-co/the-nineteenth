/**
 * ClubCard Stories
 *
 * Storybook stories for the hybrid club/course display component.
 * Shows various configurations:
 * - Single-course clubs
 * - Multi-course clubs (expandable)
 * - Favorite states
 * - Selection mode
 * - Loading states
 * - Edge cases
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ClubCard, VenueCard } from './ClubCard';
import type { ClubCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club, Hole } from '@/types/database.types';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof ClubCard> = {
  title: 'Courses/ClubCard',
  component: ClubCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Hybrid display component for clubs and courses. Shows single-course clubs directly, and multi-course clubs as expandable cards with nested courses.',
      },
    },
  },
  argTypes: {
    onCourseSelect: {
      action: 'course selected',
      description: 'Callback when a course is selected',
    },
    onClubPress: {
      action: 'club pressed',
      description: 'Callback when club info button is pressed (multi-course only)',
    },
    onToggleFavorite: {
      action: 'favorite toggled',
      description: 'Callback when favorite button is pressed',
    },
    showFavoriteButton: {
      control: 'boolean',
      description: 'Whether to show the favorite toggle button',
    },
    selectionMode: {
      control: 'boolean',
      description: 'Selection mode shows chevron instead of favorite button',
    },
    isTogglingFavorite: {
      control: 'text',
      description: 'Course ID currently being toggled (shows loading)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClubCard>;

// =====================================================
// FIXTURES
// =====================================================

const createHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
  yardages: { blue: 400, white: 380, red: 350 },
});

const createClub = (overrides: Partial<Club> = {}): Club => ({
  id: 'club-1',
  source: 'manual',
  golfapi_club_id: null,
  name: 'Royal Melbourne Golf Club',
  state: 'VIC',
  city: 'Black Rock',
  address: '359 Cheltenham Road',
  postal_code: null,
  country: 'Australia',
  continent: null,
  phone: null,
  email: null,
  website: null,
  latitude: null,
  longitude: null,
  location: null,
  total_holes: 36,
  last_synced: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createCourse = (overrides: Partial<CourseWithFavoriteStatus> = {}): CourseWithFavoriteStatus => ({
  id: 'course-1',
  club_id: 'club-1',
  golfapi_course_id: null,
  golfapi_long_course_id: null,
  name: 'West Course',
  description: 'Championship course designed by Alister MacKenzie',
  num_holes: 18,
  measure_unit: null,
  holes: Array.from({ length: 18 }, (_, i) => createHole(i + 1)),
  holes_women: null,
  match_play_indexes: null,
  tees: [
    { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
    { name: 'Members', color: 'white', totalYardage: 6400, courseRating: 72.0, slopeRating: 135 },
  ],
  tees_migrated: null,
  slope_rating: 145,
  course_rating: 74.5,
  golfapi_updated_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_favorite: false,
  ...overrides,
});

// Helper to create display items with both club and venue (backwards compatibility)
const createDisplayItem = (
  type: 'single-course' | 'multi-course-club',
  clubOverrides: Partial<Club>,
  courses: CourseWithFavoriteStatus[]
): ClubCourseDisplayItem => {
  const club = createClub(clubOverrides);
  return { type, club, venue: club, courses };
};

const singleCourseItem: ClubCourseDisplayItem = createDisplayItem(
  'single-course',
  { name: 'Kingston Heath Golf Club', city: 'Cheltenham' },
  [createCourse({ name: 'Kingston Heath', slope_rating: 140, is_favorite: false })]
);

const singleCourseFavoriteItem: ClubCourseDisplayItem = createDisplayItem(
  'single-course',
  { name: 'Kingston Heath Golf Club', city: 'Cheltenham' },
  [createCourse({ name: 'Kingston Heath', slope_rating: 140, is_favorite: true })]
);

const multiCourseItem: ClubCourseDisplayItem = createDisplayItem(
  'multi-course-club',
  {},
  [
    createCourse({ id: 'west', name: 'West Course', description: 'Championship course designed by Alister MacKenzie', is_favorite: true }),
    createCourse({ id: 'east', name: 'East Course', description: 'Composite course', slope_rating: 135, is_favorite: false }),
  ]
);

const multiCourseClubWith3Courses: ClubCourseDisplayItem = createDisplayItem(
  'multi-course-club',
  { name: 'Sandbelt Golf Resort', total_holes: 54, city: 'Melbourne' },
  [
    createCourse({ id: 'links', name: 'Links Course', description: 'Scottish-style links', slope_rating: 130 }),
    createCourse({ id: 'forest', name: 'Forest Course', description: 'Tree-lined parkland', slope_rating: 135, is_favorite: true }),
    createCourse({ id: 'lakes', name: 'Lakes Course', description: 'Water features throughout', slope_rating: 140 }),
  ]
);

// =====================================================
// STORIES: SINGLE-COURSE VENUES
// =====================================================

/**
 * Default single-course venue - shows course directly
 */
export const SingleCourse: Story = {
  args: {
    item: singleCourseItem,
    showFavoriteButton: true,
    selectionMode: false,
  },
};

/**
 * Single-course club with favorite status
 */
export const SingleCourseFavorite: Story = {
  args: {
    item: singleCourseFavoriteItem,
    showFavoriteButton: true,
    selectionMode: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the filled star icon when course is marked as favorite.',
      },
    },
  },
};

/**
 * Single-course club in selection mode
 */
export const SingleCourseSelectionMode: Story = {
  args: {
    item: singleCourseItem,
    showFavoriteButton: true,
    selectionMode: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Selection mode shows chevron-right instead of favorite button.',
      },
    },
  },
};

/**
 * Single-course club without favorite button
 */
export const SingleCourseNoFavorite: Story = {
  args: {
    item: singleCourseItem,
    showFavoriteButton: false,
    selectionMode: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hides the favorite button when showFavoriteButton is false.',
      },
    },
  },
};

/**
 * Single-course with loading favorite toggle
 */
export const SingleCourseToggling: Story = {
  args: {
    item: singleCourseItem,
    showFavoriteButton: true,
    selectionMode: false,
    isTogglingFavorite: 'course-1',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows loading indicator while favorite status is being toggled.',
      },
    },
  },
};

// =====================================================
// STORIES: MULTI-COURSE VENUES
// =====================================================

/**
 * Multi-course club - collapsed by default
 */
export const MultiCourseCollapsed: Story = {
  args: {
    item: multiCourseItem,
    showFavoriteButton: true,
    selectionMode: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-course clubs show as expandable cards. Click the header to expand.',
      },
    },
  },
};

/**
 * Multi-course club with 3 courses
 */
export const MultiCourseThreeCourses: Story = {
  args: {
    item: multiCourseClubWith3Courses,
    showFavoriteButton: true,
    selectionMode: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows course count badge and total holes. Click to expand and see all courses.',
      },
    },
  },
};

/**
 * Multi-course club in selection mode
 */
export const MultiCourseSelectionMode: Story = {
  args: {
    item: multiCourseItem,
    showFavoriteButton: true,
    selectionMode: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Selection mode for multi-course venues. Nested courses show chevrons.',
      },
    },
  },
};

/**
 * Multi-course club without venue press handler (no info button)
 */
export const MultiCourseNoInfoButton: Story = {
  args: {
    item: multiCourseItem,
    showFavoriteButton: true,
    selectionMode: false,
    onClubPress: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Without onClubPress callback, the info button is hidden.',
      },
    },
  },
};

// =====================================================
// STORIES: INTERACTIVE DEMOS
// =====================================================

/**
 * Interactive single-course with favorite toggle
 */
export const InteractiveSingleCourse: Story = {
  render: () => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const item: ClubCourseDisplayItem = {
      ...singleCourseItem,
      courses: [{ ...singleCourseItem.courses[0], is_favorite: isFavorite }],
    };

    const handleToggle = () => {
      setIsToggling(true);
      setTimeout(() => {
        setIsFavorite(!isFavorite);
        setIsToggling(false);
      }, 500);
    };

    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          Interactive Favorite Toggle
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Tap the star to toggle favorite status
        </Text>
        <ClubCard
          item={item}
          showFavoriteButton={true}
          onCourseSelect={(course, _club) => console.log('Selected:', course.name)}
          onToggleFavorite={handleToggle}
          isTogglingFavorite={isToggling ? 'course-1' : null}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo with working favorite toggle including loading state.',
      },
    },
  },
};

/**
 * Interactive multi-course with expand/collapse
 */
export const InteractiveMultiCourse: Story = {
  render: () => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set(['west']));
    const [toggling, setToggling] = useState<string | null>(null);

    const item: ClubCourseDisplayItem = {
      ...multiCourseItem,
      courses: multiCourseItem.courses.map((course) => ({
        ...course,
        is_favorite: favorites.has(course.id),
      })),
    };

    const handleToggle = (course: CourseWithFavoriteStatus) => {
      setToggling(course.id);
      setTimeout(() => {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(course.id)) {
            next.delete(course.id);
          } else {
            next.add(course.id);
          }
          return next;
        });
        setToggling(null);
      }, 500);
    };

    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          Interactive Multi-Course Venue
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Tap header to expand, star icons to favorite
        </Text>
        <ClubCard
          item={item}
          showFavoriteButton={true}
          onCourseSelect={(course, club) => console.log('Selected:', course.name, 'at', club.name)}
          onClubPress={(club) => console.log('Club info:', club.name)}
          onToggleFavorite={handleToggle}
          isTogglingFavorite={toggling}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive multi-course venue with expandable courses and favorite toggles.',
      },
    },
  },
};

// =====================================================
// STORIES: VENUE VARIATIONS
// =====================================================

/**
 * Club without city
 */
export const ClubWithoutCity: Story = {
  args: {
    item: createDisplayItem('single-course', { city: undefined }, [createCourse()]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows only state when city is not available.',
      },
    },
  },
};

/**
 * Club without state
 */
export const ClubWithoutState: Story = {
  args: {
    item: createDisplayItem('single-course', { state: undefined }, [createCourse()]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows only city when state is not available.',
      },
    },
  },
};

/**
 * Club without location info
 */
export const ClubWithoutLocation: Story = {
  args: {
    item: createDisplayItem('single-course', { city: undefined, state: undefined }, [createCourse()]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Club with no location information.',
      },
    },
  },
};

// =====================================================
// STORIES: COURSE VARIATIONS
// =====================================================

/**
 * Course without hole data
 */
export const CourseWithoutHoles: Story = {
  args: {
    item: createDisplayItem('single-course', { name: 'New Course Club' }, [createCourse({ name: 'New Course', holes: [] })]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without hole data - shows only slope rating if available.',
      },
    },
  },
};

/**
 * Course without slope rating
 */
export const CourseWithoutRating: Story = {
  args: {
    item: createDisplayItem('single-course', { name: 'Unrated Golf Club' }, [createCourse({ name: 'Main Course', slope_rating: null })]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without slope rating - shows only hole count.',
      },
    },
  },
};

/**
 * Course without any metadata
 */
export const CourseWithoutMetadata: Story = {
  args: {
    item: createDisplayItem('single-course', { name: 'Minimal Golf Club' }, [createCourse({ name: 'Minimal Course', holes: [], slope_rating: null })]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without holes or rating - clean minimal display.',
      },
    },
  },
};

/**
 * 9-hole course
 */
export const NineHoleCourse: Story = {
  args: {
    item: createDisplayItem('single-course', { name: 'Executive Golf Club', total_holes: 9 }, [
      createCourse({
        name: 'Executive Course',
        holes: Array.from({ length: 9 }, (_, i) => createHole(i + 1)),
        slope_rating: 110,
      }),
    ]),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows "9 holes" for shorter courses.',
      },
    },
  },
};

// =====================================================
// STORIES: LIST DEMO
// =====================================================

/**
 * List of mixed club types
 */
export const ClubList: Story = {
  render: () => {
    const items: ClubCourseDisplayItem[] = [
      singleCourseItem,
      multiCourseItem,
      createDisplayItem('single-course', { id: 'v3', name: 'Victoria Golf Club', city: 'Cheltenham' }, [createCourse({ id: 'c3', name: 'Victoria GC', slope_rating: 138, is_favorite: true })]),
      multiCourseClubWith3Courses,
      createDisplayItem('single-course', { id: 'v4', name: 'Metropolitan Golf Club', city: 'Oakleigh' }, [createCourse({ id: 'c4', name: 'Metropolitan', slope_rating: 142 })]),
    ];

    return (
      <ScrollView style={styles.scrollContainer}>
        <Text variant="titleMedium" style={styles.title}>
          Club List Demo
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Shows how ClubCards look in a list with mixed types
        </Text>
        {items.map((item) => (
          <View key={item.club.id} style={styles.cardWrapper}>
            <ClubCard
              item={item}
              showFavoriteButton={true}
              onCourseSelect={(course, _club) => console.log('Selected:', course.name)}
              onClubPress={(club) => console.log('Club:', club.name)}
              onToggleFavorite={(course) => console.log('Toggle:', course.name)}
            />
          </View>
        ))}
      </ScrollView>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how ClubCards appear in a scrollable list with mixed single and multi-course venues.',
      },
    },
  },
};

/**
 * Selection mode list
 */
export const SelectionModeList: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);

    const items: ClubCourseDisplayItem[] = [
      singleCourseItem,
      multiCourseItem,
      createDisplayItem('single-course', { id: 'v3', name: 'Victoria Golf Club', city: 'Cheltenham' }, [createCourse({ id: 'c3', name: 'Victoria GC', slope_rating: 138 })]),
    ];

    return (
      <ScrollView style={styles.scrollContainer}>
        <Text variant="titleMedium" style={styles.title}>
          Course Selection
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Select a course for your round
        </Text>
        {selected && (
          <View style={styles.selectedBanner}>
            <Text variant="labelMedium">Selected: {selected}</Text>
          </View>
        )}
        {items.map((item) => (
          <View key={item.club.id} style={styles.cardWrapper}>
            <ClubCard
              item={item}
              showFavoriteButton={true}
              selectionMode={true}
              onCourseSelect={(course) => setSelected(course.name)}
              onClubPress={(club) => console.log('Club:', club.name)}
            />
          </View>
        ))}
      </ScrollView>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Course selection workflow. Tap a course to select it.',
      },
    },
  },
};

// =====================================================
// STORIES: EDGE CASES
// =====================================================

/**
 * Very long names
 */
export const LongNames: Story = {
  args: {
    item: createDisplayItem(
      'single-course',
      { name: 'The Grand Royal Imperial Golf Resort and Country Club of Victoria', city: 'Mount Macedon Regional Park Area' },
      [createCourse({ name: 'The Championship Links Course at the Grand Royal Imperial Golf Resort', slope_rating: 155 })]
    ),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests text truncation with very long club and course names.',
      },
    },
  },
};

/**
 * Multi-course with long names
 */
export const MultiCourseLongNames: Story = {
  args: {
    item: createDisplayItem(
      'multi-course-club',
      { name: 'The Magnificent Golf and Country Club Resort Complex', total_holes: 72 },
      [
        createCourse({ id: 'c1', name: 'The Championship Tournament Course', description: 'Host of multiple international championships and professional events' }),
        createCourse({ id: 'c2', name: 'The Members Executive Par-3 Course', description: 'Perfect for a quick round after work or practice' }),
        createCourse({ id: 'c3', name: 'The Lakeside Resort Links Course', description: 'Beautiful water views and challenging wind conditions' }),
        createCourse({ id: 'c4', name: 'The Forest Walking Track Course', description: 'Scenic tree-lined fairways through native bushland' }),
      ]
    ),
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-course club with 4 courses and long names.',
      },
    },
  },
};

// =====================================================
// STORIES: DARK MODE
// =====================================================

/**
 * Single course dark mode
 */
export const SingleCourseDarkMode: Story = {
  args: {
    item: singleCourseItem,
    showFavoriteButton: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Single-course club in dark mode.',
      },
    },
  },
};

/**
 * Multi-course dark mode
 */
export const MultiCourseDarkMode: Story = {
  args: {
    item: multiCourseItem,
    showFavoriteButton: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Multi-course club in dark mode.',
      },
    },
  },
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  selectedBanner: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
});
