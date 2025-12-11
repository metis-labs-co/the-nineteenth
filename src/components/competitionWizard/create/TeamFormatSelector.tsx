import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, RadioButton, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import type { TeamFormat } from '@/types/database.types';

/**
 * Team format configuration for round selection
 */
interface TeamFormatOption {
  value: TeamFormat;
  label: string;
  description: string;
  icon: string;
}

/**
 * Team formats available for team rounds
 */
const TEAM_FORMAT_OPTIONS: TeamFormatOption[] = [
  {
    value: 'best-ball',
    label: 'Best Ball',
    description: 'Best individual score from each team counts',
    icon: 'star-circle-outline',
  },
  {
    value: 'scramble',
    label: 'Scramble',
    description: 'Team plays from best shot each time',
    icon: 'target',
  },
  {
    value: 'aggregate',
    label: 'Aggregate',
    description: 'Combined team score counts',
    icon: 'calculator-variant-outline',
  },
  {
    value: 'match-play-team',
    label: 'Team Match Play',
    description: 'Teams compete hole-by-hole',
    icon: 'sword-cross',
  },
];

/**
 * Props for TeamFormatSelector component
 */
export interface TeamFormatSelectorProps {
  /**
   * Currently selected team format
   */
  value: TeamFormat | null;
  /**
   * Callback when team format changes
   */
  onChange: (format: TeamFormat) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
  /**
   * Error message to display
   */
  error?: string;
}

/**
 * TeamFormatSelector - Team format selector for team rounds
 *
 * Displays team format options (Best Ball, Scramble, Aggregate, Team Match Play).
 *
 * @example
 * ```tsx
 * <TeamFormatSelector
 *   value="best-ball"
 *   onChange={(format) => setTeamFormat(format)}
 *   disabled={false}
 * />
 * ```
 */
export const TeamFormatSelector = React.memo(function TeamFormatSelector({
  value,
  onChange,
  disabled = false,
  error,
}: TeamFormatSelectorProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const handlePress = (format: TeamFormat) => {
    if (!disabled) {
      onChange(format);
    }
  };

  const renderFormatOption = (option: TeamFormatOption) => {
    const isSelected = value === option.value;

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.optionContainer,
          {
            borderColor: isSelected
              ? colors.primary
              : error
                ? colors.error
                : colors.gray300,
            backgroundColor: isSelected
              ? colors.primaryLighter + '20'
              : isDark
                ? colors.gray100
                : colors.surface,
          },
          disabled && styles.optionDisabled,
        ]}
        onPress={() => handlePress(option.value)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={option.label}
        accessibilityHint={option.description}
        accessibilityRole="radio"
        accessibilityState={{
          selected: isSelected,
          disabled,
        }}
      >
        <View style={styles.optionContent}>
          <View style={styles.radioContainer}>
            <RadioButton
              value={option.value}
              status={isSelected ? 'checked' : 'unchecked'}
              onPress={() => handlePress(option.value)}
              disabled={disabled}
              color={colors.primary}
              uncheckedColor={disabled ? colors.gray400 : colors.gray500}
            />
          </View>

          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isSelected ? colors.primary : colors.gray200 },
            ]}
          >
            <Icon
              source={option.icon}
              size={20}
              color={isSelected ? colors.white : disabled ? colors.gray400 : colors.gray600}
            />
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.optionLabel,
                { color: disabled ? colors.textDisabled : colors.textPrimary },
                isSelected && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                { color: disabled ? colors.textDisabled : colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {option.description}
            </Text>
          </View>

          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
              <Icon source="check" size={14} color={colors.white} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <RadioButton.Group
        onValueChange={(v) => onChange(v as TeamFormat)}
        value={value ?? ''}
      >
        {TEAM_FORMAT_OPTIONS.map((option) => renderFormatOption(option))}
      </RadioButton.Group>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  optionContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 72,
  },
  radioContainer: {
    marginLeft: -spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  optionLabel: {
    ...typography.bodyBold,
  },
  optionLabelSelected: {
    fontWeight: '700',
  },
  optionDescription: {
    ...typography.small,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

export default TeamFormatSelector;
