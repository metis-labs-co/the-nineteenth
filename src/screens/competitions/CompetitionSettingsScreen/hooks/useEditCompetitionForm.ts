/**
 * Hook for managing CompetitionSettingsScreen form state
 *
 * Handles core competition details:
 * - Name and description
 * - Competition type (event/league)
 * - Team mode (individual/teams)
 * - Start and end dates
 *
 * Note: Prize pool configuration is handled separately via
 * EditPrizePoolBottomSheet from the CompetitionDetailScreen.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller, Control, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Competition, CompetitionType, TeamMode } from '@/types/database.types';
import { formatDateAustralian, parseISODate, parseAustralianDate } from '@/utils/formatting';
import { editCompetitionSchema, EditCompetitionFormData } from './useCompetitionValidation';

interface UseEditCompetitionFormOptions {
  competition: Competition | undefined;
}

interface UseEditCompetitionFormReturn {
  // React Hook Form - using the Zod-inferred type
  control: Control<EditCompetitionFormData>;
  handleSubmit: UseFormHandleSubmit<EditCompetitionFormData>;
  errors: FieldErrors<EditCompetitionFormData>;
  isDirty: boolean;

  // Watched values
  startDate: string;
  competitionType: CompetitionType;
  teamMode: TeamMode;

  // Minimum date for end date picker
  startDateParsed: Date | null;

  // Field handlers
  handleCompetitionTypeChange: (value: CompetitionType) => void;
  handleTeamModeChange: (value: TeamMode) => void;
  handleStartDateChange: (value: string) => void;
  handleEndDateChange: (value: string) => void;

  // Form data getter
  getFormData: () => EditCompetitionFormData;
}

/**
 * Manages form state for editing a competition
 */
export function useEditCompetitionForm({
  competition,
}: UseEditCompetitionFormOptions): UseEditCompetitionFormReturn {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<EditCompetitionFormData>({
    resolver: zodResolver(editCompetitionSchema),
    defaultValues: {
      name: '',
      description: '',
      competitionType: 'event',
      teamMode: 'none',
      startDate: formatDateAustralian(new Date()),
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
          formatDateAustralian(parseISODate(competition.start_date)) ||
          formatDateAustralian(new Date()),
        endDate: formatDateAustralian(parseISODate(competition.end_date)) || '',
      });
    }
  }, [competition, reset]);

  // Handle competition type change
  const handleCompetitionTypeChange = useCallback(
    (value: CompetitionType) => {
      setValue('competitionType', value, { shouldDirty: true });
      // Clear end date when switching to knockout
      if (value === 'knockout') {
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

  // Get form data
  const getFormData = useCallback(() => getValues(), [getValues]);

  return {
    control,
    handleSubmit,
    errors,
    isDirty,
    startDate,
    competitionType,
    teamMode,
    startDateParsed,
    handleCompetitionTypeChange,
    handleTeamModeChange,
    handleStartDateChange,
    handleEndDateChange,
    getFormData,
  };
}

// Re-export Controller for convenience
export { Controller };
