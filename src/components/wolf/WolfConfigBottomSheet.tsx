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

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common/FormInput';
import { RadioButtonOption } from '@/screens/profile/components/RadioButtonOption';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import type { WolfConfig, WolfScoringType } from '@/types/database/wolf.types';

// ============================================================================
// CONSTANTS
// ============================================================================


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
    // If pot is enabled, pot_value must be valid
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
  showBackdrop = true,
}: WolfConfigBottomSheetProps) {
  const colors = useThemeColors();

  // Wolf order state (managed separately from form for reordering)
  const [wolfOrder, setWolfOrder] = useState<string[]>(() => {
    if (initialConfig?.wolf_order?.length) {
      return initialConfig.wolf_order;
    }
    return participants.map((p) => p.id);
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

  // Watch pot_enabled to show/hide pot value input
  const potEnabled = watch('pot_enabled');
  const potValue = watch('pot_value');

  // Reset form and wolf order when sheet opens with new initial values
  useEffect(() => {
    if (visible) {
      reset({
        scoring_type: initialConfig?.scoring_type ?? 'gross',
        blind_wolf_enabled: initialConfig?.blind_wolf_enabled ?? true,
        pot_enabled: initialConfig?.pot_enabled ?? false,
        pot_value: initialConfig?.pot_value_per_point?.toString() ?? '',
      });
      setWolfOrder(
        initialConfig?.wolf_order?.length
          ? initialConfig.wolf_order
          : participants.map((p) => p.id)
      );
    }
  }, [visible, initialConfig, participants, reset]);

  // Get participant name by ID
  const getParticipantName = useCallback(
    (id: string): string => {
      const participant = participants.find((p) => p.id === id);
      return participant?.name ?? 'Unknown';
    },
    [participants]
  );

  // Move participant up in wolf order
  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setWolfOrder((prev) => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  }, []);

  // Move participant down in wolf order
  const moveDown = useCallback((index: number) => {
    setWolfOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  }, []);

  // Shuffle wolf order randomly
  const shuffleOrder = useCallback(() => {
    setWolfOrder((prev) => {
      const newOrder = [...prev];
      // Fisher-Yates shuffle
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      return newOrder;
    });
  }, []);

  // Calculate example winnings for display
  const potExample = useMemo(() => {
    if (!potEnabled) return null;
    const value = parseFloat(potValue ?? '') || 0;
    if (value <= 0) return null;
    // Lone Wolf win = 4 points
    return {
      loneWolfWin: (4 * value).toFixed(2),
      blindWolfWin: (6 * value).toFixed(2),
    };
  }, [potEnabled, potValue]);

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

  // Check if form is ready to save
  const canSave = isValid && wolfOrder.length >= 3;

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      height={0.85}
      title="Configure Wolf Game"
      showCloseButton
      showBackdrop={showBackdrop}
      enableSwipeToDismiss={false}
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
                  testID="wolf-scoring-gross"
                />
                <RadioButtonOption
                  label="Net"
                  description="Handicap-adjusted strokes"
                  selected={value === 'net'}
                  onSelect={() => onChange('net')}
                  icon="percent"
                  testID="wolf-scoring-net"
                />
              </View>
            )}
          />
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

        {/* WOLF ORDER SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              WOLF ROTATION ORDER
            </Text>
            <TouchableOpacity
              onPress={shuffleOrder}
              style={[styles.shuffleButton, { backgroundColor: `${wolfColor}15` }]}
              activeOpacity={0.7}
              testID="wolf-shuffle-button"
            >
              <Icon source="shuffle-variant" size={16} color={wolfColor} />
              <Text style={[styles.shuffleText, { color: wolfColor }]}>Shuffle</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.orderDescription, { color: colors.textSecondary }]}>
            The Wolf rotates each hole. Hole 1 Wolf is shown first.
          </Text>

          {/* Wolf Order List */}
          <View style={[styles.orderList, { borderColor: colors.border }]}>
            {wolfOrder.map((playerId, index) => (
              <View
                key={playerId}
                style={[
                  styles.orderItem,
                  index < wolfOrder.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
              >
                {/* Hole indicator */}
                <View
                  style={[
                    styles.holeIndicator,
                    { backgroundColor: index === 0 ? wolfColor : colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.holeNumber,
                      { color: index === 0 ? colors.white : colors.textSecondary },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                {/* Player name */}
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                    {getParticipantName(playerId)}
                  </Text>
                  {index === 0 && (
                    <Text style={[styles.firstWolfBadge, { color: wolfColor }]}>
                      First Wolf
                    </Text>
                  )}
                </View>

                {/* Up/Down buttons */}
                <View style={styles.orderButtons}>
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    style={[
                      styles.orderButton,
                      { backgroundColor: colors.surfaceVariant },
                      index === 0 && styles.orderButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                    testID={`wolf-order-up-${index}`}
                  >
                    <Icon
                      source="chevron-up"
                      size={20}
                      color={index === 0 ? colors.textDisabled : colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === wolfOrder.length - 1}
                    style={[
                      styles.orderButton,
                      { backgroundColor: colors.surfaceVariant },
                      index === wolfOrder.length - 1 && styles.orderButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                    testID={`wolf-order-down-${index}`}
                  >
                    <Icon
                      source="chevron-down"
                      size={20}
                      color={index === wolfOrder.length - 1 ? colors.textDisabled : colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  radioGroup: {
    gap: spacing.sm,
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
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  shuffleText: {
    ...typography.caption,
  },
  orderDescription: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  orderList: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  holeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  holeNumber: {
    ...typography.smallBold,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
  },
  firstWolfBadge: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  orderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  orderButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.4,
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
