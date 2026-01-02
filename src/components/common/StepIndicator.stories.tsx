/**
 * StepIndicator Storybook Stories
 *
 * Stories demonstrating the various configurations of the StepIndicator component.
 * Shows different step counts, progress states, title display, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { StepIndicator, Step } from './StepIndicator';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof StepIndicator> = {
  title: 'Common/StepIndicator',
  component: StepIndicator,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    currentStep: { control: { type: 'number', min: 1 } },
    showProgress: { control: 'boolean' },
    showTitles: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof StepIndicator>;

// ===========================================================================
// TEST DATA
// ===========================================================================

const threeSteps: readonly Step[] = [
  { number: 1, title: 'Venue' },
  { number: 2, title: 'Course' },
  { number: 3, title: 'Holes' },
];

const fourSteps: readonly Step[] = [
  { number: 1, title: 'Details' },
  { number: 2, title: 'Rounds' },
  { number: 3, title: 'Players' },
  { number: 4, title: 'Review' },
];

const fiveSteps: readonly Step[] = [
  { number: 1, title: 'Step One' },
  { number: 2, title: 'Step Two' },
  { number: 3, title: 'Step Three' },
  { number: 4, title: 'Step Four' },
  { number: 5, title: 'Step Five' },
];

const twoSteps: readonly Step[] = [
  { number: 1, title: 'First' },
  { number: 2, title: 'Second' },
];

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

function Card({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.card}>{children}</View>;
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    steps: threeSteps,
    currentStep: 1,
  },
};

export const WithTitles: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showTitles: true,
  },
};

export const WithoutProgress: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showProgress: false,
  },
};

export const WithTitlesNoProgress: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showTitles: true,
    showProgress: false,
  },
};

// ===========================================================================
// STEP COUNT STORIES
// ===========================================================================

export const TwoSteps: Story = {
  args: {
    steps: twoSteps,
    currentStep: 1,
    showTitles: true,
  },
};

export const ThreeSteps: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showTitles: true,
  },
};

export const FourSteps: Story = {
  args: {
    steps: fourSteps,
    currentStep: 3,
    showTitles: true,
  },
};

export const FiveSteps: Story = {
  args: {
    steps: fiveSteps,
    currentStep: 3,
    showTitles: true,
  },
};

export const AllStepCounts: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Two Steps">
        <Card>
          <StepIndicator steps={twoSteps} currentStep={1} showTitles />
        </Card>
      </Section>
      <Section title="Three Steps">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={2} showTitles />
        </Card>
      </Section>
      <Section title="Four Steps">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={3} showTitles />
        </Card>
      </Section>
      <Section title="Five Steps">
        <Card>
          <StepIndicator steps={fiveSteps} currentStep={3} showTitles />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// PROGRESS STORIES
// ===========================================================================

export const Step1Of3: Story = {
  args: {
    steps: threeSteps,
    currentStep: 1,
    showTitles: true,
  },
};

export const Step2Of3: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showTitles: true,
  },
};

export const Step3Of3: Story = {
  args: {
    steps: threeSteps,
    currentStep: 3,
    showTitles: true,
  },
};

export const ProgressStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Step 1 of 3 (33%)">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={1} showTitles />
        </Card>
      </Section>
      <Section title="Step 2 of 3 (67%)">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={2} showTitles />
        </Card>
      </Section>
      <Section title="Step 3 of 3 (100%)">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={3} showTitles />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const FourStepProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Step 1 of 4 (25%)">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={1} showTitles />
        </Card>
      </Section>
      <Section title="Step 2 of 4 (50%)">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={2} showTitles />
        </Card>
      </Section>
      <Section title="Step 3 of 4 (75%)">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={3} showTitles />
        </Card>
      </Section>
      <Section title="Step 4 of 4 (100%)">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={4} showTitles />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// DISPLAY OPTIONS
// ===========================================================================

export const CirclesOnly: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showProgress: false,
    showTitles: false,
  },
};

export const CirclesAndProgress: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showProgress: true,
    showTitles: false,
  },
};

export const CirclesAndTitles: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showProgress: false,
    showTitles: true,
  },
};

export const FullDisplay: Story = {
  args: {
    steps: threeSteps,
    currentStep: 2,
    showProgress: true,
    showTitles: true,
  },
};

export const DisplayOptions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Circles Only">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={2} showProgress={false} showTitles={false} />
        </Card>
      </Section>
      <Section title="Circles + Progress Bar">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={2} showProgress showTitles={false} />
        </Card>
      </Section>
      <Section title="Circles + Titles">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={2} showProgress={false} showTitles />
        </Card>
      </Section>
      <Section title="Full Display">
        <Card>
          <StepIndicator steps={threeSteps} currentStep={2} showProgress showTitles />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const CourseCreationWizard: Story = {
  render: () => {
    const courseSteps: readonly Step[] = [
      { number: 1, title: 'Venue' },
      { number: 2, title: 'Course' },
      { number: 3, title: 'Holes' },
    ];
    return (
      <StoryWrapper>
        <Section title="Course Creation Wizard">
          <Card>
            <StepIndicator steps={courseSteps} currentStep={2} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const CompetitionSetup: Story = {
  render: () => {
    const competitionSteps: readonly Step[] = [
      { number: 1, title: 'Details' },
      { number: 2, title: 'Rounds' },
      { number: 3, title: 'Players' },
      { number: 4, title: 'Review' },
    ];
    return (
      <StoryWrapper>
        <Section title="Competition Setup Wizard">
          <Card>
            <StepIndicator steps={competitionSteps} currentStep={3} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const OnboardingFlow: Story = {
  render: () => {
    const onboardingSteps: readonly Step[] = [
      { number: 1, title: 'Welcome' },
      { number: 2, title: 'Profile' },
      { number: 3, title: 'Settings' },
    ];
    return (
      <StoryWrapper>
        <Section title="Onboarding Flow">
          <Card>
            <StepIndicator steps={onboardingSteps} currentStep={1} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const CheckoutFlow: Story = {
  render: () => {
    const checkoutSteps: readonly Step[] = [
      { number: 1, title: 'Cart' },
      { number: 2, title: 'Shipping' },
      { number: 3, title: 'Payment' },
      { number: 4, title: 'Confirm' },
    ];
    return (
      <StoryWrapper>
        <Section title="Checkout Flow - Cart">
          <Card>
            <StepIndicator steps={checkoutSteps} currentStep={1} showTitles />
          </Card>
        </Section>
        <Section title="Checkout Flow - Shipping">
          <Card>
            <StepIndicator steps={checkoutSteps} currentStep={2} showTitles />
          </Card>
        </Section>
        <Section title="Checkout Flow - Payment">
          <Card>
            <StepIndicator steps={checkoutSteps} currentStep={3} showTitles />
          </Card>
        </Section>
        <Section title="Checkout Flow - Confirm">
          <Card>
            <StepIndicator steps={checkoutSteps} currentStep={4} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const MinimalWizard: Story = {
  render: () => {
    const minimalSteps: readonly Step[] = [
      { number: 1, title: 'Start' },
      { number: 2, title: 'Finish' },
    ];
    return (
      <StoryWrapper>
        <Section title="Minimal Two-Step Wizard">
          <Card>
            <StepIndicator steps={minimalSteps} currentStep={1} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

export const SingleStep: Story = {
  render: () => {
    const singleStep: readonly Step[] = [{ number: 1, title: 'Only Step' }];
    return (
      <StoryWrapper>
        <Section title="Single Step">
          <Card>
            <StepIndicator steps={singleStep} currentStep={1} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const LongTitles: Story = {
  render: () => {
    const longTitleSteps: readonly Step[] = [
      { number: 1, title: 'Very Long Title Here' },
      { number: 2, title: 'Another Long Title' },
      { number: 3, title: 'Final Long Title' },
    ];
    return (
      <StoryWrapper>
        <Section title="Long Step Titles">
          <Card>
            <StepIndicator steps={longTitleSteps} currentStep={2} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const ShortTitles: Story = {
  render: () => {
    const shortTitleSteps: readonly Step[] = [
      { number: 1, title: 'A' },
      { number: 2, title: 'B' },
      { number: 3, title: 'C' },
    ];
    return (
      <StoryWrapper>
        <Section title="Short Step Titles">
          <Card>
            <StepIndicator steps={shortTitleSteps} currentStep={2} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

export const ManySteps: Story = {
  render: () => {
    const manySteps: readonly Step[] = Array.from({ length: 7 }, (_, i) => ({
      number: i + 1,
      title: `Step ${i + 1}`,
    }));
    return (
      <StoryWrapper>
        <Section title="Seven Steps (Compact View)">
          <Card>
            <StepIndicator steps={manySteps} currentStep={4} showProgress />
          </Card>
        </Section>
        <Section title="Seven Steps (With Titles)">
          <Card>
            <StepIndicator steps={manySteps} currentStep={4} showTitles />
          </Card>
        </Section>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// FIRST AND LAST STEP STORIES
// ===========================================================================

export const FirstStep: Story = {
  args: {
    steps: fourSteps,
    currentStep: 1,
    showTitles: true,
  },
};

export const LastStep: Story = {
  args: {
    steps: fourSteps,
    currentStep: 4,
    showTitles: true,
  },
};

export const FirstAndLastComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="First Step (25%)">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={1} showTitles />
        </Card>
      </Section>
      <Section title="Last Step (100%)">
        <Card>
          <StepIndicator steps={fourSteps} currentStep={4} showTitles />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    steps: fourSteps,
    currentStep: 2,
    showProgress: true,
    showTitles: true,
  },
};
