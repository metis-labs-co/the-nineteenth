/**
 * useQuickScoreEntry - State and logic for QuickScoreEntryScreen
 *
 * Manages score state, calculates totals, and handles save flow.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import {
  useQuickScoreSubmit,
  type QuickScoreSubmitInput,
} from '@/hooks/scorecard/useQuickScoreSubmit';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  getEffectiveGrossStrokes,
} from '@/utils/scoring';
import { calculateGADailyHandicap, calculateNineAwareDailyHandicap } from '@/utils/dailyHandicap';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { calculateAdjustedGrossScore } from '@/utils/adjustedGross';
import { isCompleteForHandicap } from '@/utils/handicapEligibility';
import {
  calculateNetOverHolesPlayed,
  getBaseHandicap,
  type ScorecardPlayerInfo,
} from '@/utils/scorecardCalculations';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import { ScorecardConflictError } from '@/services/offline/sync/scorecardSync';
import type { Hole, TeeBox } from '@/types/database.types';
import type { HandicapSource } from '@/types/database/enums';

interface UseQuickScoreEntryParams {
  roundId: string;
  playerId: string;
}

export function useQuickScoreEntry({ roundId, playerId }: UseQuickScoreEntryParams) {
  const navigation = useNavigation();
  const { data: round, isLoading: isLoadingRound } = useRoundDetails(roundId);
  const { data: scorecards, isLoading: isLoadingScorecards } = useRoundScorecards(roundId);
  const { data: roundPlayers, isLoading: isLoadingPlayers } = useRoundPlayers(roundId);
  const submitMutation = useQuickScoreSubmit();
  const { showAlert, dialogConfig, dismissDialog } = useConfirmationDialog();

  const isLoading = isLoadingRound || isLoadingScorecards || isLoadingPlayers;

  // Score state: { "1": 4, "2": 5, ... }
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showReview, setShowReview] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const currentDraft = useRef<QuickScoreSubmitInput | null>(null);
  const requestGeneration = useRef(0);
  const editGeneration = useRef(0);
  useEffect(() => {
    requestGeneration.current++;
    editGeneration.current++;
    setScores({});
    setInitialized(false);
    setShowReview(false);
  }, [roundId, playerId]);
  useEffect(
    () => () => {
      requestGeneration.current++;
      currentDraft.current = null;
    },
    []
  );

  // Extract round data
  const course = round?.course;
  const allHoles: Hole[] = useMemo(() => {
    if (!course?.holes || !Array.isArray(course.holes)) return [];
    return course.holes as Hole[];
  }, [course?.holes]);

  const selectedTee: TeeBox | null = round?.selected_tee ?? null;
  const nineType = round?.nine_type ?? 'full';
  const holesPlayed = round?.holes_played ?? null;
  const handicapSource: HandicapSource =
    round?.handicap_source ?? round?.competition?.handicap_source ?? 'profile';

  // Filter holes based on nine_type
  const plannedHoles: Hole[] = useMemo(() => {
    if (nineType === 'front9') return allHoles.filter((h) => h.number <= 9);
    if (nineType === 'back9') return allHoles.filter((h) => h.number > 9);
    return allHoles;
  }, [allHoles, nineType]);
  const holes = useMemo(
    () =>
      holesPlayed == null ? plannedHoles : filterPlayableHoles(plannedHoles, nineType, holesPlayed),
    [plannedHoles, nineType, holesPlayed]
  );

  const totalHoles = holes.length;

  // Find the target player from scorecards or round_players
  const player: ScorecardPlayerInfo | null = useMemo(() => {
    // Check scorecards first
    const sc = scorecards?.find((s) => s.player_id === playerId);
    if (sc?.player) {
      return {
        id: sc.player.id,
        name: sc.player.name,
        handicap: sc.player.handicap,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Player type may not include these fields
        handicap_index: (sc.player as any).handicap_index ?? null,
        gender: (sc.player as any).gender ?? null, // eslint-disable-line @typescript-eslint/no-explicit-any
      };
    }
    // Check round_players
    const rp = roundPlayers?.find((p) => p.id === playerId);
    if (rp) {
      return {
        id: rp.id,
        name: rp.name,
        handicap: rp.handicap ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RoundPlayer type may not include these fields
        handicap_index: (rp as any).handicap_index ?? null,
        gender: (rp as any).gender ?? null, // eslint-disable-line @typescript-eslint/no-explicit-any
      };
    }
    return null;
  }, [scorecards, roundPlayers, playerId]);

  // Pre-populate from existing scorecard
  const existingScorecard = useMemo(() => {
    return scorecards?.find((s) => s.player_id === playerId);
  }, [scorecards, playerId]);

  // Initialize scores from existing scorecard on first load
  useEffect(() => {
    if (!isLoading && scorecards && !initialized) {
      const existing: Record<string, number> = {};
      for (const [holeNum, score] of Object.entries(existingScorecard?.scores ?? {})) {
        if (holesPlayed != null && !holes.some((hole) => String(hole.number) === holeNum)) continue;
        const holeScore = score as { strokes?: number } | null;
        if (holeScore && 'strokes' in holeScore && holeScore.strokes && holeScore.strokes > 0) {
          existing[holeNum] = holeScore.strokes;
        }
      }
      setScores(existing);
      setInitialized(true);
    }
  }, [existingScorecard?.scores, initialized, holesPlayed, holes, isLoading, scorecards]);

  // Calculate daily handicap
  const dailyHandicap = useMemo(() => {
    if (!player || handicapSource === 'none') return 0;
    const baseHandicap = getBaseHandicap(player, handicapSource);
    if (!selectedTee?.slopeRating || !selectedTee?.courseRating) return Math.round(baseHandicap);
    if (holesPlayed != null) {
      return calculateNineAwareDailyHandicap({
        gaHandicap: baseHandicap,
        nineType,
        par: plannedHoles.reduce((sum, h) => sum + h.par, 0),
        slopeRating: selectedTee.slopeRating,
        courseRating: selectedTee.courseRating,
        slopeRatingFront9: selectedTee.slopeRatingFront9,
        courseRatingFront9: selectedTee.courseRatingFront9,
        slopeRatingBack9: selectedTee.slopeRatingBack9,
        courseRatingBack9: selectedTee.courseRatingBack9,
        gender: player.gender,
      }).dailyHandicap;
    }
    const coursePar = allHoles.reduce((sum, h) => sum + h.par, 0);
    if (coursePar <= 0) return Math.round(baseHandicap);
    const result = calculateGADailyHandicap({
      gaHandicap: baseHandicap,
      slopeRating: selectedTee.slopeRating,
      courseRating: selectedTee.courseRating,
      par: coursePar,
      gender: player.gender,
    });
    return result.dailyHandicap;
  }, [player, handicapSource, selectedTee, allHoles, plannedHoles, nineType, holesPlayed]);

  // Calculate per-hole stableford points
  const holePoints = useMemo(() => {
    const points: Record<string, number> = {};
    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
        points[String(hole.number)] = calculateStablefordPointsNet(
          strokes,
          hole.par,
          strokesReceived
        );
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
        totalGross +=
          holesPlayed == null
            ? strokes
            : (getEffectiveGrossStrokes(
                strokes,
                hole.par,
                getStrokesReceived(dailyHandicap, hole.strokeIndex)
              ) ?? 0);
        totalPoints += holePoints[String(hole.number)] ?? 0;
        holesEntered++;
      }
    });

    const totalNet =
      holesPlayed == null
        ? totalGross > 0
          ? totalGross - dailyHandicap
          : 0
        : calculateNetOverHolesPlayed(
            Object.fromEntries(Object.entries(scores).map(([key, strokes]) => [key, { strokes }])),
            holes,
            dailyHandicap
          );

    return { totalGross, totalNet, totalPoints, holesEntered };
  }, [scores, holes, holePoints, dailyHandicap, holesPlayed]);

  // Handicap differential for review. Uses the WHS ADJUSTED gross (every hole
  // capped at net double bogey) so this preview matches what the submit path
  // persists — quick entry accepts up to 12 strokes on a hole, well above the
  // cap on most holes. Like the submit, no differential until the card scores
  // every planned hole of the round's nine (I12); the review modal hides the
  // stat when it is null.
  const handicapDifferential = useMemo(() => {
    if (holesPlayed != null) return null;
    if (!selectedTee?.courseRating || !selectedTee?.slopeRating || totals.totalGross <= 0)
      return null;
    if (!isCompleteForHandicap(scores, nineType)) return null;
    const { adjustedGross } = calculateAdjustedGrossScore({
      holes,
      scores,
      dailyHandicap,
    });
    return calculateScoreDifferential({
      adjustedGrossScore: adjustedGross > 0 ? adjustedGross : totals.totalGross,
      courseRating: selectedTee.courseRating,
      slopeRating: selectedTee.slopeRating,
    });
  }, [selectedTee, totals.totalGross, holes, scores, dailyHandicap, nineType, holesPlayed]);

  const dbScores = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(scores)
          .filter(
            ([key, strokes]) =>
              strokes > 0 && (holesPlayed == null || holes.some((h) => String(h.number) === key))
          )
          .map(([key, strokes]) => [key, { strokes }])
      ),
    [scores, holesPlayed, holes]
  );
  currentDraft.current = player
    ? {
        roundId,
        playerId,
        scores: dbScores,
        totalGross: totals.totalGross,
        totalNet: totals.totalNet,
        totalPoints: totals.totalPoints,
        player,
        selectedTee,
        holes: allHoles,
        nineType,
        handicapSource,
        expectedRoundShape: { nine_type: nineType, holes_played: holesPlayed },
        gameType: round?.game_type,
      }
    : null;

  // Score manipulation
  const incrementScore = useCallback((holeNumber: number) => {
    editGeneration.current++;
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current !== undefined && current >= 12) return prev;
      return { ...prev, [key]: (current ?? 0) + 1 };
    });
  }, []);

  const decrementScore = useCallback((holeNumber: number) => {
    editGeneration.current++;
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
      showAlert('No Scores', 'Please enter at least one hole score before saving.');
      return;
    }
    setShowReview(true);
  }, [totals.holesEntered, showAlert]);

  const handleConfirmSave = useCallback(async () => {
    const draft = currentDraft.current;
    if (!draft) return;
    const request = ++requestGeneration.current;
    const edits = editGeneration.current;
    const assertOperationCurrent = () => {
      if (
        requestGeneration.current !== request ||
        currentDraft.current?.roundId !== draft.roundId ||
        currentDraft.current?.playerId !== draft.playerId
      )
        throw new RoundScoringWriteError(
          'context_changed',
          draft.roundId,
          'Quick Score request changed'
        );
    };

    try {
      const saved = await submitMutation.mutateAsync({
        ...draft,
        assertOperationCurrent,
        readCurrent: () => {
          assertOperationCurrent();
          return currentDraft.current!;
        },
      });
      assertOperationCurrent();
      if (saved.isCurrent ? !saved.isCurrent() : editGeneration.current !== edits) return;
      setShowReview(false);
      navigation.goBack();
    } catch (error) {
      try {
        assertOperationCurrent();
      } catch {
        return;
      }
      if (editGeneration.current !== edits) return;
      if (error instanceof RoundScoringWriteError || error instanceof ScorecardConflictError) {
        setScores({});
        setInitialized(false);
      }
      setShowReview(false);
      showAlert('Error', error instanceof Error ? error.message : 'Failed to save scores');
    }
  }, [submitMutation, navigation, showAlert]);

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

    // Dialog
    dialogConfig,
    dismissDialog,
  };
}
