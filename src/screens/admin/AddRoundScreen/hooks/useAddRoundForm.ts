/**
 * useAddRoundForm - Form state management for AddRoundScreen
 *
 * Manages:
 * - Form data state
 * - Validation
 * - Course, date, time selection
 * - Team round configuration
 * - Scoring pairs toggle
 * - Skins and Wolf game configuration
 */

import { useState, useCallback } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';
import { format } from 'date-fns';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { wolfKeys } from '@/hooks/queryKeys';
import type { GameType, TeamFormat, Competition, TeeBox } from '@/types/database.types';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
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
 *
 * For competition rounds, skins config is stored on the round and the actual
 * skins_games record is created later when pairings are assigned (so we know participants).
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

  // Build skins config if enabled (stored on round, skins_games created when pairings assigned)
  const skinsConfig = data.skinsEnabled && data.skinsConfig
    ? {
        pot_type: data.skinsConfig.pot_type,
        pot_value: data.skinsConfig.pot_value,
        scoring_type: data.skinsConfig.scoring_type,
        currency: data.skinsConfig.currency ?? 'AUD',
      }
    : null;

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
      selected_tee: data.selectedTee, // TeeBox with slope/course ratings for daily handicap
      status: 'upcoming',
      // Skins config stored on round - actual skins_games created when pairings assigned
      skins_enabled: data.skinsEnabled,
      skins_config: skinsConfig,
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

/**
 * Team game types that should use team skins
 */
const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];

/**
 * Create a Wolf game for a round
 * Wolf is a strategic partner selection side-game requiring 3-4 players
 *
 * @param roundId - Round UUID
 * @param wolfConfig - Wolf game configuration
 * @param userId - User creating the game
 */
async function createWolfGame(
  roundId: string,
  wolfConfig: WolfConfig,
  userId: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
  const { data: insertedGame, error } = await (supabase as any)
    .from('wolf_games')
    .insert({
      round_id: roundId,
      scoring_type: wolfConfig.scoring_type,
      blind_wolf_enabled: wolfConfig.blind_wolf_enabled,
      pot_enabled: wolfConfig.pot_enabled,
      pot_value_per_point: wolfConfig.pot_value_per_point ?? 0,
      currency: wolfConfig.currency ?? 'AUD',
      wolf_order: wolfConfig.wolf_order ?? [],
      status: 'active',
      current_hole: 1,
      disclaimer_accepted_at: new Date().toISOString(),
      disclaimer_accepted_by: userId,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create Wolf game: ${error.message}`);
  }

  const game = insertedGame as { id: string };
  return game.id;
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

  // Player count validation for skins/wolf
  competitionPlayerCount: number;
  canEnableSkins: boolean;
  skinsDisabledReason: string | null;
  canEnableWolf: boolean;
  wolfDisabledReason: string | null;

  // Setters
  updateField: (field: keyof RoundFormData, value: string) => void;
  handleCourseSelect: (course: CourseWithFavorite) => void;
  handleTeeSelect: (tee: TeeBox) => void;
  handleDateChange: (date: Date) => void;
  handleTimeChange: (time: Date) => void;
  clearTeeTime: () => void;
  handleGameTypeChange: (gameType: GameType) => void;
  handleTeamRoundToggle: (value: boolean) => void;
  handleTeamFormatChange: (format: TeamFormat) => void;
  handleScoringPairsToggle: (value: boolean) => void;
  // Skins handlers
  handleSkinsEnabledChange: (enabled: boolean) => void;
  handleSkinsConfigChange: (config: SkinsConfig) => void;

  // Wolf handlers
  handleWolfEnabledChange: (enabled: boolean) => void;
  handleWolfConfigChange: (config: WolfConfig) => void;

  // Actions
  handleSubmit: () => void;
  isPending: boolean;

  // Helpers
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;

  // Dialog
  /** Dialog config for error display - parent should render ConfirmationDialog */
  dialogConfig: DialogConfig;
  /** Dismiss the error dialog */
  dismissDialog: () => void;
}

export function useAddRoundForm({
  competitionId,
  onSuccess,
}: UseAddRoundFormOptions): UseAddRoundFormReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Form state - initialize with today's date
  const [formData, setFormData] = useState<RoundFormData>(() => ({
    ...INITIAL_FORM_DATA,
    date: formatDateAustralian(new Date()),
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch competition to get team_mode
  const { data: competition, isLoading: isLoadingCompetition } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: !!competitionId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch competition player count for skins/wolf validation
  const { data: competitionPlayerCount = 0 } = useQuery({
    queryKey: ['competition', competitionId, 'playerCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('competition_players')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', competitionId);

      if (error) {
        console.error('[useAddRoundForm] Failed to fetch player count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!competitionId,
    staleTime: 5 * 60 * 1000,
  });

  // Computed values
  const supportsTeams = competition?.team_mode !== 'none';
  const isTeamMatchPlay = formData.isTeamRound && formData.teamFormat === 'match-play-team';

  // Skins requires 2-4 players
  const canEnableSkins = competitionPlayerCount >= 2;
  const skinsDisabledReason = competitionPlayerCount === 0
    ? 'Add players to the competition to enable skins'
    : competitionPlayerCount === 1
      ? 'Skins requires at least 2 players in the competition'
      : null;

  // Wolf requires exactly 3-4 players
  const canEnableWolf = competitionPlayerCount >= 3 && competitionPlayerCount <= 4;
  const wolfDisabledReason = competitionPlayerCount === 0
    ? 'Add players to the competition to enable Wolf'
    : competitionPlayerCount < 3
      ? `Wolf requires 3-4 players (${competitionPlayerCount} in competition)`
      : competitionPlayerCount > 4
        ? `Wolf is limited to 4 players (${competitionPlayerCount} in competition)`
        : null;

  // Create round mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const nextRoundNumber = await getNextRoundNumber(competitionId);
      const roundId = await createRound(competitionId, formData, nextRoundNumber);

      // Note: Skins config is stored on the round itself (skins_enabled, skins_config).
      // The actual skins_games record will be created when pairings are assigned,
      // because we need to know the participants (players/teams) for the skins game.
      // Create Wolf game if enabled
      if (formData.wolfEnabled && formData.wolfConfig && user?.id) {
        try {
          await createWolfGame(roundId, formData.wolfConfig, user.id);
        } catch {
          // Wolf creation is non-blocking
        }
      }

      return { roundId, scoringPairsRequired: formData.scoringPairsRequired };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['skins'] });
      queryClient.invalidateQueries({ queryKey: wolfKeys.all });

      onSuccess(result.roundId, result.scoringPairsRequired);
    },
    onError: (error: Error) => {
      showAlert('Error', error.message || 'Failed to add round');
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
      courseTees: course.tees || [], // Store available tees
      selectedTee: null, // Reset tee selection when course changes
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.course;
      return newErrors;
    });
  }, []);

  // Handle tee selection
  const handleTeeSelect = useCallback((tee: TeeBox) => {
    setFormData((prev) => ({ ...prev, selectedTee: tee }));
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

  // Handle skins enabled toggle
  const handleSkinsEnabledChange = useCallback((enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      skinsEnabled: enabled,
      // Reset config when disabled
      skinsConfig: enabled ? prev.skinsConfig : null,
    }));
  }, []);

  // Handle skins config change
  const handleSkinsConfigChange = useCallback((config: SkinsConfig) => {
    setFormData((prev) => ({ ...prev, skinsConfig: config }));
  }, []);

  // Handle Wolf enabled toggle
  const handleWolfEnabledChange = useCallback((enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      wolfEnabled: enabled,
      // Reset config when disabled
      wolfConfig: enabled ? prev.wolfConfig : null,
    }));
  }, []);

  // Handle Wolf config change
  const handleWolfConfigChange = useCallback((config: WolfConfig) => {
    setFormData((prev) => ({ ...prev, wolfConfig: config }));
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
    // Player count validation for skins/wolf
    competitionPlayerCount,
    canEnableSkins,
    skinsDisabledReason,
    canEnableWolf,
    wolfDisabledReason,
    // Setters
    updateField,
    handleCourseSelect,
    handleTeeSelect,
    handleDateChange,
    handleTimeChange,
    clearTeeTime,
    handleGameTypeChange,
    handleTeamRoundToggle,
    handleTeamFormatChange,
    handleScoringPairsToggle,
    handleSkinsEnabledChange,
    handleSkinsConfigChange,
    handleWolfEnabledChange,
    handleWolfConfigChange,
    handleSubmit,
    isPending: createMutation.isPending,
    getSelectedDate,
    getSelectedTime,
    dialogConfig,
    dismissDialog,
  };
}
