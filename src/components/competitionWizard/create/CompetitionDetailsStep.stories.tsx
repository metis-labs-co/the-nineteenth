/**
 * CompetitionDetailsStep Storybook Stories
 *
 * Stories demonstrating the first step of competition creation wizard.
 * Shows form input variations, competition types, validation states, and user flows.
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import CompetitionDetailsStep from './CompetitionDetailsStep';
import type { CompetitionDetailsFormData } from '@/schemas/competition';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof CompetitionDetailsStep> = {
  title: 'CompetitionWizard/CompetitionDetailsStep',
  component: CompetitionDetailsStep,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialData: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof CompetitionDetailsStep>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children, title, description }: { children: React.ReactNode; title?: string; description?: string }) {
  return (
    <View style={wrapperStyles.container}>
      {title && (
        <View style={wrapperStyles.header}>
          <Text style={wrapperStyles.title}>{title}</Text>
          {description && <Text style={wrapperStyles.description}>{description}</Text>}
        </View>
      )}
      <View style={wrapperStyles.content}>
        {children}
      </View>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
  },
});

// ===========================================================================
// MOCK HANDLERS
// ===========================================================================

const handleComplete = (data: CompetitionDetailsFormData) => {
  Alert.alert('Form Submitted', JSON.stringify(data, null, 2));
  console.log('Form data:', data);
};

const handleBack = () => {
  Alert.alert('Cancel', 'Cancel button pressed');
  console.log('Back pressed');
};

// ===========================================================================
// SAMPLE DATA
// ===========================================================================

const emptyFormData: Partial<CompetitionDetailsFormData> = {
  name: '',
  description: '',
  competitionType: 'event',
  startDate: '',
  endDate: '',
  handicapSystem: 'honor',
  handicapSource: 'profile',
  inviteCode: '',
};

const eventFormData: CompetitionDetailsFormData = {
  name: 'Summer Championship 2025',
  description: 'Our annual summer golf championship with friends.',
  competitionType: 'event',
  startDate: '15/01/2025',
  endDate: '17/01/2025',
  handicapSystem: 'honor',
  handicapSource: 'profile',
  inviteCode: 'SUMMER25',
  enableTeams: false,
};

const knockoutFormData: CompetitionDetailsFormData = {
  name: 'Weekend Warriors Knockout',
  description: 'A bracket-style elimination competition for weekend golfers.',
  competitionType: 'knockout',
  startDate: '01/02/2025',
  endDate: '',
  handicapSystem: 'honor',
  handicapSource: 'profile',
  inviteCode: 'WARRIORS',
  enableTeams: false,
};

const minimalFormData: CompetitionDetailsFormData = {
  name: 'Quick Event',
  description: '',
  competitionType: 'event',
  startDate: '25/12/2025',
  endDate: '25/12/2025',
  handicapSystem: 'honor',
  handicapSource: 'profile',
  inviteCode: '',
  enableTeams: false,
};

const longDescriptionData: CompetitionDetailsFormData = {
  name: 'Corporate Golf Day',
  description: 'Join us for our annual corporate golf day! This event brings together colleagues from all departments for a friendly competition on the greens. Prizes will be awarded for best score, longest drive, and closest to the pin. Lunch and drinks included.',
  competitionType: 'event',
  startDate: '10/03/2025',
  endDate: '10/03/2025',
  handicapSystem: 'honor',
  handicapSource: 'profile',
  inviteCode: 'CORP2025',
  enableTeams: false,
};

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default empty form state
 */
export const Default: Story = {
  render: () => (
    <StoryWrapper title="Default State" description="Empty form ready for input">
      <CompetitionDetailsStep
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Form with initial event data
 */
export const WithEventData: Story = {
  render: () => (
    <StoryWrapper title="Event Competition" description="Pre-filled with event competition data">
      <CompetitionDetailsStep
        initialData={eventFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Form with initial knockout data
 */
export const WithKnockoutData: Story = {
  render: () => (
    <StoryWrapper title="Knockout Competition" description="Pre-filled with knockout competition data (no end date)">
      <CompetitionDetailsStep
        initialData={knockoutFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Minimal required data only
 */
export const MinimalData: Story = {
  render: () => (
    <StoryWrapper title="Minimal Data" description="Only required fields filled">
      <CompetitionDetailsStep
        initialData={minimalFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMPETITION TYPE STORIES
// ===========================================================================

/**
 * Event type selected (default)
 */
export const EventTypeSelected: Story = {
  render: () => (
    <StoryWrapper title="Event Type" description="Event competitions have a fixed end date">
      <CompetitionDetailsStep
        initialData={{
          ...emptyFormData,
          name: 'Golf Tournament',
          competitionType: 'event',
        } as CompetitionDetailsFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Knockout type selected
 */
export const KnockoutTypeSelected: Story = {
  render: () => (
    <StoryWrapper title="Knockout Type" description="Knockout competitions are bracket-style elimination">
      <CompetitionDetailsStep
        initialData={{
          ...emptyFormData,
          name: 'Sunday Knockout',
          competitionType: 'knockout',
        } as CompetitionDetailsFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// DESCRIPTION VARIATIONS
// ===========================================================================

/**
 * No description
 */
export const NoDescription: Story = {
  render: () => (
    <StoryWrapper title="No Description" description="Description field is optional">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          description: '',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Long description
 */
export const LongDescription: Story = {
  render: () => (
    <StoryWrapper title="Long Description" description="Component handles long descriptions gracefully">
      <CompetitionDetailsStep
        initialData={longDescriptionData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// INVITE CODE STORIES
// ===========================================================================

/**
 * With custom invite code
 */
export const WithInviteCode: Story = {
  render: () => (
    <StoryWrapper title="Custom Invite Code" description="User-defined invite code for players to join">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          inviteCode: 'GOLF2025',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Without invite code (auto-generate)
 */
export const WithoutInviteCode: Story = {
  render: () => (
    <StoryWrapper title="Auto-Generate Invite Code" description="Leave blank to auto-generate a code">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          inviteCode: '',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// DATE STORIES
// ===========================================================================

/**
 * Single day event
 */
export const SingleDayEvent: Story = {
  render: () => (
    <StoryWrapper title="Single Day Event" description="Start and end date are the same">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          name: 'One Day Classic',
          startDate: '20/01/2025',
          endDate: '20/01/2025',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Multi-day event
 */
export const MultiDayEvent: Story = {
  render: () => (
    <StoryWrapper title="Multi-Day Event" description="Event spanning multiple days">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          name: 'Three Day Tournament',
          startDate: '15/02/2025',
          endDate: '17/02/2025',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Long duration event
 */
export const LongDurationEvent: Story = {
  render: () => (
    <StoryWrapper title="Long Duration Event" description="Event spanning weeks or months">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          name: 'Season Championship',
          description: 'Our season-long championship running through winter.',
          startDate: '01/06/2025',
          endDate: '31/08/2025',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// VALIDATION STORIES
// ===========================================================================

/**
 * Empty form (validation will trigger on submit)
 */
export const EmptyForm: Story = {
  render: () => (
    <StoryWrapper title="Empty Form" description="Press 'Next' to see validation errors">
      <CompetitionDetailsStep
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Partially filled form
 */
export const PartiallyFilled: Story = {
  render: () => (
    <StoryWrapper title="Partially Filled" description="Some fields filled, others empty">
      <CompetitionDetailsStep
        initialData={{
          name: 'Incomplete Competition',
          description: '',
          competitionType: 'event',
          startDate: '',
          endDate: '',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: '',
          enableTeams: false,
        } as CompetitionDetailsFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// NAME VARIATIONS
// ===========================================================================

/**
 * Short name
 */
export const ShortName: Story = {
  render: () => (
    <StoryWrapper title="Short Name" description="Minimum valid name length (3 chars)">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          name: 'Cup',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Long name
 */
export const LongName: Story = {
  render: () => (
    <StoryWrapper title="Long Name" description="Maximum name length">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          name: 'The Annual Metropolitan Golf Championship and Networking Event for Corporate Executives 2025',
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// SPECIAL CHARACTERS
// ===========================================================================

/**
 * Special characters in name
 */
export const SpecialCharacters: Story = {
  render: () => (
    <StoryWrapper title="Special Characters" description="Names can include special characters">
      <CompetitionDetailsStep
        initialData={{
          ...eventFormData,
          name: "John's 50th Birthday Golf Day & BBQ",
          description: "Celebrating John's milestone with 18 holes and a feast!",
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Casual weekend golf
 */
export const UseCaseCasualWeekend: Story = {
  name: 'Use Case: Casual Weekend Golf',
  render: () => (
    <StoryWrapper title="Casual Weekend Golf" description="Simple weekend event with friends">
      <CompetitionDetailsStep
        initialData={{
          name: 'Saturday Scramble',
          description: 'A relaxed scramble format with friends. All skill levels welcome!',
          competitionType: 'event',
          startDate: '25/01/2025',
          endDate: '25/01/2025',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'SAT25',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Corporate golf day
 */
export const UseCaseCorporateDay: Story = {
  name: 'Use Case: Corporate Golf Day',
  render: () => (
    <StoryWrapper title="Corporate Golf Day" description="Company team building event">
      <CompetitionDetailsStep
        initialData={{
          name: 'Acme Corp Golf Day 2025',
          description: 'Annual team building event. All employees welcome. Prizes for winners!',
          competitionType: 'event',
          startDate: '15/03/2025',
          endDate: '15/03/2025',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'ACME2025',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Club championship
 */
export const UseCaseClubChampionship: Story = {
  name: 'Use Case: Club Championship',
  render: () => (
    <StoryWrapper title="Club Championship" description="Formal club competition over multiple days">
      <CompetitionDetailsStep
        initialData={{
          name: 'Melbourne Golf Club Championship 2025',
          description: 'Annual club championship. Stroke play format over 4 rounds. Gross and net prizes.',
          competitionType: 'event',
          startDate: '01/04/2025',
          endDate: '30/04/2025',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'MGC2025',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Monthly knockout
 */
export const UseCaseMonthlyKnockout: Story = {
  name: 'Use Case: Monthly Knockout',
  render: () => (
    <StoryWrapper title="Monthly Knockout" description="Bracket-style elimination format">
      <CompetitionDetailsStep
        initialData={{
          name: 'The Nineteenth Monthly Knockout',
          description: 'Monthly bracket-style elimination competition. Players are matched up each round.',
          competitionType: 'knockout',
          startDate: '01/01/2025',
          endDate: '',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'T19KNOCKOUT',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Charity event
 */
export const UseCaseCharityEvent: Story = {
  name: 'Use Case: Charity Event',
  render: () => (
    <StoryWrapper title="Charity Event" description="Fundraising golf event">
      <CompetitionDetailsStep
        initialData={{
          name: 'Swing for a Cause 2025',
          description: 'All proceeds go to local children\'s hospital. Includes lunch, prizes, and auction.',
          competitionType: 'event',
          startDate: '10/05/2025',
          endDate: '10/05/2025',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'CHARITY25',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// AUSTRALIAN SPECIFIC
// ===========================================================================

/**
 * Australian summer event
 */
export const AustralianSummer: Story = {
  render: () => (
    <StoryWrapper title="Australian Summer" description="Summer competition with Australian date format">
      <CompetitionDetailsStep
        initialData={{
          name: 'Boxing Day Classic',
          description: 'Annual Boxing Day golf tradition. Early start to beat the heat!',
          competitionType: 'event',
          startDate: '26/12/2025',
          endDate: '26/12/2025',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'BOXDAY25',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Australia Day event
 */
export const AustraliaDayEvent: Story = {
  render: () => (
    <StoryWrapper title="Australia Day Golf" description="Public holiday golf event">
      <CompetitionDetailsStep
        initialData={{
          name: 'Australia Day Scramble',
          description: 'Celebrate Australia Day on the course! BBQ lunch included.',
          competitionType: 'event',
          startDate: '26/01/2026',
          endDate: '26/01/2026',
          handicapSystem: 'honor',
          handicapSource: 'profile',
          inviteCode: 'AUSSIE26',
          enableTeams: false,
        }}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

/**
 * Empty initial data
 */
export const EmptyInitialData: Story = {
  render: () => (
    <StoryWrapper title="Empty Initial Data" description="Explicitly passing empty data object">
      <CompetitionDetailsStep
        initialData={emptyFormData as CompetitionDetailsFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Undefined initial data
 */
export const UndefinedInitialData: Story = {
  render: () => (
    <StoryWrapper title="No Initial Data" description="No initialData prop passed">
      <CompetitionDetailsStep
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTION TESTING
// ===========================================================================

/**
 * Interactive form for testing all fields
 */
export const Interactive: Story = {
  render: () => (
    <StoryWrapper
      title="Interactive Testing"
      description="Test all interactions: type switching, input, date selection"
    >
      <CompetitionDetailsStep
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};

/**
 * Pre-filled for quick submission test
 */
export const QuickSubmitTest: Story = {
  render: () => (
    <StoryWrapper
      title="Quick Submit Test"
      description="All fields filled - press 'Next' to test submission"
    >
      <CompetitionDetailsStep
        initialData={eventFormData}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </StoryWrapper>
  ),
};
