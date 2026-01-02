/**
 * ConfirmationDialog Storybook Stories
 *
 * Stories demonstrating the various configurations of the ConfirmationDialog component.
 * Shows different use cases, button variants, loading states, and icons.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ConfirmationDialog> = {
  title: 'Common/ConfirmationDialog',
  component: ConfirmationDialog,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    visible: { control: 'boolean' },
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    confirmVariant: {
      control: { type: 'select' },
      options: ['primary', 'destructive'],
    },
    loading: { control: 'boolean' },
    icon: { control: 'text' },
    iconColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmationDialog>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

function DemoButton({
  label,
  onPress,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'destructive' | 'primary';
}) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'destructive':
        return { backgroundColor: '#EF4444' };
      case 'primary':
        return { backgroundColor: '#1E7F5E' };
      default:
        return { backgroundColor: '#6B7280' };
    }
  };

  return (
    <TouchableOpacity
      style={[wrapperStyles.demoButton, getButtonStyle()]}
      onPress={onPress}
    >
      <Text style={wrapperStyles.demoButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.md,
  },
  demoButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    visible: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed with this action?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmVariant: 'primary',
    loading: false,
    onConfirm: () => console.log('Confirmed'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const Primary: Story = {
  args: {
    visible: true,
    title: 'Save Changes',
    message: 'Do you want to save your changes before leaving?',
    confirmLabel: 'Save',
    cancelLabel: 'Discard',
    confirmVariant: 'primary',
    onConfirm: () => console.log('Saved'),
    onCancel: () => console.log('Discarded'),
  },
};

export const Destructive: Story = {
  args: {
    visible: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmVariant: 'destructive',
    onConfirm: () => console.log('Deleted'),
    onCancel: () => console.log('Cancelled'),
  },
};

// ===========================================================================
// LOADING STATES
// ===========================================================================

export const Loading: Story = {
  args: {
    visible: true,
    title: 'Deleting Competition',
    message: 'Please wait while we delete the competition...',
    confirmLabel: 'Delete',
    confirmVariant: 'destructive',
    loading: true,
    onConfirm: () => {},
    onCancel: () => console.log('Cancelled'),
  },
};

export const LoadingPrimary: Story = {
  args: {
    visible: true,
    title: 'Saving...',
    message: 'Please wait while we save your changes.',
    confirmLabel: 'Save',
    confirmVariant: 'primary',
    loading: true,
    onConfirm: () => {},
    onCancel: () => console.log('Cancelled'),
  },
};

// ===========================================================================
// WITH ICONS
// ===========================================================================

export const WithDeleteIcon: Story = {
  args: {
    visible: true,
    title: 'Delete Competition',
    message:
      'Are you sure you want to delete this competition? All rounds, scores, and leaderboard data will be permanently removed.',
    confirmLabel: 'Delete',
    confirmVariant: 'destructive',
    icon: 'delete',
    onConfirm: () => console.log('Deleted'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const WithAlertIcon: Story = {
  args: {
    visible: true,
    title: 'Warning',
    message: 'This action may affect other players in the competition.',
    confirmLabel: 'Continue',
    confirmVariant: 'primary',
    icon: 'alert',
    onConfirm: () => console.log('Continued'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const WithCheckIcon: Story = {
  args: {
    visible: true,
    title: 'Finalise Round',
    message:
      'This will lock all scores and calculate the final leaderboard. You cannot edit scores after this.',
    confirmLabel: 'Finalise',
    confirmVariant: 'primary',
    icon: 'check-circle',
    onConfirm: () => console.log('Finalised'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const WithLogoutIcon: Story = {
  args: {
    visible: true,
    title: 'Log Out',
    message: 'Are you sure you want to log out of your account?',
    confirmLabel: 'Log Out',
    confirmVariant: 'destructive',
    icon: 'logout',
    onConfirm: () => console.log('Logged out'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const WithCustomIconColor: Story = {
  args: {
    visible: true,
    title: 'Custom Icon Color',
    message: 'This dialog shows a custom icon color.',
    confirmLabel: 'OK',
    confirmVariant: 'primary',
    icon: 'star',
    iconColor: '#FFD700',
    onConfirm: () => console.log('OK'),
    onCancel: () => console.log('Cancelled'),
  },
};

// ===========================================================================
// CUSTOM LABELS
// ===========================================================================

export const CustomLabels: Story = {
  args: {
    visible: true,
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. What would you like to do?',
    confirmLabel: 'Save & Exit',
    cancelLabel: 'Discard Changes',
    confirmVariant: 'primary',
    onConfirm: () => console.log('Saved and exited'),
    onCancel: () => console.log('Discarded'),
  },
};

export const ShortLabels: Story = {
  args: {
    visible: true,
    title: 'Confirm',
    message: 'Are you sure?',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
    confirmVariant: 'primary',
    onConfirm: () => console.log('Yes'),
    onCancel: () => console.log('No'),
  },
};

export const LongLabels: Story = {
  args: {
    visible: true,
    title: 'Delete All Data',
    message: 'This will permanently delete all your competition data including scores and settings.',
    confirmLabel: 'Yes, Delete Everything',
    cancelLabel: 'No, Keep My Data',
    confirmVariant: 'destructive',
    onConfirm: () => console.log('Deleted'),
    onCancel: () => console.log('Kept'),
  },
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const DeleteCompetition: Story = {
  args: {
    visible: true,
    title: 'Delete Competition',
    message:
      'Are you sure you want to delete "Summer Golf League 2024"? This action cannot be undone and all associated data will be lost.',
    confirmLabel: 'Delete',
    confirmVariant: 'destructive',
    icon: 'delete',
    onConfirm: () => console.log('Competition deleted'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const LeaveCompetition: Story = {
  args: {
    visible: true,
    title: 'Leave Competition',
    message:
      'Are you sure you want to leave this competition? Your scores will be removed from the leaderboard.',
    confirmLabel: 'Leave',
    confirmVariant: 'destructive',
    icon: 'exit-to-app',
    onConfirm: () => console.log('Left competition'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const SubmitScorecard: Story = {
  args: {
    visible: true,
    title: 'Submit Scorecard',
    message:
      'Once submitted, you cannot edit your scores. Please make sure all scores are correct before submitting.',
    confirmLabel: 'Submit',
    confirmVariant: 'primary',
    icon: 'check-circle',
    onConfirm: () => console.log('Scorecard submitted'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const RemovePlayer: Story = {
  args: {
    visible: true,
    title: 'Remove Player',
    message:
      'Are you sure you want to remove John Smith from this competition? Their scores will be removed.',
    confirmLabel: 'Remove',
    confirmVariant: 'destructive',
    icon: 'account-remove',
    onConfirm: () => console.log('Player removed'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const FinaliseRound: Story = {
  args: {
    visible: true,
    title: 'Finalise Round',
    message:
      'This will lock all scores and calculate the final leaderboard for Round 2. You will not be able to edit scores after this.',
    confirmLabel: 'Finalise',
    confirmVariant: 'primary',
    icon: 'flag-checkered',
    onConfirm: () => console.log('Round finalised'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const DiscardChanges: Story = {
  args: {
    visible: true,
    title: 'Discard Changes',
    message: 'You have unsaved changes. Are you sure you want to discard them?',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep Editing',
    confirmVariant: 'destructive',
    onConfirm: () => console.log('Changes discarded'),
    onCancel: () => console.log('Kept editing'),
  },
};

export const CancelRound: Story = {
  args: {
    visible: true,
    title: 'Cancel Round',
    message:
      'Are you sure you want to cancel this round? All scores entered will be lost.',
    confirmLabel: 'Cancel Round',
    cancelLabel: 'Keep Round',
    confirmVariant: 'destructive',
    icon: 'close-circle',
    onConfirm: () => console.log('Round cancelled'),
    onCancel: () => console.log('Round kept'),
  },
};

export const ResetScores: Story = {
  args: {
    visible: true,
    title: 'Reset Scores',
    message:
      'This will reset all scores for this hole to zero. Are you sure you want to continue?',
    confirmLabel: 'Reset',
    confirmVariant: 'destructive',
    icon: 'refresh',
    onConfirm: () => console.log('Scores reset'),
    onCancel: () => console.log('Cancelled'),
  },
};

// ===========================================================================
// INTERACTIVE DEMOS
// ===========================================================================

function InteractiveDemo() {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowDialog(false);
    }, 2000);
  };

  return (
    <StoryWrapper>
      <Section title="Interactive Demo">
        <DemoButton
          label="Show Delete Dialog"
          onPress={() => setShowDialog(true)}
          variant="destructive"
        />
        <ConfirmationDialog
          visible={showDialog}
          title="Delete Competition"
          message="Are you sure you want to delete this competition? This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="destructive"
          icon="delete"
          loading={isLoading}
          onConfirm={handleConfirm}
          onCancel={() => setShowDialog(false)}
        />
      </Section>
    </StoryWrapper>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

function MultipleDialogsDemo() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  return (
    <StoryWrapper>
      <Section title="Different Dialog Types">
        <DemoButton
          label="Delete"
          onPress={() => setActiveDialog('delete')}
          variant="destructive"
        />
        <DemoButton
          label="Submit"
          onPress={() => setActiveDialog('submit')}
          variant="primary"
        />
        <DemoButton
          label="Log Out"
          onPress={() => setActiveDialog('logout')}
          variant="default"
        />
      </Section>

      <ConfirmationDialog
        visible={activeDialog === 'delete'}
        title="Delete Competition"
        message="This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        icon="delete"
        onConfirm={() => setActiveDialog(null)}
        onCancel={() => setActiveDialog(null)}
      />

      <ConfirmationDialog
        visible={activeDialog === 'submit'}
        title="Submit Scorecard"
        message="Are you ready to submit?"
        confirmLabel="Submit"
        confirmVariant="primary"
        icon="check-circle"
        onConfirm={() => setActiveDialog(null)}
        onCancel={() => setActiveDialog(null)}
      />

      <ConfirmationDialog
        visible={activeDialog === 'logout'}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        icon="logout"
        onConfirm={() => setActiveDialog(null)}
        onCancel={() => setActiveDialog(null)}
      />
    </StoryWrapper>
  );
}

export const MultipleDialogs: Story = {
  render: () => <MultipleDialogsDemo />,
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongTitle: Story = {
  args: {
    visible: true,
    title: 'This is a Very Long Title That Might Need to Wrap to Multiple Lines',
    message: 'Are you sure you want to proceed?',
    confirmLabel: 'OK',
    onConfirm: () => console.log('OK'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const LongMessage: Story = {
  args: {
    visible: true,
    title: 'Important Notice',
    message:
      'This is a very long message that explains the action in great detail. It provides all the context the user needs to make an informed decision. The message continues to explain the implications of the action, what data will be affected, and any other relevant information that the user should consider before confirming or cancelling.',
    confirmLabel: 'I Understand',
    onConfirm: () => console.log('Understood'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const MinimalContent: Story = {
  args: {
    visible: true,
    title: 'Sure?',
    message: 'OK?',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
    onConfirm: () => console.log('Yes'),
    onCancel: () => console.log('No'),
  },
};

export const WithEmojis: Story = {
  args: {
    visible: true,
    title: 'Warning',
    message: 'This action is permanent! Are you absolutely sure?',
    confirmLabel: 'Yes, Delete',
    confirmVariant: 'destructive',
    icon: 'alert',
    onConfirm: () => console.log('Deleted'),
    onCancel: () => console.log('Cancelled'),
  },
};

// ===========================================================================
// ALL VARIANTS SHOWCASE
// ===========================================================================

function AllVariantsShowcase() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const dialogs = [
    {
      id: 'primary',
      label: 'Primary',
      variant: 'primary' as const,
      title: 'Primary Action',
      message: 'This is a primary confirmation dialog.',
      confirmLabel: 'Confirm',
    },
    {
      id: 'destructive',
      label: 'Destructive',
      variant: 'destructive' as const,
      title: 'Destructive Action',
      message: 'This is a destructive confirmation dialog.',
      confirmLabel: 'Delete',
    },
    {
      id: 'with-icon',
      label: 'With Icon',
      variant: 'primary' as const,
      title: 'Action with Icon',
      message: 'This dialog includes an icon.',
      confirmLabel: 'Continue',
      icon: 'check-circle',
    },
    {
      id: 'loading',
      label: 'Loading',
      variant: 'primary' as const,
      title: 'Processing',
      message: 'This dialog shows loading state.',
      confirmLabel: 'Submit',
      loading: true,
    },
  ];

  return (
    <StoryWrapper>
      <Section title="All Variants">
        {dialogs.map((dialog) => (
          <DemoButton
            key={dialog.id}
            label={dialog.label}
            onPress={() => setActiveDialog(dialog.id)}
            variant={dialog.variant === 'destructive' ? 'destructive' : 'primary'}
          />
        ))}
      </Section>

      {dialogs.map((dialog) => (
        <ConfirmationDialog
          key={dialog.id}
          visible={activeDialog === dialog.id}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          confirmVariant={dialog.variant}
          icon={dialog.icon}
          loading={dialog.loading}
          onConfirm={() => setActiveDialog(null)}
          onCancel={() => setActiveDialog(null)}
        />
      ))}
    </StoryWrapper>
  );
}

export const AllVariants: Story = {
  render: () => <AllVariantsShowcase />,
};

// ===========================================================================
// PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    visible: true,
    title: 'Playground Dialog',
    message: 'Use the controls to customize this dialog.',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmVariant: 'primary',
    loading: false,
    icon: '',
    iconColor: '',
    onConfirm: () => console.log('Confirmed'),
    onCancel: () => console.log('Cancelled'),
  },
};
