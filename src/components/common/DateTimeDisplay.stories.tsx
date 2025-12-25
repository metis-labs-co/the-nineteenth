/**
 * DateTimeDisplay Storybook Stories
 *
 * Stories demonstrating the various configurations of the DateTimeDisplay component.
 * Shows size variants, icon variants, date formatting, time display, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import {
  DateTimeDisplay,
  DateTimeDisplaySize,
  DateTimeDisplayIcon,
} from './DateTimeDisplay';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof DateTimeDisplay> = {
  title: 'Common/DateTimeDisplay',
  component: DateTimeDisplay,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    date: { control: 'text' },
    time: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    icon: {
      control: { type: 'select' },
      options: ['calendar', 'clock', 'none'],
    },
    timeConnector: { control: 'text' },
    color: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof DateTimeDisplay>;

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

function Row({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={wrapperStyles.row}>
      {label && <Text style={wrapperStyles.rowLabel}>{label}</Text>}
      {children}
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
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  rowLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 80,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    date: '2025-01-15',
  },
};

export const WithTime: Story = {
  args: {
    date: '2025-01-15',
    time: '10:30 AM',
  },
};

export const WithClockIcon: Story = {
  args: {
    date: '2025-01-15',
    time: '10:30 AM',
    icon: 'clock',
  },
};

export const NoIcon: Story = {
  args: {
    date: '2025-01-15',
    icon: 'none',
  },
};

// ===========================================================================
// SIZE VARIANTS
// ===========================================================================

export const SizeVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Variants">
        <Row label="Small (sm)">
          <DateTimeDisplay date="2025-01-15" size="sm" />
        </Row>
        <Row label="Medium (md)">
          <DateTimeDisplay date="2025-01-15" size="md" />
        </Row>
        <Row label="Large (lg)">
          <DateTimeDisplay date="2025-01-15" size="lg" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const SmallSize: Story = {
  args: {
    date: '2025-01-15',
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    date: '2025-01-15',
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    date: '2025-01-15',
    size: 'lg',
  },
};

// ===========================================================================
// ICON VARIANTS
// ===========================================================================

export const IconVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Icon Variants">
        <Row label="Calendar">
          <DateTimeDisplay date="2025-01-15" icon="calendar" />
        </Row>
        <Row label="Clock">
          <DateTimeDisplay date="2025-01-15" icon="clock" />
        </Row>
        <Row label="None">
          <DateTimeDisplay date="2025-01-15" icon="none" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const CalendarIcon: Story = {
  args: {
    date: '2025-01-15',
    icon: 'calendar',
  },
};

export const ClockIcon: Story = {
  args: {
    date: '2025-01-15',
    time: '2:30 PM',
    icon: 'clock',
  },
};

// ===========================================================================
// TIME DISPLAY
// ===========================================================================

export const TimeVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Time Display Variations">
        <Row label="Date only">
          <DateTimeDisplay date="2025-01-15" />
        </Row>
        <Row label="With time">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" />
        </Row>
        <Row label="PM time">
          <DateTimeDisplay date="2025-01-15" time="6:45 PM" />
        </Row>
        <Row label="24-hour">
          <DateTimeDisplay date="2025-01-15" time="14:30" />
        </Row>
        <Row label="Midnight">
          <DateTimeDisplay date="2025-01-15" time="12:00 AM" />
        </Row>
        <Row label="Noon">
          <DateTimeDisplay date="2025-01-15" time="12:00 PM" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const MorningTime: Story = {
  args: {
    date: '2025-01-15',
    time: '7:30 AM',
  },
};

export const AfternoonTime: Story = {
  args: {
    date: '2025-01-15',
    time: '2:45 PM',
  },
};

export const EveningTime: Story = {
  args: {
    date: '2025-01-15',
    time: '7:00 PM',
  },
};

// ===========================================================================
// TIME CONNECTORS
// ===========================================================================

export const TimeConnectors: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Time Connector Variations">
        <Row label="Default (at)">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" />
        </Row>
        <Row label="@ symbol">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" timeConnector="@" />
        </Row>
        <Row label="Dash (-)">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" timeConnector="-" />
        </Row>
        <Row label="Pipe (|)">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" timeConnector="|" />
        </Row>
        <Row label="Comma">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" timeConnector="," />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const AtSymbolConnector: Story = {
  args: {
    date: '2025-01-15',
    time: '10:30 AM',
    timeConnector: '@',
  },
};

export const DashConnector: Story = {
  args: {
    date: '2025-01-15',
    time: '10:30 AM',
    timeConnector: '-',
  },
};

// ===========================================================================
// DATE FORMATS
// ===========================================================================

export const DateFormats: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Date Format Variations">
        <Row label="Default">
          <DateTimeDisplay date="2025-01-15" />
        </Row>
        <Row label="Full month">
          <DateTimeDisplay
            date="2025-01-15"
            dateFormat={{ day: 'numeric', month: 'long', year: 'numeric' }}
          />
        </Row>
        <Row label="With weekday">
          <DateTimeDisplay
            date="2025-01-15"
            dateFormat={{ weekday: 'short', day: 'numeric', month: 'short' }}
          />
        </Row>
        <Row label="Long weekday">
          <DateTimeDisplay
            date="2025-01-15"
            dateFormat={{ weekday: 'long', day: 'numeric', month: 'long' }}
          />
        </Row>
        <Row label="Numeric">
          <DateTimeDisplay
            date="2025-01-15"
            dateFormat={{ day: 'numeric', month: 'numeric', year: 'numeric' }}
          />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const FullMonthFormat: Story = {
  args: {
    date: '2025-01-15',
    dateFormat: { day: 'numeric', month: 'long', year: 'numeric' },
  },
};

export const WithWeekday: Story = {
  args: {
    date: '2025-01-15',
    dateFormat: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  },
};

export const NumericFormat: Story = {
  args: {
    date: '2025-01-15',
    dateFormat: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
};

// ===========================================================================
// CUSTOM COLORS
// ===========================================================================

export const CustomColors: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Custom Color Variations">
        <Row label="Default">
          <DateTimeDisplay date="2025-01-15" />
        </Row>
        <Row label="Primary">
          <DateTimeDisplay date="2025-01-15" color="#1E7F5E" />
        </Row>
        <Row label="Error">
          <DateTimeDisplay date="2025-01-15" color="#DC2626" />
        </Row>
        <Row label="Warning">
          <DateTimeDisplay date="2025-01-15" color="#F59E0B" />
        </Row>
        <Row label="Blue">
          <DateTimeDisplay date="2025-01-15" color="#3B82F6" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const PrimaryColor: Story = {
  args: {
    date: '2025-01-15',
    color: '#1E7F5E',
  },
};

export const ErrorColor: Story = {
  args: {
    date: '2025-01-15',
    color: '#DC2626',
  },
};

export const WarningColor: Story = {
  args: {
    date: '2025-01-15',
    color: '#F59E0B',
  },
};

// ===========================================================================
// ALL SIZES WITH TIME
// ===========================================================================

export const AllSizesWithTime: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Sizes with Time">
        <Row label="Small">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" size="sm" />
        </Row>
        <Row label="Medium">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" size="md" />
        </Row>
        <Row label="Large">
          <DateTimeDisplay date="2025-01-15" time="10:30 AM" size="lg" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASES
// ===========================================================================

export const UseCases: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Golf App Use Cases">
        <Row label="Competition date">
          <DateTimeDisplay date="2025-03-15" size="md" />
        </Row>
        <Row label="Tee time">
          <DateTimeDisplay date="2025-03-15" time="7:30 AM" icon="clock" />
        </Row>
        <Row label="Round schedule">
          <DateTimeDisplay
            date="2025-03-15"
            time="9:00 AM"
            size="lg"
          />
        </Row>
        <Row label="List item">
          <DateTimeDisplay date="2025-03-15" size="sm" icon="none" />
        </Row>
        <Row label="Last updated">
          <DateTimeDisplay date="2025-01-15" time="3:45 PM" icon="clock" size="sm" />
        </Row>
        <Row label="Deadline">
          <DateTimeDisplay date="2025-02-28" time="11:59 PM" color="#DC2626" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const CompetitionDate: Story = {
  args: {
    date: '2025-03-15',
    size: 'md',
  },
};

export const TeeTime: Story = {
  args: {
    date: '2025-03-15',
    time: '7:30 AM',
    icon: 'clock',
  },
};

export const RoundSchedule: Story = {
  args: {
    date: '2025-03-15',
    time: '9:00 AM',
    size: 'lg',
  },
};

export const ListItemDate: Story = {
  args: {
    date: '2025-03-15',
    size: 'sm',
    icon: 'none',
  },
};

export const LastUpdated: Story = {
  args: {
    date: '2025-01-15',
    time: '3:45 PM',
    icon: 'clock',
    size: 'sm',
  },
};

export const Deadline: Story = {
  args: {
    date: '2025-02-28',
    time: '11:59 PM',
    color: '#DC2626',
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const EdgeCases: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Edge Cases">
        <Row label="Start of year">
          <DateTimeDisplay date="2025-01-01" />
        </Row>
        <Row label="End of year">
          <DateTimeDisplay date="2025-12-31" />
        </Row>
        <Row label="Leap year">
          <DateTimeDisplay date="2024-02-29" />
        </Row>
        <Row label="Far future">
          <DateTimeDisplay date="2099-12-31" />
        </Row>
        <Row label="Past date">
          <DateTimeDisplay date="2000-01-01" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const StartOfYear: Story = {
  args: {
    date: '2025-01-01',
  },
};

export const EndOfYear: Story = {
  args: {
    date: '2025-12-31',
  },
};

export const LeapYear: Story = {
  args: {
    date: '2024-02-29',
  },
};

// ===========================================================================
// COMPREHENSIVE EXAMPLES
// ===========================================================================

export const ComprehensiveExample: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Comparison">
        {(['sm', 'md', 'lg'] as DateTimeDisplaySize[]).map((size) => (
          <Row key={size} label={size.toUpperCase()}>
            <DateTimeDisplay date="2025-01-15" time="10:30 AM" size={size} />
          </Row>
        ))}
      </Section>

      <Section title="Icon Comparison">
        {(['calendar', 'clock', 'none'] as DateTimeDisplayIcon[]).map((icon) => (
          <Row key={icon} label={icon}>
            <DateTimeDisplay date="2025-01-15" time="10:30 AM" icon={icon} />
          </Row>
        ))}
      </Section>

      <Section title="Size + Icon Matrix">
        {(['sm', 'md', 'lg'] as DateTimeDisplaySize[]).map((size) =>
          (['calendar', 'clock'] as DateTimeDisplayIcon[]).map((icon) => (
            <Row key={`${size}-${icon}`} label={`${size} + ${icon}`}>
              <DateTimeDisplay date="2025-01-15" time="10:30 AM" size={size} icon={icon} />
            </Row>
          ))
        )}
      </Section>
    </StoryWrapper>
  ),
};

export const AllCombinations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Size + Icon Combinations">
        {(['sm', 'md', 'lg'] as DateTimeDisplaySize[]).map((size) => (
          <View key={size} style={{ marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '600', marginBottom: spacing.sm }}>
              Size: {size.toUpperCase()}
            </Text>
            {(['calendar', 'clock', 'none'] as DateTimeDisplayIcon[]).map((icon) => (
              <Row key={`${size}-${icon}`} label={icon}>
                <DateTimeDisplay
                  date="2025-01-15"
                  time="10:30 AM"
                  size={size}
                  icon={icon}
                />
              </Row>
            ))}
          </View>
        ))}
      </Section>
    </StoryWrapper>
  ),
};
