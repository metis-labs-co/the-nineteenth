/**
 * useAddRoundForm - Form state management for AddRoundScreen
 *
 * Manages:
 * - Form data state
 * - Validation
 * - Course, date, time selection
 * - Round preset selection (resolves to all six format columns)
 * - Sub-match generation for split presets
 * - Scoring pairs toggle
 * - Skins and Wolf game configuration
 */

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';
import { format } from 'date-fns';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { wolfKeys } from '@/hooks/queryKeys';
import {
  ROUND_PRESETS,
  type RoundPresetId,
} from '@/constants/roundPresets';
import {
  generateSubMatches,
  type GeneratedSubMatch,
} from '@/utils/pairingAlgorithm';
import { replaceSubMatches } from '@/services/subMatches';
import { getCurrentCompetitionStandings } from '@/services/api/knockout';
import { reseedRoundPairings } from '@/services/rounds';
import type {
  Competition,
  GameType,
  TeamFormat,
  TeamWithMembers,
  TeeBox,
} from '@/types/database.types';
import type {
  BracketSeedingStyle,
  PairingSource,
  QualifyingMetric,
} from '@/types/database/enums';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { PairingPlayer, SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { RoundFormData, FormErrors } from '../types';
import { INITIAL_FORM_DATA } from '../types';
import {
  parseAustralianDate,
  formatDateAustralian,
  formatTimeHHMM,
  parseTime,
} from '@/utils/formatting';

const SUB_MATCH_INTERVAL_MINUTES = 8;

/**
 * Fetch competition details to get team_mode and per_round_rules_enabled.
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

interface CreateRoundArgs {
  competitionId: string;
  data: RoundFormData;
  roundNumber: number;
}

/**
 * Insert a new round row, writing all six preset-controlled format columns.
 * For split presets, returns the round id and leaves sub-match insertion to
 * the caller (which has the generated SubMatchInput[]).
 */
async function createRound({
  competitionId,
  data,
  roundNumber,
}: CreateRoundArgs): Promise<string> {
  const parsedDate = parseAustralianDate(data.date);
  if (!parsedDate) {
    throw new Error('Invalid date format');
  }

  const preset = ROUND_PRESETS[data.presetId];
  const config = preset.config;

  const skinsConfig =
    data.skinsEnabled && data.skinsConfig
      ? {
          pot_type: data.skinsConfig.pot_type,
          pot_value: data.skinsConfig.pot_value,
          scoring_type: data.skinsConfig.scoring_type,
          currency: data.skinsConfig.currency ?? 'AUD',
        }
      : null;

  // Pairing config columns. Style + metric must be NULL when source = 'manual'
  // (DB-enforced consistency check) — guard at the write site so a stale form
  // value doesn't trip the constraint.
  const isStandings = data.pairingSource === 'current_standings';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
  const { data: insertedRound, error } = await (supabase as any)
    .from('rounds')
    .insert({
      competition_id: competitionId,
      course_id: data.courseId,
      round_number: roundNumber,
      date: format(parsedDate, 'yyyy-MM-dd'),
      tee_time: data.teeTime || null,
      // The six preset-controlled format columns. Same shape applyPresetToRound
      // writes after-the-fact when an organiser changes the round type.
      game_type: config.game_type,
      is_team_round: config.is_team_round,
      team_format: config.team_format,
      round_format: config.round_format,
      sub_match_size: config.sub_match_size,
      rules_override: config.rules_override,
      scoring_pairs_required: data.scoringPairsRequired,
      pairing_source: data.pairingSource,
      pairing_style: isStandings ? data.pairingStyle : null,
      pairing_metric: isStandings ? data.pairingMetric : null,
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
 * Create a Wolf game for a round.
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

/**
 * Map the team rosters returned by `useTeams` into the PairingPlayer shape
 * expected by `generateSubMatches`. Mirrors the helper in RoundTypeSheet.
 */
function teamMembersToPairingPlayers(
  members: TeamWithMembers['members']
): PairingPlayer[] {
  return (members ?? [])
    .filter((m) => m.player_id)
    .map((m) => ({
      id: m.player_id,
      name: m.player?.name ?? 'Unknown',
      handicap: m.player?.handicap ?? null,
      handicapIndex: m.player?.handicap_index ?? null,
      gender: m.player?.gender ?? null,
      photoUrl: m.player?.photo_url ?? null,
    }));
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
  perRoundRulesEnabled: boolean;
  teams: TeamWithMembers[];
  /** Sub-match preview for the selected preset (split presets only). */
  subMatchPreview: GeneratedSubMatch[] | null;
  /** Derived from the selected preset for legacy consumers (OptionsStep). */
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
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
  handlePresetChange: (presetId: RoundPresetId) => void;
  handleScoringPairsToggle: (value: boolean) => void;
  // Standings-driven pairing handlers (1v1 match-play presets only)
  /** Whether the selected preset can opt into standings-based pairing. */
  supportsStandingsPairing: boolean;
  handlePairingSourceToggle: (enabled: boolean) => void;
  handlePairingStyleChange: (style: BracketSeedingStyle) => void;
  handlePairingMetricChange: (metric: QualifyingMetric) => void;
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

  // Fetch competition to get team_mode and per_round_rules_enabled
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

  // Teams for the competition — needed for sub-match preview / generation
  const { data: teams = [] } = useTeams(competitionId);

  // Computed values
  const supportsTeams = competition?.team_mode !== 'none';
  const perRoundRulesEnabled = competition?.per_round_rules_enabled ?? false;

  const presetConfig = ROUND_PRESETS[formData.presetId].config;
  const gameType = presetConfig.game_type;
  const isTeamRound = presetConfig.is_team_round;
  const teamFormat = presetConfig.team_format;
  const isTeamMatchPlay = isTeamRound && teamFormat === 'match-play-team';

  // The three 1v1 match-play presets that may opt into standings-driven pairing.
  // individual_match_play_seeded defaults ON when picked (its preset description
  // already promises this behaviour); the other two are opt-in via the toggle.
  const supportsStandingsPairing =
    formData.presetId === 'individual_match_play' ||
    formData.presetId === 'individual_match_play_seeded' ||
    formData.presetId === 'ryder_cup_singles';

  // Sub-match preview for split presets — same algorithm RoundTypeSheet uses.
  const subMatchPreview = useMemo<GeneratedSubMatch[] | null>(() => {
    if (presetConfig.round_format !== 'split') return null;
    if (teams.length < 2) return null;
    const startTime = (formData.teeTime || '07:00').substring(0, 5);
    const result = generateSubMatches({
      teamAPlayers: teamMembersToPairingPlayers(teams[0].members),
      teamBPlayers: teamMembersToPairingPlayers(teams[1].members),
      subMatchSize: presetConfig.sub_match_size ?? 2,
      startTime,
      intervalMinutes: SUB_MATCH_INTERVAL_MINUTES,
    });
    return result.subMatches.length > 0 ? result.subMatches : null;
  }, [presetConfig.round_format, presetConfig.sub_match_size, teams, formData.teeTime]);

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

      // For standings-driven pairing we resolve the rank order BEFORE inserting
      // the round — an empty/error standings result must abort the insert
      // outright, otherwise the user is left with an orphan round.
      let standingsOrder: string[] | null = null;
      if (formData.pairingSource === 'current_standings') {
        const standings = await getCurrentCompetitionStandings(
          competitionId,
          nextRoundNumber,
          formData.pairingMetric
        );
        if (standings.length === 0) {
          throw new Error(
            'Standings-based pairing needs at least one completed prior round in this competition.'
          );
        }
        standingsOrder = standings.map((s) => s.id);
      }

      const roundId = await createRound({
        competitionId,
        data: formData,
        roundNumber: nextRoundNumber,
      });

      const isSplit = presetConfig.round_format === 'split';

      if (standingsOrder) {
        // Standings-driven pairings (both individual and split presets) flow
        // through the shared service so the create-time path here and the
        // edit-time path in EditPairingConfigSheet stay in lockstep. We hand
        // the helper our pre-fetched standings so it doesn't re-query.
        await reseedRoundPairings({
          roundId,
          competitionId,
          roundNumber: nextRoundNumber,
          presetConfig: {
            round_format: presetConfig.round_format,
            sub_match_size: presetConfig.sub_match_size,
          },
          pairingStyle: formData.pairingStyle,
          pairingMetric: formData.pairingMetric,
          teeTime: formData.teeTime || null,
          // Only forward teams for team-format split rounds (e.g. ryder
          // cup singles). Singles match play in a team competition still
          // ignores the team rosters and pairs head-to-head from the
          // flat standings list.
          teams: isSplit && isTeamRound ? teams : undefined,
          preFetchedStandings: standingsOrder.map((id) => ({ id })),
        });
      } else if (isSplit && isTeamRound && subMatchPreview && subMatchPreview.length > 0) {
        // Default *team* split-preset path — handicap snake-draft cross-team
        // sub-matches (e.g. ryder cup singles without standings). Singles
        // match play in a team competition deliberately skips this branch:
        // it's not a team round, so cross-team pairings would be wrong.
        // The user sets up pairings via EditPairingConfigSheet (manually
        // or by enabling standings-driven mode).
        await replaceSubMatches({
          roundId,
          subMatches: subMatchPreview.map((sm) => ({
            sortOrder: sm.sortOrder,
            teamAPlayerIds: sm.teamAPlayerIds,
            teamBPlayerIds: sm.teamBPlayerIds,
            teeTime: sm.teeTime,
            pairingId: null,
          })),
        });
      }

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

  // Handle preset change
  const handlePresetChange = useCallback((presetId: RoundPresetId) => {
    setFormData((prev) => {
      // Flip pairing_source defaults for standings-aware presets:
      //   - individual_match_play_seeded — turn ON automatically (the preset's
      //     own description promises auto-seeding from standings).
      //   - individual_match_play / ryder_cup_singles — opt-in (default OFF).
      //   - anything else — force back to 'manual' so a stale standings choice
      //     doesn't leak across preset changes.
      const nextPairingSource: PairingSource =
        presetId === 'individual_match_play_seeded'
          ? 'current_standings'
          : 'manual';
      return { ...prev, presetId, pairingSource: nextPairingSource };
    });
    setErrors((prev) => {
      if (prev.preset) {
        const newErrors = { ...prev };
        delete newErrors.preset;
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Handle scoring pairs toggle
  const handleScoringPairsToggle = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, scoringPairsRequired: value }));
  }, []);

  // Standings-driven pairing handlers
  const handlePairingSourceToggle = useCallback((enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      pairingSource: enabled ? 'current_standings' : 'manual',
    }));
  }, []);

  const handlePairingStyleChange = useCallback((style: BracketSeedingStyle) => {
    setFormData((prev) => ({ ...prev, pairingStyle: style }));
  }, []);

  const handlePairingMetricChange = useCallback((metric: QualifyingMetric) => {
    setFormData((prev) => ({ ...prev, pairingMetric: metric }));
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

    // Split presets need 2+ teams with members so we can generate sub-matches.
    if (presetConfig.round_format === 'split') {
      if (teams.length < 2) {
        newErrors.preset =
          'Set up at least two teams on this competition before picking a sub-matches preset';
      } else if (!subMatchPreview || subMatchPreview.length === 0) {
        newErrors.preset =
          'Both teams need at least one player to generate sub-matches';
      }
    }

    // Standings-driven pairing pre-checks. Only runs when the user opted in
    // for one of the three supported presets — avoids surfacing irrelevant
    // errors elsewhere.
    if (formData.pairingSource === 'current_standings' && supportsStandingsPairing) {
      if (presetConfig.round_format === 'split') {
        // Split presets — each team's roster must be even-sized so cross-team
        // pairing slots fill cleanly. competitionPlayerCount overall isn't the
        // right gauge here; team rosters are.
        const teamASize = teams[0]?.members.length ?? 0;
        const teamBSize = teams[1]?.members.length ?? 0;
        if (teamASize === 0 || teamBSize === 0) {
          newErrors.pairing =
            'Both teams need at least one player to use standings-based pairing.';
        } else if (teamASize !== teamBSize) {
          newErrors.pairing = `Teams must be the same size for standings-based 1v1 pairing (currently ${teamASize} vs ${teamBSize}).`;
        }
      } else {
        // Individual 1v1 presets — every accepted player gets a match, so the
        // count must be even. competitionPlayerCount is the input.
        if (competitionPlayerCount < 2) {
          newErrors.pairing =
            'Standings-based pairing needs at least 2 players in the competition.';
        } else if (competitionPlayerCount % 2 !== 0) {
          newErrors.pairing = `Standings-based 1v1 pairing needs an even number of players (currently ${competitionPlayerCount}).`;
        }
      }
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
  }, [formData, subMatchPreview]);

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
    perRoundRulesEnabled,
    teams,
    subMatchPreview,
    gameType,
    isTeamRound,
    teamFormat,
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
    handlePresetChange,
    handleScoringPairsToggle,
    supportsStandingsPairing,
    handlePairingSourceToggle,
    handlePairingStyleChange,
    handlePairingMetricChange,
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
