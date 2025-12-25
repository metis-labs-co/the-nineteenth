/**
 * OfflineIndicator Storybook Stories
 *
 * Stories demonstrating the various states of the OfflineIndicator component.
 * Shows offline, syncing, error states, and various configurations.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { OfflineIndicator } from './OfflineIndicator';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof OfflineIndicator> = {
  title: 'Common/OfflineIndicator',
  component: OfflineIndicator,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['online', 'offline', 'syncing', 'error'],
    },
    pendingSyncs: { control: { type: 'number', min: 0, max: 100 } },
    errorMessage: { control: 'text' },
    isSyncing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof OfflineIndicator>;

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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

function Card({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <View style={wrapperStyles.card}>
      {label && <Text style={wrapperStyles.cardLabel}>{label}</Text>}
      <View style={wrapperStyles.cardContent}>{children}</View>
    </View>
  );
}

function MockScreen({ children }: { children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.mockScreen}>
      <View style={wrapperStyles.mockHeader}>
        <Text style={wrapperStyles.mockHeaderText}>My Competitions</Text>
      </View>
      {children}
      <View style={wrapperStyles.mockContent}>
        <Text style={wrapperStyles.mockContentText}>Screen content here...</Text>
      </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    padding: spacing.sm,
    paddingBottom: 0,
    fontWeight: '500',
  },
  cardContent: {
    // Let content fill card
  },
  mockScreen: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mockHeader: {
    backgroundColor: '#1E7F5E',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  mockHeaderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  mockContent: {
    padding: spacing.lg,
    minHeight: 100,
  },
  mockContentText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 0,
  },
};

export const Online: Story = {
  args: {
    status: 'online',
  },
  parameters: {
    docs: {
      description: {
        story: 'When online, the component returns null and nothing is rendered.',
      },
    },
  },
};

export const Offline: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 0,
  },
};

export const OfflineWithPendingSyncs: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 3,
    onSyncPress: () => console.log('Sync pressed'),
  },
};

export const Syncing: Story = {
  args: {
    status: 'syncing',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    onSyncPress: () => console.log('Retry pressed'),
  },
};

export const ErrorWithCustomMessage: Story = {
  args: {
    status: 'error',
    errorMessage: 'Network connection lost. Please check your internet.',
    onSyncPress: () => console.log('Retry pressed'),
  },
};

// ===========================================================================
// PENDING SYNCS VARIATIONS
// ===========================================================================

export const OnePendingSync: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 1,
    onSyncPress: () => console.log('Sync pressed'),
  },
};

export const TwoPendingSyncs: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 2,
    onSyncPress: () => console.log('Sync pressed'),
  },
};

export const ManyPendingSyncs: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 15,
    onSyncPress: () => console.log('Sync pressed'),
  },
};

export const PendingSyncsComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pending Syncs Count Variations">
        <Card label="0 pending (no button)">
          <OfflineIndicator status="offline" pendingSyncs={0} />
        </Card>
        <Card label="1 pending (singular)">
          <OfflineIndicator
            status="offline"
            pendingSyncs={1}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="2 pending (plural)">
          <OfflineIndicator
            status="offline"
            pendingSyncs={2}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="5 pending">
          <OfflineIndicator
            status="offline"
            pendingSyncs={5}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="50 pending">
          <OfflineIndicator
            status="offline"
            pendingSyncs={50}
            onSyncPress={() => {}}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ERROR MESSAGE VARIATIONS
// ===========================================================================

export const ErrorDefaultMessage: Story = {
  args: {
    status: 'error',
    onSyncPress: () => {},
  },
};

export const ErrorNetworkMessage: Story = {
  args: {
    status: 'error',
    errorMessage: 'Network unavailable',
    onSyncPress: () => {},
  },
};

export const ErrorTimeoutMessage: Story = {
  args: {
    status: 'error',
    errorMessage: 'Connection timed out',
    onSyncPress: () => {},
  },
};

export const ErrorServerMessage: Story = {
  args: {
    status: 'error',
    errorMessage: 'Server error (500). Please try again later.',
    onSyncPress: () => {},
  },
};

export const ErrorMessageVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Error Message Variations">
        <Card label="Default message">
          <OfflineIndicator status="error" onSyncPress={() => {}} />
        </Card>
        <Card label="Network error">
          <OfflineIndicator
            status="error"
            errorMessage="Network unavailable"
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="Timeout">
          <OfflineIndicator
            status="error"
            errorMessage="Connection timed out"
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="Server error">
          <OfflineIndicator
            status="error"
            errorMessage="Server error (500)"
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="Long message">
          <OfflineIndicator
            status="error"
            errorMessage="Unable to sync your scores. The server may be under maintenance. Please try again in a few minutes."
            onSyncPress={() => {}}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STATUS COMPARISON
// ===========================================================================

export const AllStatuses: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Status States">
        <Card label="Online (returns null - nothing rendered)">
          <View style={{ padding: spacing.md }}>
            <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>
              Online status renders nothing
            </Text>
          </View>
        </Card>
        <Card label="Offline (no pending)">
          <OfflineIndicator status="offline" />
        </Card>
        <Card label="Offline (with pending syncs)">
          <OfflineIndicator
            status="offline"
            pendingSyncs={3}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="Syncing">
          <OfflineIndicator status="syncing" />
        </Card>
        <Card label="Error">
          <OfflineIndicator status="error" onSyncPress={() => {}} />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// BUTTON STATES
// ===========================================================================

export const WithSyncButton: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 5,
    onSyncPress: () => console.log('Sync button pressed'),
  },
};

export const WithRetryButton: Story = {
  args: {
    status: 'error',
    onSyncPress: () => console.log('Retry button pressed'),
  },
};

export const WithoutCallback: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 5,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Without onSyncPress callback, no button is shown even with pending syncs.',
      },
    },
  },
};

export const ButtonHiddenWhenSyncing: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 5,
    onSyncPress: () => {},
    isSyncing: true,
  },
};

export const ButtonStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Button Visibility">
        <Card label="Sync button shown">
          <OfflineIndicator
            status="offline"
            pendingSyncs={3}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="No button (no callback)">
          <OfflineIndicator status="offline" pendingSyncs={3} />
        </Card>
        <Card label="No button (no pending syncs)">
          <OfflineIndicator
            status="offline"
            pendingSyncs={0}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="No button (isSyncing=true)">
          <OfflineIndicator
            status="offline"
            pendingSyncs={3}
            onSyncPress={() => {}}
            isSyncing
          />
        </Card>
        <Card label="Retry button shown">
          <OfflineIndicator status="error" onSyncPress={() => {}} />
        </Card>
        <Card label="Retry hidden (isSyncing=true)">
          <OfflineIndicator status="error" onSyncPress={() => {}} isSyncing />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// IN CONTEXT
// ===========================================================================

export const InScreenContext: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="In Screen Context">
        <MockScreen>
          <OfflineIndicator
            status="offline"
            pendingSyncs={3}
            onSyncPress={() => {}}
          />
        </MockScreen>
      </Section>
      <Section title="Syncing State">
        <MockScreen>
          <OfflineIndicator status="syncing" />
        </MockScreen>
      </Section>
      <Section title="Error State">
        <MockScreen>
          <OfflineIndicator
            status="error"
            errorMessage="Connection failed"
            onSyncPress={() => {}}
          />
        </MockScreen>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE DEMO
// ===========================================================================

function InteractiveDemo() {
  const [status, setStatus] = useState<'offline' | 'syncing' | 'error' | 'online'>('offline');
  const [pendingSyncs, setPendingSyncs] = useState(3);

  const handleSync = () => {
    if (status === 'offline' || status === 'error') {
      setStatus('syncing');
      // Simulate sync
      setTimeout(() => {
        // 50% chance of success
        if (Math.random() > 0.5) {
          setStatus('online');
          setPendingSyncs(0);
        } else {
          setStatus('error');
        }
      }, 2000);
    }
  };

  const reset = () => {
    setStatus('offline');
    setPendingSyncs(3);
  };

  return (
    <StoryWrapper>
      <Section title="Interactive Demo">
        <Text style={{ color: '#6B7280', marginBottom: spacing.md }}>
          Press "Sync" or "Retry" to simulate sync. 50% chance of success.
        </Text>
        <MockScreen>
          <OfflineIndicator
            status={status}
            pendingSyncs={pendingSyncs}
            errorMessage="Sync failed. Please try again."
            onSyncPress={handleSync}
          />
        </MockScreen>
        <View style={{ marginTop: spacing.md }}>
          <Text
            style={{
              color: '#1E7F5E',
              textAlign: 'center',
              fontWeight: '600',
            }}
            onPress={reset}
          >
            Reset Demo
          </Text>
        </View>
      </Section>
    </StoryWrapper>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

// ===========================================================================
// SYNC FLOW SIMULATION
// ===========================================================================

function SyncFlowDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { status: 'offline' as const, pendingSyncs: 5, label: 'Offline with pending changes' },
    { status: 'syncing' as const, pendingSyncs: 5, label: 'Syncing in progress...' },
    { status: 'error' as const, pendingSyncs: 5, errorMessage: 'Connection timeout', label: 'Sync failed' },
    { status: 'syncing' as const, pendingSyncs: 5, label: 'Retrying...' },
    { status: 'online' as const, pendingSyncs: 0, label: 'Successfully synced!' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const currentStep = steps[step];

  return (
    <StoryWrapper>
      <Section title="Sync Flow Animation">
        <Text style={{ color: '#6B7280', marginBottom: spacing.md }}>
          Demonstrating typical sync flow: offline → syncing → error → retry → success
        </Text>
        <Card label={currentStep.label}>
          <OfflineIndicator
            status={currentStep.status}
            pendingSyncs={currentStep.pendingSyncs}
            errorMessage={currentStep.errorMessage}
            onSyncPress={() => {}}
          />
        </Card>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {steps.map((s, i) => (
            <View
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: i === step ? '#1E7F5E' : '#E5E7EB',
              }}
            />
          ))}
        </View>
      </Section>
    </StoryWrapper>
  );
}

export const SyncFlowAnimation: Story = {
  render: () => <SyncFlowDemo />,
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongErrorMessage: Story = {
  args: {
    status: 'error',
    errorMessage:
      'Unable to synchronize your scores with the server. This may be due to a temporary network issue or server maintenance. Please check your internet connection and try again in a few minutes.',
    onSyncPress: () => {},
  },
};

export const ZeroPendingSyncs: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 0,
  },
};

export const HighPendingSyncsCount: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 999,
    onSyncPress: () => {},
  },
};

// ===========================================================================
// USE CASES
// ===========================================================================

export const UseCase_ScoreEntry: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Score Entry Flow">
        <Text style={{ color: '#6B7280', marginBottom: spacing.md }}>
          When a player is entering scores on the course with poor connectivity.
        </Text>
        <Card label="Entering scores offline">
          <OfflineIndicator
            status="offline"
            pendingSyncs={4}
            onSyncPress={() => {}}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const UseCase_CompetitionView: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Viewing Competition">
        <Text style={{ color: '#6B7280', marginBottom: spacing.md }}>
          When viewing competition details with pending score submissions.
        </Text>
        <MockScreen>
          <OfflineIndicator
            status="offline"
            pendingSyncs={2}
            onSyncPress={() => {}}
          />
        </MockScreen>
      </Section>
    </StoryWrapper>
  ),
};

export const UseCase_ErrorRecovery: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Error Recovery">
        <Text style={{ color: '#6B7280', marginBottom: spacing.md }}>
          When sync fails and user needs to retry.
        </Text>
        <MockScreen>
          <OfflineIndicator
            status="error"
            errorMessage="Failed to upload scores. Tap Retry to try again."
            onSyncPress={() => {}}
          />
        </MockScreen>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

export const AccessibilityDemo: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Accessibility Features">
        <Text style={{ color: '#6B7280', marginBottom: spacing.md }}>
          The component uses appropriate colors and contrast for visibility.
          Buttons have accessible labels and are properly sized for touch.
        </Text>
        <Card label="Yellow for offline (warning)">
          <OfflineIndicator
            status="offline"
            pendingSyncs={3}
            onSyncPress={() => {}}
          />
        </Card>
        <Card label="Blue for syncing (info)">
          <OfflineIndicator status="syncing" />
        </Card>
        <Card label="Red for error">
          <OfflineIndicator status="error" onSyncPress={() => {}} />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    status: 'offline',
    pendingSyncs: 3,
    errorMessage: 'Sync failed',
    onSyncPress: () => console.log('Button pressed'),
    isSyncing: false,
  },
};
