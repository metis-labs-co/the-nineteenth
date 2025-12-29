/**
 * TeeSelector Storybook Stories
 *
 * Stories demonstrating the various configurations of the TeeSelector component.
 * Shows pills, cards, and list variants with different configurations.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { TeeSelector, TeeSelectorProps, TeeSelectorVariant } from './TeeSelector';
import { spacing } from '@/constants/theme';
import type { TeeBox, Venue } from '@/types/database.types';

// ===========================================================================
// MOCK DATA
// ===========================================================================

const mockTees: TeeBox[] = [
  {
    name: 'Championship',
    color: 'black',
    totalYardage: 6850,
    courseRating: 73.5,
    slopeRating: 138,
  },
  {
    name: 'Blue',
    color: 'blue',
    totalYardage: 6450,
    courseRating: 71.2,
    slopeRating: 130,
  },
  {
    name: 'White',
    color: 'white',
    totalYardage: 6050,
    courseRating: 69.5,
    slopeRating: 125,
  },
  {
    name: 'Yellow',
    color: 'yellow',
    totalYardage: 5650,
    courseRating: 67.8,
    slopeRating: 118,
  },
  {
    name: 'Red',
    color: 'red',
    totalYardage: 5100,
    courseRating: 70.2,
    slopeRating: 122,
  },
];

const mockVenue: Venue = {
  id: '1',
  source: 'manual',
  api_id: null,
  name: 'The Eastern Golf Club',
  state: 'VIC',
  city: 'Doncaster',
  address: '123 Golf Club Road',
  phone: '03 1234 5678',
  email: 'info@easterngolf.com.au',
  website: 'https://easterngolf.com.au',
  location: null,
  total_holes: 27,
  last_synced: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const minimalTees: TeeBox[] = [
  { name: 'Men', color: 'white', totalYardage: 6200 },
  { name: 'Women', color: 'red', totalYardage: 5400 },
];

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof TeeSelector> = {
  title: 'Common/TeeSelector',
  component: TeeSelector,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['pills', 'cards', 'list'],
    },
    showYardage: { control: 'boolean' },
    showBanner: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof TeeSelector>;

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
});

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveTeeSelector({
  initialTee,
  ...props
}: Omit<TeeSelectorProps, 'selectedTee' | 'onSelectTee'> & {
  initialTee?: TeeBox | null;
}) {
  const [selectedTee, setSelectedTee] = useState<TeeBox | null>(initialTee ?? null);

  return (
    <TeeSelector
      {...props}
      selectedTee={selectedTee}
      onSelectTee={setSelectedTee}
    />
  );
}

// ===========================================================================
// PILLS VARIANT STORIES
// ===========================================================================

export const PillsDefault: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pills Variant - Default">
        <InteractiveTeeSelector tees={mockTees} variant="pills" />
      </Section>
    </StoryWrapper>
  ),
};

export const PillsWithYardage: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pills Variant - With Yardage">
        <InteractiveTeeSelector tees={mockTees} variant="pills" showYardage />
      </Section>
    </StoryWrapper>
  ),
};

export const PillsWithSelection: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pills Variant - With Pre-selected Tee">
        <InteractiveTeeSelector
          tees={mockTees}
          variant="pills"
          initialTee={mockTees[1]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const PillsCustomLabel: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pills Variant - Custom Label">
        <InteractiveTeeSelector
          tees={mockTees}
          variant="pills"
          label="Choose Tee Box:"
        />
      </Section>
    </StoryWrapper>
  ),
};

export const PillsMinimalTees: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pills Variant - Minimal (2 Tees)">
        <InteractiveTeeSelector tees={minimalTees} variant="pills" />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CARDS VARIANT STORIES
// ===========================================================================

export const CardsDefault: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Cards Variant - Default">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={mockTees} variant="cards" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

export const CardsWithSelection: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Cards Variant - With Pre-selected Tee">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector
            tees={mockTees}
            variant="cards"
            initialTee={mockTees[2]}
          />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

export const CardsDisabled: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Cards Variant - Disabled">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={mockTees} variant="cards" disabled />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

export const CardsEmpty: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Cards Variant - No Tees Available">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={[]} variant="cards" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// LIST VARIANT STORIES
// ===========================================================================

export const ListDefault: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: '#FFF', height: 500 }}>
      <InteractiveTeeSelector
        tees={mockTees}
        variant="list"
        courseInfo={{
          courseName: 'East/West Course',
          venue: mockVenue,
        }}
        onSkip={() => alert('Skipped!')}
      />
    </View>
  ),
};

export const ListWithSelection: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: '#FFF', height: 500 }}>
      <InteractiveTeeSelector
        tees={mockTees}
        variant="list"
        courseInfo={{
          courseName: 'Championship Course',
          venue: mockVenue,
        }}
        initialTee={mockTees[0]}
        onSkip={() => alert('Skipped!')}
      />
    </View>
  ),
};

export const ListWithoutBanner: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: '#FFF', height: 400 }}>
      <InteractiveTeeSelector
        tees={mockTees}
        variant="list"
        showBanner={false}
        onSkip={() => alert('Skipped!')}
      />
    </View>
  ),
};

export const ListWithoutSkip: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: '#FFF', height: 400 }}>
      <InteractiveTeeSelector
        tees={mockTees}
        variant="list"
        courseInfo={{
          courseName: 'East/West Course',
          venue: mockVenue,
        }}
      />
    </View>
  ),
};

export const ListMinimalCourseInfo: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: '#FFF', height: 500 }}>
      <InteractiveTeeSelector
        tees={mockTees}
        variant="list"
        courseInfo={{
          courseName: 'Main Course',
        }}
        onSkip={() => alert('Skipped!')}
      />
    </View>
  ),
};

// ===========================================================================
// ALL VARIANTS COMPARISON
// ===========================================================================

export const AllVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pills Variant">
        <InteractiveTeeSelector
          tees={mockTees}
          variant="pills"
          showYardage
        />
      </Section>
      <Section title="Cards Variant">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={mockTees} variant="cards" />
        </View>
      </Section>
      <Section title="List Variant">
        <View style={{ backgroundColor: '#FFF', height: 350, borderRadius: 8 }}>
          <InteractiveTeeSelector
            tees={mockTees}
            variant="list"
            courseInfo={{
              courseName: 'Championship Course',
              venue: mockVenue,
            }}
            onSkip={() => alert('Skipped!')}
          />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// TEE COLORS
// ===========================================================================

const colorTees: TeeBox[] = [
  { name: 'Black', color: 'black', totalYardage: 7000 },
  { name: 'Blue', color: 'blue', totalYardage: 6500 },
  { name: 'White', color: 'white', totalYardage: 6000 },
  { name: 'Yellow', color: 'yellow', totalYardage: 5700 },
  { name: 'Gold', color: 'gold', totalYardage: 5500 },
  { name: 'Red', color: 'red', totalYardage: 5200 },
  { name: 'Green', color: 'green', totalYardage: 5000 },
  { name: 'Silver', color: 'silver', totalYardage: 4800 },
  { name: 'Orange', color: 'orange', totalYardage: 4500 },
];

export const AllTeeColors: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Tee Colors - Pills">
        <InteractiveTeeSelector tees={colorTees} variant="pills" />
      </Section>
      <Section title="All Tee Colors - Cards">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={colorTees} variant="cards" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const SingleTee: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Single Tee - Pills">
        <InteractiveTeeSelector
          tees={[mockTees[2]]}
          variant="pills"
        />
      </Section>
      <Section title="Single Tee - Cards">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={[mockTees[2]]} variant="cards" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

export const EmptyTees: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Empty Tees - Pills">
        <InteractiveTeeSelector tees={[]} variant="pills" />
        <Text style={{ color: '#666', fontStyle: 'italic' }}>
          (Pills variant returns null when empty)
        </Text>
      </Section>
      <Section title="Empty Tees - Cards">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={[]} variant="cards" />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

const teesWithMissingData: TeeBox[] = [
  { name: 'Full Data', color: 'blue', totalYardage: 6500, courseRating: 71.5, slopeRating: 128 },
  { name: 'No Rating', color: 'white', totalYardage: 6000 },
  { name: 'Only CR', color: 'yellow', totalYardage: 5700, courseRating: 68.0 },
  { name: 'Only Slope', color: 'red', totalYardage: 5200, slopeRating: 115 },
];

export const PartialData: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Partial Data - Cards">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector tees={teesWithMissingData} variant="cards" />
        </View>
      </Section>
      <Section title="Partial Data - List">
        <View style={{ backgroundColor: '#FFF', height: 300, borderRadius: 8 }}>
          <InteractiveTeeSelector
            tees={teesWithMissingData}
            variant="list"
            courseInfo={{ courseName: 'Test Course' }}
          />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    tees: mockTees,
    variant: 'pills',
    showYardage: false,
    showBanner: true,
    disabled: false,
    label: 'Select Tee:',
  },
  render: (args: TeeSelectorProps) => (
    <StoryWrapper>
      <Section title="Playground">
        <View style={{ backgroundColor: '#FFF', padding: spacing.md, borderRadius: 8 }}>
          <InteractiveTeeSelector
            {...args}
            courseInfo={{
              courseName: 'Test Course',
              venue: mockVenue,
            }}
            onSkip={() => alert('Skipped!')}
          />
        </View>
      </Section>
    </StoryWrapper>
  ),
};
