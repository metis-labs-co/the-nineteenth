/**
 * Hook for managing EditRoundScreen form state
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { GameType, TeeBox } from '@/types/database.types';
import type { RoundFormData, RoundWithCourse } from '../types';
import {
  parseISODate,
  formatDateAustralian,
  parseAustralianDate,
  parseTime,
} from '@/utils/formatting';

interface UseEditRoundFormOptions {
  round: RoundWithCourse | undefined;
}

interface UseEditRoundFormReturn {
  formData: RoundFormData;
  originalData: RoundFormData | null;
  isDirty: boolean;
  availableTees: TeeBox[];

  // Form field handlers
  setDate: (date: string) => void;
  setTeeTime: (time: string) => void;
  clearTeeTime: () => void;
  setGameType: (gameType: GameType) => void;
  setSelectedTee: (tee: TeeBox) => void;
  setScoringPairsRequired: (value: boolean) => void;

  // Date/time picker helpers
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
}

/**
 * Manages form state for editing a round
 */
export function useEditRoundForm({
  round,
}: UseEditRoundFormOptions): UseEditRoundFormReturn {
  // Form state
  const [formData, setFormData] = useState<RoundFormData>({
    date: '',
    teeTime: '',
    gameType: 'stableford',
    selectedTee: null,
    scoringPairsRequired: false,
  });

  // Original values for dirty check
  const [originalData, setOriginalData] = useState<RoundFormData | null>(null);

  // Populate form when data loads
  useEffect(() => {
    if (round) {
      const parsedDate = parseISODate(round.date);
      const data: RoundFormData = {
        date: parsedDate ? formatDateAustralian(parsedDate) : '',
        teeTime: round.tee_time || '',
        gameType: round.game_type,
        selectedTee: round.selected_tee,
        scoringPairsRequired: round.scoring_pairs_required,
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [round]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!originalData) return false;
    return (
      formData.date !== originalData.date ||
      formData.teeTime !== originalData.teeTime ||
      formData.gameType !== originalData.gameType ||
      formData.selectedTee?.name !== originalData.selectedTee?.name ||
      formData.scoringPairsRequired !== originalData.scoringPairsRequired
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
    setDate,
    setTeeTime,
    clearTeeTime,
    setGameType,
    setSelectedTee,
    setScoringPairsRequired,
    getSelectedDate,
    getSelectedTime,
  };
}
