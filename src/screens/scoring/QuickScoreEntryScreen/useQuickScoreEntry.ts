/**
 * useQuickScoreEntry - State and logic for QuickScoreEntryScreen
 *
 * Manages score state, calculates totals, and handles save flow.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import { useQuickScoreSubmit } from '@/hooks/scorecard/useQuickScoreSubmit';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';
import type { Hole, TeeBox } from '@/types/database.types';
import type { HandicapSource } from '@/types/database/enums';

interface UseQuickScoreEntryParams {
  roundId: string;
  playerId: string;
}

export function useQuickScoreEntry({ roundId, playerId }: UseQuickScoreEntryParams) {
  const navigation = useNavigation();
  const { data: roundData, isLoading } = useRoundDetails(roundId);
  const submitMutation = useQuickScoreSubmit();

  // Score state: { "1": 4, "2": 5, ... }
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showReview, setShowReview] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Extract round data
  const round = roundData?.round;
  const course = round?.course;
  const allHoles: Hole[] = useMemo(() => {
    if (!course?.holes || !Array.isArray(course.holes)) return [];
    return course.holes as Hole[];
  }, [course?.holes]);

  const selectedTee: TeeBox | null = round?.selected_tee ?? null;
  const nineType = round?.nine_type ?? 'full';
  const handicapSource: HandicapSource = round?.handicap_source ?? 'profile';

  // Filter holes based on nine_type
  const holes: Hole[] = useMemo(() => {
    if (nineType === 'front9') return allHoles.filter((h) => h.number <= 9);
    if (nineType === 'back9') return allHoles.filter((h) => h.number > 9);
    return allHoles;
  }, [allHoles, nineType]);

  const totalHoles = holes.length;

  // Find the target player from scorecards or round_players
  const player: ScorecardPlayerInfo | null = useMemo(() => {
    if (!roundData) return null;
    // Check scorecards first
    const sc = roundData.scorecards?.find((s: any) => s.player_id === playerId);
    if (sc?.player) {
      return {
        id: sc.player.id,
        name: sc.player.name,
        handicap: sc.player.handicap,
        handicap_index: (sc.player as any).handicap_index ?? null,
        gender: (sc.player as any).gender ?? null,
      };
    }
    // Check round_players
    const rp = roundData.roundPlayers?.find((p: any) => p.id === playerId || p.player_id === playerId);
    if (rp) {
      return {
        id: (rp as any).player_id ?? rp.id,
        name: (rp as any).name ?? 'Player',
        handicap: (rp as any).handicap ?? null,
        handicap_index: (rp as any).handicap_index ?? null,
        gender: (rp as any).gender ?? null,
      };
    }
    return null;
  }, [roundData, playerId]);

  // Pre-populate from existing scorecard
  const existingScorecard = useMemo(() => {
    return roundData?.scorecards?.find((s: any) => s.player_id === playerId);
  }, [roundData?.scorecards, playerId]);

  // Initialize scores from existing scorecard on first load
  useEffect(() => {
    if (existingScorecard?.scores && !initialized) {
      const existing: Record<string, number> = {};
      for (const [holeNum, score] of Object.entries(existingScorecard.scores)) {
        if (score && typeof score === 'object' && 'strokes' in score && (score as any).strokes > 0) {
          existing[holeNum] = (score as any).strokes;
        }
      }
      if (Object.keys(existing).length > 0) {
        setScores(existing);
      }
      setInitialized(true);
    }
  }, [existingScorecard?.scores, initialized]);

  // Calculate daily handicap
  const dailyHandicap = useMemo(() => {
    if (!player || handicapSource === 'none') return 0;
    const baseHandicap = getBaseHandicap(player, handicapSource);
    if (!selectedTee?.slopeRating || !selectedTee?.courseRating) return baseHandicap;
    const coursePar = allHoles.reduce((sum, h) => sum + h.par, 0);
    if (coursePar <= 0) return baseHandicap;
    const result = calculateGADailyHandicap({
      gaHandicap: baseHandicap,
      slopeRating: selectedTee.slopeRating,
      courseRating: selectedTee.courseRating,
      par: coursePar,
      gender: player.gender,
    });
    return result.dailyHandicap;
  }, [player, handicapSource, selectedTee, allHoles]);

  // Calculate per-hole stableford points
  const holePoints = useMemo(() => {
    const points: Record<string, number> = {};
    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
        points[String(hole.number)] = calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      } else {
        points[String(hole.number)] = 0;
      }
    });
    return points;
  }, [scores, holes, dailyHandicap]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalPoints = 0;
    let holesEntered = 0;

    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        totalGross += strokes;
        totalPoints += holePoints[String(hole.number)] ?? 0;
        holesEntered++;
      }
    });

    const totalNet = totalGross > 0 ? totalGross - dailyHandicap : 0;

    return { totalGross, totalNet, totalPoints, holesEntered };
  }, [scores, holes, holePoints, dailyHandicap]);

  // Handicap differential for review
  const handicapDifferential = useMemo(() => {
    if (!selectedTee?.courseRating || !selectedTee?.slopeRating || totals.totalGross <= 0) return null;
    return calculateScoreDifferential({
      adjustedGrossScore: totals.totalGross,
      courseRating: selectedTee.courseRating,
      slopeRating: selectedTee.slopeRating,
    });
  }, [selectedTee, totals.totalGross]);

  // Score manipulation
  const incrementScore = useCallback((holeNumber: number) => {
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current !== undefined && current >= 12) return prev;
      return { ...prev, [key]: (current ?? 0) + 1 };
    });
  }, []);

  const decrementScore = useCallback((holeNumber: number) => {
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current === undefined || current <= 1) return prev;
      return { ...prev, [key]: current - 1 };
    });
  }, []);

  // Save
  const handleSave = useCallback(() => {
    if (totals.holesEntered === 0) {
      Alert.alert('No Scores', 'Please enter at least one hole score before saving.');
      return;
    }
    setShowReview(true);
  }, [totals.holesEntered]);

  const handleConfirmSave = useCallback(async () => {
    if (!player) return;

    // Build scores in database format
    const dbScores: Record<string, { strokes: number }> = {};
    for (const [holeNum, strokes] of Object.entries(scores)) {
      if (strokes > 0) {
        dbScores[holeNum] = { strokes };
      }
    }

    try {
      await submitMutation.mutateAsync({
        roundId,
        playerId,
        scores: dbScores,
        totalGross: totals.totalGross,
        totalNet: totals.totalNet,
        totalPoints: totals.totalPoints,
        player,
        selectedTee,
        holes: allHoles,
        handicapSource,
      });
      setShowReview(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save scores');
    }
  }, [player, scores, roundId, playerId, totals, selectedTee, allHoles, handicapSource, submitMutation, navigation]);

  return {
    // Data
    isLoading,
    round,
    course,
    holes,
    player,
    selectedTee,
    totalHoles,

    // Scores
    scores,
    holePoints,
    totals,
    handicapDifferential,
    dailyHandicap,

    // Actions
    incrementScore,
    decrementScore,
    handleSave,
    handleConfirmSave,

    // Review modal
    showReview,
    setShowReview,
    isSaving: submitMutation.isPending,
  };
}
