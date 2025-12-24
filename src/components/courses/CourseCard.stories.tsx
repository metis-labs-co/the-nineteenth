/**
 * CourseCard Stories
 *
 * Storybook stories for the course card component.
 * Shows various configurations:
 * - Course with full data
 * - Course with partial data
 * - Favorite states
 * - Loading states
 * - Different tee configurations
 * - Edge cases
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { CourseCard } from './CourseCard';
import type { Course, Hole } from '@/types/database.types';

// =====================================================
// META
// =====================================================

interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

const meta: Meta<typeof CourseCard> = {
  title: 'Courses/CourseCard',
  component: CourseCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Display card for a single golf course. Shows course name, description, stats (holes, par, ratings), tee information, and allows favorite toggling.',
      },
    },
  },
  argTypes: {
    onPress: {
      action: 'pressed',
      description: 'Callback when the card is pressed',
    },
    onToggleFavorite: {
      action: 'favorite toggled',
      description: 'Callback when the favorite button is pressed',
    },
    isTogglingFavorite: {
      control: 'boolean',
      description: 'Shows loading indicator in favorite button',
    },
    showFavoriteButton: {
      control: 'boolean',
      description: 'Whether to show the favorite button',
    },
    showChevron: {
      control: 'boolean',
      description: 'Whether to show the chevron icon',
    },
    venueName: {
      control: 'text',
      description: 'Optional venue name to display below course name',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CourseCard>;

// =====================================================
// FIXTURES
// =====================================================

const createHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
  yardages: { blue: 400, white: 380, red: 350 },
});

const createCourse = (overrides: Partial<CourseWithFavorite> = {}): CourseWithFavorite => ({
  id: 'course-1',
  venue_id: 'venue-1',
  name: 'Championship Course',
  description: 'A challenging championship layout designed by Alister MacKenzie',
  holes: Array.from({ length: 18 }, (_, i) => createHole(i + 1)),
  tees: [
    { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
    { name: 'Members', color: 'white', totalYardage: 6400, courseRating: 72.0, slopeRating: 135 },
    { name: 'Forward', color: 'red', totalYardage: 5800, courseRating: 68.5, slopeRating: 120 },
  ],
  slope_rating: 145,
  course_rating: 74.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_favorite: false,
  ...overrides,
});

const fullCourse = createCourse();
const favoriteCourse = createCourse({ is_favorite: true });
const nineHoleCourse = createCourse({
  name: 'Executive Course',
  description: 'Perfect for a quick round',
  holes: Array.from({ length: 9 }, (_, i) => createHole(i + 1)),
  slope_rating: 110,
  course_rating: 65.5,
  tees: [{ name: 'Standard', color: 'white', totalYardage: 3200, courseRating: 65.5, slopeRating: 110 }],
});

// =====================================================
// STORIES: BASIC STATES
// =====================================================

/**
 * Default course card with full data
 */
export const Default: Story = {
  args: {
    course: fullCourse,
    showFavoriteButton: true,
    showChevron: true,
  },
};

/**
 * Course marked as favorite (filled star)
 */
export const Favorite: Story = {
  args: {
    course: favoriteCourse,
    showFavoriteButton: true,
    showChevron: true,
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
 * Course with loading favorite toggle
 */
export const TogglingFavorite: Story = {
  args: {
    course: fullCourse,
    showFavoriteButton: true,
    showChevron: true,
    isTogglingFavorite: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows loading indicator while favorite status is being toggled.',
      },
    },
  },
};

/**
 * Course with venue name displayed
 */
export const WithVenueName: Story = {
  args: {
    course: fullCourse,
    venueName: 'Royal Melbourne Golf Club',
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows venue name below the course name.',
      },
    },
  },
};

// =====================================================
// STORIES: BUTTON VISIBILITY
// =====================================================

/**
 * Selection mode - shows chevron, hides favorite
 */
export const SelectionMode: Story = {
  args: {
    course: fullCourse,
    showFavoriteButton: false,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Selection mode shows only chevron for navigation.',
      },
    },
  },
};

/**
 * Browse mode - shows favorite, hides chevron
 */
export const BrowseMode: Story = {
  args: {
    course: fullCourse,
    showFavoriteButton: true,
    showChevron: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Browse mode shows only favorite button.',
      },
    },
  },
};

/**
 * Minimal mode - no buttons
 */
export const MinimalMode: Story = {
  args: {
    course: fullCourse,
    showFavoriteButton: false,
    showChevron: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal display without action buttons.',
      },
    },
  },
};

// =====================================================
// STORIES: COURSE DATA VARIATIONS
// =====================================================

/**
 * 9-hole executive course
 */
export const NineHoleCourse: Story = {
  args: {
    course: nineHoleCourse,
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows "9 holes" and appropriate par for shorter courses.',
      },
    },
  },
};

/**
 * Course without description
 */
export const NoDescription: Story = {
  args: {
    course: createCourse({ description: null }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without a description.',
      },
    },
  },
};

/**
 * Course without hole data
 */
export const NoHoleData: Story = {
  args: {
    course: createCourse({ holes: [] }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without hole information - shows only ratings.',
      },
    },
  },
};

/**
 * Course without ratings
 */
export const NoRatings: Story = {
  args: {
    course: createCourse({ slope_rating: null, course_rating: null }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without slope or course ratings.',
      },
    },
  },
};

/**
 * Course without any stats
 */
export const NoStats: Story = {
  args: {
    course: createCourse({ holes: [], slope_rating: null, course_rating: null }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with no holes or ratings - minimal display.',
      },
    },
  },
};

/**
 * Course without tee data
 */
export const NoTeeData: Story = {
  args: {
    course: createCourse({ tees: [] }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course without tee box information.',
      },
    },
  },
};

// =====================================================
// STORIES: TEE VARIATIONS
// =====================================================

/**
 * Course with single tee
 */
export const SingleTee: Story = {
  args: {
    course: createCourse({
      tees: [{ name: 'Standard', color: 'white', totalYardage: 6200, courseRating: 70.0, slopeRating: 130 }],
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with only one tee option.',
      },
    },
  },
};

/**
 * Course with many tees
 */
export const ManyTees: Story = {
  args: {
    course: createCourse({
      tees: [
        { name: 'Tournament', color: 'black', totalYardage: 7200, courseRating: 76.0, slopeRating: 155 },
        { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
        { name: 'Members', color: 'white', totalYardage: 6400, courseRating: 72.0, slopeRating: 135 },
        { name: 'Senior', color: 'gold', totalYardage: 6000, courseRating: 69.5, slopeRating: 125 },
        { name: 'Forward', color: 'red', totalYardage: 5500, courseRating: 66.0, slopeRating: 115 },
      ],
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with five different tee options.',
      },
    },
  },
};

/**
 * Tees without yardage
 */
export const TeesWithoutYardage: Story = {
  args: {
    course: createCourse({
      tees: [
        { name: 'Blue', color: 'blue', totalYardage: null, courseRating: 72.0, slopeRating: 135 },
        { name: 'White', color: 'white', totalYardage: null, courseRating: 70.0, slopeRating: 130 },
      ],
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tees without yardage data - tee summary is hidden.',
      },
    },
  },
};

/**
 * Mixed tees (some with yardage, some without)
 */
export const MixedTeeYardage: Story = {
  args: {
    course: createCourse({
      tees: [
        { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
        { name: 'Members', color: 'white', totalYardage: null, courseRating: 72.0, slopeRating: 135 },
        { name: 'Forward', color: 'red', totalYardage: 5500, courseRating: 68.0, slopeRating: 120 },
      ],
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Mix of tees with and without yardage - shows range of available yardages.',
      },
    },
  },
};

// =====================================================
// STORIES: INTERACTIVE DEMOS
// =====================================================

/**
 * Interactive favorite toggle
 */
export const InteractiveFavorite: Story = {
  render: () => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const course: CourseWithFavorite = {
      ...fullCourse,
      is_favorite: isFavorite,
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
        <CourseCard
          course={course}
          onPress={(c) => console.log('Pressed:', c.name)}
          onToggleFavorite={handleToggle}
          isTogglingFavorite={isToggling}
          showFavoriteButton={true}
          showChevron={true}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo with working favorite toggle and loading state.',
      },
    },
  },
};

/**
 * Interactive card press
 */
export const InteractivePress: Story = {
  render: () => {
    const [lastPressed, setLastPressed] = useState<string | null>(null);

    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          Interactive Press
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Tap the card to see the press event
        </Text>
        {lastPressed && (
          <View style={styles.banner}>
            <Text variant="labelMedium">Pressed: {lastPressed}</Text>
          </View>
        )}
        <CourseCard
          course={fullCourse}
          onPress={(course) => setLastPressed(course.name)}
          showFavoriteButton={true}
          showChevron={true}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing card press events.',
      },
    },
  },
};

// =====================================================
// STORIES: EDGE CASES
// =====================================================

/**
 * Very long course name
 */
export const LongCourseName: Story = {
  args: {
    course: createCourse({
      name: 'The Championship Links Course at the Grand Royal Imperial Golf Resort',
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests text truncation with very long course name.',
      },
    },
  },
};

/**
 * Very long description
 */
export const LongDescription: Story = {
  args: {
    course: createCourse({
      description:
        'This is an extremely long description that details every aspect of this magnificent championship golf course, including its storied history, the renowned architects who designed it, the challenging layout featuring water hazards and strategically placed bunkers, and the countless professional tournaments that have been hosted here over the decades.',
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests text truncation with very long description (limited to 2 lines).',
      },
    },
  },
};

/**
 * Course with special characters
 */
export const SpecialCharacters: Story = {
  args: {
    course: createCourse({
      name: "St. Andrew's Links (Old Course)",
      description: "Home of golf since the 15th century - the world's most iconic course",
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with special characters in name and description.',
      },
    },
  },
};

/**
 * Minimal course data
 */
export const MinimalData: Story = {
  args: {
    course: createCourse({
      name: 'New Course',
      description: null,
      holes: [],
      tees: [],
      slope_rating: null,
      course_rating: null,
    }),
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with minimal data - only name is required.',
      },
    },
  },
};

// =====================================================
// STORIES: LIST DEMO
// =====================================================

/**
 * Course list demo
 */
export const CourseList: Story = {
  render: () => {
    const courses: CourseWithFavorite[] = [
      createCourse({ id: '1', name: 'Championship Course', is_favorite: true }),
      createCourse({ id: '2', name: 'Links Course', description: 'Scottish-style links' }),
      createCourse({
        id: '3',
        name: 'Executive Course',
        holes: Array.from({ length: 9 }, (_, i) => createHole(i + 1)),
        slope_rating: 110,
      }),
      createCourse({ id: '4', name: 'Desert Course', tees: [] }),
      createCourse({ id: '5', name: 'Lakeside Course', is_favorite: true }),
    ];

    return (
      <ScrollView style={styles.scrollContainer}>
        <Text variant="titleMedium" style={styles.title}>
          Course List Demo
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Shows how CourseCards look in a list
        </Text>
        {courses.map((course) => (
          <View key={course.id} style={styles.cardWrapper}>
            <CourseCard
              course={course}
              onPress={(c) => console.log('Selected:', c.name)}
              onToggleFavorite={(c) => console.log('Toggle:', c.name)}
              showFavoriteButton={true}
              showChevron={true}
            />
          </View>
        ))}
      </ScrollView>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how CourseCards appear in a scrollable list.',
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

    const courses: CourseWithFavorite[] = [
      createCourse({ id: '1', name: 'Championship Course' }),
      createCourse({ id: '2', name: 'Links Course' }),
      createCourse({ id: '3', name: 'Executive Course' }),
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
          <View style={styles.banner}>
            <Text variant="labelMedium">Selected: {selected}</Text>
          </View>
        )}
        {courses.map((course) => (
          <View key={course.id} style={styles.cardWrapper}>
            <CourseCard
              course={course}
              onPress={(c) => setSelected(c.name)}
              showFavoriteButton={false}
              showChevron={true}
            />
          </View>
        ))}
      </ScrollView>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Course selection workflow in selection mode.',
      },
    },
  },
};

// =====================================================
// STORIES: WITH VENUE
// =====================================================

/**
 * Course cards with venue names
 */
export const WithVenueNames: Story = {
  render: () => {
    const coursesWithVenues = [
      { course: createCourse({ id: '1', name: 'West Course' }), venue: 'Royal Melbourne Golf Club' },
      { course: createCourse({ id: '2', name: 'East Course' }), venue: 'Royal Melbourne Golf Club' },
      { course: createCourse({ id: '3', name: 'Links Course', is_favorite: true }), venue: 'Barnbougle Dunes' },
    ];

    return (
      <ScrollView style={styles.scrollContainer}>
        <Text variant="titleMedium" style={styles.title}>
          Courses with Venue Names
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Useful when showing courses from multiple venues
        </Text>
        {coursesWithVenues.map(({ course, venue }) => (
          <View key={course.id} style={styles.cardWrapper}>
            <CourseCard
              course={course}
              venueName={venue}
              onPress={(c) => console.log('Selected:', c.name)}
              onToggleFavorite={(c) => console.log('Toggle:', c.name)}
              showFavoriteButton={true}
              showChevron={true}
            />
          </View>
        ))}
      </ScrollView>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows courses with their venue names displayed.',
      },
    },
  },
};

// =====================================================
// STORIES: DARK MODE
// =====================================================

/**
 * Dark mode default
 */
export const DarkModeDefault: Story = {
  args: {
    course: fullCourse,
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Course card in dark mode.',
      },
    },
  },
};

/**
 * Dark mode favorite
 */
export const DarkModeFavorite: Story = {
  args: {
    course: favoriteCourse,
    showFavoriteButton: true,
    showChevron: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Favorited course card in dark mode.',
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
  banner: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
});
