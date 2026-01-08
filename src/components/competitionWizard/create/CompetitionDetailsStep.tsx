import React from 'react';
import { View, StyleSheet, Platform, ScrollView, LayoutAnimation, UIManager, TouchableOpacity } from 'react-native';
import { Button, Text, SegmentedButtons, Icon } from 'react-native-paper';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parse, isValid, startOfDay } from 'date-fns';
import {
  competitionDetailsSchema,
  type CompetitionDetailsFormData,
  type CompetitionType,
} from '@/schemas/competition';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { DatePicker, FormInput } from '@/components/common';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CompetitionDetailsStepProps {
  initialData?: CompetitionDetailsFormData;
  onComplete: (data: CompetitionDetailsFormData) => void;
  onBack: () => void;
}

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

export default function CompetitionDetailsStep({
  initialData,
  onComplete,
  onBack,
}: CompetitionDetailsStepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompetitionDetailsFormData>({
    resolver: zodResolver(competitionDetailsSchema),
    mode: 'onSubmit', // Only validate when clicking Next
    defaultValues: initialData || {
      name: '',
      description: '',
      competitionType: 'event',
      startDate: '',
      endDate: '',
      handicapSystem: 'honor',
      inviteCode: '',
      enableTeams: false,
    },
  });

  // Watch competition type to conditionally show end date
  const competitionType = useWatch({ control, name: 'competitionType' });

  // Watch start date for end date minimum
  const startDateValue = useWatch({ control, name: 'startDate' });
  const startDateParsed = parseAustralianDate(startDateValue);

  const handleCompetitionTypeChange = (value: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValue('competitionType', value as CompetitionType);
    // Clear end date when switching to league
    if (value === 'league') {
      setValue('endDate', '');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Enter the basic details for your competition. You can edit these later.
        </Text>

        {/* Form Section */}
        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
          {/* Competition Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Competition Name"
                placeholder="e.g., Summer Classic 2025"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
                returnKeyType="next"
                required
              />
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Description (Optional)"
                placeholder="Add a description for your competition..."
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                multiline
                numberOfLines={4}
              />
            )}
          />

          {/* Competition Type */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Competition Type *</Text>
            <Controller
              control={control}
              name="competitionType"
              render={({ field: { value } }) => (
                <SegmentedButtons
                  value={value}
                  onValueChange={handleCompetitionTypeChange}
                  buttons={[
                    {
                      value: 'event',
                      label: 'Event',
                      icon: 'calendar-star',
                      checkedColor: colors.primary,
                    },
                    {
                      value: 'league',
                      label: 'League',
                      icon: 'trophy-outline',
                      checkedColor: colors.primary,
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {competitionType === 'event'
                ? 'A fixed-term competition with a set end date'
                : 'An ongoing competition with no fixed end date'}
            </Text>
          </View>

          {/* Invite Code */}
          <Controller
            control={control}
            name="inviteCode"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Invite Code (Optional)"
                placeholder="e.g., SUMMER2025"
                value={value || ''}
                onChangeText={(text) => onChange(text.toUpperCase().replace(/[^A-Z0-9-_]/g, ''))}
                onBlur={onBlur}
                error={errors.inviteCode?.message}
                hint={!errors.inviteCode ? 'Custom code for players to join. Leave blank to auto-generate.' : undefined}
                autoCapitalize="characters"
                returnKeyType="next"
              />
            )}
          />

          {/* Start Date */}
          <Controller
            control={control}
            name="startDate"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                value={value}
                onChange={onChange}
                mode="date"
                label="Start Date *"
                placeholder="Select a date"
                error={errors.startDate?.message}
                hint={!errors.startDate ? 'When the competition begins' : undefined}
                minimumDate={startOfDay(new Date())}
              />
            )}
          />

          {/* End Date - Only shown for Event type */}
          {competitionType === 'event' && (
            <Controller
              control={control}
              name="endDate"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  value={value || ''}
                  onChange={onChange}
                  mode="date"
                  label="End Date *"
                  placeholder="Select end date"
                  error={errors.endDate?.message}
                  hint={!errors.endDate ? 'Competition will auto-complete after this date' : undefined}
                  minimumDate={startDateParsed || startOfDay(new Date())}
                  icon="calendar-end"
                />
              )}
            />
          )}

          {/* Team Toggle */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Teams</Text>
            <Controller
              control={control}
              name="enableTeams"
              render={({ field: { value, onChange } }) => (
                <TouchableOpacity
                  onPress={() => onChange(!value)}
                  style={[
                    styles.teamToggle,
                    {
                      backgroundColor: value ? colors.primaryLighter : colors.surface,
                      borderColor: value ? colors.primary : colors.gray300,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.teamToggleContent}>
                    <Icon
                      source={value ? 'account-group' : 'account'}
                      size={24}
                      color={value ? colors.primary : colors.gray500}
                    />
                    <View style={styles.teamToggleText}>
                      <Text style={[styles.teamToggleLabel, { color: colors.textPrimary }]}>
                        {value ? 'Team Competition' : 'Individual Competition'}
                      </Text>
                      <Text style={[styles.teamToggleDescription, { color: colors.textSecondary }]}>
                        {value ? 'Players compete in teams of 2' : 'Players compete individually'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: value ? colors.primary : colors.surface,
                        borderColor: value ? colors.primary : colors.gray300,
                      },
                    ]}
                  >
                    {value && <Icon source="check" size={14} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Team format can be configured in competition settings after creation
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.surface, borderTopColor: colors.gray200 }]}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={[styles.cancelButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onComplete)}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Next: Rounds
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
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  segmentedButtons: {
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
  cancelButton: {
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
  teamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  teamToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  teamToggleText: {
    flex: 1,
  },
  teamToggleLabel: {
    ...typography.bodyBold,
  },
  teamToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
