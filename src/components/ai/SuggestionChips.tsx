/**
 * SuggestionChips - Quick prompt templates for AI competition creation
 *
 * Displays tappable chips with pre-written prompt suggestions
 * to help users get started with AI competition creation.
 *
 * Each suggestion declares the minimum subscription tier required to actually
 * create the competition it describes. Chips above the user's tier are hidden
 * so users can't tap a prompt that will fail at the create step.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import type { SubscriptionTier } from '@/types/subscription.types';

interface SuggestionChipsProps {
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  /**
   * User's current subscription tier. When provided, suggestions whose
   * `requiredTier` exceeds the user's tier are filtered out. When omitted
   * (e.g. in tests), all suggestions are shown.
   */
  tier?: SubscriptionTier;
}

interface Suggestion {
  label: string;
  prompt: string;
  icon: string;
  requiredTier: SubscriptionTier;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  social: 1,
  premium: 2,
  enterprise: 3,
  super_admin: 4,
  developer: 4,
};

const SUGGESTIONS: Suggestion[] = [
  {
    label: 'Stableford comp',
    prompt:
      'Create a Stableford competition with my friends next Saturday morning',
    icon: 'golf',
    requiredTier: 'free',
  },
  {
    label: 'Quick round',
    prompt: 'Set up a Stableford round for 4 players this weekend',
    icon: 'clock-fast',
    requiredTier: 'free',
  },
  {
    label: 'Stroke play',
    prompt: 'Create a Stroke Play competition for 6 players next weekend',
    icon: 'counter',
    requiredTier: 'social',
  },
  {
    label: 'Par round',
    prompt: 'Set up a Par round for 4 friends next Saturday morning',
    icon: 'plus-minus',
    requiredTier: 'social',
  },
  {
    label: 'Team event',
    prompt:
      'Create a 2-round Best Ball competition with 2 teams of 4 starting this weekend',
    icon: 'account-group',
    requiredTier: 'premium',
  },
  {
    label: 'Multi-round',
    prompt:
      'Create a 4-round competition over 4 weeks alternating Stableford, Stroke Play, Match Play, and Par',
    icon: 'calendar-multiple',
    requiredTier: 'premium',
  },
];

export function SuggestionChips({
  onSelect,
  disabled,
  tier,
}: SuggestionChipsProps) {
  const colors = useThemeColors();

  const visibleSuggestions = useMemo(() => {
    if (!tier) return SUGGESTIONS;
    const userRank = TIER_RANK[tier];
    return SUGGESTIONS.filter((s) => userRank >= TIER_RANK[s.requiredTier]);
  }, [tier]);

  if (visibleSuggestions.length === 0) return null;

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
        {visibleSuggestions.map((suggestion, index) => (
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
