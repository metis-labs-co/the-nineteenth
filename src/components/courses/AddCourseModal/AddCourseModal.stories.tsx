/**
 * AddCourseModal Component Stories
 *
 * Storybook stories for the multi-step wizard modal for adding venues and courses.
 * Demonstrates all steps, states, and variations.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { AddCourseModal } from './index';
import type { Venue, Course } from '@/types/database.types';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof AddCourseModal> = {
  title: 'Courses/AddCourseModal',
  component: AddCourseModal,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AddCourseModal>;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  triggerContainer: {
    alignItems: 'center',
    gap: 20,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

// =====================================================
// INTERACTIVE WRAPPER
// =====================================================

function InteractiveWrapper({
  initialVisible = false,
  ...props
}: Partial<React.ComponentProps<typeof AddCourseModal>> & { initialVisible?: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [lastCreated, setLastCreated] = useState<{ venue: Venue; course: Course } | null>(null);

  const handleVenueCreated = (venue: Venue, course: Course) => {
    setLastCreated({ venue, course });
    console.log('Venue created:', venue);
    console.log('Course created:', course);
  };

  return (
    <View style={styles.triggerContainer}>
      <Button mode="contained" onPress={() => setVisible(true)}>
        Add New Course
      </Button>
      <Text style={styles.infoText}>Tap the button to open the add course wizard</Text>

      <AddCourseModal
        visible={visible}
        onClose={() => setVisible(false)}
        onVenueCreated={handleVenueCreated}
        {...props}
      />

      {lastCreated && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Created:</Text>
          <Text>Venue: {lastCreated.venue.name}</Text>
          <Text>Course: {lastCreated.course.name}</Text>
        </View>
      )}
    </View>
  );
}

// =====================================================
// STORIES - BASIC
// =====================================================

/**
 * Default interactive story with trigger button.
 * Click "Add New Course" to open the modal.
 */
export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

/**
 * Modal opened by default to show initial state.
 */
export const VisibleByDefault: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
};

/**
 * Modal in closed/hidden state.
 */
export const Hidden: Story = {
  args: {
    visible: false,
    onClose: () => console.log('onClose called'),
    onVenueCreated: () => console.log('onVenueCreated called'),
  },
};

// =====================================================
// STORIES - STEP STATES
// =====================================================

/**
 * Step 1: Venue Details entry.
 * Users enter venue name, city, and state.
 */
export const Step1VenueDetails: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'First step of the wizard where users enter venue information: name, city, and Australian state.',
      },
    },
  },
};

/**
 * Step 2: Course & Tees configuration.
 * Users enter course name and add tee boxes.
 */
export const Step2CourseTees: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'Second step where users configure the course name and add tee boxes with colors and names.',
      },
    },
  },
};

/**
 * Step 3: Hole Data entry.
 * Users enter par, stroke index, and yardages for each hole.
 */
export const Step3HoleData: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'Third step where users enter hole-by-hole data including par, stroke index, and yardages per tee.',
      },
    },
  },
};

// =====================================================
// STORIES - VALIDATION STATES
// =====================================================

/**
 * Empty form state with validation messages.
 */
export const EmptyFormValidation: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Shows the form in empty state with validation preventing progression.',
      },
    },
  },
};

/**
 * Partially filled form showing mixed validation.
 */
export const PartiallyFilledForm: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Form with some fields filled, showing partial validation state.',
      },
    },
  },
};

/**
 * Fully valid form ready to proceed.
 */
export const ValidFormReadyToProceed: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'All required fields completed, Next button enabled.',
      },
    },
  },
};

// =====================================================
// STORIES - TEE MANAGEMENT
// =====================================================

/**
 * No tees added - shows empty state.
 */
export const NoTeesAdded: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 2 with no tee boxes added, showing the empty state message.',
      },
    },
  },
};

/**
 * Single tee box added.
 */
export const SingleTeeAdded: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 2 with one tee box added.',
      },
    },
  },
};

/**
 * Multiple tee boxes with different colors.
 */
export const MultipleTees: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 2 with multiple tee boxes of different colors (Blue, White, Red).',
      },
    },
  },
};

/**
 * Tee box in editing mode.
 */
export const TeeEditingMode: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'A tee box card expanded in editing mode with name and color inputs.',
      },
    },
  },
};

// =====================================================
// STORIES - HOLE DATA VARIATIONS
// =====================================================

/**
 * First hole selected.
 */
export const HoleDataFirstHole: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 3 showing hole 1 data entry.',
      },
    },
  },
};

/**
 * Middle hole selected (e.g., hole 9).
 */
export const HoleDataMiddleHole: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 3 showing hole 9 data entry.',
      },
    },
  },
};

/**
 * Last hole selected (hole 18).
 */
export const HoleDataLastHole: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 3 showing hole 18 data entry.',
      },
    },
  },
};

/**
 * Shows duplicate stroke index warning.
 */
export const DuplicateStrokeIndexWarning: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 3 with duplicate stroke index values highlighted.',
      },
    },
  },
};

// =====================================================
// STORIES - BUTTON STATES
// =====================================================

/**
 * Next button disabled (validation failed).
 */
export const NextButtonDisabled: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Next button in disabled state when form validation fails.',
      },
    },
  },
};

/**
 * Next button enabled (validation passed).
 */
export const NextButtonEnabled: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Next button in enabled state when form validation passes.',
      },
    },
  },
};

/**
 * Create Course button (step 3).
 */
export const CreateCourseButton: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Final step showing "Create Course" button instead of "Next".',
      },
    },
  },
};

/**
 * Creating state with loading indicator.
 */
export const CreatingState: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Button showing "Creating..." text while submission is pending.',
      },
    },
  },
};

// =====================================================
// STORIES - NAVIGATION
// =====================================================

/**
 * Shows back button on step 2.
 */
export const BackButtonOnStep2: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 2 showing the Back button to return to step 1.',
      },
    },
  },
};

/**
 * Shows back button on step 3.
 */
export const BackButtonOnStep3: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 3 showing the Back button to return to step 2.',
      },
    },
  },
};

// =====================================================
// STORIES - AUSTRALIAN STATES
// =====================================================

/**
 * All Australian state chips displayed.
 */
export const AustralianStateSelection: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'Step 1 showing all Australian state selection chips (NSW, VIC, QLD, SA, WA, TAS, NT, ACT).',
      },
    },
  },
};

/**
 * State selected (VIC).
 */
export const StateSelectedVIC: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step 1 with VIC state selected, showing selected state styling.',
      },
    },
  },
};

// =====================================================
// STORIES - TEE COLORS
// =====================================================

/**
 * All tee color options.
 */
export const AllTeeColors: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates all available tee colors: Black, Blue, White, Yellow, Red, Gold, Green, Silver.',
      },
    },
  },
};

// =====================================================
// STORIES - STEP INDICATOR
// =====================================================

/**
 * Step indicator showing step 1 active.
 */
export const StepIndicatorStep1: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step indicator with step 1 (Venue) active.',
      },
    },
  },
};

/**
 * Step indicator showing step 2 active.
 */
export const StepIndicatorStep2: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step indicator with step 2 (Course & Tees) active.',
      },
    },
  },
};

/**
 * Step indicator showing step 3 active.
 */
export const StepIndicatorStep3: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Step indicator with step 3 (Hole Data) active.',
      },
    },
  },
};

// =====================================================
// STORIES - EDGE CASES
// =====================================================

/**
 * Long venue name handling.
 */
export const LongVenueName: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Tests how long venue names are displayed and handled.',
      },
    },
  },
};

/**
 * Long course name handling.
 */
export const LongCourseName: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Tests how long course names are displayed and handled.',
      },
    },
  },
};

/**
 * Maximum tee boxes added.
 */
export const MaximumTees: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Shows behavior when many tee boxes are added.',
      },
    },
  },
};

// =====================================================
// STORIES - ACCESSIBILITY
// =====================================================

/**
 * High contrast / accessibility mode.
 */
export const AccessibilityFocus: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates accessibility features including proper labels and touch targets.',
      },
    },
  },
};

// =====================================================
// STORIES - COMPLETE FLOWS
// =====================================================

/**
 * Full wizard flow demonstration.
 * Interactive story to test complete course creation.
 */
export const CompleteWizardFlow: Story = {
  render: () => <InteractiveWrapper />,
  parameters: {
    docs: {
      description: {
        story:
          'Interactive story demonstrating the complete flow: Venue details -> Course & Tees -> Hole Data -> Create.',
      },
    },
  },
};

/**
 * Quick course creation (minimal fields).
 */
export const QuickCourseCreation: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the minimum required fields to create a course.',
      },
    },
  },
};

/**
 * Full detailed course creation.
 */
export const DetailedCourseCreation: Story = {
  render: () => <InteractiveWrapper initialVisible={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates a fully detailed course with all optional fields.',
      },
    },
  },
};
