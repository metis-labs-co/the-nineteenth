/**
 * GolfBallLoader Storybook Stories
 *
 * Stories demonstrating the various configurations of the GolfBallLoader component.
 * Shows size variants, theme support, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { GolfBallLoader } from './GolfBallLoader';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof GolfBallLoader> = {
  title: 'Common/GolfBallLoader',
  component: GolfBallLoader,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size of the loader: sm (24px), md (36px), lg (48px)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GolfBallLoader>;

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

function LoaderRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={wrapperStyles.loaderRow}>
      <View style={wrapperStyles.loaderContainer}>{children}</View>
      <Text style={wrapperStyles.loaderLabel}>{label}</Text>
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
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loaderContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default golf ball loader with medium size.
 * The ball rotates continuously to indicate loading.
 */
export const Default: Story = {
  args: {
    size: 'md',
  },
};

/**
 * Small golf ball loader (24px).
 * Best for inline loading indicators or compact spaces.
 */
export const Small: Story = {
  args: {
    size: 'sm',
  },
};

/**
 * Medium golf ball loader (36px).
 * The default size, suitable for most loading contexts.
 */
export const Medium: Story = {
  args: {
    size: 'md',
  },
};

/**
 * Large golf ball loader (48px).
 * Best for full-screen loading states or prominent indicators.
 */
export const Large: Story = {
  args: {
    size: 'lg',
  },
};

// ===========================================================================
// SIZE COMPARISON
// ===========================================================================

/**
 * Comparison of all three size variants side by side.
 */
export const SizeComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Variants">
        <LoaderRow label="Small (24px)">
          <GolfBallLoader size="sm" />
        </LoaderRow>
        <LoaderRow label="Medium (36px) - Default">
          <GolfBallLoader size="md" />
        </LoaderRow>
        <LoaderRow label="Large (48px)">
          <GolfBallLoader size="lg" />
        </LoaderRow>
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
            <GolfBallLoader size="sm" />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>sm</Text>
          </View>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <GolfBallLoader size="md" />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>md</Text>
          </View>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <GolfBallLoader size="lg" />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>lg</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASES
// ===========================================================================

/**
 * Golf ball loader in a full-screen loading context.
 */
export const FullScreenLoading: Story = {
  render: () => (
    <View style={useCaseStyles.fullScreen}>
      <GolfBallLoader size="lg" />
      <Text style={useCaseStyles.loadingText}>Loading...</Text>
    </View>
  ),
};

/**
 * Golf ball loader for button loading state.
 */
export const ButtonLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Button Loading State">
        <View style={useCaseStyles.buttonContainer}>
          <View style={useCaseStyles.button}>
            <GolfBallLoader size="sm" />
            <Text style={useCaseStyles.buttonText}>Submitting...</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Golf ball loader for list item loading.
 */
export const ListItemLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="List Item Loading">
        <View style={useCaseStyles.listItem}>
          <GolfBallLoader size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={useCaseStyles.listItemTitle}>Loading competition...</Text>
            <Text style={useCaseStyles.listItemSubtitle}>Please wait</Text>
          </View>
        </View>
        <View style={useCaseStyles.listItem}>
          <GolfBallLoader size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={useCaseStyles.listItemTitle}>Loading round...</Text>
            <Text style={useCaseStyles.listItemSubtitle}>Fetching data</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Golf ball loader in a card loading context.
 */
export const CardLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Card Loading">
        <View style={useCaseStyles.card}>
          <GolfBallLoader size="md" />
          <Text style={useCaseStyles.cardText}>Loading scorecard...</Text>
        </View>
        <View style={useCaseStyles.card}>
          <GolfBallLoader size="md" />
          <Text style={useCaseStyles.cardText}>Loading leaderboard...</Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Golf ball loader in a modal loading context.
 */
export const ModalLoading: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Modal Loading">
        <View style={useCaseStyles.modal}>
          <View style={useCaseStyles.modalContent}>
            <GolfBallLoader size="lg" />
            <Text style={useCaseStyles.modalTitle}>Processing...</Text>
            <Text style={useCaseStyles.modalText}>Submitting your scorecard</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Golf ball loader with inline text.
 */
export const InlineWithText: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Inline With Text">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GolfBallLoader size="sm" />
          <Text>Loading players...</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GolfBallLoader size="sm" />
          <Text>Syncing scores...</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GolfBallLoader size="sm" />
          <Text>Updating leaderboard...</Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// BACKGROUND VARIATIONS
// ===========================================================================

/**
 * Golf ball loader on different background colors.
 */
export const OnDifferentBackgrounds: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="On Different Backgrounds">
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#FFFFFF' }]}>
          <GolfBallLoader size="md" />
          <Text>White Background</Text>
        </View>
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#F3F4F6' }]}>
          <GolfBallLoader size="md" />
          <Text>Gray Background</Text>
        </View>
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#1E7F5E' }]}>
          <GolfBallLoader size="md" />
          <Text style={{ color: '#FFFFFF' }}>Green Background</Text>
        </View>
        <View style={[useCaseStyles.bgBox, { backgroundColor: '#1F2937' }]}>
          <GolfBallLoader size="md" />
          <Text style={{ color: '#FFFFFF' }}>Dark Background</Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Golf ball loader on a green golf-themed background.
 */
export const OnGolfGreen: Story = {
  render: () => (
    <View style={useCaseStyles.golfGreen}>
      <GolfBallLoader size="lg" />
      <Text style={useCaseStyles.golfGreenText}>Loading round...</Text>
    </View>
  ),
};

// ===========================================================================
// MULTIPLE LOADERS
// ===========================================================================

/**
 * Multiple golf ball loaders in a grid pattern.
 */
export const MultipleLoaders: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Multiple Loaders">
        <View style={useCaseStyles.grid}>
          <GolfBallLoader size="md" />
          <GolfBallLoader size="md" />
          <GolfBallLoader size="md" />
          <GolfBallLoader size="md" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

/**
 * Mixed size golf ball loaders.
 */
export const MixedSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Mixed Sizes">
        <View style={useCaseStyles.mixedRow}>
          <GolfBallLoader size="lg" />
          <GolfBallLoader size="md" />
          <GolfBallLoader size="sm" />
          <GolfBallLoader size="sm" />
          <GolfBallLoader size="md" />
          <GolfBallLoader size="lg" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CENTERED LAYOUTS
// ===========================================================================

/**
 * Golf ball loader centered in container.
 */
export const Centered: Story = {
  render: () => (
    <View style={useCaseStyles.centeredContainer}>
      <GolfBallLoader size="lg" />
    </View>
  ),
};

/**
 * Golf ball loader centered with message.
 */
export const CenteredWithMessage: Story = {
  render: () => (
    <View style={useCaseStyles.centeredContainer}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <GolfBallLoader size="lg" />
        <Text style={{ fontSize: 18, fontWeight: '500', color: '#374151' }}>Loading</Text>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>Please wait while we fetch your data</Text>
      </View>
    </View>
  ),
};

// ===========================================================================
// SKELETON LOADING
// ===========================================================================

/**
 * Golf ball loader used in skeleton loading context.
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
            <GolfBallLoader size="sm" />
          </View>
        </View>
      </Section>
    </StoryWrapper>
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
  },
  render: (args) => (
    <StoryWrapper>
      <Section title="Playground">
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <GolfBallLoader {...args} />
        </View>
      </Section>
    </StoryWrapper>
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
    gap: spacing.md,
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: spacing.sm,
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
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: {
    fontSize: 16,
    color: '#6B7280',
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
    alignItems: 'center',
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
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
    gap: spacing.md,
  },
  golfGreenText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
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
