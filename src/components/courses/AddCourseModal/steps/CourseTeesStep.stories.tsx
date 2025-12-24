/**
 * CourseTeesStep Stories
 *
 * Storybook stories for the course/tees step of AddCourseModal.
 * Shows various configurations:
 * - Empty state (no tees)
 * - Single and multiple tees
 * - Edit mode for tees
 * - Different tee colors
 * - Course name variations
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { CourseTeesStep } from './CourseTeesStep';
import type { TeeFormData, TeeColor } from '../types';
import { TEE_COLORS, generateId } from '../types';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof CourseTeesStep> = {
  title: 'Courses/AddCourseModal/CourseTeesStep',
  component: CourseTeesStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Step 2 of AddCourseModal wizard. Collects course name and allows creating/editing/deleting tee boxes with color selection.',
      },
    },
  },
  argTypes: {
    onCourseNameChange: { action: 'course name changed' },
    onAddTee: { action: 'add tee' },
    onEditTee: { action: 'edit tee' },
    onSaveTee: { action: 'save tee' },
    onCancelEdit: { action: 'cancel edit' },
    onDeleteTee: { action: 'delete tee' },
    onTeeNameChange: { action: 'tee name changed' },
    onTeeColorChange: { action: 'tee color changed' },
    courseName: {
      control: 'text',
      description: 'The name of the course',
    },
    editingTeeId: {
      control: 'text',
      description: 'ID of the tee currently being edited (null if none)',
    },
    newTeeName: {
      control: 'text',
      description: 'Name value in the edit form',
    },
    newTeeColor: {
      control: 'select',
      options: TEE_COLORS.map((c) => c.value),
      description: 'Color value in the edit form',
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
type Story = StoryObj<typeof CourseTeesStep>;

// =====================================================
// FIXTURES
// =====================================================

const createTee = (id: string, name: string, color: TeeColor): TeeFormData => ({
  id,
  name,
  color,
});

const standardTees: TeeFormData[] = [
  createTee('tee-blue', 'Blue', 'blue'),
  createTee('tee-white', 'White', 'white'),
  createTee('tee-red', 'Red', 'red'),
];

const championshipTees: TeeFormData[] = [
  createTee('tee-black', 'Championship', 'black'),
  createTee('tee-blue', 'Blue', 'blue'),
  createTee('tee-white', 'White', 'white'),
  createTee('tee-gold', 'Senior', 'gold'),
  createTee('tee-red', 'Ladies', 'red'),
];

const allColorTees: TeeFormData[] = TEE_COLORS.map((c) =>
  createTee(`tee-${c.value}`, c.label, c.value as TeeColor)
);

// =====================================================
// STORIES: BASIC STATES
// =====================================================

/**
 * Empty state - no course name, no tees
 */
export const Empty: Story = {
  args: {
    courseName: '',
    tees: [],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial empty state. Shows "Add at least one tee box to continue" message.',
      },
    },
  },
};

/**
 * Default with standard 3 tees
 */
export const Default: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Standard setup with Blue, White, and Red tees.',
      },
    },
  },
};

/**
 * With course name only, no tees
 */
export const CourseNameOnly: Story = {
  args: {
    courseName: 'The Championship Course',
    tees: [],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Course name entered but no tees added yet.',
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
    courseName: 'Practice Course',
    tees: [createTee('tee-1', 'Standard', 'white')],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
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
 * Championship tees (5 tee boxes)
 */
export const ChampionshipTees: Story = {
  args: {
    courseName: 'Royal Melbourne',
    tees: championshipTees,
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Championship course with 5 tee boxes: Championship, Blue, White, Senior, Ladies.',
      },
    },
  },
};

/**
 * All color options
 */
export const AllColors: Story = {
  args: {
    courseName: 'Color Demo Course',
    tees: allColorTees,
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows all 8 available tee colors: Black, Blue, White, Yellow, Red, Gold, Green, Silver.',
      },
    },
  },
};

// =====================================================
// STORIES: EDIT MODE
// =====================================================

/**
 * Editing existing tee
 */
export const EditingTee: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Blue',
    newTeeColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story: 'Editing the Blue tee. Shows name input and color picker.',
      },
    },
  },
};

/**
 * Adding new tee (empty form)
 */
export const AddingNewTee: Story = {
  args: {
    courseName: 'Championship Course',
    tees: [
      ...standardTees,
      createTee('tee-new', '', 'white'),
    ],
    editingTeeId: 'tee-new',
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Adding a new tee with empty name. Save button is disabled.',
      },
    },
  },
};

/**
 * Changing tee color to black
 */
export const EditingWithBlackColor: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Championship',
    newTeeColor: 'black',
  },
  parameters: {
    docs: {
      description: {
        story: 'Editing Blue tee, changing name to Championship and color to Black.',
      },
    },
  },
};

/**
 * Editing with red color selected
 */
export const EditingWithRedColor: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-white',
    newTeeName: 'Ladies',
    newTeeColor: 'red',
  },
  parameters: {
    docs: {
      description: {
        story: 'Editing White tee, changing to Ladies with Red color.',
      },
    },
  },
};

/**
 * Editing with gold color selected
 */
export const EditingWithGoldColor: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-white',
    newTeeName: 'Senior',
    newTeeColor: 'gold',
  },
  parameters: {
    docs: {
      description: {
        story: 'Editing White tee, changing to Senior with Gold color.',
      },
    },
  },
};

// =====================================================
// STORIES: VALIDATION STATES
// =====================================================

/**
 * Empty tee name (Save disabled)
 */
export const EmptyTeeName: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: '',
    newTeeColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty tee name - Save button should appear disabled.',
      },
    },
  },
};

/**
 * Whitespace-only tee name (Save disabled)
 */
export const WhitespaceTeeName: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: '   ',
    newTeeColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story: 'Whitespace-only tee name - Save button should appear disabled.',
      },
    },
  },
};

/**
 * Valid tee name (Save enabled)
 */
export const ValidTeeName: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Professional',
    newTeeColor: 'black',
  },
  parameters: {
    docs: {
      description: {
        story: 'Valid tee name entered - Save button should be enabled.',
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
    courseName:
      'The Championship Course at Kingston Heath Golf Club Victoria Australia',
    tees: standardTees,
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests layout with a very long course name.',
      },
    },
  },
};

/**
 * Very long tee names
 */
export const LongTeeNames: Story = {
  args: {
    courseName: 'Championship Course',
    tees: [
      createTee('tee-1', 'Championship Professional Tournament Back Tees', 'black'),
      createTee('tee-2', 'Club Members Regular Daily Play Tees', 'white'),
      createTee('tee-3', 'Senior Ladies Forward Accessible Tees', 'red'),
    ],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests layout with very long tee names.',
      },
    },
  },
};

/**
 * Special characters in names
 */
export const SpecialCharacters: Story = {
  args: {
    courseName: "St. Andrew's Old Course",
    tees: [
      createTee('tee-1', "Men's Championship", 'black'),
      createTee('tee-2', "Men's & Women's Combined", 'white'),
      createTee('tee-3', "Ladies' Forward", 'red'),
    ],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Names with apostrophes and special characters.',
      },
    },
  },
};

/**
 * Unicode characters in names
 */
export const UnicodeCharacters: Story = {
  args: {
    courseName: 'Château Golf 🏌️',
    tees: [
      createTee('tee-1', 'Championnat ⚫', 'black'),
      createTee('tee-2', 'Régulier 🔵', 'blue'),
      createTee('tee-3', 'Dames 🔴', 'red'),
    ],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Names with unicode and emoji characters.',
      },
    },
  },
};

/**
 * Unnamed tee (empty name)
 */
export const UnnamedTee: Story = {
  args: {
    courseName: 'Championship Course',
    tees: [createTee('tee-1', '', 'white')],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Tee with empty name displays as "Unnamed Tee".',
      },
    },
  },
};

// =====================================================
// STORIES: INTERACTIVE
// =====================================================

/**
 * Interactive demo
 */
export const InteractiveDemo: Story = {
  render: () => {
    const [courseName, setCourseName] = useState('');
    const [tees, setTees] = useState<TeeFormData[]>([]);
    const [editingTeeId, setEditingTeeId] = useState<string | null>(null);
    const [newTeeName, setNewTeeName] = useState('');
    const [newTeeColor, setNewTeeColor] = useState<TeeColor>('white');

    const handleAddTee = () => {
      const newId = generateId();
      const newTee: TeeFormData = { id: newId, name: '', color: 'white' };
      setTees([...tees, newTee]);
      setEditingTeeId(newId);
      setNewTeeName('');
      setNewTeeColor('white');
    };

    const handleEditTee = (tee: TeeFormData) => {
      setEditingTeeId(tee.id);
      setNewTeeName(tee.name);
      setNewTeeColor(tee.color);
    };

    const handleSaveTee = () => {
      if (!newTeeName.trim()) return;
      setTees(
        tees.map((t) =>
          t.id === editingTeeId ? { ...t, name: newTeeName, color: newTeeColor } : t
        )
      );
      setEditingTeeId(null);
      setNewTeeName('');
      setNewTeeColor('white');
    };

    const handleCancelEdit = (tee: TeeFormData | undefined) => {
      if (tee && !tee.name) {
        // Remove unsaved new tee
        setTees(tees.filter((t) => t.id !== tee.id));
      }
      setEditingTeeId(null);
      setNewTeeName('');
      setNewTeeColor('white');
    };

    const handleDeleteTee = (teeId: string) => {
      setTees(tees.filter((t) => t.id !== teeId));
      if (editingTeeId === teeId) {
        setEditingTeeId(null);
        setNewTeeName('');
        setNewTeeColor('white');
      }
    };

    return (
      <View style={styles.interactiveContainer}>
        <View style={styles.header}>
          <Text variant="titleMedium">Interactive Course & Tees</Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Enter course name and add tee boxes
          </Text>
        </View>
        <CourseTeesStep
          courseName={courseName}
          tees={tees}
          editingTeeId={editingTeeId}
          newTeeName={newTeeName}
          newTeeColor={newTeeColor}
          onCourseNameChange={setCourseName}
          onAddTee={handleAddTee}
          onEditTee={handleEditTee}
          onSaveTee={handleSaveTee}
          onCancelEdit={handleCancelEdit}
          onDeleteTee={handleDeleteTee}
          onTeeNameChange={setNewTeeName}
          onTeeColorChange={setNewTeeColor}
        />
        <View style={styles.footer}>
          <Divider />
          <Text variant="bodySmall" style={styles.footerText}>
            Course: {courseName || '(not set)'} | Tees: {tees.filter((t) => t.name).length}
          </Text>
        </View>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive demo with state management. Add, edit, and delete tee boxes.',
      },
    },
  },
};

/**
 * Pre-populated demo
 */
export const PrePopulatedDemo: Story = {
  render: () => {
    const [courseName, setCourseName] = useState('Kingston Heath');
    const [tees, setTees] = useState<TeeFormData[]>([...standardTees]);
    const [editingTeeId, setEditingTeeId] = useState<string | null>(null);
    const [newTeeName, setNewTeeName] = useState('');
    const [newTeeColor, setNewTeeColor] = useState<TeeColor>('white');

    const handleAddTee = () => {
      const newId = generateId();
      const newTee: TeeFormData = { id: newId, name: '', color: 'white' };
      setTees([...tees, newTee]);
      setEditingTeeId(newId);
      setNewTeeName('');
      setNewTeeColor('white');
    };

    const handleEditTee = (tee: TeeFormData) => {
      setEditingTeeId(tee.id);
      setNewTeeName(tee.name);
      setNewTeeColor(tee.color);
    };

    const handleSaveTee = () => {
      if (!newTeeName.trim()) return;
      setTees(
        tees.map((t) =>
          t.id === editingTeeId ? { ...t, name: newTeeName, color: newTeeColor } : t
        )
      );
      setEditingTeeId(null);
      setNewTeeName('');
      setNewTeeColor('white');
    };

    const handleCancelEdit = (tee: TeeFormData | undefined) => {
      if (tee && !tee.name) {
        setTees(tees.filter((t) => t.id !== tee.id));
      }
      setEditingTeeId(null);
      setNewTeeName('');
      setNewTeeColor('white');
    };

    const handleDeleteTee = (teeId: string) => {
      setTees(tees.filter((t) => t.id !== teeId));
      if (editingTeeId === teeId) {
        setEditingTeeId(null);
        setNewTeeName('');
        setNewTeeColor('white');
      }
    };

    return (
      <View style={styles.interactiveContainer}>
        <View style={styles.header}>
          <Text variant="titleMedium">Pre-Populated Course</Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Edit existing course and tees
          </Text>
        </View>
        <CourseTeesStep
          courseName={courseName}
          tees={tees}
          editingTeeId={editingTeeId}
          newTeeName={newTeeName}
          newTeeColor={newTeeColor}
          onCourseNameChange={setCourseName}
          onAddTee={handleAddTee}
          onEditTee={handleEditTee}
          onSaveTee={handleSaveTee}
          onCancelEdit={handleCancelEdit}
          onDeleteTee={handleDeleteTee}
          onTeeNameChange={setNewTeeName}
          onTeeColorChange={setNewTeeColor}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-populated with course name and 3 standard tees for editing.',
      },
    },
  },
};

// =====================================================
// STORIES: DARK MODE
// =====================================================

/**
 * Dark mode - empty
 */
export const DarkModeEmpty: Story = {
  args: {
    courseName: '',
    tees: [],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Empty state in dark mode.',
      },
    },
  },
};

/**
 * Dark mode - with tees
 */
export const DarkModeWithTees: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Standard tees in dark mode.',
      },
    },
  },
};

/**
 * Dark mode - editing
 */
export const DarkModeEditing: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Championship',
    newTeeColor: 'black',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Edit mode in dark mode.',
      },
    },
  },
};

// =====================================================
// STORIES: COLOR PICKER FOCUS
// =====================================================

/**
 * Black color selected
 */
export const ColorBlack: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Championship',
    newTeeColor: 'black',
  },
};

/**
 * Blue color selected
 */
export const ColorBlue: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Regular',
    newTeeColor: 'blue',
  },
};

/**
 * White color selected
 */
export const ColorWhite: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Standard',
    newTeeColor: 'white',
  },
};

/**
 * Yellow color selected
 */
export const ColorYellow: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Forward',
    newTeeColor: 'yellow',
  },
};

/**
 * Red color selected
 */
export const ColorRed: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Ladies',
    newTeeColor: 'red',
  },
};

/**
 * Gold color selected
 */
export const ColorGold: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Senior',
    newTeeColor: 'gold',
  },
};

/**
 * Green color selected
 */
export const ColorGreen: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Junior',
    newTeeColor: 'green',
  },
};

/**
 * Silver color selected
 */
export const ColorSilver: Story = {
  args: {
    courseName: 'Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Accessible',
    newTeeColor: 'silver',
  },
};

// =====================================================
// STORIES: REALISTIC SCENARIOS
// =====================================================

/**
 * Australian public course
 */
export const AustralianPublicCourse: Story = {
  args: {
    courseName: 'Yarra Yarra Golf Club',
    tees: [
      createTee('tee-1', 'Blue', 'blue'),
      createTee('tee-2', 'White', 'white'),
      createTee('tee-3', 'Yellow', 'yellow'),
      createTee('tee-4', 'Red', 'red'),
    ],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Typical Australian public course with 4 tee options.',
      },
    },
  },
};

/**
 * Links course
 */
export const LinksCourse: Story = {
  args: {
    courseName: 'Barnbougle Dunes',
    tees: [
      createTee('tee-1', 'Tiger', 'black'),
      createTee('tee-2', 'Blue', 'blue'),
      createTee('tee-3', 'White', 'white'),
      createTee('tee-4', 'Gold', 'gold'),
      createTee('tee-5', 'Red', 'red'),
    ],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Championship links course with 5 tee options.',
      },
    },
  },
};

/**
 * Resort course
 */
export const ResortCourse: Story = {
  args: {
    courseName: 'The National Golf Club - Moonah',
    tees: [
      createTee('tee-1', 'Professional', 'black'),
      createTee('tee-2', 'Championship', 'blue'),
      createTee('tee-3', 'Member', 'white'),
      createTee('tee-4', 'Resort', 'yellow'),
      createTee('tee-5', 'Forward', 'red'),
    ],
    editingTeeId: null,
    newTeeName: '',
    newTeeColor: 'white',
  },
  parameters: {
    docs: {
      description: {
        story: 'Resort course with descriptive tee names.',
      },
    },
  },
};

// =====================================================
// STORIES: ACCESSIBILITY
// =====================================================

/**
 * Touch targets demo
 */
export const TouchTargets: Story = {
  args: {
    courseName: 'Championship Course',
    tees: standardTees,
    editingTeeId: 'tee-blue',
    newTeeName: 'Blue',
    newTeeColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates touch target sizes. All interactive elements meet minimum 44x44pt guidelines.',
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
});
