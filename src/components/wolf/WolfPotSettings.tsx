/**
 * WolfPotSettings - Pot toggle, value input, and example winnings display
 *
 * Renders:
 * - Enable pot toggle with styled row
 * - Per-point value input (when pot enabled)
 * - Example winnings card (lone wolf, blind wolf)
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Switch } from 'react-native-paper';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { FormInput } from '@/components/common/FormInput';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Form data shape expected by this component (subset of the full form)
 */
interface WolfPotFormSlice {
  pot_enabled: boolean;
  pot_value?: string;
  // Allow other fields from the parent form
  scoring_type: 'gross' | 'net';
  blind_wolf_enabled: boolean;
}

export interface WolfPotSettingsProps {
  /** React Hook Form control */
  control: Control<WolfPotFormSlice>;
  /** Form validation errors */
  errors: FieldErrors<WolfPotFormSlice>;
  /** Whether pot is currently enabled */
  potEnabled: boolean;
  /** Current pot value string */
  potValue?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfPotSettings = memo(function WolfPotSettings({
  control,
  errors,
  potEnabled,
  potValue,
}: WolfPotSettingsProps) {
  const colors = useThemeColors();

  // Calculate example winnings for display
  const potExample = useMemo(() => {
    if (!potEnabled) return null;
    const value = parseFloat(potValue ?? '') || 0;
    if (value <= 0) return null;
    return {
      loneWolfWin: (4 * value).toFixed(2),
      blindWolfWin: (6 * value).toFixed(2),
    };
  }, [potEnabled, potValue]);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        POT SETTINGS
      </Text>

      {/* Enable Pot Toggle */}
      <Controller
        control={control}
        name="pot_enabled"
        render={({ field: { onChange, value } }) => (
          <TouchableOpacity
            style={[
              styles.toggleRow,
              {
                backgroundColor: value ? `${colors.warning}15` : colors.surface,
                borderColor: value ? colors.warning : colors.border,
              },
            ]}
            onPress={() => onChange(!value)}
            activeOpacity={0.7}
            testID="wolf-pot-toggle"
          >
            <View style={styles.toggleContent}>
              <Icon
                source="cash"
                size={24}
                color={value ? colors.warning : colors.textSecondary}
              />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  Enable Pot
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Play for money with per-point betting
                </Text>
              </View>
            </View>
            <Switch
              value={value}
              onValueChange={onChange}
              color={colors.warning}
            />
          </TouchableOpacity>
        )}
      />

      {/* Per-Point Value Input (shown when pot enabled) */}
      {potEnabled && (
        <View style={styles.potValueContainer}>
          <Controller
            control={control}
            name="pot_value"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Per-Point Value"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal"
                leftAffix="$"
                placeholder="1.00"
                error={errors.pot_value?.message}
                required
                testID="wolf-pot-value-input"
              />
            )}
          />

          {/* Example Calculation */}
          {potExample && (
            <View
              style={[
                styles.exampleCard,
                { backgroundColor: `${colors.warning}10`, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.exampleTitle, { color: colors.textSecondary }]}>
                Example Winnings
              </Text>
              <View style={styles.exampleRow}>
                <Text style={[styles.exampleLabel, { color: colors.textSecondary }]}>
                  Lone Wolf Win (4 pts)
                </Text>
                <Text style={[styles.exampleValue, { color: colors.success }]}>
                  +${potExample.loneWolfWin}
                </Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={[styles.exampleLabel, { color: colors.textSecondary }]}>
                  Blind Wolf Win (6 pts)
                </Text>
                <Text style={[styles.exampleValue, { color: colors.success }]}>
                  +${potExample.blindWolfWin}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
  },
  toggleDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  potValueContainer: {
    marginTop: spacing.md,
  },
  exampleCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  exampleTitle: {
    ...typography.captionBold,
    marginBottom: spacing.sm,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  exampleLabel: {
    ...typography.small,
  },
  exampleValue: {
    ...typography.bodyBold,
  },
});
