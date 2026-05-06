/**
 * AIInputState - Input state display for AI generation
 *
 * Shows prompt input, suggestions, and info cards
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PromptInput, SuggestionChips } from '@/components/ai';
import type { SubscriptionTier } from '@/types/subscription.types';

interface AIInputStateProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionSelect: (suggestion: string) => void;
  isLoading: boolean;
  tier: SubscriptionTier;
}

export function AIInputState({
  prompt,
  onPromptChange,
  onSubmit,
  onSuggestionSelect,
  isLoading,
  tier,
}: AIInputStateProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <PromptInput
        value={prompt}
        onChangeText={onPromptChange}
        onSubmit={onSubmit}
        isLoading={isLoading}
      />

      <View style={styles.suggestionsContainer}>
        <SuggestionChips
          onSelect={onSuggestionSelect}
          disabled={isLoading}
          tier={tier}
        />
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
        <Icon source="information" size={20} color={colors.info} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: colors.info }]}>
            How it works
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Describe your competition in plain English. The AI will create
            rounds, assign players from your friends, and configure teams.
            Need more players? Specify a number and guest spots will be created.
          </Text>
        </View>
      </View>

      {/* Limitations note */}
      <View
        style={[styles.limitationsCard, { backgroundColor: colors.gray100 }]}
      >
        <Text style={[styles.limitationsTitle, { color: colors.textSecondary }]}>
          Good to know
        </Text>
        <Text style={[styles.limitationsText, { color: colors.textSecondary }]}>
          • Courses in your database can be auto-selected{'\n'}
          • Friends you&apos;ve added will be assigned first{'\n'}
          • If you need more players, guest players will be created{'\n'}
          • You can link guest players to real accounts later{'\n'}
          • Game types limited to your subscription tier ({tier})
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  suggestionsContainer: {
    marginTop: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    ...typography.bodyBold,
  },
  infoText: {
    ...typography.small,
    lineHeight: 20,
  },
  limitationsCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  limitationsTitle: {
    ...typography.small,
    fontWeight: '600',
  },
  limitationsText: {
    ...typography.caption,
    lineHeight: 18,
  },
});
