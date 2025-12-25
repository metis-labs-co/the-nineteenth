/**
 * ErrorState Storybook Stories
 *
 * Stories demonstrating the various configurations of the ErrorState component.
 * Shows error handling, retry buttons, compact mode, and use case examples.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState } from './ErrorState';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ErrorState> = {
  title: 'Common/ErrorState',
  component: ErrorState,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    error: { control: 'text' },
    title: { control: 'text' },
    retryLabel: { control: 'text' },
    compact: { control: 'boolean' },
    onRetry: { action: 'retry pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

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
    gap: spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    error: 'Something went wrong. Please try again.',
  },
};

export const WithRetry: Story = {
  args: {
    error: 'Failed to load data from the server.',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const CustomTitle: Story = {
  args: {
    error: 'Unable to connect to the server.',
    title: 'Connection Error',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const CustomRetryLabel: Story = {
  args: {
    error: 'Request timed out.',
    title: 'Request Failed',
    retryLabel: 'Retry Request',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const Compact: Story = {
  args: {
    error: 'Score submission failed',
    title: 'Submission Error',
    compact: true,
  },
};

export const CompactWithRetry: Story = {
  args: {
    error: 'Unable to sync data',
    title: 'Sync Failed',
    retryLabel: 'Retry Sync',
    onRetry: () => console.log('Retry clicked'),
    compact: true,
  },
};

// ===========================================================================
// ERROR TYPES
// ===========================================================================

export const StringError: Story = {
  args: {
    error: 'This is a string error message',
  },
};

export const ErrorObjectStory: Story = {
  name: 'Error Object',
  args: {
    error: new Error('This error was created from an Error object'),
    onRetry: () => console.log('Retry clicked'),
  },
};

export const NullError: Story = {
  args: {
    error: null,
    onRetry: () => console.log('Retry clicked'),
  },
};

export const ErrorTypeComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="String Error">
        <Card>
          <ErrorState
            error="This is a plain string error message"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Error Object">
        <Card>
          <ErrorState
            error={new Error('This error came from an Error object')}
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Null Error (Fallback)">
        <Card>
          <ErrorState error={null} onRetry={() => {}} compact />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMPACT MODE COMPARISON
// ===========================================================================

export const CompactComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Normal Mode">
        <Card>
          <ErrorState
            error="Failed to load competition data. Please check your connection and try again."
            title="Load Error"
            retryLabel="Try Again"
            onRetry={() => {}}
          />
        </Card>
      </Section>
      <Section title="Compact Mode">
        <Card>
          <ErrorState
            error="Failed to load competition data. Please check your connection and try again."
            title="Load Error"
            retryLabel="Retry"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const NetworkError: Story = {
  args: {
    error: 'Network request failed. Please check your internet connection.',
    title: 'Connection Error',
    retryLabel: 'Retry Connection',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const APIError: Story = {
  args: {
    error: 'Failed to load competition data. The server returned an error.',
    title: 'Load Error',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const SubmissionError: Story = {
  args: {
    error: 'Score submission failed. Your scores have been saved locally.',
    title: 'Submission Failed',
    retryLabel: 'Retry Submission',
    onRetry: () => console.log('Retry clicked'),
    compact: true,
  },
};

export const SyncError: Story = {
  args: {
    error: 'Sync failed. Your changes are saved locally and will sync when connection is restored.',
    title: 'Sync Error',
    retryLabel: 'Retry Sync',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const AuthError: Story = {
  args: {
    error: 'Your session has expired. Please log in again.',
    title: 'Authentication Error',
  },
};

export const LeaderboardError: Story = {
  args: {
    error: new Error('Unable to fetch leaderboard data'),
    title: "Couldn't load leaderboard",
    onRetry: () => console.log('Retry clicked'),
  },
};

export const ScorecardError: Story = {
  args: {
    error: 'Failed to save scorecard. Please try again.',
    title: 'Save Failed',
    retryLabel: 'Save Again',
    onRetry: () => console.log('Retry clicked'),
    compact: true,
  },
};

export const UseCaseGallery: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Network Error">
        <Card>
          <ErrorState
            error="No internet connection"
            title="Offline"
            retryLabel="Reconnect"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="API Error">
        <Card>
          <ErrorState
            error="Server error (500)"
            title="Server Error"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Sync Error">
        <Card>
          <ErrorState
            error="Sync failed"
            title="Sync Error"
            retryLabel="Retry"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Auth Error">
        <Card>
          <ErrorState
            error="Session expired"
            title="Logged Out"
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// WITHOUT RETRY BUTTON
// ===========================================================================

export const NoRetryButton: Story = {
  args: {
    error: 'This feature is temporarily unavailable.',
    title: 'Unavailable',
  },
};

export const InformationalError: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Errors Without Retry Options">
        <Card>
          <ErrorState
            error="This feature is not available in your region."
            title="Not Available"
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="Your subscription has expired. Please contact support."
            title="Subscription Expired"
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="This competition has been cancelled by the organizer."
            title="Competition Cancelled"
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongErrorMessage: Story = {
  args: {
    error:
      'This is a very long error message that provides detailed information about what went wrong during the operation. It includes additional context about the error and suggestions for how the user might resolve the issue. The server returned status code 500 with message: Internal Server Error.',
    title: 'Detailed Error',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const ShortError: Story = {
  args: {
    error: 'Timeout',
    title: 'Error',
    onRetry: () => console.log('Retry clicked'),
    compact: true,
  },
};

export const SpecialCharacters: Story = {
  args: {
    error: 'Error: "Resource not found" (code: 404) - /api/v1/competition/123',
    title: 'Not Found',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const ErrorWithEmoji: Story = {
  args: {
    error: 'Oops! Something went wrong while loading your data.',
    title: 'Error',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const EdgeCaseGallery: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Very Long Error">
        <Card>
          <ErrorState
            error="This is an extremely long error message that contains a lot of detail about what went wrong and might need to be truncated or wrapped appropriately."
            title="Long Error"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Very Short Error">
        <Card>
          <ErrorState error="404" title="Error" onRetry={() => {}} compact />
        </Card>
      </Section>
      <Section title="Special Characters">
        <Card>
          <ErrorState
            error='Error: "Not found" (code: 404)'
            title="Not Found"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// RETRY LABEL VARIATIONS
// ===========================================================================

export const RetryLabelVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Label">
        <Card>
          <ErrorState
            error="Default retry label"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Custom Labels">
        <Card>
          <ErrorState
            error="Reload content"
            retryLabel="Reload"
            onRetry={() => {}}
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="Refresh data"
            retryLabel="Refresh"
            onRetry={() => {}}
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="Reconnect to server"
            retryLabel="Reconnect"
            onRetry={() => {}}
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="Resync data"
            retryLabel="Sync Again"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM TITLES
// ===========================================================================

export const CustomTitleVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Title">
        <Card>
          <ErrorState
            error="Error with default title"
            onRetry={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Custom Titles">
        <Card>
          <ErrorState
            error="Connection failed"
            title="Network Error"
            onRetry={() => {}}
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="Data failed to load"
            title="Load Failed"
            onRetry={() => {}}
            compact
          />
        </Card>
        <Card>
          <ErrorState
            error="Submission unsuccessful"
            title="Couldn't Submit"
            onRetry={() => {}}
            compact
          />
        </Card>
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
        <Card>
          <ErrorState
            error="This error state has proper accessibility attributes including alert role and screen reader labels"
            title="Accessible Error"
            retryLabel="Try Again"
            onRetry={() => {}}
          />
        </Card>
      </Section>
      <Text style={{ fontSize: 12, color: '#6B7280', padding: spacing.md }}>
        Note: The container has an alert role and combined accessibility label.
        The title has a header role. The retry button has accessibility label
        and hint.
      </Text>
    </StoryWrapper>
  ),
};

// ===========================================================================
// FULLSCREEN EXAMPLES
// ===========================================================================

export const FullscreenError: Story = {
  args: {
    error: 'Failed to load page content. The server may be temporarily unavailable.',
    title: 'Page Load Error',
    onRetry: () => console.log('Retry clicked'),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const FullscreenNetworkError: Story = {
  args: {
    error: 'No internet connection. Please check your network settings and try again.',
    title: 'You\'re Offline',
    retryLabel: 'Check Connection',
    onRetry: () => console.log('Check connection clicked'),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    error: 'Customize this error message',
    title: 'Customize Me',
    retryLabel: 'Try Again',
    onRetry: () => console.log('Retry clicked'),
    compact: false,
  },
};
