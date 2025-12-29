/**
 * SearchBar Storybook Stories
 *
 * Stories demonstrating the various configurations of the SearchBar component.
 * Shows empty states, search with value, clear button, custom placeholders,
 * styling options, and use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './SearchBar';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof SearchBar> = {
  title: 'Common/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    accessibilityLabel: { control: 'text' },
    hideBorder: { control: 'boolean' },
    inputBackgroundColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

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
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveSearchBar(props: Partial<React.ComponentProps<typeof SearchBar>>) {
  const [value, setValue] = useState(props.value ?? '');

  return (
    <SearchBar
      value={value}
      onChangeText={setValue}
      placeholder={props.placeholder}
      accessibilityLabel={props.accessibilityLabel}
      hideBorder={props.hideBorder}
      inputBackgroundColor={props.inputBackgroundColor}
      containerStyle={props.containerStyle}
    />
  );
}

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <InteractiveSearchBar />
      </Card>
    </StoryWrapper>
  ),
};

export const Empty: Story = {
  args: {
    value: '',
    onChangeText: () => {},
  },
};

export const WithValue: Story = {
  args: {
    value: 'Royal Melbourne',
    onChangeText: () => {},
  },
};

export const WithCustomPlaceholder: Story = {
  args: {
    value: '',
    onChangeText: () => {},
    placeholder: 'Search courses...',
  },
};

// ===========================================================================
// PLACEHOLDER VARIATIONS
// ===========================================================================

export const PlaceholderVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Different Placeholders">
        <Card>
          <InteractiveSearchBar placeholder="Search..." />
        </Card>
        <Card>
          <InteractiveSearchBar placeholder="Find players..." />
        </Card>
        <Card>
          <InteractiveSearchBar placeholder="Search courses..." />
        </Card>
        <Card>
          <InteractiveSearchBar placeholder="Search competitions..." />
        </Card>
        <Card>
          <InteractiveSearchBar placeholder="Type to search friends..." />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// VALUE STATES
// ===========================================================================

export const ValueStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Empty">
        <Card>
          <SearchBar value="" onChangeText={() => {}} placeholder="Empty search..." />
        </Card>
      </Section>

      <Section title="Short Value">
        <Card>
          <SearchBar value="ab" onChangeText={() => {}} />
        </Card>
      </Section>

      <Section title="Normal Value">
        <Card>
          <SearchBar value="Royal Melbourne" onChangeText={() => {}} />
        </Card>
      </Section>

      <Section title="Long Value">
        <Card>
          <SearchBar
            value="The Metropolitan Golf Club Victoria Australia"
            onChangeText={() => {}}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CLEAR BUTTON
// ===========================================================================

export const ClearButtonVisible: Story = {
  args: {
    value: 'Search text',
    onChangeText: () => {},
  },
};

export const ClearButtonHidden: Story = {
  args: {
    value: '',
    onChangeText: () => {},
  },
};

export const InteractiveClearDemo: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Type to see clear button">
        <Card>
          <InteractiveSearchBar placeholder="Start typing..." />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// BORDER VARIATIONS
// ===========================================================================

export const WithBorder: Story = {
  args: {
    value: '',
    onChangeText: () => {},
    hideBorder: false,
  },
};

export const WithoutBorder: Story = {
  args: {
    value: '',
    onChangeText: () => {},
    hideBorder: true,
  },
};

export const BorderComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Border (Default)">
        <Card>
          <SearchBar value="" onChangeText={() => {}} hideBorder={false} />
        </Card>
      </Section>

      <Section title="Without Border">
        <Card>
          <SearchBar value="" onChangeText={() => {}} hideBorder={true} />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// BACKGROUND COLOR VARIATIONS
// ===========================================================================

export const CustomBackgroundColor: Story = {
  args: {
    value: '',
    onChangeText: () => {},
    inputBackgroundColor: '#E5E7EB',
  },
};

export const BackgroundColorVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Background">
        <Card>
          <SearchBar value="" onChangeText={() => {}} />
        </Card>
      </Section>

      <Section title="Light Gray">
        <Card>
          <SearchBar value="" onChangeText={() => {}} inputBackgroundColor="#F3F4F6" />
        </Card>
      </Section>

      <Section title="Light Green">
        <Card>
          <SearchBar value="" onChangeText={() => {}} inputBackgroundColor="#ECFDF5" />
        </Card>
      </Section>

      <Section title="Light Blue">
        <Card>
          <SearchBar value="" onChangeText={() => {}} inputBackgroundColor="#EFF6FF" />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CONTAINER STYLE VARIATIONS
// ===========================================================================

export const CustomContainerStyle: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Container">
        <Card>
          <SearchBar value="" onChangeText={() => {}} />
        </Card>
      </Section>

      <Section title="No Padding">
        <Card>
          <SearchBar
            value=""
            onChangeText={() => {}}
            containerStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
        </Card>
      </Section>

      <Section title="Extra Padding">
        <Card>
          <SearchBar
            value=""
            onChangeText={() => {}}
            containerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

export const WithCustomAccessibilityLabel: Story = {
  args: {
    value: '',
    onChangeText: () => {},
    accessibilityLabel: 'Search for golf courses',
  },
};

export const AccessibilityVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Label (Search)">
        <Card>
          <SearchBar value="" onChangeText={() => {}} />
        </Card>
      </Section>

      <Section title="Custom Label (Search Players)">
        <Card>
          <SearchBar
            value=""
            onChangeText={() => {}}
            accessibilityLabel="Search players"
            placeholder="Find players..."
          />
        </Card>
      </Section>

      <Section title="Custom Label (Search Courses)">
        <Card>
          <SearchBar
            value=""
            onChangeText={() => {}}
            accessibilityLabel="Search golf courses"
            placeholder="Search courses..."
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASES
// ===========================================================================

export const CourseSearch: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Course Search">
        <Card>
          <InteractiveSearchBar
            placeholder="Search courses..."
            accessibilityLabel="Search golf courses"
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const PlayerSearch: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Player Search">
        <Card>
          <InteractiveSearchBar
            placeholder="Find players..."
            accessibilityLabel="Search players"
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const CompetitionSearch: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Search">
        <Card>
          <InteractiveSearchBar
            placeholder="Search competitions..."
            accessibilityLabel="Search competitions"
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const FriendSearch: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Friend Search">
        <Card>
          <InteractiveSearchBar
            placeholder="Search friends..."
            accessibilityLabel="Search friends"
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const ModalSearch: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Search in Modal (no border)">
        <Card>
          <InteractiveSearchBar
            placeholder="Search..."
            hideBorder={true}
            containerStyle={{ paddingTop: 0 }}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongPlaceholder: Story = {
  args: {
    value: '',
    onChangeText: () => {},
    placeholder: 'Search for courses, players, or competitions...',
  },
};

export const SpecialCharacters: Story = {
  args: {
    value: "@#$%^&*()!",
    onChangeText: () => {},
  },
};

export const EmojiContent: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Emoji in Search">
        <Card>
          <SearchBar value="Golf ⛳ 🏌️" onChangeText={() => {}} />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const UnicodeContent: Story = {
  args: {
    value: 'Cafe Aussie',
    onChangeText: () => {},
  },
};

export const WhitespaceOnly: Story = {
  args: {
    value: '   ',
    onChangeText: () => {},
  },
};

// ===========================================================================
// COMBINED PROPS
// ===========================================================================

export const AllPropsSet: Story = {
  args: {
    value: 'Royal Melbourne',
    onChangeText: () => {},
    placeholder: 'Search courses...',
    accessibilityLabel: 'Search golf courses',
    hideBorder: true,
    inputBackgroundColor: '#F0F0F0',
    containerStyle: { margin: 8 },
  },
};

export const AllCombinations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Empty + Default">
        <Card>
          <SearchBar value="" onChangeText={() => {}} />
        </Card>
      </Section>

      <Section title="Empty + Custom Placeholder">
        <Card>
          <SearchBar
            value=""
            onChangeText={() => {}}
            placeholder="Find courses..."
          />
        </Card>
      </Section>

      <Section title="With Value + Clear Button">
        <Card>
          <SearchBar
            value="Melbourne"
            onChangeText={() => {}}
          />
        </Card>
      </Section>

      <Section title="No Border + Custom Background">
        <Card>
          <SearchBar
            value=""
            onChangeText={() => {}}
            hideBorder={true}
            inputBackgroundColor="#E5E7EB"
          />
        </Card>
      </Section>

      <Section title="Full Configuration">
        <Card>
          <SearchBar
            value="Royal Melbourne Golf Club"
            onChangeText={() => {}}
            placeholder="Search courses..."
            accessibilityLabel="Search golf courses"
            hideBorder={true}
            inputBackgroundColor="#F3F4F6"
            containerStyle={{ paddingVertical: 8 }}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// MULTIPLE SEARCH BARS
// ===========================================================================

export const MultipleSearchBars: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Multiple Search Bars">
        <Card>
          <InteractiveSearchBar placeholder="Search courses..." />
        </Card>
        <Card>
          <InteractiveSearchBar placeholder="Search players..." />
        </Card>
        <Card>
          <InteractiveSearchBar placeholder="Search competitions..." />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Interactive Playground">
        <Card>
          <InteractiveSearchBar
            placeholder="Try typing something..."
          />
        </Card>
      </Section>
      <Text style={{ color: '#6B7280', fontSize: 12, textAlign: 'center' }}>
        Type in the search bar above to see the clear button appear
      </Text>
    </StoryWrapper>
  ),
};
