/**
 * Hook for managing EditRoundScreen form state
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { GameType, TeeBox, Course, SkinsConfig } from '@/types/database.types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { RoundFormData, RoundWithCourse, SkinsEditState, WolfEditState } from '../types';
import {
  parseISODate,
  formatDateAustralian,
  parseAustralianDate,
  parseTime,
} from '@/utils/formatting';

interface UseEditRoundFormOptions {
  round: RoundWithCourse | undefined;
  /** Competition ID (kept for potential future use) */
  competitionId?: string;
  /** Existing skins game for this round (if any) */
  existingSkinsGame?: {
    id: string;
    pot_type: 'per_hole' | 'total_pot';
    pot_value: number;
    currency: string;
    scoring_type: 'gross' | 'net';
  } | null;
  /** Existing Wolf game for this round (if any) */
  existingWolfGame?: {
    id: string;
    scoring_type: 'gross' | 'net';
    blind_wolf_enabled: boolean;
    pot_enabled: boolean;
    pot_value_per_point: number | null;
    currency: string;
    wolf_order: string[];
  } | null;
}

interface UseEditRoundFormReturn {
  formData: RoundFormData;
  originalData: RoundFormData | null;
  isDirty: boolean;
  availableTees: TeeBox[];
  skinsEditState: SkinsEditState;
  wolfEditState: WolfEditState;

  // Form field handlers
  setDate: (date: string) => void;
  setTeeTime: (time: string) => void;
  clearTeeTime: () => void;
  setGameType: (gameType: GameType) => void;
  setSelectedTee: (tee: TeeBox) => void;
  setScoringPairsRequired: (value: boolean) => void;
  setCourse: (course: Course) => void;

  // Skins handlers
  setSkinsEnabled: (enabled: boolean) => void;
  setSkinsConfig: (config: SkinsConfig) => void;

  // Wolf handlers
  setWolfEnabled: (enabled: boolean) => void;
  setWolfConfig: (config: WolfConfig) => void;

  // Date/time picker helpers
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
}

/**
 * Manages form state for editing a round
 */
export function useEditRoundForm({
  round,
  competitionId,
  existingSkinsGame,
  existingWolfGame,
}: UseEditRoundFormOptions): UseEditRoundFormReturn {
  // Form state
  const [formData, setFormData] = useState<RoundFormData>({
    date: '',
    teeTime: '',
    gameType: 'stableford',
    selectedTee: null,
    scoringPairsRequired: false,
    courseId: null,
    courseName: '',
    skinsEnabled: false,
    skinsConfig: null,
    wolfEnabled: false,
    wolfConfig: null,
  });

  // Original values for dirty check
  const [originalData, setOriginalData] = useState<RoundFormData | null>(null);

  // Populate form when data loads
  useEffect(() => {
    if (round) {
      const parsedDate = parseISODate(round.date);

      // Build skins config from existing game (if any)
      const skinsConfig: SkinsConfig | null = existingSkinsGame
        ? {
            pot_type: existingSkinsGame.pot_type,
            pot_value: existingSkinsGame.pot_value,
            currency: existingSkinsGame.currency,
            scoring_type: existingSkinsGame.scoring_type,
          }
        : null;

      // Build Wolf config from existing game (if any)
      const wolfConfig: WolfConfig | null = existingWolfGame
        ? {
            scoring_type: existingWolfGame.scoring_type,
            blind_wolf_enabled: existingWolfGame.blind_wolf_enabled,
            pot_enabled: existingWolfGame.pot_enabled,
            pot_value_per_point: existingWolfGame.pot_value_per_point ?? undefined,
            currency: existingWolfGame.currency ?? undefined,
            wolf_order: existingWolfGame.wolf_order,
          }
        : null;

      const data: RoundFormData = {
        date: parsedDate ? formatDateAustralian(parsedDate) : '',
        teeTime: round.tee_time || '',
        gameType: round.game_type,
        selectedTee: round.selected_tee,
        scoringPairsRequired: round.scoring_pairs_required,
        courseId: round.course_id,
        courseName: round.courses?.name || '',
        skinsEnabled: !!existingSkinsGame,
        skinsConfig,
        wolfEnabled: !!existingWolfGame,
        wolfConfig,
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [round, existingSkinsGame, existingWolfGame]);

  // Calculate skins edit state based on round status
  const skinsEditState = useMemo((): SkinsEditState => {
    const roundStatus = round?.status;
    const hasStarted = roundStatus === 'in-progress' || roundStatus === 'completed';

    return {
      hasExistingSkins: !!existingSkinsGame,
      existingSkinsGameId: existingSkinsGame?.id ?? null,
      canEditSkins: !hasStarted,
      lockedReason: hasStarted
        ? roundStatus === 'completed'
          ? 'Skins configuration cannot be changed after round is completed'
          : 'Skins configuration cannot be changed after round has started'
        : null,
    };
  }, [round?.status, existingSkinsGame]);

  // Calculate Wolf edit state based on round status
  const wolfEditState = useMemo((): WolfEditState => {
    const roundStatus = round?.status;
    const hasStarted = roundStatus === 'in-progress' || roundStatus === 'completed';

    return {
      hasExistingWolf: !!existingWolfGame,
      existingWolfGameId: existingWolfGame?.id ?? null,
      canEditWolf: !hasStarted,
      lockedReason: hasStarted
        ? roundStatus === 'completed'
          ? 'Wolf configuration cannot be changed after round is completed'
          : 'Wolf configuration cannot be changed after round has started'
        : null,
    };
  }, [round?.status, existingWolfGame]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!originalData) return false;

    // Check skins config changes
    const skinsChanged =
      formData.skinsEnabled !== originalData.skinsEnabled ||
      formData.skinsConfig?.pot_type !== originalData.skinsConfig?.pot_type ||
      formData.skinsConfig?.pot_value !== originalData.skinsConfig?.pot_value ||
      formData.skinsConfig?.scoring_type !== originalData.skinsConfig?.scoring_type;

    // Check Wolf config changes
    const wolfChanged =
      formData.wolfEnabled !== originalData.wolfEnabled ||
      formData.wolfConfig?.scoring_type !== originalData.wolfConfig?.scoring_type ||
      formData.wolfConfig?.blind_wolf_enabled !== originalData.wolfConfig?.blind_wolf_enabled ||
      formData.wolfConfig?.pot_enabled !== originalData.wolfConfig?.pot_enabled ||
      formData.wolfConfig?.pot_value_per_point !== originalData.wolfConfig?.pot_value_per_point;

    return (
      formData.date !== originalData.date ||
      formData.teeTime !== originalData.teeTime ||
      formData.gameType !== originalData.gameType ||
      formData.selectedTee?.name !== originalData.selectedTee?.name ||
      formData.scoringPairsRequired !== originalData.scoringPairsRequired ||
      formData.courseId !== originalData.courseId ||
      skinsChanged ||
      wolfChanged
    );
  }, [formData, originalData]);

  // Get available tees from course
  const availableTees = useMemo(() => {
    return round?.courses?.tees || [];
  }, [round?.courses?.tees]);

  // Form field handlers
  const setDate = useCallback((date: string) => {
    setFormData((prev) => ({ ...prev, date }));
  }, []);

  const setTeeTime = useCallback((teeTime: string) => {
    setFormData((prev) => ({ ...prev, teeTime }));
  }, []);

  const clearTeeTime = useCallback(() => {
    setFormData((prev) => ({ ...prev, teeTime: '' }));
  }, []);

  const setGameType = useCallback((gameType: GameType) => {
    setFormData((prev) => ({ ...prev, gameType }));
  }, []);

  const setSelectedTee = useCallback((selectedTee: TeeBox) => {
    setFormData((prev) => ({ ...prev, selectedTee }));
  }, []);

  const setScoringPairsRequired = useCallback((scoringPairsRequired: boolean) => {
    setFormData((prev) => ({ ...prev, scoringPairsRequired }));
  }, []);

  const setCourse = useCallback((course: Course) => {
    setFormData((prev) => ({
      ...prev,
      courseId: course.id,
      courseName: course.name,
      // Reset selected tee when course changes (since tees are course-specific)
      selectedTee: course.tees?.[0] || null,
    }));
  }, []);

  // Skins handlers
  const setSkinsEnabled = useCallback((enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      skinsEnabled: enabled,
      // Reset config when disabling
      skinsConfig: enabled ? prev.skinsConfig : null,
    }));
  }, []);

  const setSkinsConfig = useCallback((config: SkinsConfig) => {
    setFormData((prev) => ({
      ...prev,
      skinsConfig: config,
      skinsEnabled: true, // Enable skins when config is set
    }));
  }, []);

  // Wolf handlers
  const setWolfEnabled = useCallback((enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      wolfEnabled: enabled,
      // Reset config when disabling
      wolfConfig: enabled ? prev.wolfConfig : null,
    }));
  }, []);

  const setWolfConfig = useCallback((config: WolfConfig) => {
    setFormData((prev) => ({
      ...prev,
      wolfConfig: config,
      wolfEnabled: true, // Enable Wolf when config is set
    }));
  }, []);

  // Date/time picker helpers
  const getSelectedDate = useCallback(() => {
    if (formData.date) {
      return parseAustralianDate(formData.date) || new Date();
    }
    return new Date();
  }, [formData.date]);

  const getSelectedTime = useCallback(() => {
    if (formData.teeTime) {
      return parseTime(formData.teeTime) || new Date();
    }
    return new Date();
  }, [formData.teeTime]);

  return {
    formData,
    originalData,
    isDirty,
    availableTees,
    skinsEditState,
    wolfEditState,
    setDate,
    setTeeTime,
    clearTeeTime,
    setGameType,
    setSelectedTee,
    setScoringPairsRequired,
    setCourse,
    setSkinsEnabled,
    setSkinsConfig,
    setWolfEnabled,
    setWolfConfig,
    getSelectedDate,
    getSelectedTime,
  };
}
