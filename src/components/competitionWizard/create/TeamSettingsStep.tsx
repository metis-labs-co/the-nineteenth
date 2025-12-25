import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, LayoutAnimation, UIManager } from 'react-native';
import { Text, Button, TextInput, Icon } from 'react-native-paper';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  teamSettingsSchema,
  type TeamSettingsFormData,
  type TeamMode,
  DEFAULT_POINT_SYSTEM,
} from '@/schemas/competition';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TeamSettingsStepProps {
  initialData?: TeamSettingsFormData;
  onComplete: (data: TeamSettingsFormData) => void;
  onBack: () => void;
}

// Team mode options with descriptions (values match database.types.ts)
const TEAM_MODES: { value: TeamMode; label: string; description: string; icon: string }[] = [
  {
    value: 'none',
    label: 'No Teams',
    description: 'Individual competition - players compete solo',
    icon: 'account',
  },
  {
    value: 'fixed',
    label: 'Fixed Teams',
    description: 'Same teams throughout all rounds',
    icon: 'account-group',
  },
  {
    value: 'per-round',
    label: 'Per-Round',
    description: 'Teams change each round (rotating partners)',
    icon: 'sync',
  },
];

// Team size options
const TEAM_SIZES = [2, 3, 4] as const;

export default function TeamSettingsStep({
  initialData,
  onComplete,
  onBack,
}: TeamSettingsStepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [showCustomPoints, setShowCustomPoints] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeamSettingsFormData>({
    resolver: zodResolver(teamSettingsSchema),
    mode: 'onSubmit',
    defaultValues: initialData || {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: DEFAULT_POINT_SYSTEM,
    },
  });

  const { fields, update } = useFieldArray({
    control,
    name: 'pointSystem',
  });

  const teamMode = watch('teamMode');
  const teamSize = watch('teamSize');
  const pointSystem = watch('pointSystem');

  const teamsEnabled = teamMode !== 'none';

  const handleTeamModeChange = (mode: TeamMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValue('teamMode', mode, { shouldValidate: true });
  };

  const handleTeamSizeChange = (size: number) => {
    setValue('teamSize', size as 2 | 3 | 4, { shouldValidate: true });
  };

  const handlePointChange = (index: number, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      update(index, { ...fields[index], points: numValue });
    }
  };

  const toggleCustomPoints = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCustomPoints(!showCustomPoints);
  };

  const resetPointSystem = () => {
    setValue('pointSystem', DEFAULT_POINT_SYSTEM);
  };

  const getPositionLabel = (position: number): string => {
    const suffixes = ['st', 'nd', 'rd'];
    const suffix = position <= 3 ? suffixes[position - 1] : 'th';
    return `${position}${suffix}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Configure team settings and point system for your competition.
        </Text>

        {/* Team Mode Section */}
        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Team Format</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose how players will be grouped
          </Text>

          <View style={styles.segmentedContainer}>
            {TEAM_MODES.map((mode) => {
              const isSelected = teamMode === mode.value;
              return (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.segmentedButton,
                    { borderColor: colors.gray300 },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => handleTeamModeChange(mode.value)}
                  accessibilityLabel={mode.label}
                  accessibilityHint={mode.description}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Icon
                    source={mode.icon}
                    size={24}
                    color={isSelected ? colors.white : colors.gray600}
                  />
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      { color: isSelected ? colors.white : colors.textPrimary },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected mode description */}
          <View style={[styles.modeDescriptionBox, { backgroundColor: colors.gray100 }]}>
            <Icon
              source={TEAM_MODES.find(m => m.value === teamMode)?.icon || 'account'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.modeDescriptionText, { color: colors.textSecondary }]}>
              {TEAM_MODES.find(m => m.value === teamMode)?.description}
            </Text>
          </View>

          {errors.teamMode && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.teamMode.message}
            </Text>
          )}
        </View>

        {/* Team Size Section - Only show if teams enabled */}
        {teamsEnabled && (
          <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Team Size</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Number of players per team
            </Text>

            <View style={styles.chipContainer}>
              {TEAM_SIZES.map((size) => {
                const isSelected = teamSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.chip,
                      { borderColor: colors.gray300, backgroundColor: colors.surface },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => handleTeamSizeChange(size)}
                    accessibilityLabel={`${size} players per team`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.white : colors.textPrimary },
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {errors.teamSize && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.teamSize.message}
              </Text>
            )}
          </View>
        )}

        {/* Point System Section */}
        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Point System</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Points awarded based on finishing position
          </Text>

          {/* Default Points Preview */}
          <View style={styles.pointsPreviewContainer}>
            <View style={styles.pointsPreviewRow}>
              {pointSystem.slice(0, 5).map((entry, index) => (
                <View key={index} style={styles.pointsPreviewItem}>
                  <Text style={[styles.pointsPosition, { color: colors.textSecondary }]}>
                    {getPositionLabel(entry.position)}
                  </Text>
                  <View style={[styles.pointsBadge, { backgroundColor: colors.gray200 }]}>
                    <Text style={[styles.pointsValue, { color: colors.textPrimary }]}>
                      {entry.points}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {pointSystem.length > 5 && (
              <Text style={[styles.morePointsText, { color: colors.textSecondary }]}>
                +{pointSystem.length - 5} more positions...
              </Text>
            )}
          </View>

          {/* Customize Points Toggle */}
          <TouchableOpacity
            style={[styles.customizeButton, { borderColor: colors.gray300 }]}
            onPress={toggleCustomPoints}
            accessibilityLabel={showCustomPoints ? 'Hide point customization' : 'Customize points'}
            accessibilityRole="button"
          >
            <Icon
              source={showCustomPoints ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.customizeButtonText, { color: colors.primary }]}>
              {showCustomPoints ? 'Hide Customization' : 'Customize Points'}
            </Text>
          </TouchableOpacity>

          {/* Custom Points Editor */}
          {showCustomPoints && (
            <View style={styles.customPointsContainer}>
              <View style={styles.customPointsHeader}>
                <Text style={[styles.customPointsTitle, { color: colors.textPrimary }]}>
                  Edit Point Values
                </Text>
                <TouchableOpacity
                  onPress={resetPointSystem}
                  style={[styles.resetButton, { backgroundColor: colors.gray100 }]}
                  accessibilityLabel="Reset to default points"
                  accessibilityRole="button"
                >
                  <Icon source="refresh" size={16} color={colors.textSecondary} />
                  <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.customPointsGrid}>
                {fields.map((field, index) => (
                  <View key={field.id} style={styles.customPointRow}>
                    <Text style={[styles.customPointPosition, { color: colors.textPrimary }]}>
                      {getPositionLabel(field.position)}
                    </Text>
                    <TextInput
                      value={field.points.toString()}
                      onChangeText={(value) => handlePointChange(index, value)}
                      mode="outlined"
                      keyboardType="number-pad"
                      style={[styles.customPointInput, { backgroundColor: colors.surface }]}
                      outlineColor={colors.gray300}
                      activeOutlineColor={colors.primary}
                      textColor={colors.textPrimary}
                      dense
                    />
                    <Text style={[styles.customPointLabel, { color: colors.textSecondary }]}>
                      pts
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {errors.pointSystem && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {typeof errors.pointSystem === 'string'
                ? errors.pointSystem
                : 'Invalid point system configuration'}
            </Text>
          )}
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {teamsEnabled
              ? `Teams of ${teamSize} will be ${teamMode === 'fixed' ? 'assigned once and stay the same' : 'rotated each round'}. Points are awarded per ${teamMode === 'fixed' ? 'team' : 'round'}.`
              : 'Individual competition - each player competes for their own score. Points are awarded based on individual finishing position.'}
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: colors.surface,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onComplete)}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Next: Round Details
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  segmentedContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  segmentedButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  segmentedButtonText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  modeDescriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  modeDescriptionText: {
    ...typography.small,
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 2,
  },
  chipText: {
    ...typography.bodyBold,
  },
  pointsPreviewContainer: {
    marginBottom: spacing.md,
  },
  pointsPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointsPreviewItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pointsPosition: {
    ...typography.caption,
  },
  pointsBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 40,
    alignItems: 'center',
  },
  pointsValue: {
    ...typography.bodyBold,
  },
  morePointsText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  customizeButtonText: {
    ...typography.smallBold,
  },
  customPointsContainer: {
    marginTop: spacing.md,
  },
  customPointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customPointsTitle: {
    ...typography.smallBold,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  resetButtonText: {
    ...typography.caption,
  },
  customPointsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  customPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '48%',
  },
  customPointPosition: {
    ...typography.small,
    width: 32,
  },
  customPointInput: {
    flex: 1,
    height: 40,
  },
  customPointLabel: {
    ...typography.caption,
    width: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});
