/**
 * BottomSheet Storybook Stories
 *
 * Stories demonstrating the various configurations of the BottomSheet component.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { BottomSheet } from './BottomSheet';
import { spacing, borderRadius, typography } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof BottomSheet> = {
  title: 'Common/BottomSheet',
  component: BottomSheet,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    // Default args required by BottomSheetProps - wrapper handles these internally
    visible: false,
    onClose: () => {},
  },
  argTypes: {
    visible: { control: 'boolean' },
    height: {
      control: { type: 'select' },
      options: ['full', 0.3, 0.5, 0.8],
    },
    showBackdrop: { control: 'boolean' },
    closeOnBackdropPress: { control: 'boolean' },
    enableSwipeToDismiss: { control: 'boolean' },
    showCloseButton: { control: 'boolean' },
    showHandle: { control: 'boolean' },
    safeAreaBottom: { control: 'boolean' },
    safeAreaTop: { control: 'boolean' },
  },
};

export default meta;
// Custom Story type - the wrapper handles visible and onClose internally,
// so we use a more permissive type that doesn't require them in args
type Story = Omit<StoryObj<typeof BottomSheet>, 'args'> & {
  args?: Partial<React.ComponentProps<typeof BottomSheet>>;
};

// ===========================================================================
// WRAPPER COMPONENT FOR INTERACTIVE STORIES
// ===========================================================================

// Wrapper props - visible and onClose are optional since the wrapper manages them
type BottomSheetWrapperProps = Omit<React.ComponentProps<typeof BottomSheet>, 'visible' | 'onClose'> & {
  buttonText?: string;
  visible?: boolean;
  onClose?: () => void;
};

function BottomSheetWrapper({
  children,
  buttonText = 'Open Bottom Sheet',
  ...props
}: BottomSheetWrapperProps) {
  const [visible, setVisible] = useState(props.visible ?? false);

  return (
    <View style={wrapperStyles.container}>
      <TouchableOpacity
        style={wrapperStyles.button}
        onPress={() => setVisible(true)}
      >
        <Text style={wrapperStyles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>

      <BottomSheet
        {...props}
        visible={visible}
        onClose={() => setVisible(false)}
      >
        {children}
      </BottomSheet>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    ...typography.bodyBold,
  },
});

// ===========================================================================
// CONTENT COMPONENTS
// ===========================================================================

function SimpleContent() {
  return (
    <View style={contentStyles.container}>
      <Text style={contentStyles.title}>Bottom Sheet Content</Text>
      <Text style={contentStyles.text}>
        This is a simple bottom sheet with some content. You can add any React
        Native components here.
      </Text>
    </View>
  );
}

function FormContent() {
  return (
    <View style={contentStyles.container}>
      <Text style={contentStyles.title}>Add New Item</Text>
      <View style={contentStyles.inputPlaceholder}>
        <Text style={contentStyles.inputText}>Name input placeholder</Text>
      </View>
      <View style={contentStyles.inputPlaceholder}>
        <Text style={contentStyles.inputText}>Description input placeholder</Text>
      </View>
      <TouchableOpacity style={contentStyles.submitButton}>
        <Text style={contentStyles.submitText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScrollableContent() {
  return (
    <ScrollView style={contentStyles.scrollContainer}>
      <Text style={contentStyles.title}>Scrollable Content</Text>
      {Array.from({ length: 20 }, (_, i) => (
        <View key={i} style={contentStyles.listItem}>
          <Text style={contentStyles.listText}>Item {i + 1}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const contentStyles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  scrollContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: '#1A1A1A',
  },
  text: {
    ...typography.body,
    color: '#666666',
    lineHeight: 24,
  },
  inputPlaceholder: {
    backgroundColor: '#F5F5F5',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  inputText: {
    color: '#999999',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitText: {
    color: '#FFFFFF',
    ...typography.bodyBold,
  },
  listItem: {
    backgroundColor: '#F5F5F5',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  listText: {
    ...typography.body,
    color: '#333333',
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default partial bottom sheet (80% height)
 */
export const Default: Story = {
  render: () => (
    <BottomSheetWrapper title="Default Sheet">
      <SimpleContent />
    </BottomSheetWrapper>
  ),
};

/**
 * Full-screen bottom sheet
 */
export const FullScreen: Story = {
  render: () => (
    <BottomSheetWrapper
      title="Full Screen Sheet"
      height="full"
      buttonText="Open Full Screen"
    >
      <ScrollableContent />
    </BottomSheetWrapper>
  ),
};

/**
 * Small bottom sheet (30% height)
 */
export const Small: Story = {
  render: () => (
    <BottomSheetWrapper
      title="Quick Action"
      height={0.3}
      buttonText="Open Small Sheet"
    >
      <View style={{ padding: spacing.lg }}>
        <Text style={{ textAlign: 'center', marginBottom: spacing.md }}>
          Choose an option
        </Text>
        <TouchableOpacity style={contentStyles.submitButton}>
          <Text style={contentStyles.submitText}>Option 1</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetWrapper>
  ),
};

/**
 * Half-screen bottom sheet (50% height)
 */
export const HalfScreen: Story = {
  render: () => (
    <BottomSheetWrapper
      title="Form"
      height={0.5}
      buttonText="Open Half Screen"
    >
      <FormContent />
    </BottomSheetWrapper>
  ),
};

/**
 * Without title (just handle)
 */
export const NoTitle: Story = {
  render: () => (
    <BottomSheetWrapper height={0.4} showHandle={true}>
      <View style={{ padding: spacing.lg }}>
        <Text style={contentStyles.text}>
          This sheet has no title, just a drag handle.
        </Text>
      </View>
    </BottomSheetWrapper>
  ),
};

/**
 * Without close button
 */
export const NoCloseButton: Story = {
  render: () => (
    <BottomSheetWrapper
      title="No Close Button"
      showCloseButton={false}
      buttonText="Open (No X Button)"
    >
      <SimpleContent />
    </BottomSheetWrapper>
  ),
};

/**
 * With header left/right actions
 */
export const WithHeaderActions: Story = {
  render: () => (
    <BottomSheetWrapper
      title="Edit Item"
      headerLeft={
        <TouchableOpacity>
          <Text style={{ color: '#2E7D32' }}>Cancel</Text>
        </TouchableOpacity>
      }
      headerRight={
        <TouchableOpacity>
          <Text style={{ color: '#2E7D32', fontWeight: '600' }}>Save</Text>
        </TouchableOpacity>
      }
      showCloseButton={false}
      buttonText="Open With Actions"
    >
      <FormContent />
    </BottomSheetWrapper>
  ),
};

/**
 * No backdrop
 */
export const NoBackdrop: Story = {
  render: () => (
    <BottomSheetWrapper
      title="No Backdrop"
      showBackdrop={false}
      buttonText="Open (No Backdrop)"
    >
      <SimpleContent />
    </BottomSheetWrapper>
  ),
};

/**
 * Backdrop doesn't close on tap
 */
export const BackdropNoClose: Story = {
  render: () => (
    <BottomSheetWrapper
      title="Must Use X Button"
      closeOnBackdropPress={false}
      buttonText="Open (Backdrop Won't Close)"
    >
      <View style={{ padding: spacing.lg }}>
        <Text style={contentStyles.text}>
          Tapping the backdrop won't close this sheet. Use the X button or swipe
          down to close.
        </Text>
      </View>
    </BottomSheetWrapper>
  ),
};

/**
 * Swipe disabled
 */
export const SwipeDisabled: Story = {
  render: () => (
    <BottomSheetWrapper
      title="Swipe Disabled"
      enableSwipeToDismiss={false}
      buttonText="Open (No Swipe)"
    >
      <View style={{ padding: spacing.lg }}>
        <Text style={contentStyles.text}>
          This sheet cannot be dismissed by swiping down. Use the X button or
          tap the backdrop.
        </Text>
      </View>
    </BottomSheetWrapper>
  ),
};

/**
 * Custom header
 */
export const CustomHeader: Story = {
  render: () => (
    <BottomSheetWrapper
      customHeader={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
            backgroundColor: '#2E7D32',
          }}
        >
          <Text style={{ color: '#FFFFFF', ...typography.h4 }}>
            Custom Green Header
          </Text>
        </View>
      }
      buttonText="Open (Custom Header)"
    >
      <SimpleContent />
    </BottomSheetWrapper>
  ),
};

/**
 * Scrollable content
 */
export const WithScrollableContent: Story = {
  render: () => (
    <BottomSheetWrapper title="Long List" buttonText="Open Scrollable">
      <ScrollableContent />
    </BottomSheetWrapper>
  ),
};
