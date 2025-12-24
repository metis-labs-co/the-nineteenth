/**
 * StatusBadge Storybook Stories
 *
 * Stories demonstrating the various configurations of the StatusBadge component.
 * Shows status variants, size options, custom colors, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge, StatusBadgeProps, StatusVariant, StatusBadgeSize } from './StatusBadge';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof StatusBadge> = {
  title: 'Common/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: [
        'in-progress',
        'completed',
        'upcoming',
        'scheduled',
        'active',
        'draft',
        'cancelled',
        'custom',
      ],
    },
    label: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md'],
    },
    accessibilityLabel: { control: 'text' },
    backgroundColor: { control: 'color' },
    textColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

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

function Row({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.row}>{children}</View>;
}

function LabeledBadge({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={wrapperStyles.labeledBadge}>
      {children}
      <Text style={wrapperStyles.badgeLabel}>{label}</Text>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  labeledBadge: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
});

// ===========================================================================
// BASIC STATUS STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    status: 'active',
  },
};

export const InProgress: Story = {
  args: {
    status: 'in-progress',
  },
};

export const Completed: Story = {
  args: {
    status: 'completed',
  },
};

export const Upcoming: Story = {
  args: {
    status: 'upcoming',
  },
};

export const Scheduled: Story = {
  args: {
    status: 'scheduled',
  },
};

export const Active: Story = {
  args: {
    status: 'active',
  },
};

export const Draft: Story = {
  args: {
    status: 'draft',
  },
};

export const Cancelled: Story = {
  args: {
    status: 'cancelled',
  },
};

export const Custom: Story = {
  args: {
    status: 'custom',
    label: 'You',
    backgroundColor: '#DBEAFE',
    textColor: '#1E40AF',
  },
};

// ===========================================================================
// ALL STATUSES OVERVIEW
// ===========================================================================

export const AllStatuses: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Status Variants">
        <Row>
          <LabeledBadge label="in-progress">
            <StatusBadge status="in-progress" />
          </LabeledBadge>
          <LabeledBadge label="completed">
            <StatusBadge status="completed" />
          </LabeledBadge>
          <LabeledBadge label="upcoming">
            <StatusBadge status="upcoming" />
          </LabeledBadge>
          <LabeledBadge label="scheduled">
            <StatusBadge status="scheduled" />
          </LabeledBadge>
        </Row>
        <Row>
          <LabeledBadge label="active">
            <StatusBadge status="active" />
          </LabeledBadge>
          <LabeledBadge label="draft">
            <StatusBadge status="draft" />
          </LabeledBadge>
          <LabeledBadge label="cancelled">
            <StatusBadge status="cancelled" />
          </LabeledBadge>
          <LabeledBadge label="custom">
            <StatusBadge status="custom" label="Custom" />
          </LabeledBadge>
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SIZE STORIES
// ===========================================================================

export const SizeSmall: Story = {
  args: {
    status: 'active',
    size: 'sm',
  },
};

export const SizeMedium: Story = {
  args: {
    status: 'active',
    size: 'md',
  },
};

export const AllSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Comparison">
        <Row>
          <LabeledBadge label="sm">
            <StatusBadge status="active" size="sm" />
          </LabeledBadge>
          <LabeledBadge label="md">
            <StatusBadge status="active" size="md" />
          </LabeledBadge>
        </Row>
      </Section>
      <Section title="Sizes with Different Statuses">
        <Row>
          <StatusBadge status="in-progress" size="sm" />
          <StatusBadge status="in-progress" size="md" />
        </Row>
        <Row>
          <StatusBadge status="completed" size="sm" />
          <StatusBadge status="completed" size="md" />
        </Row>
        <Row>
          <StatusBadge status="upcoming" size="sm" />
          <StatusBadge status="upcoming" size="md" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM LABEL STORIES
// ===========================================================================

export const WithCustomLabel: Story = {
  args: {
    status: 'in-progress',
    label: 'Playing Now',
  },
};

export const CustomLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Labels">
        <Row>
          <StatusBadge status="in-progress" />
          <StatusBadge status="active" />
          <StatusBadge status="completed" />
        </Row>
      </Section>
      <Section title="Custom Labels (Same Statuses)">
        <Row>
          <StatusBadge status="in-progress" label="Round 2" />
          <StatusBadge status="active" label="Live" />
          <StatusBadge status="completed" label="Done" />
        </Row>
      </Section>
      <Section title="Short Labels">
        <Row>
          <StatusBadge status="active" label="On" size="sm" />
          <StatusBadge status="cancelled" label="Off" size="sm" />
          <StatusBadge status="custom" label="VIP" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM COLOR STORIES
// ===========================================================================

export const CustomColors: Story = {
  args: {
    status: 'custom',
    label: 'VIP',
    backgroundColor: '#FFD700',
    textColor: '#7C2D12',
  },
};

export const CustomColorVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Custom Color Badges">
        <Row>
          <StatusBadge
            status="custom"
            label="You"
            backgroundColor="#DBEAFE"
            textColor="#1E40AF"
          />
          <StatusBadge
            status="custom"
            label="Organiser"
            backgroundColor="#FEF3C7"
            textColor="#92400E"
          />
          <StatusBadge
            status="custom"
            label="Pro"
            backgroundColor="#FDF2F8"
            textColor="#9D174D"
          />
        </Row>
      </Section>
      <Section title="Team Colors">
        <Row>
          <StatusBadge
            status="custom"
            label="Team A"
            backgroundColor="#DCFCE7"
            textColor="#166534"
          />
          <StatusBadge
            status="custom"
            label="Team B"
            backgroundColor="#FEE2E2"
            textColor="#991B1B"
          />
          <StatusBadge
            status="custom"
            label="Team C"
            backgroundColor="#E0E7FF"
            textColor="#3730A3"
          />
        </Row>
      </Section>
      <Section title="Ranking Indicators">
        <Row>
          <StatusBadge
            status="custom"
            label="1st"
            backgroundColor="#FEF3C7"
            textColor="#92400E"
          />
          <StatusBadge
            status="custom"
            label="2nd"
            backgroundColor="#F3F4F6"
            textColor="#374151"
          />
          <StatusBadge
            status="custom"
            label="3rd"
            backgroundColor="#FFEDD5"
            textColor="#9A3412"
          />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const CompetitionStatus: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Status Flow">
        <Row>
          <StatusBadge status="draft" />
          <Text style={{ fontSize: 12, color: '#6B7280' }}>→</Text>
          <StatusBadge status="upcoming" />
          <Text style={{ fontSize: 12, color: '#6B7280' }}>→</Text>
          <StatusBadge status="in-progress" />
          <Text style={{ fontSize: 12, color: '#6B7280' }}>→</Text>
          <StatusBadge status="completed" />
        </Row>
      </Section>
      <Section title="Alternative End States">
        <Row>
          <StatusBadge status="cancelled" />
          <StatusBadge status="completed" label="Finalized" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const RoundStatus: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Round Status Options">
        <Row>
          <StatusBadge status="scheduled" label="Round 1" />
          <StatusBadge status="in-progress" label="Round 2" />
          <StatusBadge status="completed" label="Round 3" />
        </Row>
      </Section>
      <Section title="Small Round Badges">
        <Row>
          <StatusBadge status="upcoming" label="R1" size="sm" />
          <StatusBadge status="active" label="R2" size="sm" />
          <StatusBadge status="completed" label="R3" size="sm" />
          <StatusBadge status="scheduled" label="R4" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const PlayerIdentifiers: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Player Role Badges">
        <Row>
          <StatusBadge
            status="custom"
            label="You"
            size="sm"
            backgroundColor="#DBEAFE"
            textColor="#1E40AF"
          />
          <StatusBadge
            status="custom"
            label="Organiser"
            size="sm"
            backgroundColor="#FEF3C7"
            textColor="#92400E"
          />
          <StatusBadge
            status="custom"
            label="Scorer"
            size="sm"
            backgroundColor="#F3E8FF"
            textColor="#7C3AED"
          />
        </Row>
      </Section>
      <Section title="Pairing Identifiers">
        <Row>
          <StatusBadge
            status="custom"
            label="Group A"
            size="sm"
          />
          <StatusBadge
            status="custom"
            label="Group B"
            size="sm"
          />
          <StatusBadge
            status="custom"
            label="Group C"
            size="sm"
          />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const LeaderboardBadges: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Position Badges">
        <Row>
          <StatusBadge
            status="custom"
            label="1st"
            size="sm"
            backgroundColor="#FEF3C7"
            textColor="#92400E"
          />
          <StatusBadge
            status="custom"
            label="2nd"
            size="sm"
            backgroundColor="#F3F4F6"
            textColor="#374151"
          />
          <StatusBadge
            status="custom"
            label="3rd"
            size="sm"
            backgroundColor="#FFEDD5"
            textColor="#9A3412"
          />
          <StatusBadge
            status="custom"
            label="T4"
            size="sm"
          />
        </Row>
      </Section>
      <Section title="Live Indicator">
        <Row>
          <StatusBadge status="active" label="Live" size="sm" />
          <StatusBadge status="in-progress" label="Scoring" size="sm" />
          <StatusBadge status="completed" label="Final" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

export const LongLabel: Story = {
  args: {
    status: 'in-progress',
    label: 'This is a very long status label',
  },
};

export const ShortLabel: Story = {
  args: {
    status: 'active',
    label: 'On',
    size: 'sm',
  },
};

export const SpecialCharacters: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Special Character Labels">
        <Row>
          <StatusBadge status="custom" label="#1" size="sm" />
          <StatusBadge status="custom" label="@ Event" size="sm" />
          <StatusBadge status="custom" label="★ VIP" size="sm" />
          <StatusBadge status="custom" label="50%" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY STORIES
// ===========================================================================

export const WithAccessibilityLabel: Story = {
  args: {
    status: 'in-progress',
    accessibilityLabel: 'Competition is currently in progress, Round 2 of 4',
  },
};

export const AccessibilityExamples: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Status Badges with Custom Accessibility Labels">
        <Row>
          <StatusBadge
            status="active"
            label="Live"
            accessibilityLabel="Competition is currently live with active scoring"
          />
          <StatusBadge
            status="completed"
            label="Done"
            accessibilityLabel="Competition has been completed and finalized"
          />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMPARISON STORIES
// ===========================================================================

export const StatusComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Similar Statuses Comparison">
        <Row>
          <LabeledBadge label="upcoming">
            <StatusBadge status="upcoming" />
          </LabeledBadge>
          <LabeledBadge label="scheduled">
            <StatusBadge status="scheduled" />
          </LabeledBadge>
        </Row>
        <Row>
          <LabeledBadge label="in-progress">
            <StatusBadge status="in-progress" />
          </LabeledBadge>
          <LabeledBadge label="active">
            <StatusBadge status="active" />
          </LabeledBadge>
        </Row>
        <Row>
          <LabeledBadge label="draft">
            <StatusBadge status="draft" />
          </LabeledBadge>
          <LabeledBadge label="cancelled">
            <StatusBadge status="cancelled" />
          </LabeledBadge>
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const SizeStatusMatrix: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small Size - All Statuses">
        <Row>
          <StatusBadge status="in-progress" size="sm" />
          <StatusBadge status="completed" size="sm" />
          <StatusBadge status="upcoming" size="sm" />
          <StatusBadge status="active" size="sm" />
        </Row>
        <Row>
          <StatusBadge status="draft" size="sm" />
          <StatusBadge status="cancelled" size="sm" />
          <StatusBadge status="scheduled" size="sm" />
          <StatusBadge status="custom" label="Custom" size="sm" />
        </Row>
      </Section>
      <Section title="Medium Size - All Statuses">
        <Row>
          <StatusBadge status="in-progress" size="md" />
          <StatusBadge status="completed" size="md" />
          <StatusBadge status="upcoming" size="md" />
          <StatusBadge status="active" size="md" />
        </Row>
        <Row>
          <StatusBadge status="draft" size="md" />
          <StatusBadge status="cancelled" size="md" />
          <StatusBadge status="scheduled" size="md" />
          <StatusBadge status="custom" label="Custom" size="md" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    status: 'active',
    label: '',
    size: 'md',
    accessibilityLabel: '',
    backgroundColor: '',
    textColor: '',
  },
};
