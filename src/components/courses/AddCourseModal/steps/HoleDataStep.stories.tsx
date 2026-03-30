/**
 * HoleDataStep Stories
 *
 * Storybook stories for the hole data entry step of AddCourseModal.
 * Shows various configurations:
 * - Different hole selections
 * - Par value states
 * - Stroke index with duplicates
 * - Yardage entry
 * - Multiple tee configurations
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { HoleDataStep } from './HoleDataStep';
import type { HoleFormData, TeeFormData } from '../types';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof HoleDataStep> = {
  title: 'Courses/AddCourseModal/HoleDataStep',
  component: HoleDataStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Step 3 of AddCourseModal wizard. Collects hole-by-hole data including par (3, 4, 5), stroke index (1-18), and yardages per tee box.',
      },
    },
  },
  argTypes: {
    onHoleChange: { action: 'hole changed' },
    onHoleYardageChange: { action: 'yardage changed' },
    onNextHole: { action: 'next hole' },
    onPrevHole: { action: 'prev hole' },
    onJumpToHole: { action: 'jump to hole' },
    currentHoleIndex: {
      control: { type: 'range', min: 0, max: 17, step: 1 },
      description: 'Currently selected hole (0-17)',
    },
    duplicateSiValues: {
      control: 'object',
      description: 'Array of stroke index values that are duplicated',
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.decorator}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HoleDataStep>;

// =====================================================
// FIXTURES
// =====================================================

const createHole = (number: number, par: 3 | 4 | 5 = 4, strokeIndex?: number): HoleFormData => ({
  number,
  par,
  strokeIndex: strokeIndex ?? number,
  yardages: {},
});

const createHoleWithYardages = (
  number: number,
  par: 3 | 4 | 5,
  strokeIndex: number,
  yardages: Record<string, number>
): HoleFormData => ({
  number,
  par,
  strokeIndex,
  yardages,
});

const createTee = (id: string, name: string, color: 'black' | 'blue' | 'white' | 'yellow' | 'red' | 'gold' | 'green' | 'silver'): TeeFormData => ({
  id,
  name,
  color,
});

const defaultHoles: HoleFormData[] = Array.from({ length: 18 }, (_, i) => createHole(i + 1));

const defaultTees: TeeFormData[] = [
  createTee('tee-blue', 'Blue', 'blue'),
  createTee('tee-white', 'White', 'white'),
  createTee('tee-red', 'Red', 'red'),
];

// Realistic course data
const kingsltonHeathHoles: HoleFormData[] = [
  createHoleWithYardages(1, 4, 11, { 'tee-blue': 389, 'tee-white': 375, 'tee-red': 350 }),
  createHoleWithYardages(2, 3, 17, { 'tee-blue': 158, 'tee-white': 145, 'tee-red': 130 }),
  createHoleWithYardages(3, 4, 1, { 'tee-blue': 443, 'tee-white': 428, 'tee-red': 400 }),
  createHoleWithYardages(4, 4, 9, { 'tee-blue': 388, 'tee-white': 372, 'tee-red': 345 }),
  createHoleWithYardages(5, 5, 5, { 'tee-blue': 545, 'tee-white': 530, 'tee-red': 495 }),
  createHoleWithYardages(6, 3, 15, { 'tee-blue': 190, 'tee-white': 175, 'tee-red': 155 }),
  createHoleWithYardages(7, 4, 3, { 'tee-blue': 432, 'tee-white': 415, 'tee-red': 385 }),
  createHoleWithYardages(8, 4, 13, { 'tee-blue': 375, 'tee-white': 360, 'tee-red': 335 }),
  createHoleWithYardages(9, 5, 7, { 'tee-blue': 510, 'tee-white': 495, 'tee-red': 460 }),
  createHoleWithYardages(10, 4, 8, { 'tee-blue': 398, 'tee-white': 382, 'tee-red': 355 }),
  createHoleWithYardages(11, 4, 4, { 'tee-blue': 425, 'tee-white': 410, 'tee-red': 380 }),
  createHoleWithYardages(12, 4, 16, { 'tee-blue': 355, 'tee-white': 340, 'tee-red': 315 }),
  createHoleWithYardages(13, 3, 12, { 'tee-blue': 172, 'tee-white': 158, 'tee-red': 140 }),
  createHoleWithYardages(14, 4, 2, { 'tee-blue': 445, 'tee-white': 430, 'tee-red': 400 }),
  createHoleWithYardages(15, 5, 10, { 'tee-blue': 520, 'tee-white': 505, 'tee-red': 470 }),
  createHoleWithYardages(16, 3, 18, { 'tee-blue': 145, 'tee-white': 135, 'tee-red': 120 }),
  createHoleWithYardages(17, 4, 6, { 'tee-blue': 412, 'tee-white': 398, 'tee-red': 368 }),
  createHoleWithYardages(18, 4, 14, { 'tee-blue': 380, 'tee-white': 365, 'tee-red': 340 }),
];

const champTees: TeeFormData[] = [
  createTee('tee-black', 'Championship', 'black'),
  createTee('tee-blue', 'Blue', 'blue'),
  createTee('tee-white', 'White', 'white'),
  createTee('tee-gold', 'Gold', 'gold'),
  createTee('tee-red', 'Red', 'red'),
];

// =====================================================
// STORIES: BASIC STATES
// =====================================================

/**
 * Default first hole view
 */
export const Default: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
};

/**
 * Middle hole (Hole 9)
 */
export const MiddleHole: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 8,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows hole 9, a middle hole in the round.',
      },
    },
  },
};

/**
 * Last hole (Hole 18)
 */
export const LastHole: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 17,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows hole 18, the last hole. Next button is disabled.',
      },
    },
  },
};

// =====================================================
// STORIES: PAR VALUES
// =====================================================

/**
 * Par 3 hole
 */
export const Par3Hole: Story = {
  args: {
    holes: defaultHoles.map((h, i) => (i === 0 ? { ...h, par: 3 as const } : h)),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Hole with par 3 selected.',
      },
    },
  },
};

/**
 * Par 4 hole (default)
 */
export const Par4Hole: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Hole with par 4 selected (default).',
      },
    },
  },
};

/**
 * Par 5 hole
 */
export const Par5Hole: Story = {
  args: {
    holes: defaultHoles.map((h, i) => (i === 0 ? { ...h, par: 5 as const } : h)),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Hole with par 5 selected.',
      },
    },
  },
};

// =====================================================
// STORIES: STROKE INDEX
// =====================================================

/**
 * SI 1 (hardest hole)
 */
export const StrokeIndex1: Story = {
  args: {
    holes: defaultHoles.map((h, i) => (i === 0 ? { ...h, strokeIndex: 1 } : h)),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Stroke Index 1 - the hardest hole on the course.',
      },
    },
  },
};

/**
 * SI 18 (easiest hole)
 */
export const StrokeIndex18: Story = {
  args: {
    holes: defaultHoles.map((h, i) => (i === 0 ? { ...h, strokeIndex: 18 } : h)),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Stroke Index 18 - the easiest hole on the course.',
      },
    },
  },
};

/**
 * Duplicate SI value (error state)
 */
export const DuplicateStrokeIndex: Story = {
  args: {
    holes: defaultHoles.map((h, i) => {
      if (i === 0) return { ...h, strokeIndex: 5 };
      if (i === 4) return { ...h, strokeIndex: 5 }; // Duplicate on hole 5
      return h;
    }),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [5],
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows error state when stroke index is duplicated. Both hole 1 and 5 have SI 5.',
      },
    },
  },
};

/**
 * Multiple duplicate SI values
 */
export const MultipleDuplicates: Story = {
  args: {
    holes: defaultHoles.map((h, i) => {
      if (i === 0 || i === 3) return { ...h, strokeIndex: 1 };
      if (i === 1 || i === 5) return { ...h, strokeIndex: 10 };
      return h;
    }),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [1, 10],
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple duplicate stroke indexes. SI 1 and SI 10 are both duplicated.',
      },
    },
  },
};

// =====================================================
// STORIES: TEE CONFIGURATIONS
// =====================================================

/**
 * Single tee box
 */
export const SingleTee: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: [createTee('tee-white', 'White', 'white')],
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with only one tee box.',
      },
    },
  },
};

/**
 * Many tee boxes (5 tees)
 */
export const ManyTees: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: champTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Course with 5 different tee boxes for various skill levels.',
      },
    },
  },
};

/**
 * No tee boxes
 */
export const NoTees: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: [],
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Before tees are configured - yardage section is empty.',
      },
    },
  },
};

// =====================================================
// STORIES: YARDAGE DATA
// =====================================================

/**
 * With yardage values entered
 */
export const WithYardages: Story = {
  args: {
    holes: defaultHoles.map((h, i) =>
      i === 0
        ? { ...h, yardages: { 'tee-blue': 420, 'tee-white': 400, 'tee-red': 365 } }
        : h
    ),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Hole with yardage values entered for all tees.',
      },
    },
  },
};

/**
 * Partial yardage data
 */
export const PartialYardages: Story = {
  args: {
    holes: defaultHoles.map((h, i) =>
      i === 0 ? { ...h, yardages: { 'tee-blue': 420 } } : h
    ),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Only blue tee yardage is entered.',
      },
    },
  },
};

/**
 * Long par 5 yardages
 */
export const LongPar5: Story = {
  args: {
    holes: defaultHoles.map((h, i) =>
      i === 0
        ? {
            ...h,
            par: 5 as const,
            strokeIndex: 1,
            yardages: { 'tee-blue': 610, 'tee-white': 585, 'tee-red': 545 },
          }
        : h
    ),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'A long par 5 with championship yardages.',
      },
    },
  },
};

/**
 * Short par 3 yardages
 */
export const ShortPar3: Story = {
  args: {
    holes: defaultHoles.map((h, i) =>
      i === 0
        ? {
            ...h,
            par: 3 as const,
            strokeIndex: 18,
            yardages: { 'tee-blue': 125, 'tee-white': 115, 'tee-red': 95 },
          }
        : h
    ),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'A short par 3 - the easiest hole on the course.',
      },
    },
  },
};

// =====================================================
// STORIES: REALISTIC DATA
// =====================================================

/**
 * Realistic course data (Kingston Heath)
 */
export const RealisticCourse: Story = {
  args: {
    holes: kingsltonHeathHoles,
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Realistic course data based on Kingston Heath layout.',
      },
    },
  },
};

/**
 * Signature hole (Hole 15)
 */
export const SignatureHole: Story = {
  args: {
    holes: kingsltonHeathHoles,
    currentHoleIndex: 14,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Hole 15 - a signature par 5.',
      },
    },
  },
};

// =====================================================
// STORIES: PROGRESS STATES
// =====================================================

/**
 * Holes with complete data
 */
export const CompletedHoles: Story = {
  args: {
    holes: kingsltonHeathHoles.map((h, i) =>
      i < 9 ? h : { ...defaultHoles[i], par: 4, strokeIndex: i + 1 }
    ),
    currentHoleIndex: 9,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'First 9 holes completed (green dots), entering hole 10.',
      },
    },
  },
};

/**
 * All holes completed
 */
export const AllHolesCompleted: Story = {
  args: {
    holes: kingsltonHeathHoles,
    currentHoleIndex: 17,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'All 18 holes have complete data (all green dots).',
      },
    },
  },
};

/**
 * Mix of completed and error holes
 */
export const MixedProgress: Story = {
  args: {
    holes: kingsltonHeathHoles.map((h, i) => {
      if (i === 5) return { ...h, strokeIndex: 3 }; // Duplicate with hole 7
      return h;
    }),
    currentHoleIndex: 5,
    tees: defaultTees,
    duplicateSiValues: [3],
  },
  parameters: {
    docs: {
      description: {
        story: 'Some holes completed, hole 6 and 7 both have SI 3 (error state).',
      },
    },
  },
};

// =====================================================
// STORIES: INTERACTIVE
// =====================================================

/**
 * Interactive navigation demo
 */
export const InteractiveDemo: Story = {
  render: () => {
    const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
    const [holes, setHoles] = useState<HoleFormData[]>(
      Array.from({ length: 18 }, (_, i) => createHole(i + 1))
    );

    const handleHoleChange = (holeIndex: number, updates: Partial<HoleFormData>) => {
      setHoles((prev) =>
        prev.map((h, i) => (i === holeIndex ? { ...h, ...updates } : h))
      );
    };

    const handleYardageChange = (holeIndex: number, teeId: string, yardage: string) => {
      setHoles((prev) =>
        prev.map((h, i) =>
          i === holeIndex
            ? { ...h, yardages: { ...h.yardages, [teeId]: parseInt(yardage) || 0 } }
            : h
        )
      );
    };

    const handleNextHole = () => {
      if (currentHoleIndex < 17) setCurrentHoleIndex((i) => i + 1);
    };

    const handlePrevHole = () => {
      if (currentHoleIndex > 0) setCurrentHoleIndex((i) => i - 1);
    };

    // Calculate duplicates
    const siCounts = new Map<number, number>();
    holes.forEach((h) => siCounts.set(h.strokeIndex, (siCounts.get(h.strokeIndex) || 0) + 1));
    const duplicateSiValues = Array.from(siCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([si]) => si);

    return (
      <View style={styles.interactiveContainer}>
        <View style={styles.header}>
          <Text variant="titleMedium">Interactive Hole Data Entry</Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Navigate between holes, select par, adjust SI, and enter yardages
          </Text>
        </View>
        <HoleDataStep
          holes={holes}
          currentHoleIndex={currentHoleIndex}
          tees={defaultTees}
          numHoles={18}
          duplicateSiValues={duplicateSiValues}
          onHoleChange={handleHoleChange}
          onHoleYardageChange={handleYardageChange}
          onNextHole={handleNextHole}
          onPrevHole={handlePrevHole}
          onJumpToHole={setCurrentHoleIndex}
        />
        <View style={styles.footer}>
          <Divider />
          <Text variant="bodySmall" style={styles.footerText}>
            Completed: {holes.filter((h) => h.par && h.strokeIndex && Object.keys(h.yardages).length > 0).length}/18 holes
          </Text>
          {duplicateSiValues.length > 0 && (
            <Text variant="bodySmall" style={styles.errorText}>
              Duplicate SI values: {duplicateSiValues.join(', ')}
            </Text>
          )}
        </View>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive demo with state management. Enter data and navigate between holes.',
      },
    },
  },
};

/**
 * Quick entry demo - pre-fill par 4s
 */
export const QuickEntryDemo: Story = {
  render: () => {
    const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
    const [holes, setHoles] = useState<HoleFormData[]>(
      Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: 4 as const, // Default to par 4
        strokeIndex: i + 1,
        yardages: {},
      }))
    );

    const handleHoleChange = (holeIndex: number, updates: Partial<HoleFormData>) => {
      setHoles((prev) =>
        prev.map((h, i) => (i === holeIndex ? { ...h, ...updates } : h))
      );
    };

    const handleYardageChange = (holeIndex: number, teeId: string, yardage: string) => {
      setHoles((prev) =>
        prev.map((h, i) =>
          i === holeIndex
            ? { ...h, yardages: { ...h.yardages, [teeId]: parseInt(yardage) || 0 } }
            : h
        )
      );
    };

    return (
      <View style={styles.interactiveContainer}>
        <View style={styles.header}>
          <Text variant="titleMedium">Quick Entry Mode</Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            All holes pre-filled with par 4. Just adjust par 3s and 5s.
          </Text>
        </View>
        <HoleDataStep
          holes={holes}
          currentHoleIndex={currentHoleIndex}
          tees={defaultTees}
          numHoles={18}
          duplicateSiValues={[]}
          onHoleChange={handleHoleChange}
          onHoleYardageChange={handleYardageChange}
          onNextHole={() => setCurrentHoleIndex((i) => Math.min(17, i + 1))}
          onPrevHole={() => setCurrentHoleIndex((i) => Math.max(0, i - 1))}
          onJumpToHole={setCurrentHoleIndex}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-fills all holes as par 4 for quick entry. User only needs to adjust par 3s and 5s.',
      },
    },
  },
};

// =====================================================
// STORIES: EDGE CASES
// =====================================================

/**
 * Very long tee names
 */
export const LongTeeNames: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: [
      createTee('tee-champ', 'Championship Professional', 'black'),
      createTee('tee-members', 'Club Members Regular', 'white'),
      createTee('tee-senior', 'Senior Ladies Forward', 'red'),
    ],
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests layout with long tee box names.',
      },
    },
  },
};

/**
 * Maximum yardages
 */
export const MaxYardages: Story = {
  args: {
    holes: defaultHoles.map((h, i) =>
      i === 0
        ? {
            ...h,
            par: 5 as const,
            yardages: { 'tee-blue': 9999, 'tee-white': 8888, 'tee-red': 7777 },
          }
        : h
    ),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests input with maximum 4-digit yardages.',
      },
    },
  },
};

// =====================================================
// STORIES: DARK MODE
// =====================================================

/**
 * Dark mode - default
 */
export const DarkModeDefault: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Default view in dark mode.',
      },
    },
  },
};

/**
 * Dark mode - with data
 */
export const DarkModeWithData: Story = {
  args: {
    holes: kingsltonHeathHoles,
    currentHoleIndex: 2,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Realistic course data in dark mode.',
      },
    },
  },
};

/**
 * Dark mode - with errors
 */
export const DarkModeWithErrors: Story = {
  args: {
    holes: defaultHoles.map((h, i) => (i === 0 || i === 3 ? { ...h, strokeIndex: 5 } : h)),
    currentHoleIndex: 0,
    tees: defaultTees,
    duplicateSiValues: [5],
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Error state (duplicate SI) in dark mode.',
      },
    },
  },
};

// =====================================================
// STORIES: ACCESSIBILITY
// =====================================================

/**
 * Large touch targets
 */
export const TouchTargets: Story = {
  args: {
    holes: defaultHoles,
    currentHoleIndex: 8,
    tees: defaultTees,
    duplicateSiValues: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates touch target sizes. All interactive elements meet minimum 44x44pt guidelines.',
      },
    },
  },
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  decorator: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  interactiveContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    marginTop: 8,
    color: '#666',
  },
  errorText: {
    marginTop: 4,
    color: '#F44336',
  },
});
