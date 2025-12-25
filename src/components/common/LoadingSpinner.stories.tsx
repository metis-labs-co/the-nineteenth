/**
 * LoadingSpinner Storybook Stories
 *
 * Stories demonstrating the various configurations of the LoadingSpinner component.
 * Shows size variants, full screen vs inline modes, message display, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Common/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size of the spinner: sm (24px), md (36px), lg (48px)',
    },
    message: {
      control: { type: 'text' },
      description: 'Optional loading message displayed below the spinner',
    },
    fullScreen: {
      control: { type: 'boolean' },
      description: 'Whether spinner fills container and centers itself',
    },
    color: {
      control: { type: 'color' },
      description: 'Color prop (kept for API compatibility, not used with GolfBallLoader)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

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

function SpinnerRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={wrapperStyles.spinnerRow}>
      <View style={wrapperStyles.spinnerContainer}>{children}</View>
      <Text style={wrapperStyles.spinnerLabel}>{label}</Text>
    </View>
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
    gap: spacing.lg,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 8,
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default loading spinner with medium size in full screen mode.
 * The golf ball rotates continuously to indicate loading.
 */
export const Default: Story = {
  args: {
    size: 'md',
    fullScreen: true,
  },
};

/**
 * Small loading spinner (24px).
 * Best for inline loading indicators, buttons, or compact spaces.
 */
export const Small: Story = {
  args: {
    size: 'sm',
    fullScreen: true,
  },
};

/**
 * Medium loading spinner (36px).
 * The default size, suitable for most loading contexts.
 */
export const Medium: Story = {
  args: {
    size: 'md',
    fullScreen: true,
  },
};

/**
 * Large loading spinner (48px).
 * Best for full-screen loading states or prominent indicators.
 */
export const Large: Story = {
  args: {
    size: 'lg',
    fullScreen: true,
  },
};

// ===========================================================================
// WITH MESSAGE
// ===========================================================================

/**
 * Loading spinner with a simple message.
 */
export const WithMessage: Story = {
  args: {
    size: 'md',
    message: 'Loading...',
    fullScreen: true,
  },
};

/**
 * Loading spinner with a detailed message.
 */
export const WithDetailedMessage: Story = {
  args: {
    size: 'lg',
    message: 'Loading competition data...',
    fullScreen: true,
  },
};

/**
 * Loading spinner with a long message.
 */
export const WithLongMessage: Story = {
  args: {
    size: 'md',
    message: 'Please wait while we fetch your scorecard and update the leaderboard...',
    fullScreen: true,
  },
};

// ===========================================================================
// SIZE COMPARISON
// ===========================================================================

/**
 * Comparison of all three size variants.
 */
export const SizeComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Variants">
        <SpinnerRow label="Small (24px) - Best for inline/buttons">
          <LoadingSpinner size="sm" fullScreen={false} />
        </SpinnerRow>
        <SpinnerRow label="Medium (36px) - Default size">
          <LoadingSpinner size="md" fullScreen={false} />
        </SpinnerRow>
        <SpinnerRow label="Large (48px) - Full screen loading">
          <LoadingSpinner size="lg" fullScreen={false} />
        </SpinnerRow>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * All sizes displayed in a row for easy comparison.
 */
export const SizesInRow: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Sizes in Row">
        <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'center' }}>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <LoadingSpinner size="sm" fullScreen={false} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>sm</Text>
          </View>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <LoadingSpinner size="md" fullScreen={false} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>md</Text>
          </View>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <LoadingSpinner size="lg" fullScreen={false} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>lg</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// FULL SCREEN VS INLINE
// ===========================================================================

/**
 * Full screen loading mode - centers in container.
 */
export const FullScreenMode: Story = {
  render: () => (
    <View style={useCaseStyles.fullScreen}>
      <LoadingSpinner size="lg" message="Loading competition..." fullScreen={true} />
    </View>
  ),
};

/**
 * Inline loading mode - does not fill container.
 */
export const InlineMode: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Inline Mode">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <LoadingSpinner size="sm" fullScreen={false} />
          <Text>Loading data...</Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Inline loading mode with message.
 */
export const InlineModeWithMessage: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Inline Mode With Message">
        <View style={{ backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: 8 }}>
          <LoadingSpinner size="sm" message="Syncing..." fullScreen={false} />
        </View>
        <View style={{ backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: 8 }}>
          <LoadingSpinner size="md" message="Processing..." fullScreen={false} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASES
// ===========================================================================

/**
 * Full screen loading for initial app load.
 */
export const InitialAppLoad: Story = {
  render: () => (
    <View style={useCaseStyles.fullScreen}>
      <LoadingSpinner size="lg" message="Loading The Nineteenth..." fullScreen={true} />
    </View>
  ),
};

/**
 * Loading state for competition data.
 */
export const CompetitionLoading: Story = {
  render: () => (
    <View style={useCaseStyles.fullScreen}>
      <LoadingSpinner size="lg" message="Loading competition..." fullScreen={true} />
    </View>
  ),
};

/**
 * Loading state for scorecard.
 */
export const ScorecardLoading: Story = {
  render: () => (
    <View style={useCaseStyles.fullScreen}>
      <LoadingSpinner size="md" message="Loading scorecard..." fullScreen={true} />
    </View>
  ),
};

/**
 * Loading state for leaderboard.
 */
export const LeaderboardLoading: Story = {
  render: () => (
    <View style={useCaseStyles.fullScreen}>
      <LoadingSpinner size="md" message="Fetching leaderboard..." fullScreen={true} />
    </View>
  ),
};

/**
 * Button loading state.
 */
export const ButtonLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Button Loading State">
        <View style={useCaseStyles.buttonContainer}>
          <View style={useCaseStyles.button}>
            <LoadingSpinner size="sm" fullScreen={false} />
            <Text style={useCaseStyles.buttonText}>Submitting...</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * List item loading.
 */
export const ListItemLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="List Item Loading">
        <View style={useCaseStyles.listItem}>
          <LoadingSpinner size="sm" fullScreen={false} />
          <View style={{ flex: 1 }}>
            <Text style={useCaseStyles.listItemTitle}>Loading round...</Text>
            <Text style={useCaseStyles.listItemSubtitle}>Please wait</Text>
          </View>
        </View>
        <View style={useCaseStyles.listItem}>
          <LoadingSpinner size="sm" fullScreen={false} />
          <View style={{ flex: 1 }}>
            <Text style={useCaseStyles.listItemTitle}>Loading player...</Text>
            <Text style={useCaseStyles.listItemSubtitle}>Fetching data</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Card loading state.
 */
export const CardLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Card Loading">
        <View style={useCaseStyles.card}>
          <LoadingSpinner size="md" message="Loading competition details..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.card}>
          <LoadingSpinner size="md" message="Loading player stats..." fullScreen={true} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Modal loading state.
 */
export const ModalLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Modal Loading">
        <View style={useCaseStyles.modal}>
          <View style={useCaseStyles.modalContent}>
            <LoadingSpinner size="lg" message="Processing your request..." fullScreen={true} />
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Sync indicator.
 */
export const SyncIndicator: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Sync Indicator">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <LoadingSpinner size="sm" fullScreen={false} />
          <Text style={{ color: '#6B7280' }}>Syncing scores...</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <LoadingSpinner size="sm" fullScreen={false} />
          <Text style={{ color: '#6B7280' }}>Uploading data...</Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// BACKGROUND VARIATIONS
// ===========================================================================

/**
 * Loading spinner on different background colors.
 */
export const OnDifferentBackgrounds: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="On Different Backgrounds">
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#FFFFFF' }]}>
          <LoadingSpinner size="md" fullScreen={false} />
          <Text>White Background</Text>
        </View>
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#F3F4F6' }]}>
          <LoadingSpinner size="md" fullScreen={false} />
          <Text>Gray Background</Text>
        </View>
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#1E7F5E' }]}>
          <LoadingSpinner size="md" fullScreen={false} />
          <Text style={{ color: '#FFFFFF' }}>Green Background</Text>
        </View>
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#1F2937' }]}>
          <LoadingSpinner size="md" fullScreen={false} />
          <Text style={{ color: '#FFFFFF' }}>Dark Background</Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Loading spinner on golf-themed green background.
 */
export const OnGolfGreen: Story = {
  render: () => (
    <View style={useCaseStyles.golfGreen}>
      <LoadingSpinner size="lg" message="Loading round..." fullScreen={true} />
    </View>
  ),
};

// ===========================================================================
// MESSAGE VARIATIONS
// ===========================================================================

/**
 * Various loading messages for different contexts.
 */
export const MessageVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Message Variations">
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Loading..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Please wait..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Saving changes..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Submitting scorecard..." fullScreen={true} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Golf-specific loading messages.
 */
export const GolfMessages: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Golf-Specific Messages">
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Loading courses..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Calculating handicap..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Updating leaderboard..." fullScreen={true} />
        </View>
        <View style={useCaseStyles.messageBox}>
          <LoadingSpinner size="md" message="Generating pairings..." fullScreen={true} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// MULTIPLE INSTANCES
// ===========================================================================

/**
 * Multiple loading spinners in a grid.
 */
export const MultipleSpinners: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Multiple Spinners">
        <View style={useCaseStyles.grid}>
          <LoadingSpinner size="sm" fullScreen={false} />
          <LoadingSpinner size="sm" fullScreen={false} />
          <LoadingSpinner size="sm" fullScreen={false} />
          <LoadingSpinner size="sm" fullScreen={false} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Mixed size spinners.
 */
export const MixedSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Mixed Sizes">
        <View style={useCaseStyles.mixedRow}>
          <LoadingSpinner size="lg" fullScreen={false} />
          <LoadingSpinner size="md" fullScreen={false} />
          <LoadingSpinner size="sm" fullScreen={false} />
          <LoadingSpinner size="sm" fullScreen={false} />
          <LoadingSpinner size="md" fullScreen={false} />
          <LoadingSpinner size="lg" fullScreen={false} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SKELETON LOADING
// ===========================================================================

/**
 * Loading spinner in skeleton loading context.
 */
export const SkeletonContext: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Skeleton Loading Context">
        <View style={useCaseStyles.skeletonCard}>
          <View style={useCaseStyles.skeletonHeader}>
            <View style={useCaseStyles.skeletonAvatar} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={useCaseStyles.skeletonLine} />
              <View style={[useCaseStyles.skeletonLine, { width: '60%' }]} />
            </View>
          </View>
          <View style={useCaseStyles.skeletonLoader}>
            <LoadingSpinner size="sm" fullScreen={false} />
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CENTERED LAYOUTS
// ===========================================================================

/**
 * Loading spinner centered in container.
 */
export const Centered: Story = {
  render: () => (
    <View style={useCaseStyles.centeredContainer}>
      <LoadingSpinner size="lg" fullScreen={true} />
    </View>
  ),
};

/**
 * Loading spinner centered with message.
 */
export const CenteredWithMessage: Story = {
  render: () => (
    <View style={useCaseStyles.centeredContainer}>
      <LoadingSpinner size="lg" message="Loading your data..." fullScreen={true} />
    </View>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

/**
 * Interactive playground for testing different configurations.
 */
export const Playground: Story = {
  args: {
    size: 'md',
    message: 'Loading...',
    fullScreen: true,
  },
  render: (args) => (
    <View style={{ flex: 1, minHeight: 300 }}>
      <LoadingSpinner {...args} />
    </View>
  ),
};

// ===========================================================================
// STYLES
// ===========================================================================

const useCaseStyles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 300,
  },
  buttonContainer: {
    alignItems: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E7F5E',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: 12,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: spacing.xl,
    borderRadius: 12,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: 12,
    minHeight: 200,
  },
  bgBox: {
    padding: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    gap: spacing.md,
  },
  golfGreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#15803D',
    minHeight: 300,
  },
  messageBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minHeight: 120,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    padding: spacing.md,
  },
  mixedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.md,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    minHeight: 300,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '100%',
  },
  skeletonLoader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
