/**
 * EditCompetitionScreen - Edit competition details
 *
 * Allows organizers to edit:
 * - Competition name
 * - Description
 * - Start date
 * - End date
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Icon,
  Surface,
  SegmentedButtons,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { supabase } from '@/services/supabase/client';
import type { Competition, HandicapSystem, CompetitionType, TeamMode } from '@/types/database.types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCompetition'>;

// Competition type labels
const competitionTypeLabels: Record<CompetitionType, string> = {
  'league': 'League',
  'event': 'Event',
};

const competitionTypeDescriptions: Record<CompetitionType, string> = {
  'league': 'Ongoing competition with no fixed end date',
  'event': 'Fixed-term competition with an end date',
};

// Team mode labels
const teamModeLabels: Record<TeamMode, string> = {
  'none': 'Individual',
  'fixed': 'Fixed Teams',
  'per-round': 'Per-Round Teams',
};

const teamModeDescriptions: Record<TeamMode, string> = {
  'none': 'Players compete individually',
  'fixed': 'Same teams throughout the competition',
  'per-round': 'Teams change each round',
};

/**
 * Form validation schema
 */
const editCompetitionSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  competitionType: z.enum(['league', 'event']),
  teamMode: z.enum(['none', 'fixed', 'per-round']),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
}).refine(
  (data) => {
    // Event type requires an end date
    if (data.competitionType === 'event' && !data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: 'End date is required for event competitions',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // End date must be on or after start date
    if (data.endDate && data.startDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
);

type EditCompetitionFormData = z.infer<typeof editCompetitionSchema>;

/**
 * Format date for display (DD/MM/YYYY - Australian format)
 */
function formatDateDisplay(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse ISO date string to Date object
 */
function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

/**
 * Fetch competition data
 */
async function fetchCompetition(competitionId: string): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch competition: ${error.message}`);
  }

  return data as Competition;
}

/**
 * Update competition data
 */
interface CompetitionUpdateInput {
  name?: string;
  description?: string | null;
  competition_type?: CompetitionType;
  team_mode?: TeamMode;
  start_date?: string;
  end_date?: string | null;
}

async function updateCompetition(
  competitionId: string,
  updates: CompetitionUpdateInput
): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    // @ts-ignore - Supabase types don't properly handle partial updates
    .update(updates)
    .eq('id', competitionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update competition: ${error.message}`);
  }

  return data as Competition;
}

export default function EditCompetitionScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Fetch competition data
  const {
    data: competition,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['competition', id],
    queryFn: () => fetchCompetition(id),
    enabled: !!id,
  });

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<EditCompetitionFormData>({
    resolver: zodResolver(editCompetitionSchema),
    defaultValues: {
      name: '',
      description: '',
      competitionType: 'event',
      teamMode: 'none',
      startDate: new Date(),
      endDate: null,
    },
  });

  // Watch form values
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const competitionType = watch('competitionType');
  const teamMode = watch('teamMode');

  // Update form when competition data loads
  useEffect(() => {
    if (competition) {
      reset({
        name: competition.name,
        description: competition.description || '',
        competitionType: competition.competition_type || 'event',
        teamMode: competition.team_mode || 'none',
        startDate: parseDate(competition.start_date) || new Date(),
        endDate: parseDate(competition.end_date),
      });
    }
  }, [competition, reset]);

  // Handle competition type change
  const handleCompetitionTypeChange = useCallback(
    (value: string) => {
      setValue('competitionType', value as CompetitionType, { shouldDirty: true });
      // Clear end date when switching to league
      if (value === 'league') {
        setValue('endDate', null, { shouldDirty: true });
      }
    },
    [setValue]
  );

  // Handle team mode change
  const handleTeamModeChange = useCallback(
    (value: string) => {
      setValue('teamMode', value as TeamMode, { shouldDirty: true });
    },
    [setValue]
  );

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: EditCompetitionFormData) =>
      updateCompetition(id, {
        name: data.name,
        description: data.description || null,
        competition_type: data.competitionType,
        team_mode: data.teamMode,
        start_date: data.startDate.toISOString().split('T')[0],
        end_date: data.endDate ? data.endDate.toISOString().split('T')[0] : null,
      }),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['competition', id] });
      queryClient.invalidateQueries({ queryKey: ['competition', id, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });

      // Navigate back
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update competition');
    },
  });

  // Handle navigation
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [navigation, isDirty]);

  // Handle form submission
  const onSubmit = useCallback(
    (data: EditCompetitionFormData) => {
      updateMutation.mutate(data);
    },
    [updateMutation]
  );

  // Handle date changes
  const handleStartDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowStartDatePicker(false);
      }
      if (event.type === 'set' && selectedDate) {
        setValue('startDate', selectedDate, { shouldDirty: true });
      }
    },
    [setValue]
  );

  const handleEndDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowEndDatePicker(false);
      }
      if (event.type === 'set' && selectedDate) {
        setValue('endDate', selectedDate, { shouldDirty: true });
      }
    },
    [setValue]
  );

  const handleStartDatePickerDismiss = () => {
    setShowStartDatePicker(false);
  };

  const handleEndDatePickerDismiss = () => {
    setShowEndDatePicker(false);
  };

  const clearEndDate = useCallback(() => {
    setValue('endDate', null, { shouldDirty: true });
  }, [setValue]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading competition...</Text>
      </View>
    );
  }

  // Error state
  if (fetchError || !competition) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <Icon source="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load competition</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {fetchError?.message || 'Competition not found'}
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
        <Pressable
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Icon source="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Competition</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Update your competition details below.
        </Text>

        {/* Form Section */}
        <Surface style={[styles.formSection, { backgroundColor: colors.white }]} elevation={1}>
          {/* Competition Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Competition Name *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter competition name"
                  error={!!errors.name}
                  style={styles.input}
                  outlineColor={errors.name ? colors.error : colors.gray300}
                  activeOutlineColor={errors.name ? colors.error : colors.primary}
                  accessibilityLabel="Competition name"
                />
              )}
            />
            {errors.name ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.name.message}</Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Description (Optional)</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={4}
                  style={[styles.input, styles.textArea]}
                  outlineColor={errors.description ? colors.error : colors.gray300}
                  activeOutlineColor={errors.description ? colors.error : colors.primary}
                  accessibilityLabel="Competition description"
                />
              )}
            />
            {errors.description ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.description.message}</Text>
            ) : null}
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
                    },
                    {
                      value: 'league',
                      label: 'League',
                      icon: 'trophy-outline',
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {competitionTypeDescriptions[competitionType]}
            </Text>
          </View>

          {/* Format (Team Mode) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format *</Text>
            <Controller
              control={control}
              name="teamMode"
              render={({ field: { value } }) => (
                <SegmentedButtons
                  value={value}
                  onValueChange={handleTeamModeChange}
                  buttons={[
                    {
                      value: 'none',
                      label: 'Individual',
                      icon: 'account',
                    },
                    {
                      value: 'fixed',
                      label: 'Teams',
                      icon: 'account-group',
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {teamModeDescriptions[teamMode]}
            </Text>
          </View>

          {/* Start Date */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Start Date *</Text>
            <Pressable onPress={() => setShowStartDatePicker(true)}>
              <TextInput
                mode="outlined"
                value={formatDateDisplay(startDate)}
                editable={false}
                pointerEvents="none"
                style={styles.input}
                outlineColor={colors.gray300}
                activeOutlineColor={colors.primary}
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => setShowStartDatePicker(true)}
                    color={colors.primary}
                  />
                }
                accessibilityLabel={`Start date: ${formatDateDisplay(startDate)}`}
              />
            </Pressable>
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>Tap to change the start date</Text>

            {/* Start Date Picker */}
            {showStartDatePicker && (
              Platform.OS === 'ios' ? (
                <Surface style={[styles.datePickerContainer, { backgroundColor: colors.white, borderColor: colors.gray200 }]} elevation={2}>
                  <View style={styles.datePickerHeader}>
                    <Button onPress={handleStartDatePickerDismiss} textColor={colors.primary}>
                      Done
                    </Button>
                  </View>
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="spinner"
                    onChange={handleStartDateChange}
                  />
                </Surface>
              ) : (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                />
              )
            )}
          </View>

          {/* End Date - Required for Event, hidden for League */}
          {competitionType === 'event' && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>End Date *</Text>
              <Pressable onPress={() => setShowEndDatePicker(true)}>
                <TextInput
                  mode="outlined"
                  value={endDate ? formatDateDisplay(endDate) : ''}
                  placeholder="Set end date"
                  editable={false}
                  pointerEvents="none"
                  style={styles.input}
                  outlineColor={errors.endDate ? colors.error : colors.gray300}
                  activeOutlineColor={errors.endDate ? colors.error : colors.primary}
                  error={!!errors.endDate}
                  right={
                    endDate ? (
                      <TextInput.Icon icon="close" onPress={clearEndDate} color={colors.gray400} />
                    ) : (
                      <TextInput.Icon
                        icon="calendar"
                        onPress={() => setShowEndDatePicker(true)}
                        color={colors.primary}
                      />
                    )
                  }
                  accessibilityLabel={`End date: ${endDate ? formatDateDisplay(endDate) : 'Not set'}`}
                />
              </Pressable>
              {errors.endDate ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.endDate.message}</Text>
              ) : (
                <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                  Competition will auto-complete after this date
                </Text>
              )}

              {/* End Date Picker */}
              {showEndDatePicker && (
                Platform.OS === 'ios' ? (
                  <Surface style={[styles.datePickerContainer, { backgroundColor: colors.white, borderColor: colors.gray200 }]} elevation={2}>
                    <View style={styles.datePickerHeader}>
                      <Button onPress={handleEndDatePickerDismiss} textColor={colors.primary}>
                        Done
                      </Button>
                    </View>
                    <DateTimePicker
                      value={endDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleEndDateChange}
                      minimumDate={startDate}
                    />
                  </Surface>
                ) : (
                  <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                    minimumDate={startDate}
                  />
                )
              )}
            </View>
          )}
        </Surface>

        {/* Invite Code Section (read-only) */}
        <Surface style={[styles.inviteCodeSection, { backgroundColor: colors.white }]} elevation={1}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Invite Code</Text>
          <View style={[styles.inviteCodeContainer, { backgroundColor: colors.primaryLighter }]}>
            <Text style={[styles.inviteCode, { color: colors.primaryDark }]}>{competition.invite_code}</Text>
          </View>
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Share this code with players to let them join
          </Text>
        </Surface>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Handicap system cannot be changed after creation.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.white, borderTopColor: colors.gray200 }]}>
        <Button
          mode="outlined"
          onPress={handleBack}
          style={styles.cancelButton}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
          theme={{ colors: { outline: colors.gray300 } }}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={updateMutation.isPending}
          disabled={updateMutation.isPending || !isDirty}
          style={styles.saveButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
          accessibilityLabel="Save changes"
          accessibilityRole="button"
        >
          Save Changes
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    borderRadius: borderRadius.md,
  },

  // Form Section
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'transparent',
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
  datePickerContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
  },

  // Invite Code Section
  inviteCodeSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  inviteCodeContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  inviteCode: {
    ...typography.h3,
    letterSpacing: 2,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },

  // Footer
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
  saveButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});
