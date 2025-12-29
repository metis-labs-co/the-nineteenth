/**
 * FormSection Storybook Stories
 *
 * Stories demonstrating the various configurations of the FormSection component.
 * Shows basic usage, required fields, errors, descriptions, and style overrides.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { FormSection, FormSectionProps } from './FormSection';
import { spacing, borderRadius } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof FormSection> = {
  title: 'Common/FormSection',
  component: FormSection,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    required: { control: 'boolean' },
    noCard: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof FormSection>;

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

function MockInput({ label, error }: { label: string; error?: boolean }) {
  return (
    <TextInput
      label={label}
      mode="outlined"
      style={wrapperStyles.input}
      error={error}
    />
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
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection>
        <MockInput label="Example Input" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const WithTitle: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="Competition Details">
        <MockInput label="Competition Name" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Player Information"
        description="Enter details for each player in your group"
      >
        <MockInput label="Player Name" />
        <MockInput label="Handicap" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const WithRequired: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="Course Selection" required>
        <MockInput label="Course Name" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const WithRequiredAndDescription: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Handicap"
        description="Your official handicap index"
        required
      >
        <MockInput label="Handicap Index" />
      </FormSection>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ERROR STATES
// ===========================================================================

export const WithError: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="Handicap" error="Please enter a valid handicap between 0 and 54">
        <MockInput label="Handicap Index" error />
      </FormSection>
    </StoryWrapper>
  ),
};

export const WithTitleDescriptionAndError: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Email Address"
        description="We'll send round invitations to this email"
        error="Please enter a valid email address"
        required
      >
        <MockInput label="Email" error />
      </FormSection>
    </StoryWrapper>
  ),
};

export const ErrorStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Error States">
        <FormSection title="Simple Error" error="This field is required">
          <MockInput label="Required Field" error />
        </FormSection>

        <FormSection
          title="Validation Error"
          description="Enter your handicap index"
          error="Handicap must be between 0 and 54"
        >
          <MockInput label="Handicap" error />
        </FormSection>

        <FormSection
          title="Multiple Field Error"
          error="Please correct the highlighted fields"
        >
          <MockInput label="First Name" error />
          <MockInput label="Email" error />
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CARD VARIANTS
// ===========================================================================

export const NoCard: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="Without Card" noCard>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            padding: spacing.md,
            borderRadius: borderRadius.md,
          }}
        >
          <MockInput label="Input Field" />
        </View>
      </FormSection>
    </StoryWrapper>
  ),
};

export const CardComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Card (Default)">
        <FormSection title="Card Section">
          <MockInput label="Input" />
        </FormSection>
      </Section>

      <Section title="Without Card (noCard)">
        <FormSection title="No Card Section" noCard>
          <MockInput label="Input" />
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// NESTED SECTIONS
// ===========================================================================

export const NestedSections: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="Competition Setup">
        <FormSection title="Basic Info" noCard>
          <MockInput label="Name" />
          <MockInput label="Description" />
        </FormSection>

        <FormSection title="Settings" noCard>
          <MockInput label="Max Players" />
          <MockInput label="Rounds" />
        </FormSection>
      </FormSection>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STYLE OVERRIDES
// ===========================================================================

export const CustomContainerStyle: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Custom Background"
        style={{
          backgroundColor: '#EFF6FF',
          borderWidth: 1,
          borderColor: '#BFDBFE',
        }}
      >
        <MockInput label="Blue themed input" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const CustomTitleStyle: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Large Bold Title"
        titleStyle={{
          fontSize: 24,
          fontWeight: '700',
        }}
      >
        <MockInput label="Input" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const CustomDescriptionStyle: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Section"
        description="Custom styled description"
        descriptionStyle={{
          fontStyle: 'italic',
          color: '#3B82F6',
        }}
      >
        <MockInput label="Input" />
      </FormSection>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMMON USE CASES
// ===========================================================================

export const RegistrationForm: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Registration Form Example">
        <FormSection
          title="Personal Information"
          description="Your basic account details"
          required
        >
          <MockInput label="Full Name" />
          <MockInput label="Email" />
          <MockInput label="Phone" />
        </FormSection>

        <FormSection
          title="Golf Profile"
          description="Help us personalize your experience"
        >
          <MockInput label="Handicap Index" />
          <MockInput label="Home Course" />
        </FormSection>

        <FormSection title="Account Security" required>
          <MockInput label="Password" />
          <MockInput label="Confirm Password" />
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

export const CompetitionCreation: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Create Competition Form">
        <FormSection
          title="Competition Details"
          description="Basic information about your competition"
          required
        >
          <MockInput label="Competition Name" />
          <MockInput label="Description" />
        </FormSection>

        <FormSection title="Dates" required>
          <MockInput label="Start Date" />
          <MockInput label="End Date" />
        </FormSection>

        <FormSection
          title="Scoring Settings"
          description="Choose how scores will be calculated"
        >
          <MockInput label="Handicap System" />
          <MockInput label="Game Type" />
        </FormSection>

        <FormSection
          title="Invite Code"
          description="Share this code to invite players"
        >
          <MockInput label="Custom Code (optional)" />
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

export const RoundSetup: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Round Setup Form">
        <FormSection title="Course" required>
          <MockInput label="Select Course" />
          <MockInput label="Select Tee" />
        </FormSection>

        <FormSection title="Date & Time" required>
          <MockInput label="Date" />
          <MockInput label="Tee Time" />
        </FormSection>

        <FormSection
          title="Players"
          description="Add players to this round"
          required
        >
          <Text style={{ color: '#6B7280', marginVertical: spacing.sm }}>
            No players added yet
          </Text>
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

export const ProfileEdit: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Edit Profile Form">
        <FormSection title="Basic Info">
          <MockInput label="Display Name" />
          <MockInput label="Email" />
        </FormSection>

        <FormSection
          title="Golf Details"
          description="Keep your profile up to date"
        >
          <MockInput label="Handicap Index" />
          <MockInput label="Home Course" />
          <MockInput label="Golf Association ID" />
        </FormSection>

        <FormSection title="Preferences">
          <MockInput label="Preferred Tees" />
          <MockInput label="Default Game Type" />
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongTitle: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="This is a very long section title that might need to wrap to multiple lines">
        <MockInput label="Input" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const LongDescription: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Section"
        description="This is a very long description that provides extensive information about the section content and might span multiple lines on smaller screen sizes. It includes details about what the user should enter in this section."
      >
        <MockInput label="Input" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const LongError: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection
        title="Section"
        error="This is a very long error message that explains in detail what went wrong and how the user can fix it. Please review all fields and try again."
      >
        <MockInput label="Input" error />
      </FormSection>
    </StoryWrapper>
  ),
};

export const OnlyChildren: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection>
        <MockInput label="Just an input without header" />
      </FormSection>
    </StoryWrapper>
  ),
};

export const EmptyChildren: Story = {
  render: () => (
    <StoryWrapper>
      <FormSection title="Section with no children">
        <View />
      </FormSection>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ALL COMBINATIONS
// ===========================================================================

export const AllCombinations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Just Title">
        <FormSection title="Title Only">
          <MockInput label="Input" />
        </FormSection>
      </Section>

      <Section title="Title + Required">
        <FormSection title="Required Section" required>
          <MockInput label="Input" />
        </FormSection>
      </Section>

      <Section title="Title + Description">
        <FormSection title="With Description" description="Helpful description">
          <MockInput label="Input" />
        </FormSection>
      </Section>

      <Section title="Title + Error">
        <FormSection title="With Error" error="Something went wrong">
          <MockInput label="Input" error />
        </FormSection>
      </Section>

      <Section title="All Props">
        <FormSection
          title="Complete Section"
          description="All props enabled"
          required
          error="Validation failed"
        >
          <MockInput label="Input" error />
        </FormSection>
      </Section>

      <Section title="No Card + All Props">
        <FormSection
          title="No Card Complete"
          description="All props with noCard"
          required
          error="Validation failed"
          noCard
        >
          <MockInput label="Input" error />
        </FormSection>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Playground Section',
    description: 'Customize this form section',
    required: false,
    error: '',
    noCard: false,
  },
  render: (args) => (
    <StoryWrapper>
      <FormSection {...args}>
        <MockInput label="Example Input" error={!!args.error} />
      </FormSection>
    </StoryWrapper>
  ),
};
