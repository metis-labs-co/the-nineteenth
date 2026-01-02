/**
 * NotificationBell Storybook Stories
 *
 * Stories demonstrating the various configurations of the NotificationBell component.
 * Shows different unread counts, badge states, icon sizes, and edge cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { NotificationBell } from './NotificationBell';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof NotificationBell> = {
  title: 'Profile/NotificationBell',
  component: NotificationBell,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onPress: { action: 'pressed' },
    size: {
      control: { type: 'range', min: 16, max: 48, step: 4 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationBell>;

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

function BellRow({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={wrapperStyles.bellRow}>
      {children}
      {label && <Text style={wrapperStyles.bellLabel}>{label}</Text>}
    </View>
  );
}

function BellGrid({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.bellGrid}>{children}</View>;
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
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
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  bellLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  bellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
});

// ===========================================================================
// MOCK PROVIDER
// ===========================================================================

/**
 * Creates a mock notification store provider for stories
 */
function _MockNotificationStoreProvider({
  unreadCount,
  children,
}: {
  unreadCount: number;
  children: React.ReactNode;
}) {
  // We use a key to force re-render when unreadCount changes
  return <View key={`mock-${unreadCount}`}>{children}</View>;
}

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    onPress: () => {},
    size: 24,
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Default (no unread notifications)">
          <BellRow label="Bell icon without badge">
            <Story />
          </BellRow>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const WithUnreadNotifications: Story = {
  args: {
    onPress: () => {},
    size: 24,
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="With Unread Notifications">
          <Text style={{ fontSize: 12, color: '#666', marginBottom: spacing.md }}>
            Note: The badge count is controlled by the notification store in the app.
            These examples show the visual appearance at different count levels.
          </Text>
          <BellRow label="Shows red badge with count">
            <Story />
          </BellRow>
        </Section>
      </StoryWrapper>
    ),
  ],
};

// ===========================================================================
// SIZE VARIATIONS
// ===========================================================================

export const SizeVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Icon Size Variations">
        <BellGrid>
          <BellRow label="16px">
            <NotificationBell onPress={() => {}} size={16} />
          </BellRow>
          <BellRow label="20px">
            <NotificationBell onPress={() => {}} size={20} />
          </BellRow>
          <BellRow label="24px (default)">
            <NotificationBell onPress={() => {}} size={24} />
          </BellRow>
          <BellRow label="28px">
            <NotificationBell onPress={() => {}} size={28} />
          </BellRow>
          <BellRow label="32px">
            <NotificationBell onPress={() => {}} size={32} />
          </BellRow>
          <BellRow label="48px">
            <NotificationBell onPress={() => {}} size={48} />
          </BellRow>
        </BellGrid>
      </Section>
    </StoryWrapper>
  ),
};

export const SmallSize: Story = {
  args: {
    onPress: () => {},
    size: 16,
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Small Size (16px)">
          <BellRow label="Compact bell icon">
            <Story />
          </BellRow>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const LargeSize: Story = {
  args: {
    onPress: () => {},
    size: 32,
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Large Size (32px)">
          <BellRow label="Larger bell icon for emphasis">
            <Story />
          </BellRow>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const ExtraLargeSize: Story = {
  args: {
    onPress: () => {},
    size: 48,
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Extra Large Size (48px)">
          <BellRow label="Prominent bell icon">
            <Story />
          </BellRow>
        </Section>
      </StoryWrapper>
    ),
  ],
};

// ===========================================================================
// BADGE COUNT EXAMPLES
// ===========================================================================

export const BadgeCountExamples: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Badge Count Display Rules">
        <Text style={{ fontSize: 12, color: '#666', marginBottom: spacing.md }}>
          The badge displays the exact count up to 99, then shows "99+" for counts over 99.
        </Text>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ width: 80, fontSize: 14 }}>Count 0:</Text>
            <Text style={{ color: '#666' }}>No badge shown</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ width: 80, fontSize: 14 }}>Count 1:</Text>
            <Text style={{ color: '#666' }}>Badge shows "1"</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ width: 80, fontSize: 14 }}>Count 50:</Text>
            <Text style={{ color: '#666' }}>Badge shows "50"</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ width: 80, fontSize: 14 }}>Count 99:</Text>
            <Text style={{ color: '#666' }}>Badge shows "99"</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ width: 80, fontSize: 14 }}>Count 100+:</Text>
            <Text style={{ color: '#666' }}>Badge shows "99+"</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// NAVIGATION HEADER CONTEXT
// ===========================================================================

export const InNavigationHeader: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="In Navigation Header Context">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600' }}>The Nineteenth</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <NotificationBell onPress={() => {}} size={24} />
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

export const InHeaderWithOtherActions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Header with Multiple Actions">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#E5E7EB',
              }}
            />
            <Text style={{ fontSize: 16, fontWeight: '500' }}>Home</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <NotificationBell onPress={() => {}} size={24} />
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#E5E7EB',
                }}
              />
            </View>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// TOUCH TARGET DEMONSTRATION
// ===========================================================================

export const TouchTargetDemonstration: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Touch Target (44x44px)">
        <Text style={{ fontSize: 12, color: '#666', marginBottom: spacing.md }}>
          The bell has a 44x44px touch target for easy tapping, plus 8px hitSlop extension.
        </Text>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                backgroundColor: 'rgba(30, 127, 94, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 22,
              }}
            >
              <NotificationBell onPress={() => {}} size={24} />
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#666', marginTop: spacing.sm }}>
            Green area = 44x44 touch target
          </Text>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY DEMONSTRATION
// ===========================================================================

export const AccessibilityFeatures: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Accessibility Features">
        <View style={{ gap: spacing.lg }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.xs }}>
              0 unread:
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Label: "Notifications, none unread"
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Hint: "Opens the notifications screen"
            </Text>
            <BellRow>
              <NotificationBell onPress={() => {}} />
            </BellRow>
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.xs }}>
              1 unread:
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Label: "Notifications, 1 unread"
            </Text>
            <BellRow>
              <NotificationBell onPress={() => {}} />
            </BellRow>
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.xs }}>
              5 unread:
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Label: "Notifications, 5 unread"
            </Text>
            <BellRow>
              <NotificationBell onPress={() => {}} />
            </BellRow>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE STORY
// ===========================================================================

export const Interactive: Story = {
  args: {
    size: 24,
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 16, max: 48, step: 4 },
      description: 'Icon size in pixels',
    },
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Interactive - Use Controls panel to adjust">
          <BellRow label="Try adjusting the size">
            <Story />
          </BellRow>
        </Section>
      </StoryWrapper>
    ),
  ],
};

// ===========================================================================
// DARK BACKGROUND CONTEXT
// ===========================================================================

export const OnDarkBackground: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="On Dark Background">
        <View
          style={{
            backgroundColor: '#1F2937',
            padding: spacing.lg,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', marginBottom: spacing.md, fontSize: 12 }}>
            Note: Icon color adapts based on theme
          </Text>
          <NotificationBell onPress={() => {}} size={24} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// MULTIPLE BELLS COMPARISON
// ===========================================================================

export const MultipleComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Comparison (Side by Side)">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            paddingVertical: spacing.lg,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <NotificationBell onPress={() => {}} size={16} />
            <Text style={{ fontSize: 10, color: '#666', marginTop: spacing.xs }}>16</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <NotificationBell onPress={() => {}} size={20} />
            <Text style={{ fontSize: 10, color: '#666', marginTop: spacing.xs }}>20</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <NotificationBell onPress={() => {}} size={24} />
            <Text style={{ fontSize: 10, color: '#666', marginTop: spacing.xs }}>24</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <NotificationBell onPress={() => {}} size={28} />
            <Text style={{ fontSize: 10, color: '#666', marginTop: spacing.xs }}>28</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <NotificationBell onPress={() => {}} size={32} />
            <Text style={{ fontSize: 10, color: '#666', marginTop: spacing.xs }}>32</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <NotificationBell onPress={() => {}} size={48} />
            <Text style={{ fontSize: 10, color: '#666', marginTop: spacing.xs }}>48</Text>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// LOADING/DISABLED STATE (CONCEPTUAL)
// ===========================================================================

export const ConceptualStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Conceptual States">
        <Text style={{ fontSize: 12, color: '#666', marginBottom: spacing.md }}>
          The NotificationBell doesn't have built-in loading or disabled states.
          If needed, wrap it in a container with reduced opacity.
        </Text>
        <View style={{ gap: spacing.md }}>
          <BellRow label="Normal state">
            <NotificationBell onPress={() => {}} />
          </BellRow>
          <BellRow label="Simulated disabled (50% opacity)">
            <View style={{ opacity: 0.5 }}>
              <NotificationBell onPress={() => {}} />
            </View>
          </BellRow>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const EdgeCases: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Edge Cases">
        <View style={{ gap: spacing.lg }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.sm }}>
              Very Small Icon (8px)
            </Text>
            <BellRow>
              <NotificationBell onPress={() => {}} size={8} />
            </BellRow>
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.sm }}>
              Very Large Icon (64px)
            </Text>
            <BellRow>
              <NotificationBell onPress={() => {}} size={64} />
            </BellRow>
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.sm }}>
              In Constrained Container
            </Text>
            <View
              style={{
                width: 60,
                height: 60,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}
            >
              <NotificationBell onPress={() => {}} size={24} />
            </View>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};
