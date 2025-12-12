/**
 * EditCompetitionScreen - Edit competition details
 *
 * Allows organizers to edit:
 * - Competition name
 * - Description
 * - Competition type (event/league)
 * - Team mode
 * - Start date
 * - End date
 *
 * Uses BottomSheet component for full-screen modal presentation.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Icon } from 'react-native-paper';
import {
  BottomSheet,
  DatePicker,
  FormInput,
  SegmentedButton,
  LoadingSpinner,
} from '@/components/common';
import type { SegmentOption } from '@/components/common';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { supabase } from '@/services/supabase/client';
import type { Competition, CompetitionType, TeamMode } from '@/types/database.types';

// ============================================================================
// Types
// ============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'EditCompetition'>;

interface CompetitionUpdateInput {
  name?: string;
  description?: string | null;
  competition_type?: CompetitionType;
  team_mode?: TeamMode;
  start_date?: string;
  end_date?: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const COMPETITION_TYPE_DESCRIPTIONS: Record<CompetitionType, string> = {
  league: 'Ongoing competition with no fixed end date',
  event: 'Fixed-term competition with an end date',
};

const TEAM_MODE_DESCRIPTIONS: Record<TeamMode, string> = {
  none: 'Players compete individually',
  fixed: 'Same teams throughout the competition',
  'per-round': 'Teams change each round',
};

const COMPETITION_TYPE_BUTTONS: SegmentOption<CompetitionType>[] = [
  { value: 'event', label: 'Event', icon: 'calendar-star' },
  { value: 'league', label: 'League', icon: 'trophy-outline' },
];

const TEAM_MODE_BUTTONS: SegmentOption<TeamMode>[] = [
  { value: 'none', label: 'Individual', icon: 'account' },
  { value: 'fixed', label: 'Teams', icon: 'account-group' },
];

// ============================================================================
// Form Schema
// ============================================================================

const editCompetitionSchema = z
  .object({
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
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.competitionType === 'event' && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: 'End date is required for event competitions',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        const start = parseAustralianDate(data.startDate);
        const end = parseAustralianDate(data.endDate);
        if (start && end) {
          return end >= start;
        }
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

type EditCompetitionFormData = z.infer<typeof editCompetitionSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse DD/MM/YYYY string to Date object
 */
function parseAustralianDate(dateString: string): Date | null {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
}

/**
 * Format Date to DD/MM/YYYY string (Australian format)
 */
function formatAustralianDate(date: Date | null): string {
  if (!date) return '';
  return format(date, 'dd/MM/yyyy');
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

// ============================================================================
// API Functions
// ============================================================================

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

async function updateCompetition(
  competitionId: string,
  updates: CompetitionUpdateInput
): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    // @ts-expect-error - Supabase types don't properly handle partial updates
    .update(updates)
    .eq('id', competitionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update competition: ${error.message}`);
  }

  return data as Competition;
}

// ============================================================================
// Component
// ============================================================================

export default function EditCompetitionScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

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
      startDate: formatAustralianDate(new Date()),
      endDate: '',
    },
  });

  // Watch form values
  const startDate = watch('startDate');
  const competitionType = watch('competitionType');
  const teamMode = watch('teamMode');

  // Memoized minimum date for end date picker
  const startDateParsed = useMemo(() => parseAustralianDate(startDate), [startDate]);

  // Update form when competition data loads
  useEffect(() => {
    if (competition) {
      reset({
        name: competition.name,
        description: competition.description || '',
        competitionType: competition.competition_type || 'event',
        teamMode: competition.team_mode || 'none',
        startDate:
          formatAustralianDate(parseISODate(competition.start_date)) ||
          formatAustralianDate(new Date()),
        endDate: formatAustralianDate(parseISODate(competition.end_date)) || '',
      });
    }
  }, [competition, reset]);

  // Handle competition type change
  const handleCompetitionTypeChange = useCallback(
    (value: CompetitionType) => {
      setValue('competitionType', value, { shouldDirty: true });
      // Clear end date when switching to league
      if (value === 'league') {
        setValue('endDate', '', { shouldDirty: true });
      }
    },
    [setValue]
  );

  // Handle team mode change
  const handleTeamModeChange = useCallback(
    (value: TeamMode) => {
      setValue('teamMode', value, { shouldDirty: true });
    },
    [setValue]
  );

  // Handle date changes
  const handleStartDateChange = useCallback(
    (value: string) => {
      setValue('startDate', value, { shouldDirty: true });
    },
    [setValue]
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      setValue('endDate', value, { shouldDirty: true });
    },
    [setValue]
  );

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: EditCompetitionFormData) => {
      const startDateParsed = parseAustralianDate(data.startDate);
      const endDateParsed = data.endDate ? parseAustralianDate(data.endDate) : null;

      return updateCompetition(id, {
        name: data.name,
        description: data.description || null,
        competition_type: data.competitionType,
        team_mode: data.teamMode,
        start_date: startDateParsed ? startDateParsed.toISOString().split('T')[0] : undefined,
        end_date: endDateParsed ? endDateParsed.toISOString().split('T')[0] : null,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['competition', id] });
      queryClient.invalidateQueries({ queryKey: ['competition', id, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update competition');
    },
  });

  // Handle close with unsaved changes confirmation
  const handleClose = useCallback(() => {
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

  // Memoized save button disabled state
  const isSaveDisabled = updateMutation.isPending || !isDirty;

  // Render loading state
  if (isLoading) {
    return (
      <BottomSheet
        visible={true}
        onClose={handleClose}
        height="full"
        title="Edit Competition"
        showHandle={false}
        safeAreaTop
        showCloseButton
        testID="edit-competition-bottom-sheet"
      >
        <LoadingSpinner size="lg" message="Loading competition..." fullScreen />
      </BottomSheet>
    );
  }

  // Render error state
  if (fetchError || !competition) {
    return (
      <BottomSheet
        visible={true}
        onClose={handleClose}
        height="full"
        title="Edit Competition"
        showHandle={false}
        safeAreaTop
        showCloseButton
        testID="edit-competition-bottom-sheet"
      >
        <View style={styles.centerContent}>
          <Icon source="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Unable to load competition
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {fetchError?.message || 'Competition not found'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.textOnColored }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={true}
      onClose={handleClose}
      height="full"
      title="Edit Competition"
      showHandle={false}
      safeAreaTop
      showCloseButton
      enableSwipeToDismiss={!isDirty}
      closeOnBackdropPress={!isDirty}
      testID="edit-competition-bottom-sheet"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Update your competition details below.
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
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter competition name"
                error={errors.name?.message}
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
                label="Description"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter description"
                multiline
                numberOfLines={4}
                error={errors.description?.message}
              />
            )}
          />

          {/* Competition Type */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Competition Type *
            </Text>
            <Controller
              control={control}
              name="competitionType"
              render={({ field: { value } }) => (
                <SegmentedButton<CompetitionType>
                  value={value}
                  onValueChange={handleCompetitionTypeChange}
                  buttons={COMPETITION_TYPE_BUTTONS}
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {COMPETITION_TYPE_DESCRIPTIONS[competitionType]}
            </Text>
          </View>

          {/* Format (Team Mode) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format *</Text>
            <Controller
              control={control}
              name="teamMode"
              render={({ field: { value } }) => (
                <SegmentedButton<TeamMode>
                  value={value}
                  onValueChange={handleTeamModeChange}
                  buttons={TEAM_MODE_BUTTONS}
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {TEAM_MODE_DESCRIPTIONS[teamMode]}
            </Text>
          </View>

          {/* Start Date - Using reusable DatePicker component */}
          <Controller
            control={control}
            name="startDate"
            render={({ field: { value } }) => (
              <DatePicker
                value={value}
                onChange={handleStartDateChange}
                label="Start Date *"
                hint="Tap to change the start date"
                error={errors.startDate?.message}
              />
            )}
          />

          {/* End Date - Required for Event, hidden for League */}
          {competitionType === 'event' && (
            <Controller
              control={control}
              name="endDate"
              render={({ field: { value } }) => (
                <DatePicker
                  value={value || ''}
                  onChange={handleEndDateChange}
                  label="End Date *"
                  placeholder="Set end date"
                  hint="Competition will auto-complete after this date"
                  error={errors.endDate?.message}
                  minimumDate={startDateParsed || undefined}
                  showClear={!!value}
                />
              )}
            />
          )}
        </View>

        {/* Invite Code Section (read-only) */}
        <View style={[styles.inviteCodeSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Invite Code</Text>
          <View style={[styles.inviteCodeContainer, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.inviteCode, { color: colors.primaryDark }]}>
              {competition.invite_code}
            </Text>
          </View>
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Share this code with players to let them join
          </Text>
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source="information-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Handicap system cannot be changed after creation.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSaveDisabled}
          style={[
            styles.saveButton,
            { backgroundColor: isSaveDisabled ? colors.gray200 : colors.primary },
          ]}
          accessibilityLabel="Save changes"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaveDisabled }}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.textOnColored} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: isSaveDisabled ? colors.textDisabled : colors.textOnColored },
              ]}
            >
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Center content (loading/error states)
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
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
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },

  // Scroll content
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

  // Form Section
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

  // Invite Code Section
  inviteCodeSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
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
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
