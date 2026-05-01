/**
 * SkinsConfigBottomSheet - Configure skins game settings
 *
 * A bottom sheet component for configuring skins game parameters including:
 * - Pot type (per-hole or total pot)
 * - Pot value (dollar amount)
 * - Scoring type (gross or net)
 *
 * @example
 * ```tsx
 * <SkinsConfigBottomSheet
 *   visible={showConfig}
 *   onDismiss={() => setShowConfig(false)}
 *   initialConfig={existingConfig}
 *   onSave={(config) => handleSaveConfig(config)}
 * />
 * ```
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common/FormInput';
import { RadioButtonOption } from '@/screens/profile/components/RadioButtonOption';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type { SkinsConfig, SkinsPotType, SkinsScoringType } from '@/types/database/skins.types';
import type { SkinsTeamInfo } from './SkinsSection';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CURRENCY = 'AUD';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const skinsConfigSchema = z.object({
  pot_type: z.enum(['per_hole', 'total_pot']),
  pot_value: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be greater than 0'
    ),
  scoring_type: z.enum(['gross', 'net']),
});

type SkinsConfigFormData = z.infer<typeof skinsConfigSchema>;

// ============================================================================
// PROPS
// ============================================================================

export interface SkinsConfigBottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** Callback when sheet is dismissed without saving */
  onDismiss: () => void;
  /** Initial configuration values (for editing existing config) */
  initialConfig?: SkinsConfig | null;
  /** Callback when configuration is saved */
  onSave: (config: SkinsConfig) => void;
  /** Whether to show backdrop (default true, set false for nested sheets) */
  showBackdrop?: boolean;
  /** Whether this is a team skins game */
  isTeamSkins?: boolean;
  /** Available teams for team skins (shows team info instead of players) */
  teams?: SkinsTeamInfo[];
  /**
   * Optional override for the bottom-sheet title — defaults to
   * "Skins Configuration". Sub-match wrappers use this to brand the sheet.
   */
  titleOverride?: string;
  /**
   * Optional content rendered in place of the default participants info
   * card / team list. Wrappers use this to inject an interactive
   * participant picker (e.g. "Individual" vs "Team A vs Team B" radios for
   * a sub-match). When provided, the default participants section is
   * suppressed entirely.
   */
  participantsSlot?: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SkinsConfigBottomSheet({
  visible,
  onDismiss,
  initialConfig,
  onSave,
  showBackdrop: _showBackdrop = true,
  isTeamSkins = false,
  teams,
  titleOverride,
  participantsSlot,
}: SkinsConfigBottomSheetProps) {
  const colors = useThemeColors();

  // Form setup with React Hook Form + Zod
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<SkinsConfigFormData>({
    resolver: zodResolver(skinsConfigSchema),
    mode: 'onChange',
    defaultValues: {
      pot_type: initialConfig?.pot_type ?? 'per_hole',
      pot_value: initialConfig?.pot_value?.toString() ?? '',
      scoring_type: initialConfig?.scoring_type ?? 'gross',
    },
  });

  // Watch values for calculated display
  const potType = watch('pot_type');
  const potValue = watch('pot_value');

  // Reset form when sheet opens with new initial values
  useEffect(() => {
    if (visible) {
      reset({
        pot_type: initialConfig?.pot_type ?? 'per_hole',
        pot_value: initialConfig?.pot_value?.toString() ?? '',
        scoring_type: initialConfig?.scoring_type ?? 'gross',
      });
    }
  }, [visible, initialConfig, reset]);

  // Calculate display values
  const calculatedDisplay = useMemo(() => {
    const value = parseFloat(potValue) || 0;
    if (value <= 0) return null;

    if (potType === 'per_hole') {
      const total = value * 18;
      return {
        label: 'Total pot',
        value: `$${total.toFixed(2)}`,
        detail: `$${value.toFixed(2)} × 18 holes`,
      };
    } else {
      const perHole = value / 18;
      return {
        label: 'Per hole',
        value: `$${perHole.toFixed(2)}`,
        detail: `$${value.toFixed(2)} ÷ 18 holes`,
      };
    }
  }, [potType, potValue]);

  // Handle form submission
  const onSubmit = (data: SkinsConfigFormData) => {
    const config: SkinsConfig = {
      pot_type: data.pot_type as SkinsPotType,
      pot_value: parseFloat(data.pot_value),
      scoring_type: data.scoring_type as SkinsScoringType,
      currency: initialConfig?.currency ?? DEFAULT_CURRENCY,
    };
    onSave(config);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      height={0.85}
      title={titleOverride ?? 'Skins Configuration'}
      showCloseButton
      showBackdrop
      useModal
      testID="skins-config-bottom-sheet"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* POT SETUP SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            POT SETUP
          </Text>

          {/* Amount Input */}
          <Controller
            control={control}
            name="pot_value"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Amount"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal"
                leftAffix="$"
                placeholder="5.00"
                error={errors.pot_value?.message}
                required
                testID="skins-pot-value-input"
              />
            )}
          />

          {/* Pot Type Selection */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            Pot Type
          </Text>
          <Controller
            control={control}
            name="pot_type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.radioGroup}>
                <RadioButtonOption
                  label="Per Hole"
                  description="Pay this amount for each hole"
                  selected={value === 'per_hole'}
                  onSelect={() => onChange('per_hole')}
                  icon="golf"
                  testID="skins-pot-type-per-hole"
                />
                <RadioButtonOption
                  label="Total Pot"
                  description="Split this amount across 18 holes"
                  selected={value === 'total_pot'}
                  onSelect={() => onChange('total_pot')}
                  icon="cash-multiple"
                  testID="skins-pot-type-total"
                />
              </View>
            )}
          />

          {/* Calculated Display */}
          {calculatedDisplay && (
            <View
              style={[
                styles.calculatedCard,
                { backgroundColor: `${colors.primary}10`, borderColor: colors.border },
              ]}
            >
              <View style={styles.calculatedRow}>
                <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                  {calculatedDisplay.label}
                </Text>
                <Text style={[styles.calculatedValue, { color: colors.primary }]}>
                  {calculatedDisplay.value}
                </Text>
              </View>
              <Text style={[styles.calculatedDetail, { color: colors.textSecondary }]}>
                {calculatedDisplay.detail}
              </Text>
            </View>
          )}
        </View>

        {/* SCORING TYPE SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SCORING TYPE
          </Text>

          <Controller
            control={control}
            name="scoring_type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.radioGroup}>
                <RadioButtonOption
                  label="Gross"
                  description="Raw strokes - no handicap adjustment"
                  selected={value === 'gross'}
                  onSelect={() => onChange('gross')}
                  icon="numeric"
                  testID="skins-scoring-gross"
                />
                <RadioButtonOption
                  label="Net"
                  description="Handicap-adjusted strokes"
                  selected={value === 'net'}
                  onSelect={() => onChange('net')}
                  icon="percent"
                  testID="skins-scoring-net"
                />
              </View>
            )}
          />
        </View>

        {/* PARTICIPANTS INFO — wrapper-supplied slot, or default copy */}
        {participantsSlot ? (
          <View style={styles.section}>{participantsSlot}</View>
        ) : isTeamSkins && teams && teams.length > 0 ? (
          <View style={styles.teamInfoSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PARTICIPATING TEAMS
            </Text>
            <View
              style={[
                styles.teamListCard,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              ]}
            >
              <Icon source="account-multiple" size={20} color={colors.textSecondary} />
              <View style={styles.teamListContent}>
                {teams.map((team, index) => (
                  <Text
                    key={team.id}
                    style={[styles.teamName, { color: colors.textPrimary }]}
                  >
                    {team.name} ({team.memberCount} {team.memberCount === 1 ? 'player' : 'players'})
                    {index < teams.length - 1 ? ',' : ''}
                  </Text>
                ))}
              </View>
            </View>
            <View
              style={[
                styles.teamInfoNote,
                { backgroundColor: `${colors.info}10` },
              ]}
            >
              <Icon source="information-outline" size={16} color={colors.info} />
              <Text style={[styles.teamInfoNoteText, { color: colors.infoDark }]}>
                Winnings will be split equally among team members
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
            ]}
          >
            <Icon source="account-group" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              All players in your group will participate in the skins game
            </Text>
          </View>
        )}
      </ScrollView>

      {/* SAVE BUTTON */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: isValid ? colors.primary : colors.surfaceVariant,
            },
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Save skins configuration"
          accessibilityState={{ disabled: !isValid }}
          testID="skins-config-save-button"
        >
          <Icon
            source="check"
            size={20}
            color={isValid ? colors.white : colors.textDisabled}
          />
          <Text
            style={[
              styles.saveButtonText,
              { color: isValid ? colors.white : colors.textDisabled },
            ]}
          >
            Save Configuration
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  radioGroup: {
    gap: spacing.sm,
  },
  calculatedCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatedLabel: {
    ...typography.small,
  },
  calculatedValue: {
    ...typography.h3,
  },
  calculatedDetail: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  // Team skins styles
  teamInfoSection: {
    gap: spacing.sm,
  },
  teamListCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  teamListContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teamName: {
    ...typography.small,
  },
  teamInfoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  teamInfoNoteText: {
    ...typography.caption,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
});

export default SkinsConfigBottomSheet;
