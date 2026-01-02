/**
 * BottomSheetHeader Stories
 *
 * Visual testing stories for the BottomSheetHeader component.
 * Demonstrates different configurations and states.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { BottomSheetHeader } from './BottomSheetHeader';
import { Text, Icon } from 'react-native-paper';

// ===========================================================================
// STYLES (defined first to avoid hoisting issues)
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});

const headerStyles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#666666',
  },
  saveText: {
    fontSize: 16,
    color: '#006B3F',
    fontWeight: '600',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

const meta: Meta<typeof BottomSheetHeader> = {
  title: 'Common/BottomSheet/BottomSheetHeader',
  component: BottomSheetHeader,
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <Story />
        </View>
      </View>
    ),
  ],
  argTypes: {
    title: {
      control: 'text',
      description: 'Title text displayed in the header',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show the close button',
    },
    showHandle: {
      control: 'boolean',
      description: 'Whether to show the drag handle',
    },
    onClose: {
      action: 'closed',
      description: 'Called when close button is pressed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BottomSheetHeader>;

// ===========================================================================
// DEFAULT STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    title: 'Sheet Title',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const WithTitle: Story = {
  args: {
    title: 'Add Player',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const WithoutTitle: Story = {
  args: {
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'This is a very long title that should be truncated',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

// ===========================================================================
// CLOSE BUTTON VARIANTS
// ===========================================================================

export const WithCloseButton: Story = {
  args: {
    title: 'With Close Button',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const WithoutCloseButton: Story = {
  args: {
    title: 'Without Close Button',
    showCloseButton: false,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

// ===========================================================================
// HANDLE VARIANTS
// ===========================================================================

export const WithHandle: Story = {
  args: {
    title: 'With Handle',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const WithoutHandle: Story = {
  args: {
    title: 'Without Handle',
    showCloseButton: true,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
  },
};

// ===========================================================================
// HEADER LEFT STORIES
// ===========================================================================

export const WithBackButton: Story = {
  args: {
    title: 'Detail View',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Back pressed')}
        style={headerStyles.backButton}
      >
        <Icon source="arrow-left" size={24} color="#666666" />
      </TouchableOpacity>
    ),
  },
};

export const WithTextBackButton: Story = {
  args: {
    title: 'Settings',
    showCloseButton: true,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Cancel pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    ),
  },
};

export const WithIconLeft: Story = {
  args: {
    title: 'Filter Options',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <View style={headerStyles.iconWrapper}>
        <Icon source="filter" size={20} color="#666666" />
      </View>
    ),
  },
};

// ===========================================================================
// HEADER RIGHT STORIES
// ===========================================================================

export const WithSaveButton: Story = {
  args: {
    title: 'Edit Profile',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Save pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.saveText}>Save</Text>
      </TouchableOpacity>
    ),
  },
};

export const WithDoneButton: Story = {
  args: {
    title: 'Select Players',
    showCloseButton: false,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Done pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.saveText}>Done</Text>
      </TouchableOpacity>
    ),
  },
};

export const WithIconRight: Story = {
  args: {
    title: 'Search',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Search pressed')}
        style={headerStyles.iconWrapper}
      >
        <Icon source="magnify" size={24} color="#666666" />
      </TouchableOpacity>
    ),
  },
};

// ===========================================================================
// COMBINED HEADER CONTENT
// ===========================================================================

export const WithLeftAndRight: Story = {
  args: {
    title: 'Edit Round',
    showCloseButton: false,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Cancel pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    ),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Save pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.saveText}>Save</Text>
      </TouchableOpacity>
    ),
  },
};

export const WithLeftRightAndClose: Story = {
  args: {
    title: 'Complete Header',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Back pressed')}
        style={headerStyles.backButton}
      >
        <Icon source="arrow-left" size={24} color="#666666" />
      </TouchableOpacity>
    ),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Action pressed')}
        style={headerStyles.iconWrapper}
      >
        <Icon source="dots-vertical" size={24} color="#666666" />
      </TouchableOpacity>
    ),
  },
};

export const NavigationStyle: Story = {
  args: {
    title: 'Player Details',
    showCloseButton: false,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Back pressed')}
        style={headerStyles.backButton}
      >
        <Icon source="chevron-left" size={28} color="#006B3F" />
      </TouchableOpacity>
    ),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Edit pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.saveText}>Edit</Text>
      </TouchableOpacity>
    ),
  },
};

// ===========================================================================
// SPECIAL USE CASES
// ===========================================================================

export const MinimalHeader: Story = {
  args: {
    showCloseButton: false,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
  },
};

export const HandleOnly: Story = {
  args: {
    showCloseButton: false,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'Title Only',
    showCloseButton: false,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
  },
};

export const FullScreenStyle: Story = {
  args: {
    title: 'Full Screen Sheet',
    showCloseButton: true,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Back pressed')}
        style={headerStyles.backButton}
      >
        <Icon source="arrow-left" size={24} color="#666666" />
      </TouchableOpacity>
    ),
  },
};

export const PartialSheetStyle: Story = {
  args: {
    title: 'Partial Sheet',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

// ===========================================================================
// GOLF-SPECIFIC USE CASES
// ===========================================================================

export const AddPlayerHeader: Story = {
  args: {
    title: 'Add Player',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
  },
};

export const SelectCourseHeader: Story = {
  args: {
    title: 'Select Course',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Search pressed')}
        style={headerStyles.iconWrapper}
      >
        <Icon source="magnify" size={24} color="#666666" />
      </TouchableOpacity>
    ),
  },
};

export const ScorecardHeader: Story = {
  args: {
    title: 'Scorecard',
    showCloseButton: true,
    showHandle: false,
    onClose: () => console.log('Close pressed'),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Share pressed')}
        style={headerStyles.iconWrapper}
      >
        <Icon source="share-variant" size={24} color="#006B3F" />
      </TouchableOpacity>
    ),
  },
};

export const FilterPlayersHeader: Story = {
  args: {
    title: 'Filter Players',
    showCloseButton: false,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerLeft: (
      <TouchableOpacity
        onPress={() => console.log('Reset pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.cancelText}>Reset</Text>
      </TouchableOpacity>
    ),
    headerRight: (
      <TouchableOpacity
        onPress={() => console.log('Apply pressed')}
        style={headerStyles.textButton}
      >
        <Text style={headerStyles.saveText}>Apply</Text>
      </TouchableOpacity>
    ),
  },
};

export const RoundDetailsHeader: Story = {
  args: {
    title: 'Round Details',
    showCloseButton: true,
    showHandle: true,
    onClose: () => console.log('Close pressed'),
    headerRight: (
      <View style={headerStyles.iconRow}>
        <TouchableOpacity
          onPress={() => console.log('Edit pressed')}
          style={headerStyles.iconWrapper}
        >
          <Icon source="pencil" size={20} color="#666666" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => console.log('Share pressed')}
          style={headerStyles.iconWrapper}
        >
          <Icon source="share-variant" size={20} color="#666666" />
        </TouchableOpacity>
      </View>
    ),
  },
};

