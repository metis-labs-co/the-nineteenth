/**
 * useAddRoundForm - Form state management for AddRoundScreen
 *
 * Manages:
 * - Form data state
 * - Validation
 * - Course, date, time selection
 * - Team round configuration
 * - Scoring pairs toggle
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/services/supabase/client';
import type { GameType, TeamFormat, Competition } from '@/types/database.types';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { RoundFormData, FormErrors } from '../types';
import { INITIAL_FORM_DATA } from '../types';
import {
  parseAustralianDate,
  formatDateAustralian,
  formatTimeHHMM,
  parseTime,
} from '@/utils/formatting';

/**
 * Fetch competition details to get team_mode
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
 * Create a new round in the database
 */
async function createRound(
  competitionId: string,
  data: RoundFormData,
  roundNumber: number
): Promise<string> {
  const parsedDate = parseAustralianDate(data.date);
  if (!parsedDate) {
    throw new Error('Invalid date format');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
  const { data: insertedRound, error } = await (supabase as any)
    .from('rounds')
    .insert({
      competition_id: competitionId,
      course_id: data.courseId,
      round_number: roundNumber,
      date: format(parsedDate, 'yyyy-MM-dd'),
      tee_time: data.teeTime || null,
      game_type: data.gameType,
      is_team_round: data.isTeamRound,
      team_format: data.isTeamRound ? data.teamFormat : null,
      scoring_pairs_required: data.scoringPairsRequired,
      status: 'upcoming',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create round: ${error.message}`);
  }

  const round = insertedRound as { id: string };
  return round.id;
}

/**
 * Get the next round number for a competition
 */
async function getNextRoundNumber(competitionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('rounds')
    .select('round_number')
    .eq('competition_id', competitionId)
    .order('round_number', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to get round count: ${error.message}`);
  }

  const rounds = data as { round_number: number }[] | null;
  return rounds && rounds.length > 0 ? rounds[0].round_number + 1 : 1;
}

interface UseAddRoundFormOptions {
  competitionId: string;
  onSuccess: (roundId: string, scoringPairsRequired: boolean) => void;
}

interface UseAddRoundFormReturn {
  // State
  formData: RoundFormData;
  errors: FormErrors;
  competition: Competition | undefined;
  isLoadingCompetition: boolean;

  // Computed
  supportsTeams: boolean;
  isTeamMatchPlay: boolean;

  // Setters
  updateField: (field: keyof RoundFormData, value: string) => void;
  handleCourseSelect: (course: CourseWithFavorite) => void;
  handleDateChange: (date: Date) => void;
  handleTimeChange: (time: Date) => void;
  clearTeeTime: () => void;
  handleGameTypeChange: (gameType: GameType) => void;
  handleTeamRoundToggle: (value: boolean) => void;
  handleTeamFormatChange: (format: TeamFormat) => void;
  handleScoringPairsToggle: (value: boolean) => void;

  // Actions
  handleSubmit: () => void;
  isPending: boolean;

  // Helpers
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
}

export function useAddRoundForm({
  competitionId,
  onSuccess,
}: UseAddRoundFormOptions): UseAddRoundFormReturn {
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<RoundFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch competition to get team_mode
  const { data: competition, isLoading: isLoadingCompetition } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: !!competitionId,
    staleTime: 5 * 60 * 1000,
  });

  // Computed values
  const supportsTeams = competition?.team_mode !== 'none';
  const isTeamMatchPlay = formData.isTeamRound && formData.teamFormat === 'match-play-team';

  // Create round mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const nextRoundNumber = await getNextRoundNumber(competitionId);
      const roundId = await createRound(competitionId, formData, nextRoundNumber);
      return { roundId, scoringPairsRequired: formData.scoringPairsRequired };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', competitionId] });
      onSuccess(result.roundId, result.scoringPairsRequired);
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to add round');
    },
  });

  // Update form field
  const updateField = useCallback((field: keyof RoundFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Handle course selection
  const handleCourseSelect = useCallback((course: CourseWithFavorite) => {
    setFormData((prev) => ({
      ...prev,
      courseId: course.id,
      courseName: course.name,
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.course;
      return newErrors;
    });
  }, []);

  // Handle date change
  const handleDateChange = useCallback((date: Date) => {
    setFormData((prev) => ({ ...prev, date: formatDateAustralian(date) }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.date;
      return newErrors;
    });
  }, []);

  // Handle time change
  const handleTimeChange = useCallback((time: Date) => {
    setFormData((prev) => ({ ...prev, teeTime: formatTimeHHMM(time) }));
  }, []);

  // Clear tee time
  const clearTeeTime = useCallback(() => {
    setFormData((prev) => ({ ...prev, teeTime: '' }));
  }, []);

  // Handle game type change
  const handleGameTypeChange = useCallback((gameType: GameType) => {
    setFormData((prev) => ({ ...prev, gameType }));
  }, []);

  // Handle team round toggle
  const handleTeamRoundToggle = useCallback((value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isTeamRound: value,
      teamFormat: value ? prev.teamFormat : null,
    }));
    setErrors((prev) => {
      if (!value && prev.teamFormat) {
        const newErrors = { ...prev };
        delete newErrors.teamFormat;
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Handle team format change
  const handleTeamFormatChange = useCallback((format: TeamFormat) => {
    setFormData((prev) => ({ ...prev, teamFormat: format }));
    setErrors((prev) => {
      if (prev.teamFormat) {
        const newErrors = { ...prev };
        delete newErrors.teamFormat;
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Handle scoring pairs toggle
  const handleScoringPairsToggle = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, scoringPairsRequired: value }));
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.courseId || !formData.courseName) {
      newErrors.course = 'Please select a course';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    } else {
      const parsedDate = parseAustralianDate(formData.date);
      if (!parsedDate) {
        newErrors.date = 'Invalid date format';
      }
    }

    if (formData.isTeamRound && !formData.teamFormat) {
      newErrors.teamFormat = 'Please select a team format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      createMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createMutation.mutate and validateForm are stable
  }, [formData]);

  // Get selected date for picker
  const getSelectedDate = useCallback(() => {
    if (formData.date) {
      return parseAustralianDate(formData.date) || new Date();
    }
    return new Date();
  }, [formData.date]);

  // Get selected time for picker
  const getSelectedTime = useCallback(() => {
    if (formData.teeTime) {
      return parseTime(formData.teeTime) || new Date();
    }
    return new Date();
  }, [formData.teeTime]);

  return {
    formData,
    errors,
    competition,
    isLoadingCompetition,
    supportsTeams,
    isTeamMatchPlay,
    updateField,
    handleCourseSelect,
    handleDateChange,
    handleTimeChange,
    clearTeeTime,
    handleGameTypeChange,
    handleTeamRoundToggle,
    handleTeamFormatChange,
    handleScoringPairsToggle,
    handleSubmit,
    isPending: createMutation.isPending,
    getSelectedDate,
    getSelectedTime,
  };
}
