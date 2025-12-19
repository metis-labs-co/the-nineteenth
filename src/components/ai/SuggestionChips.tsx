/**
 * SuggestionChips - Quick prompt templates for AI competition creation
 *
 * Displays tappable chips with pre-written prompt suggestions
 * to help users get started with AI competition creation.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

interface SuggestionChipsProps {
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

interface Suggestion {
  label: string;
  prompt: string;
  icon: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    label: 'Stableford comp',
    prompt:
      'Create a single round Stableford competition with all my friends next Saturday morning',
    icon: 'golf',
  },
  {
    label: 'Team event',
    prompt:
      'Create a 2-round Best Ball competition with 2 teams of 4, starting this weekend',
    icon: 'account-group',
  },
  {
    label: 'Multi-round',
    prompt:
      'Create a 4-round competition over 4 weeks with a different game type each round',
    icon: 'calendar-multiple',
  },
  {
    label: 'Quick round',
    prompt:
      'Set up a casual Stableford round for 4 players this weekend',
    icon: 'clock-fast',
  },
];

export function SuggestionChips({ onSelect, disabled }: SuggestionChipsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Try a suggestion:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {SUGGESTIONS.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.chip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              disabled && styles.chipDisabled,
            ]}
            onPress={() => onSelect(suggestion.prompt)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon
              source={suggestion.icon}
              size={16}
              color={disabled ? colors.textDisabled : colors.primary}
            />
            <Text
              style={[
                styles.chipText,
                { color: disabled ? colors.textDisabled : colors.textPrimary },
              ]}
            >
              {suggestion.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.small,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    ...typography.small,
  },
});

export default SuggestionChips;
