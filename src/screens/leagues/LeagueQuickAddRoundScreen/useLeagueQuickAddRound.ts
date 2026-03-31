/**
 * useLeagueQuickAddRound - State and logic for the League Quick Add Round wizard
 *
 * Steps: Select Player → Select Course → Select Tee → Enter Scores → Review
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { useLeaguePlayers } from '@/hooks/useLeagues';
import { useQuickScoreSubmit } from '@/hooks/scorecard/useQuickScoreSubmit';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';
import type { Hole, TeeBox } from '@/types/database.types';

export type WizardStep = 'player' | 'course' | 'tee' | 'scores' | 'review';

/** Course data stored directly from the club search result (includes tees and holes) */
interface SelectedCourseData {
  courseId: string;
  courseName: string;
  clubName: string;
  holes: Hole[];
  tees: TeeBox[];
}

interface UseLeagueQuickAddRoundParams {
  leagueId: string;
}

export function useLeagueQuickAddRound({ leagueId }: UseLeagueQuickAddRoundParams) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const submitScorecard = useQuickScoreSubmit();
  const { showAlert, dialogConfig, dismissDialog } = useConfirmationDialog();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('player');
  const [selectedPlayer, setSelectedPlayer] = useState<ScorecardPlayerInfo | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseData | null>(null);
  const [selectedTee, setSelectedTee] = useState<TeeBox | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [roundDate, setRoundDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const { data: players } = useLeaguePlayers(leagueId);

  // Holes and tees come from the selected course (embedded in search results)
  const holes: Hole[] = useMemo(() => selectedCourse?.holes ?? [], [selectedCourse?.holes]);
  const tees: TeeBox[] = useMemo(() => selectedCourse?.tees ?? [], [selectedCourse?.tees]);

  // Calculate daily handicap
  const dailyHandicap = useMemo(() => {
    if (!selectedPlayer || !selectedTee?.slopeRating || !selectedTee?.courseRating) return 0;
    const baseHandicap = getBaseHandicap(selectedPlayer, 'profile');
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
    if (coursePar <= 0) return baseHandicap;
    const result = calculateGADailyHandicap({
      gaHandicap: baseHandicap,
      slopeRating: selectedTee.slopeRating,
      courseRating: selectedTee.courseRating,
      par: coursePar,
      gender: selectedPlayer.gender,
    });
    return result.dailyHandicap;
  }, [selectedPlayer, selectedTee, holes]);

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

  // Handicap differential
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

  // Navigation
  const goToStep = useCallback((nextStep: WizardStep) => setStep(nextStep), []);

  const handleSelectPlayer = useCallback((player: ScorecardPlayerInfo) => {
    setSelectedPlayer(player);
    setStep('course');
  }, []);

  /** Called from the screen when a course is selected from club search results */
  const handleSelectCourse = useCallback((courseData: SelectedCourseData) => {
    setSelectedCourse(courseData);
    setSelectedTee(null);
    setScores({});
    setStep('tee');
  }, []);

  const handleSelectTee = useCallback((tee: TeeBox) => {
    if (!tee.courseRating || !tee.slopeRating) {
      showAlert(
        'Missing Ratings',
        'This tee does not have Course Rating or Slope Rating data. Please select a different tee with complete ratings for league rounds.'
      );
      return;
    }
    setSelectedTee(tee);
    setScores({});
    setStep('scores');
  }, []);

  const handleGoToReview = useCallback(() => {
    if (totals.holesEntered === 0) {
      showAlert('No Scores', 'Please enter at least one hole score.');
      return;
    }
    setStep('review');
  }, [totals.holesEntered]);

  // Save: create round + scorecard + league tag
  const handleConfirmSave = useCallback(async () => {
    if (!selectedPlayer || !selectedCourse || !selectedTee) return;
    setIsSaving(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');

      // 1. Create standalone round
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { data: roundData, error: roundError } = await (supabase.from('rounds') as any)
        .insert({
          course_id: selectedCourse.courseId,
          user_id: currentUser.id,
          competition_id: null,
          round_number: 1,
          date: roundDate,
          game_type: 'stableford',
          status: 'completed',
          selected_tee: selectedTee,
          scoring_pairs_required: false,
          ball_count: 1,
          is_team_round: false,
          team_format: null,
          nine_type: 'full',
          handicap_source: 'profile',
        })
        .select('id')
        .single();

      if (roundError) throw new Error(`Failed to create round: ${roundError.message}`);
      const roundId = roundData.id;

      // 2. Create scorecard via the submit hook
      const dbScores: Record<string, { strokes: number }> = {};
      for (const [holeNum, strokes] of Object.entries(scores)) {
        if (strokes > 0) {
          dbScores[holeNum] = { strokes };
        }
      }

      await submitScorecard.mutateAsync({
        roundId,
        playerId: selectedPlayer.id,
        scores: dbScores,
        totalGross: totals.totalGross,
        totalNet: totals.totalNet,
        totalPoints: totals.totalPoints,
        player: selectedPlayer,
        selectedTee,
        holes,
        handicapSource: 'profile',
      });

      // 3. Get scorecard ID for league tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { data: scData } = await (supabase.from('scorecards') as any)
        .select('id')
        .eq('round_id', roundId)
        .eq('player_id', selectedPlayer.id)
        .single();

      if (!scData?.id) throw new Error('Scorecard not found after creation');

      // 4. Calculate differential at save time (ensures fresh values)
      let differential = handicapDifferential;
      if (differential == null && selectedTee?.courseRating && selectedTee?.slopeRating && totals.totalGross > 0) {
        differential = calculateScoreDifferential({
          adjustedGrossScore: totals.totalGross,
          courseRating: selectedTee.courseRating,
          slopeRating: selectedTee.slopeRating,
        });
      }
      if (differential == null) {
        throw new Error('Cannot tag to league: the selected tee is missing Course Rating or Slope Rating. Please select a tee with complete rating data.');
      }

      // 5. Tag to league
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { error: tagError } = await (supabase.from('league_rounds') as any)
        .insert({
          league_id: leagueId,
          scorecard_id: scData.id,
          player_id: selectedPlayer.id,
          handicap_differential: differential,
        });

      if (tagError) throw new Error(`Failed to tag to league: ${tagError.message}`);

      // Invalidate league caches
      queryClient.invalidateQueries({ queryKey: ['league'] });
      queryClient.invalidateQueries({ queryKey: ['leagueLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['leagueRounds'] });
      queryClient.invalidateQueries({ queryKey: ['myLeagueRounds'] });

      navigation.goBack();
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to save round');
    } finally {
      setIsSaving(false);
    }
  }, [selectedPlayer, selectedCourse, selectedTee, scores, totals, roundDate, handicapDifferential, leagueId, holes, submitScorecard, queryClient, navigation]);

  return {
    // Wizard
    step,
    goToStep,

    // Player selection
    players,
    selectedPlayer,
    handleSelectPlayer,

    // Course selection
    selectedCourse,
    handleSelectCourse,

    // Tee selection
    tees,
    selectedTee,
    handleSelectTee,

    // Score entry
    holes,
    scores,
    holePoints,
    totals,
    dailyHandicap,
    handicapDifferential,
    incrementScore,
    decrementScore,
    handleGoToReview,

    // Date
    roundDate,
    setRoundDate,

    // Save
    handleConfirmSave,
    isSaving,

    // Dialog
    dialogConfig,
    dismissDialog,
  };
}
