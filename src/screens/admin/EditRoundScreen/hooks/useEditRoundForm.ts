/**
 * Hook for managing EditRoundScreen form state
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { GameType, TeeBox, Course, SkinsConfig, SkinsPoolSource } from '@/types/database.types';
import type { RoundFormData, RoundWithCourse, SkinsEditState, PoolSourceData } from '../types';
import { useCompetitionPrizePool, usePoolBalance } from '@/hooks/usePrizePool';
import {
  parseISODate,
  formatDateAustralian,
  parseAustralianDate,
  parseTime,
} from '@/utils/formatting';

interface UseEditRoundFormOptions {
  round: RoundWithCourse | undefined;
  /** Competition ID for fetching prize pool (Phase 2) */
  competitionId?: string;
  /** Existing skins game for this round (if any) */
  existingSkinsGame?: {
    id: string;
    pot_type: 'per_hole' | 'total_pot';
    pot_value: number;
    currency: string;
    scoring_type: 'gross' | 'net';
    pool_source?: 'direct' | 'prize_pool';
  } | null;
}

interface UseEditRoundFormReturn {
  formData: RoundFormData;
  originalData: RoundFormData | null;
  isDirty: boolean;
  availableTees: TeeBox[];
  skinsEditState: SkinsEditState;

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
  // Pool source handlers (Phase 2)
  setPoolSource: (source: SkinsPoolSource) => void;

  // Pool data (Phase 2)
  poolData: PoolSourceData | undefined;
  isLoadingPool: boolean;

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
    skinsPoolSource: 'direct',
  });

  // Original values for dirty check
  const [originalData, setOriginalData] = useState<RoundFormData | null>(null);

  // Fetch prize pool for this competition (Phase 2)
  const { data: prizePool, isLoading: isLoadingPrizePool } = useCompetitionPrizePool(competitionId);
  const { data: poolBalance, isLoading: isLoadingBalance } = usePoolBalance(prizePool?.id);

  // Compute pool data for SkinsSection
  const poolData = useMemo((): PoolSourceData | undefined => {
    if (!prizePool) return undefined;

    return {
      pool: prizePool,
      balance: poolBalance ?? null,
      isLocked: prizePool.is_locked,
    };
  }, [prizePool, poolBalance]);

  const isLoadingPool = isLoadingPrizePool || isLoadingBalance;

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
        skinsPoolSource: existingSkinsGame?.pool_source ?? 'direct',
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [round, existingSkinsGame]);

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

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!originalData) return false;

    // Check skins config changes
    const skinsChanged =
      formData.skinsEnabled !== originalData.skinsEnabled ||
      formData.skinsConfig?.pot_type !== originalData.skinsConfig?.pot_type ||
      formData.skinsConfig?.pot_value !== originalData.skinsConfig?.pot_value ||
      formData.skinsConfig?.scoring_type !== originalData.skinsConfig?.scoring_type ||
      formData.skinsPoolSource !== originalData.skinsPoolSource;

    return (
      formData.date !== originalData.date ||
      formData.teeTime !== originalData.teeTime ||
      formData.gameType !== originalData.gameType ||
      formData.selectedTee?.name !== originalData.selectedTee?.name ||
      formData.scoringPairsRequired !== originalData.scoringPairsRequired ||
      formData.courseId !== originalData.courseId ||
      skinsChanged
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

  // Pool source handler (Phase 2)
  const setPoolSource = useCallback((source: SkinsPoolSource) => {
    setFormData((prev) => ({ ...prev, skinsPoolSource: source }));
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
    setDate,
    setTeeTime,
    clearTeeTime,
    setGameType,
    setSelectedTee,
    setScoringPairsRequired,
    setCourse,
    setSkinsEnabled,
    setSkinsConfig,
    setPoolSource,
    poolData,
    isLoadingPool,
    getSelectedDate,
    getSelectedTime,
  };
}
