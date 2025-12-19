/**
 * ApiSearchModal Stories
 *
 * Storybook stories for the course search modal component.
 * Shows various states: initial, loading, with results, errors, API unavailable.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ApiSearchModal } from './ApiSearchModal';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof ApiSearchModal> = {
  title: 'Courses/ApiSearchModal',
  component: ApiSearchModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal for searching and importing golf courses from the external GolfAPI.io service.',
      },
    },
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the modal is visible',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when modal is closed',
    },
    onCourseImported: {
      action: 'course imported',
      description: 'Callback when a course is imported',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ApiSearchModal>;

// =====================================================
// WRAPPER COMPONENT
// =====================================================

/**
 * Wrapper that provides a button to open the modal
 */
function ModalWrapper({
  initialVisible = true,
  ...props
}: React.ComponentProps<typeof ApiSearchModal> & { initialVisible?: boolean }) {
  const [visible, setVisible] = useState(initialVisible);

  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={() => setVisible(true)}>
        Open Search Modal
      </Button>
      <ApiSearchModal
        {...props}
        visible={visible}
        onClose={() => {
          setVisible(false);
          props.onClose?.();
        }}
      />
    </View>
  );
}

// =====================================================
// STORIES
// =====================================================

/**
 * Default state - modal visible with search ready
 */
export const Default: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
    onCourseImported: (course) => console.log('Course imported:', course),
  },
};

/**
 * Initially closed - use button to open
 */
export const InitiallyClosed: Story = {
  render: (args) => <ModalWrapper {...args} initialVisible={false} />,
  args: {
    visible: false,
    onClose: () => console.log('Modal closed'),
    onCourseImported: (course) => console.log('Course imported:', course),
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal starts closed. Click the button to open it.',
      },
    },
  },
};

/**
 * Interactive demo showing the full workflow
 */
export const InteractiveDemo: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    const [importedCourses, setImportedCourses] = useState<string[]>([]);

    return (
      <View style={styles.demoContainer}>
        <View style={styles.demoHeader}>
          <Text variant="titleMedium">Search & Import Demo</Text>
          <Text variant="bodySmall">
            Search for courses and import them to your database
          </Text>
        </View>

        <Button mode="contained" onPress={() => setVisible(true)}>
          Open Course Search
        </Button>

        {importedCourses.length > 0 && (
          <View style={styles.importedList}>
            <Text variant="labelMedium">Imported Courses:</Text>
            {importedCourses.map((name, index) => (
              <Text key={index} variant="bodySmall">
                • {name}
              </Text>
            ))}
          </View>
        )}

        <ApiSearchModal
          visible={visible}
          onClose={() => setVisible(false)}
          onCourseImported={(course) => {
            setImportedCourses((prev) => [...prev, course.name || 'Unknown']);
          }}
        />
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Full interactive demo showing the search and import workflow. Imported courses are tracked below the button.',
      },
    },
  },
};

/**
 * State filter example
 */
export const WithStateFilter: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows all Australian state filter chips. Click a chip to filter courses by state.',
      },
    },
  },
};

/**
 * For testing loading states
 */
export const LoadingState: Story = {
  render: (args) => (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.note}>
        Note: Loading state is shown when API search is in progress.
        {'\n'}Try searching for a course name to see the loader.
      </Text>
      <ModalWrapper {...args} />
    </View>
  ),
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The loading state appears when searching for courses. A golf ball loader is shown with "Searching courses..." text.',
      },
    },
  },
};

/**
 * Dark mode version
 */
export const DarkMode: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'The modal in dark mode. Colors automatically adapt to the theme.',
      },
    },
  },
};

/**
 * Empty search result
 */
export const EmptySearch: Story = {
  render: (args) => (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.note}>
        Note: Empty state appears when no courses match your search.
        {'\n'}Try searching for "xyz123" to see the empty state.
      </Text>
      <ModalWrapper {...args} />
    </View>
  ),
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the empty state message when no courses match the search query.',
      },
    },
  },
};

/**
 * API Unavailable state
 */
export const ApiUnavailable: Story = {
  render: (args) => (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.note}>
        Note: This state appears when GOLF_API_KEY is not configured.
        {'\n'}The mock below simulates this state.
      </Text>
      <View style={styles.mockUnavailable}>
        <Text variant="titleMedium">API Not Configured</Text>
        <Text variant="bodyMedium" style={styles.unavailableText}>
          Course search API is not available. Please configure your GolfAPI.io
          credentials.
        </Text>
      </View>
    </View>
  ),
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'When the GolfAPI.io credentials are not configured, this state is shown instead of the search interface.',
      },
    },
  },
};

/**
 * Search with results
 */
export const WithResults: Story = {
  render: (args) => (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.note}>
        Note: Search results show both cached (local) courses and API results.
        {'\n'}Cached courses have a "Saved" badge, API results have an "Import"
        button.
      </Text>
      <ModalWrapper {...args} />
    </View>
  ),
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
    onCourseImported: (course) => console.log('Imported:', course),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Results display shows course cards with name, location, and import/saved status.',
      },
    },
  },
};

/**
 * Error state
 */
export const ErrorState: Story = {
  render: (args) => (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.note}>
        Note: Error states appear when the API request fails.
        {'\n'}A warning banner is shown for partial failures (API error but cached
        results available).
      </Text>
      <ModalWrapper {...args} />
    </View>
  ),
  args: {
    visible: true,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Error handling shows appropriate messages for network failures or API errors.',
      },
    },
  },
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  demoHeader: {
    marginBottom: 16,
  },
  importedList: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    gap: 4,
  },
  note: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    paddingHorizontal: 20,
  },
  mockUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    gap: 12,
  },
  unavailableText: {
    textAlign: 'center',
    color: '#666',
    maxWidth: 280,
  },
});
