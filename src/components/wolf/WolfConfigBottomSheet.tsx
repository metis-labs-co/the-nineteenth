/**
 * WolfConfigBottomSheet - Configure Wolf game settings
 *
 * A bottom sheet component for configuring Wolf game parameters including:
 * - Scoring type (gross or net)
 * - Blind Wolf option
 * - Pot settings (enable/disable and per-point value)
 * - Wolf rotation order
 *
 * @example
 * ```tsx
 * <WolfConfigBottomSheet
 *   visible={showConfig}
 *   onDismiss={() => setShowConfig(false)}
 *   initialConfig={existingConfig}
 *   onSave={(config) => handleSaveConfig(config)}
 *   participants={players}
 * />
 * ```
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { BottomSheet } from '@/components/common/BottomSheet';
import { ScoringTypeField } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import { useWolfOrderManagement } from './useWolfOrderManagement';
import { WolfOrderList } from './WolfOrderList';
import { WolfPotSettings } from './WolfPotSettings';
import type { WolfConfig, WolfScoringType } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Participant info for Wolf order display
 */
export interface WolfParticipantInfo {
  id: string;
  name: string;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const wolfConfigSchema = z.object({
  scoring_type: z.enum(['gross', 'net']),
  blind_wolf_enabled: z.boolean(),
  pot_enabled: z.boolean(),
  pot_value: z.string().optional(),
}).refine(
  (data) => {
    if (data.pot_enabled) {
      const value = parseFloat(data.pot_value ?? '');
      return !isNaN(value) && value > 0;
    }
    return true;
  },
  {
    message: 'Per-point value must be greater than 0',
    path: ['pot_value'],
  }
);

type WolfConfigFormData = z.infer<typeof wolfConfigSchema>;

// ============================================================================
// PROPS
// ============================================================================

export interface WolfConfigBottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** Callback when sheet is dismissed without saving */
  onDismiss: () => void;
  /** Initial configuration values (for editing existing config) */
  initialConfig?: WolfConfig | null;
  /** Callback when configuration is saved */
  onSave: (config: WolfConfig) => void;
  /** Participants for Wolf order configuration */
  participants: WolfParticipantInfo[];
  /** Whether to show backdrop (default true) */
  showBackdrop?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WolfConfigBottomSheet({
  visible,
  onDismiss,
  initialConfig,
  onSave,
  participants,
  showBackdrop: _showBackdrop = true,
}: WolfConfigBottomSheetProps) {
  const colors = useThemeColors();

  // Wolf order management (extracted hook)
  const {
    wolfOrder,
    getParticipantName,
    moveUp,
    moveDown,
    shuffleOrder,
  } = useWolfOrderManagement({
    visible,
    initialWolfOrder: initialConfig?.wolf_order,
    participants,
  });

  // Form setup with React Hook Form + Zod
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<WolfConfigFormData>({
    resolver: zodResolver(wolfConfigSchema),
    mode: 'onChange',
    defaultValues: {
      scoring_type: initialConfig?.scoring_type ?? 'gross',
      blind_wolf_enabled: initialConfig?.blind_wolf_enabled ?? true,
      pot_enabled: initialConfig?.pot_enabled ?? false,
      pot_value: initialConfig?.pot_value_per_point?.toString() ?? '',
    },
  });

  const potEnabled = watch('pot_enabled');
  const potValue = watch('pot_value');

  // Reset form when sheet opens with new initial values
  useEffect(() => {
    if (visible) {
      reset({
        scoring_type: initialConfig?.scoring_type ?? 'gross',
        blind_wolf_enabled: initialConfig?.blind_wolf_enabled ?? true,
        pot_enabled: initialConfig?.pot_enabled ?? false,
        pot_value: initialConfig?.pot_value_per_point?.toString() ?? '',
      });
    }
  }, [visible, initialConfig, reset]);

  // Handle form submission
  const onSubmit = (data: WolfConfigFormData) => {
    const config: WolfConfig = {
      scoring_type: data.scoring_type as WolfScoringType,
      blind_wolf_enabled: data.blind_wolf_enabled,
      pot_enabled: data.pot_enabled,
      pot_value_per_point: data.pot_enabled ? parseFloat(data.pot_value ?? '0') : undefined,
      wolf_order: wolfOrder,
    };
    onSave(config);
  };

  const canSave = isValid && wolfOrder.length >= 3;

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      height={0.85}
      title="Configure Wolf Game"
      showCloseButton
      showBackdrop
      enableSwipeToDismiss={false}
      useModal
      testID="wolf-config-bottom-sheet"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SCORING TYPE SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SCORING TYPE
          </Text>
          <ScoringTypeField control={control} name="scoring_type" testIDPrefix="wolf" />
        </View>

        {/* BLIND WOLF SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            BLIND WOLF
          </Text>
          <Controller
            control={control}
            name="blind_wolf_enabled"
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[
                  styles.toggleRow,
                  {
                    backgroundColor: value ? `${wolfColor}15` : colors.surface,
                    borderColor: value ? wolfColor : colors.border,
                  },
                ]}
                onPress={() => onChange(!value)}
                activeOpacity={0.7}
                testID="wolf-blind-toggle"
              >
                <View style={styles.toggleContent}>
                  <Icon
                    source="fire"
                    size={24}
                    color={value ? wolfColor : colors.textSecondary}
                  />
                  <View style={styles.toggleTextContainer}>
                    <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                      Enable Blind Wolf
                    </Text>
                    <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                      Wolf can declare going alone before anyone tees off for double points
                    </Text>
                  </View>
                </View>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  color={wolfColor}
                />
              </TouchableOpacity>
            )}
          />
        </View>

        {/* POT SETTINGS SECTION */}
        <WolfPotSettings
          control={control}
          errors={errors}
          potEnabled={potEnabled}
          potValue={potValue}
        />

        {/* WOLF ORDER SECTION */}
        <WolfOrderList
          wolfOrder={wolfOrder}
          getParticipantName={getParticipantName}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onShuffle={shuffleOrder}
        />

        {/* INFO CARD */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: `${wolfColor}10`, borderColor: colors.border },
          ]}
        >
          <Icon source="dog-side" size={20} color={wolfColor} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Wolf is a strategic game where the Wolf each hole chooses to partner up or go alone against the pack.
          </Text>
        </View>
      </ScrollView>

      {/* SAVE BUTTON */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: canSave ? wolfColor : colors.surfaceVariant,
            },
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!canSave}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Save Wolf configuration"
          accessibilityState={{ disabled: !canSave }}
          testID="wolf-config-save-button"
        >
          <Icon
            source="check"
            size={20}
            color={canSave ? colors.white : colors.textDisabled}
          />
          <Text
            style={[
              styles.saveButtonText,
              { color: canSave ? colors.white : colors.textDisabled },
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  infoText: {
    ...typography.small,
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

export default WolfConfigBottomSheet;
