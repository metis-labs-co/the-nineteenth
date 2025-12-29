/**
 * HoleTable Stories
 *
 * Storybook stories for the HoleTable component showing:
 * - Default 18-hole course
 * - 9-hole course (front and back only)
 * - Different tee selections (blue, white, red)
 * - Distance units (yards vs metres)
 * - Edge cases (empty, missing yardages)
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { HoleTable } from './HoleTable';
import type { Hole } from '@/types/database.types';

// ===========================================================================
// STORY FIXTURES
// ===========================================================================

/**
 * Create a single hole with specified properties
 */
function createHole(overrides: Partial<Hole> = {}): Hole {
  return {
    number: 1 as Hole['number'],
    par: 4 as Hole['par'],
    strokeIndex: 10,
    yardages: { blue: 420, white: 400, red: 360 },
    ...overrides,
  };
}

/**
 * Create standard front 9 holes (1-9)
 */
function createFrontNine(): Hole[] {
  const pars: Hole['par'][] = [4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [7, 15, 1, 11, 5, 17, 3, 9, 13];
  const blueYardages = [420, 185, 540, 380, 405, 175, 445, 520, 390];
  const whiteYardages = [400, 165, 510, 360, 385, 155, 425, 495, 370];
  const redYardages = [360, 140, 470, 320, 345, 130, 385, 455, 330];

  return pars.map((par, i) =>
    createHole({
      number: (i + 1) as Hole['number'],
      par,
      strokeIndex: strokeIndexes[i],
      yardages: {
        blue: blueYardages[i],
        white: whiteYardages[i],
        red: redYardages[i],
      },
    })
  );
}

/**
 * Create standard back 9 holes (10-18)
 */
function createBackNine(): Hole[] {
  const pars: Hole['par'][] = [4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [8, 16, 2, 12, 6, 18, 4, 10, 14];
  const blueYardages = [410, 195, 550, 390, 420, 165, 455, 530, 400];
  const whiteYardages = [390, 175, 520, 370, 400, 145, 435, 505, 380];
  const redYardages = [350, 150, 480, 330, 360, 120, 395, 465, 340];

  return pars.map((par, i) =>
    createHole({
      number: (i + 10) as Hole['number'],
      par,
      strokeIndex: strokeIndexes[i],
      yardages: {
        blue: blueYardages[i],
        white: whiteYardages[i],
        red: redYardages[i],
      },
    })
  );
}

/**
 * Create full 18 holes
 */
function create18Holes(): Hole[] {
  return [...createFrontNine(), ...createBackNine()];
}

/**
 * Create a links-style championship course
 */
function createLinksChampionshipCourse(): Hole[] {
  const pars: Hole['par'][] = [4, 5, 3, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [5, 9, 15, 1, 7, 11, 17, 3, 13, 6, 16, 10, 2, 8, 18, 4, 12, 14];

  return pars.map((par, i) =>
    createHole({
      number: (i + 1) as Hole['number'],
      par,
      strokeIndex: strokeIndexes[i],
      yardages: {
        championship: 450 + i * 10 + (par === 5 ? 100 : par === 3 ? -200 : 0),
        mens: 420 + i * 10 + (par === 5 ? 80 : par === 3 ? -180 : 0),
        senior: 380 + i * 10 + (par === 5 ? 60 : par === 3 ? -160 : 0),
        ladies: 340 + i * 10 + (par === 5 ? 40 : par === 3 ? -140 : 0),
      },
    })
  );
}

/**
 * Create a short executive course (par 3s and short 4s)
 */
function createExecutiveCourse(): Hole[] {
  const pars: Hole['par'][] = [3, 3, 4, 3, 3, 4, 3, 3, 4];
  const strokeIndexes = [7, 5, 1, 9, 3, 2, 8, 6, 4];

  return pars.map((par, i) =>
    createHole({
      number: (i + 1) as Hole['number'],
      par,
      strokeIndex: strokeIndexes[i],
      yardages: {
        blue: 150 + i * 15,
        white: 135 + i * 15,
        red: 120 + i * 15,
      },
    })
  );
}

// ===========================================================================
// STORY CONFIGURATION
// ===========================================================================

const meta: Meta<typeof HoleTable> = {
  title: 'Rounds/ViewRound/RoundDetailsTab/HoleTable',
  component: HoleTable,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    selectedTee: {
      control: 'select',
      options: [null, 'blue', 'white', 'red', 'championship', 'mens', 'senior', 'ladies'],
    },
    useMetres: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof HoleTable>;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default 18-hole course with white tees in yards
 */
export const Default: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Standard 18-hole course from blue (championship) tees
 */
export const BlueTees: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'blue',
    useMetres: false,
  },
};

/**
 * Standard 18-hole course from red (forward) tees
 */
export const RedTees: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'red',
    useMetres: false,
  },
};

// ===========================================================================
// DISTANCE UNIT STORIES
// ===========================================================================

/**
 * 18-hole course displaying distances in metres
 */
export const InMetres: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'white',
    useMetres: true,
  },
};

/**
 * Blue tees in metres
 */
export const BlueTeesInMetres: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'blue',
    useMetres: true,
  },
};

// ===========================================================================
// 9-HOLE COURSE STORIES
// ===========================================================================

/**
 * Front 9 holes only
 */
export const FrontNineOnly: Story = {
  args: {
    holes: createFrontNine(),
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Back 9 holes only
 */
export const BackNineOnly: Story = {
  args: {
    holes: createBackNine(),
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Executive 9-hole course (shorter par 3s and 4s)
 */
export const ExecutiveCourse: Story = {
  args: {
    holes: createExecutiveCourse(),
    selectedTee: 'white',
    useMetres: false,
  },
};

// ===========================================================================
// SPECIAL COURSE STORIES
// ===========================================================================

/**
 * Links championship course with custom tee names
 */
export const LinksChampionship: Story = {
  args: {
    holes: createLinksChampionshipCourse(),
    selectedTee: 'championship',
    useMetres: false,
  },
};

/**
 * Links course from senior tees
 */
export const LinksSeniorTees: Story = {
  args: {
    holes: createLinksChampionshipCourse(),
    selectedTee: 'senior',
    useMetres: false,
  },
};

/**
 * Links course from ladies tees
 */
export const LinksLadiesTees: Story = {
  args: {
    holes: createLinksChampionshipCourse(),
    selectedTee: 'ladies',
    useMetres: true,
  },
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Empty holes array - no course data
 */
export const EmptyHoles: Story = {
  args: {
    holes: [],
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * No tee selected - shows dashes for distances
 */
export const NoTeeSelected: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: null,
    useMetres: false,
  },
};

/**
 * Partial yardage data - some holes missing distance for selected tee
 */
export const PartialYardageData: Story = {
  args: {
    holes: create18Holes().map((hole, i) => ({
      ...hole,
      yardages: i % 3 === 0 ? {} : hole.yardages, // Every 3rd hole missing yardages
    })),
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Mixed yardage availability - different tees have different holes
 */
export const MixedYardageAvailability: Story = {
  args: {
    holes: create18Holes().map((hole, i) => {
      const yardages: Record<string, number> = {
        white: 380 + i * 10, // White for all
      };
      if (i < 9) yardages.blue = 400 + i * 10; // Blue only for front 9
      if (i >= 9) yardages.red = 340 + i * 10; // Red only for back 9
      return { ...hole, yardages };
    }),
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Single hole course
 */
export const SingleHole: Story = {
  args: {
    holes: [createHole({ number: 1, par: 4, strokeIndex: 1, yardages: { white: 400 } })],
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Three holes only
 */
export const ThreeHoles: Story = {
  args: {
    holes: [
      createHole({ number: 1, par: 4, strokeIndex: 3, yardages: { white: 380 } }),
      createHole({ number: 2, par: 3, strokeIndex: 1, yardages: { white: 165 } }),
      createHole({ number: 3, par: 5, strokeIndex: 2, yardages: { white: 520 } }),
    ],
    selectedTee: 'white',
    useMetres: false,
  },
};

// ===========================================================================
// PAR VARIATION STORIES
// ===========================================================================

/**
 * All par 3 course
 */
export const AllPar3Course: Story = {
  args: {
    holes: Array.from({ length: 9 }, (_, i) =>
      createHole({
        number: (i + 1) as Hole['number'],
        par: 3,
        strokeIndex: i + 1,
        yardages: { white: 140 + i * 15 },
      })
    ),
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Challenging course with par 72 (typical championship)
 */
export const Par72Championship: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'blue',
    useMetres: false,
  },
};

/**
 * Long course with high yardage
 */
export const LongCourse: Story = {
  args: {
    holes: create18Holes().map((hole) => ({
      ...hole,
      yardages: {
        blue: (hole.yardages?.blue || 400) + 50,
        white: (hole.yardages?.white || 380) + 50,
        red: (hole.yardages?.red || 340) + 50,
      },
    })),
    selectedTee: 'blue',
    useMetres: false,
  },
};

/**
 * Short course with low yardage
 */
export const ShortCourse: Story = {
  args: {
    holes: create18Holes().map((hole) => ({
      ...hole,
      yardages: {
        blue: Math.max(100, (hole.yardages?.blue || 400) - 100),
        white: Math.max(90, (hole.yardages?.white || 380) - 100),
        red: Math.max(80, (hole.yardages?.red || 340) - 100),
      },
    })),
    selectedTee: 'white',
    useMetres: false,
  },
};

// ===========================================================================
// COMBINED SETTINGS STORIES
// ===========================================================================

/**
 * Red tees in metres (common for international ladies' play)
 */
export const RedTeesInMetres: Story = {
  args: {
    holes: create18Holes(),
    selectedTee: 'red',
    useMetres: true,
  },
};

/**
 * Executive course in metres
 */
export const ExecutiveCourseInMetres: Story = {
  args: {
    holes: createExecutiveCourse(),
    selectedTee: 'white',
    useMetres: true,
  },
};

/**
 * Front 9 with no tee selected in metres
 */
export const FrontNineNoTeeMetres: Story = {
  args: {
    holes: createFrontNine(),
    selectedTee: null,
    useMetres: true,
  },
};

// ===========================================================================
// UNSORTED HOLES STORIES
// ===========================================================================

/**
 * Holes in random order (component should sort them)
 */
export const UnsortedHoles: Story = {
  args: {
    holes: [
      createHole({ number: 5, par: 4, strokeIndex: 5 }),
      createHole({ number: 1, par: 4, strokeIndex: 7 }),
      createHole({ number: 9, par: 4, strokeIndex: 13 }),
      createHole({ number: 3, par: 5, strokeIndex: 1 }),
      createHole({ number: 7, par: 4, strokeIndex: 3 }),
      createHole({ number: 2, par: 3, strokeIndex: 15 }),
      createHole({ number: 8, par: 5, strokeIndex: 9 }),
      createHole({ number: 4, par: 4, strokeIndex: 11 }),
      createHole({ number: 6, par: 3, strokeIndex: 17 }),
    ],
    selectedTee: 'white',
    useMetres: false,
  },
};

/**
 * Mixed front and back 9 in random order
 */
export const MixedUnsortedHoles: Story = {
  args: {
    holes: [
      createHole({ number: 15, par: 3, strokeIndex: 18 }),
      createHole({ number: 1, par: 4, strokeIndex: 7 }),
      createHole({ number: 10, par: 4, strokeIndex: 8 }),
      createHole({ number: 5, par: 4, strokeIndex: 5 }),
      createHole({ number: 18, par: 4, strokeIndex: 14 }),
      createHole({ number: 9, par: 4, strokeIndex: 13 }),
    ],
    selectedTee: 'white',
    useMetres: false,
  },
};

// ===========================================================================
// REALISTIC AUSTRALIAN COURSES
// ===========================================================================

/**
 * Typical Melbourne Sandbelt style course
 */
export const MelbourneSandbelt: Story = {
  args: {
    holes: [
      createHole({ number: 1, par: 4, strokeIndex: 7, yardages: { blue: 380, white: 360, red: 320 } }),
      createHole({ number: 2, par: 3, strokeIndex: 15, yardages: { blue: 175, white: 155, red: 130 } }),
      createHole({ number: 3, par: 5, strokeIndex: 1, yardages: { blue: 540, white: 515, red: 475 } }),
      createHole({ number: 4, par: 4, strokeIndex: 11, yardages: { blue: 355, white: 335, red: 300 } }),
      createHole({ number: 5, par: 4, strokeIndex: 5, yardages: { blue: 420, white: 400, red: 365 } }),
      createHole({ number: 6, par: 3, strokeIndex: 17, yardages: { blue: 145, white: 130, red: 110 } }),
      createHole({ number: 7, par: 4, strokeIndex: 3, yardages: { blue: 435, white: 410, red: 375 } }),
      createHole({ number: 8, par: 5, strokeIndex: 9, yardages: { blue: 505, white: 480, red: 445 } }),
      createHole({ number: 9, par: 4, strokeIndex: 13, yardages: { blue: 365, white: 345, red: 310 } }),
      createHole({ number: 10, par: 4, strokeIndex: 8, yardages: { blue: 395, white: 375, red: 340 } }),
      createHole({ number: 11, par: 3, strokeIndex: 16, yardages: { blue: 165, white: 145, red: 125 } }),
      createHole({ number: 12, par: 5, strokeIndex: 2, yardages: { blue: 555, white: 530, red: 490 } }),
      createHole({ number: 13, par: 4, strokeIndex: 12, yardages: { blue: 340, white: 320, red: 290 } }),
      createHole({ number: 14, par: 4, strokeIndex: 6, yardages: { blue: 410, white: 390, red: 355 } }),
      createHole({ number: 15, par: 3, strokeIndex: 18, yardages: { blue: 155, white: 140, red: 120 } }),
      createHole({ number: 16, par: 4, strokeIndex: 4, yardages: { blue: 425, white: 400, red: 365 } }),
      createHole({ number: 17, par: 5, strokeIndex: 10, yardages: { blue: 495, white: 470, red: 435 } }),
      createHole({ number: 18, par: 4, strokeIndex: 14, yardages: { blue: 375, white: 355, red: 320 } }),
    ],
    selectedTee: 'white',
    useMetres: true, // Australian standard
  },
};

/**
 * Sydney coastal links style
 */
export const SydneyCoastalLinks: Story = {
  args: {
    holes: create18Holes().map((hole, i) => ({
      ...hole,
      yardages: {
        blue: 420 + (i % 5) * 25,
        white: 395 + (i % 5) * 25,
        red: 360 + (i % 5) * 25,
      },
    })),
    selectedTee: 'white',
    useMetres: true,
  },
};
