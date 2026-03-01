/**
 * LeagueTypeSelector - Card-style radio list for selecting league type
 *
 * Shows icon, type name, 1-line description per type.
 * Lock icon for Ladder/Eclectic for non-Premium users.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { LeagueType } from '@/types/database';

interface LeagueTypeOption {
  type: LeagueType;
  icon: string;
  label: string;
  description: string;
  premiumOnly?: boolean;
}

const LEAGUE_TYPES: LeagueTypeOption[] = [
  {
    type: 'ongoing',
    icon: 'infinity',
    label: 'Ongoing',
    description: 'No end date. Best 8 of last 20 differentials.',
  },
  {
    type: 'season',
    icon: 'calendar-range',
    label: 'Season',
    description: 'Time-bound with start and end dates.',
  },
  {
    type: 'round_limit',
    icon: 'counter',
    label: 'Round Limit',
    description: 'Fixed number of rounds per player.',
  },
  {
    type: 'ladder',
    icon: 'ladder',
    label: 'Ladder',
    description: 'Ranked positions. Challenge those above you.',
    premiumOnly: true,
  },
  {
    type: 'eclectic',
    icon: 'star-shooting',
    label: 'Eclectic',
    description: 'Best score per hole across multiple rounds.',
    premiumOnly: true,
  },
];

interface LeagueTypeSelectorProps {
  selectedType: LeagueType;
  onSelectType: (type: LeagueType) => void;
  canCreatePremium: boolean;
  onPremiumPress?: () => void;
}

export default React.memo(function LeagueTypeSelector({
  selectedType,
  onSelectType,
  canCreatePremium,
  onPremiumPress,
}: LeagueTypeSelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {LEAGUE_TYPES.map((option) => {
        const isSelected = selectedType === option.type;
        const isLocked = option.premiumOnly && !canCreatePremium;

        return (
          <TouchableOpacity
            key={option.type}
            onPress={() => {
              if (isLocked) {
                onPremiumPress?.();
              } else {
                onSelectType(option.type);
              }
            }}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? colors.primaryBackground : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.7}
            accessibilityLabel={`${option.label} league type${isLocked ? ', requires Premium' : ''}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: isSelected ? colors.primary : colors.gray100 },
            ]}>
              <Icon
                source={option.icon}
                size={22}
                color={isSelected ? colors.white : colors.textSecondary}
              />
            </View>

            <View style={styles.textContainer}>
              <View style={styles.labelRow}>
                <Text style={[
                  styles.label,
                  { color: isLocked ? colors.textSecondary : colors.textPrimary },
                ]}>
                  {option.label}
                </Text>
                {isLocked && (
                  <Icon source="lock" size={14} color={colors.textSecondary} />
                )}
              </View>
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                {isLocked ? 'Premium only' : option.description}
              </Text>
            </View>

            {isSelected && !isLocked && (
              <Icon source="check-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
    ...shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.small,
    marginTop: 2,
  },
});
