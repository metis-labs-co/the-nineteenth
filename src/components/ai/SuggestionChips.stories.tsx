/**
 * SuggestionChips Storybook Stories
 *
 * Visual testing for the AI prompt suggestion chips component
 * including various states and interactions.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SuggestionChips } from './SuggestionChips';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META CONFIGURATION
// ===========================================================================

const meta: Meta<typeof SuggestionChips> = {
  title: 'AI/SuggestionChips',
  component: SuggestionChips,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onSelect: { action: 'onSelect' },
    disabled: {
      control: 'boolean',
      description: 'Disables all suggestion chips',
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, minHeight: 200 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SuggestionChips>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>
        {children}
      </View>
    </ScrollView>
  );
}

function StorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
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
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

// ===========================================================================
// INTERACTIVE STORIES
// ===========================================================================

export const InteractiveWithFeedback: Story = {
  render: () => {
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    return (
      <StoryWrapper>
        <StorySection title="Interactive with Feedback">
          <SuggestionChips onSelect={setSelectedPrompt} />
          {selectedPrompt && (
            <View style={interactiveStyles.feedbackContainer}>
              <Text style={interactiveStyles.feedbackLabel}>Selected prompt:</Text>
              <Text style={interactiveStyles.feedbackText}>{selectedPrompt}</Text>
            </View>
          )}
        </StorySection>
      </StoryWrapper>
    );
  },
};

export const InteractiveToggleDisabled: Story = {
  render: () => {
    const [disabled, setDisabled] = useState(false);
    const [lastSelected, setLastSelected] = useState<string | null>(null);

    return (
      <StoryWrapper>
        <StorySection title="Toggle Disabled State">
          <View style={interactiveStyles.toggleContainer}>
            <Text>Disabled: {disabled ? 'Yes' : 'No'}</Text>
            <View style={interactiveStyles.toggleButton}>
              <Text
                style={interactiveStyles.toggleButtonText}
                onPress={() => setDisabled(!disabled)}
              >
                Toggle
              </Text>
            </View>
          </View>
          <SuggestionChips
            onSelect={(prompt) => {
              setLastSelected(prompt);
            }}
            disabled={disabled}
          />
          {lastSelected && (
            <View style={interactiveStyles.feedbackContainer}>
              <Text style={interactiveStyles.feedbackLabel}>Last selected:</Text>
              <Text style={interactiveStyles.feedbackText}>{lastSelected}</Text>
            </View>
          )}
        </StorySection>
      </StoryWrapper>
    );
  },
};

const interactiveStyles = StyleSheet.create({
  feedbackContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  feedbackLabel: {
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: spacing.xs,
  },
  feedbackText: {
    color: '#388E3C',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  toggleButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ===========================================================================
// STATE COMPARISON STORIES
// ===========================================================================

export const AllStates: Story = {
  render: () => (
    <StoryWrapper>
      <StorySection title="Enabled State">
        <SuggestionChips onSelect={() => {}} disabled={false} />
      </StorySection>
      <StorySection title="Disabled State">
        <SuggestionChips onSelect={() => {}} disabled={true} />
      </StorySection>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY STORIES
// ===========================================================================

export const WithScreenReader: Story = {
  args: {
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
  },
};

export const DisabledWithScreenReader: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    a11y: { disable: false },
  },
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const InFormContext: Story = {
  render: () => {
    const [inputValue, setInputValue] = useState('');

    return (
      <StoryWrapper>
        <StorySection title="In Form Context">
          <View style={formStyles.formContainer}>
            <Text style={formStyles.label}>Competition Description</Text>
            <View style={formStyles.inputContainer}>
              <Text style={formStyles.inputPlaceholder}>
                {inputValue || 'Enter your competition details...'}
              </Text>
            </View>
            <SuggestionChips onSelect={setInputValue} />
          </View>
        </StorySection>
      </StoryWrapper>
    );
  },
};

export const WithLoadingInput: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSelect = (prompt: string) => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2000);
    };

    return (
      <StoryWrapper>
        <StorySection title="With Loading State">
          <SuggestionChips onSelect={handleSelect} disabled={isLoading} />
          {isLoading && (
            <View style={formStyles.loadingContainer}>
              <Text style={formStyles.loadingText}>Loading...</Text>
            </View>
          )}
        </StorySection>
      </StoryWrapper>
    );
  },
};

const formStyles = StyleSheet.create({
  formContainer: {
    gap: spacing.md,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
  },
  inputPlaceholder: {
    color: '#999999',
  },
  loadingContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  loadingText: {
    color: '#E65100',
  },
});

// ===========================================================================
// SELECTION TRACKING STORIES
// ===========================================================================

export const WithSelectionHistory: Story = {
  render: () => {
    const [history, setHistory] = useState<string[]>([]);

    const handleSelect = (prompt: string) => {
      setHistory((prev) => [...prev, prompt]);
    };

    return (
      <StoryWrapper>
        <StorySection title="Selection History">
          <SuggestionChips onSelect={handleSelect} />
          <View style={historyStyles.historyContainer}>
            <Text style={historyStyles.historyTitle}>Selection History:</Text>
            {history.length === 0 ? (
              <Text style={historyStyles.emptyText}>No selections yet</Text>
            ) : (
              history.map((prompt, index) => (
                <Text key={index} style={historyStyles.historyItem}>
                  {index + 1}. {prompt.substring(0, 50)}...
                </Text>
              ))
            )}
            {history.length > 0 && (
              <Text
                style={historyStyles.clearButton}
                onPress={() => setHistory([])}
              >
                Clear History
              </Text>
            )}
          </View>
        </StorySection>
      </StoryWrapper>
    );
  },
};

const historyStyles = StyleSheet.create({
  historyContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  historyTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: '#999999',
    fontStyle: 'italic',
  },
  historyItem: {
    color: '#666666',
    paddingVertical: spacing.xs,
  },
  clearButton: {
    color: '#D32F2F',
    marginTop: spacing.md,
    fontWeight: '600',
  },
});
