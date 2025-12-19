/**
 * VenueCard Stories
 *
 * Storybook stories for the hybrid venue/course display component.
 * Shows various configurations:
 * - Single-course venues
 * - Multi-course venues (expandable)
 * - Favorite states
 * - Selection mode
 * - Loading states
 * - Edge cases
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { VenueCard } from './VenueCard';
import type { VenueCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useVenues';
import type { Venue, Hole } from '@/types/database.types';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof VenueCard> = {
  title: 'Courses/VenueCard',
  component: VenueCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Hybrid display component for venues and courses. Shows single-course venues directly, and multi-course venues as expandable cards with nested courses.',
      },
    },
  },
  argTypes: {
    onCourseSelect: {
      action: 'course selected',
      description: 'Callback when a course is selected',
    },
    onVenuePress: {
      action: 'venue pressed',
      description: 'Callback when venue info button is pressed (multi-course only)',
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
type Story = StoryObj<typeof VenueCard>;

// =====================================================
// FIXTURES
// =====================================================

const createHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
  yardages: { blue: 400, white: 380, red: 350 },
});

const createVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 'venue-1',
  source: 'manual',
  api_id: null,
  name: 'Royal Melbourne Golf Club',
  state: 'VIC',
  city: 'Black Rock',
  address: '359 Cheltenham Road',
  phone: null,
  email: null,
  website: null,
  location: null,
  total_holes: 36,
  last_synced: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createCourse = (overrides: Partial<CourseWithFavoriteStatus> = {}): CourseWithFavoriteStatus => ({
  id: 'course-1',
  venue_id: 'venue-1',
  name: 'West Course',
  description: 'Championship course designed by Alister MacKenzie',
  holes: Array.from({ length: 18 }, (_, i) => createHole(i + 1)),
  tees: [
    { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
    { name: 'Members', color: 'white', totalYardage: 6400, courseRating: 72.0, slopeRating: 135 },
  ],
  slope_rating: 145,
  course_rating: 74.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_favorite: false,
  ...overrides,
});

const singleCourseItem: VenueCourseDisplayItem = {
  type: 'single-course',
  venue: createVenue({ name: 'Kingston Heath Golf Club', city: 'Cheltenham' }),
  courses: [createCourse({ name: 'Kingston Heath', slope_rating: 140, is_favorite: false })],
};

const singleCourseFavoriteItem: VenueCourseDisplayItem = {
  type: 'single-course',
  venue: createVenue({ name: 'Kingston Heath Golf Club', city: 'Cheltenham' }),
  courses: [createCourse({ name: 'Kingston Heath', slope_rating: 140, is_favorite: true })],
};

const multiCourseItem: VenueCourseDisplayItem = {
  type: 'multi-course-venue',
  venue: createVenue(),
  courses: [
    createCourse({ id: 'west', name: 'West Course', description: 'Championship course designed by Alister MacKenzie', is_favorite: true }),
    createCourse({ id: 'east', name: 'East Course', description: 'Composite course', slope_rating: 135, is_favorite: false }),
  ],
};

const multiCourseVenueWith3Courses: VenueCourseDisplayItem = {
  type: 'multi-course-venue',
  venue: createVenue({ name: 'Sandbelt Golf Resort', total_holes: 54, city: 'Melbourne' }),
  courses: [
    createCourse({ id: 'links', name: 'Links Course', description: 'Scottish-style links', slope_rating: 130 }),
    createCourse({ id: 'forest', name: 'Forest Course', description: 'Tree-lined parkland', slope_rating: 135, is_favorite: true }),
    createCourse({ id: 'lakes', name: 'Lakes Course', description: 'Water features throughout', slope_rating: 140 }),
  ],
};

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
 * Single-course venue with favorite status
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
 * Single-course venue in selection mode
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
 * Single-course venue without favorite button
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
 * Multi-course venue - collapsed by default
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
        story: 'Multi-course venues show as expandable cards. Click the header to expand.',
      },
    },
  },
};

/**
 * Multi-course venue with 3 courses
 */
export const MultiCourseThreeCourses: Story = {
  args: {
    item: multiCourseVenueWith3Courses,
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
 * Multi-course venue in selection mode
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
 * Multi-course venue without venue press handler (no info button)
 */
export const MultiCourseNoInfoButton: Story = {
  args: {
    item: multiCourseItem,
    showFavoriteButton: true,
    selectionMode: false,
    onVenuePress: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Without onVenuePress callback, the info button is hidden.',
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

    const item: VenueCourseDisplayItem = {
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
        <VenueCard
          item={item}
          showFavoriteButton={true}
          onCourseSelect={(course, venue) => console.log('Selected:', course.name)}
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

    const item: VenueCourseDisplayItem = {
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
        <VenueCard
          item={item}
          showFavoriteButton={true}
          onCourseSelect={(course, venue) => console.log('Selected:', course.name, 'at', venue.name)}
          onVenuePress={(venue) => console.log('Venue info:', venue.name)}
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
 * Venue without city
 */
export const VenueWithoutCity: Story = {
  args: {
    item: {
      type: 'single-course',
      venue: createVenue({ city: undefined }),
      courses: [createCourse()],
    },
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
 * Venue without state
 */
export const VenueWithoutState: Story = {
  args: {
    item: {
      type: 'single-course',
      venue: createVenue({ state: undefined }),
      courses: [createCourse()],
    },
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
 * Venue without location info
 */
export const VenueWithoutLocation: Story = {
  args: {
    item: {
      type: 'single-course',
      venue: createVenue({ city: undefined, state: undefined }),
      courses: [createCourse()],
    },
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Venue with no location information.',
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
    item: {
      type: 'single-course',
      venue: createVenue({ name: 'New Course Club' }),
      courses: [createCourse({ name: 'New Course', holes: [] })],
    },
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
    item: {
      type: 'single-course',
      venue: createVenue({ name: 'Unrated Golf Club' }),
      courses: [createCourse({ name: 'Main Course', slope_rating: null })],
    },
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
    item: {
      type: 'single-course',
      venue: createVenue({ name: 'Minimal Golf Club' }),
      courses: [createCourse({ name: 'Minimal Course', holes: [], slope_rating: null })],
    },
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
    item: {
      type: 'single-course',
      venue: createVenue({ name: 'Executive Golf Club', total_holes: 9 }),
      courses: [
        createCourse({
          name: 'Executive Course',
          holes: Array.from({ length: 9 }, (_, i) => createHole(i + 1)),
          slope_rating: 110,
        }),
      ],
    },
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
 * List of mixed venue types
 */
export const VenueList: Story = {
  render: () => {
    const items: VenueCourseDisplayItem[] = [
      singleCourseItem,
      multiCourseItem,
      {
        type: 'single-course',
        venue: createVenue({ id: 'v3', name: 'Victoria Golf Club', city: 'Cheltenham' }),
        courses: [createCourse({ id: 'c3', name: 'Victoria GC', slope_rating: 138, is_favorite: true })],
      },
      multiCourseVenueWith3Courses,
      {
        type: 'single-course',
        venue: createVenue({ id: 'v4', name: 'Metropolitan Golf Club', city: 'Oakleigh' }),
        courses: [createCourse({ id: 'c4', name: 'Metropolitan', slope_rating: 142 })],
      },
    ];

    return (
      <ScrollView style={styles.scrollContainer}>
        <Text variant="titleMedium" style={styles.title}>
          Venue List Demo
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Shows how VenueCards look in a list with mixed types
        </Text>
        {items.map((item, index) => (
          <View key={item.venue.id} style={styles.cardWrapper}>
            <VenueCard
              item={item}
              showFavoriteButton={true}
              onCourseSelect={(course, venue) => console.log('Selected:', course.name)}
              onVenuePress={(venue) => console.log('Venue:', venue.name)}
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
        story: 'Shows how VenueCards appear in a scrollable list with mixed single and multi-course venues.',
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

    const items: VenueCourseDisplayItem[] = [
      singleCourseItem,
      multiCourseItem,
      {
        type: 'single-course',
        venue: createVenue({ id: 'v3', name: 'Victoria Golf Club', city: 'Cheltenham' }),
        courses: [createCourse({ id: 'c3', name: 'Victoria GC', slope_rating: 138 })],
      },
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
          <View key={item.venue.id} style={styles.cardWrapper}>
            <VenueCard
              item={item}
              showFavoriteButton={true}
              selectionMode={true}
              onCourseSelect={(course) => setSelected(course.name)}
              onVenuePress={(venue) => console.log('Venue:', venue.name)}
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
    item: {
      type: 'single-course',
      venue: createVenue({
        name: 'The Grand Royal Imperial Golf Resort and Country Club of Victoria',
        city: 'Mount Macedon Regional Park Area',
      }),
      courses: [
        createCourse({
          name: 'The Championship Links Course at the Grand Royal Imperial Golf Resort',
          slope_rating: 155,
        }),
      ],
    },
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests text truncation with very long venue and course names.',
      },
    },
  },
};

/**
 * Multi-course with long names
 */
export const MultiCourseLongNames: Story = {
  args: {
    item: {
      type: 'multi-course-venue',
      venue: createVenue({
        name: 'The Magnificent Golf and Country Club Resort Complex',
        total_holes: 72,
      }),
      courses: [
        createCourse({
          id: 'c1',
          name: 'The Championship Tournament Course',
          description: 'Host of multiple international championships and professional events',
        }),
        createCourse({
          id: 'c2',
          name: 'The Members Executive Par-3 Course',
          description: 'Perfect for a quick round after work or practice',
        }),
        createCourse({
          id: 'c3',
          name: 'The Lakeside Resort Links Course',
          description: 'Beautiful water views and challenging wind conditions',
        }),
        createCourse({
          id: 'c4',
          name: 'The Forest Walking Track Course',
          description: 'Scenic tree-lined fairways through native bushland',
        }),
      ],
    },
    showFavoriteButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-course venue with 4 courses and long names.',
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
        story: 'Single-course venue in dark mode.',
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
        story: 'Multi-course venue in dark mode.',
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
