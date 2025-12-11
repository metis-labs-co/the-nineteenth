import React from 'react';
import { View, StyleSheet, Platform, ScrollView, LayoutAnimation, UIManager } from 'react-native';
import { TextInput, Button, Text, Surface, SegmentedButtons } from 'react-native-paper';
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
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { DatePicker } from '@/components/common/DatePicker';

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
  const isDark = useIsDark();
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
        <Surface style={[styles.formSection, { backgroundColor: isDark ? colors.gray100 : colors.surface }]} elevation={1}>
          {/* Competition Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Competition Name *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="e.g., Summer Classic 2025"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  error={!!errors.name}
                  autoCapitalize="words"
                  returnKeyType="next"
                  style={[styles.input, { backgroundColor: colors.surface }]}
                  outlineColor={errors.name ? colors.error : colors.gray300}
                  activeOutlineColor={errors.name ? colors.error : colors.primary}
                  textColor={colors.textPrimary}
                />
              )}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.name.message}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Description (Optional)</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Add a description for your competition..."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  error={!!errors.description}
                  multiline
                  numberOfLines={4}
                  style={[styles.input, styles.textArea, { backgroundColor: colors.surface }]}
                  outlineColor={errors.description ? colors.error : colors.gray300}
                  activeOutlineColor={errors.description ? colors.error : colors.primary}
                  textColor={colors.textPrimary}
                />
              )}
            />
            {errors.description && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.description.message}</Text>
            )}
          </View>

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
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Invite Code (Optional)</Text>
            <Controller
              control={control}
              name="inviteCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="e.g., SUMMER2025"
                  value={value}
                  onChangeText={(text) => onChange(text.toUpperCase().replace(/[^A-Z0-9-_]/g, ''))}
                  onBlur={onBlur}
                  mode="outlined"
                  error={!!errors.inviteCode}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  style={[styles.input, { backgroundColor: colors.surface }]}
                  outlineColor={errors.inviteCode ? colors.error : colors.gray300}
                  activeOutlineColor={errors.inviteCode ? colors.error : colors.primary}
                  textColor={colors.textPrimary}
                />
              )}
            />
            {errors.inviteCode ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.inviteCode.message}</Text>
            ) : (
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                Custom code for players to join. Leave blank to auto-generate.
              </Text>
            )}
          </View>

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
        </Surface>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: isDark ? colors.gray100 : colors.surface, borderTopColor: colors.gray200 }]}>
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
          Next: Team Settings
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
  input: {
  },
  textArea: {
    minHeight: 100,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
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
});
