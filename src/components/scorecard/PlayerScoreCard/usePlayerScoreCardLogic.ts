/**
 * usePlayerScoreCardLogic Hook
 *
 * Manages score state, calculations, and event handlers
 * for the PlayerScoreCard component.
 */

import { useCallback, useMemo } from 'react';
import { getStrokesOnHole, calculateStablefordPointsNet } from '@/utils/scoring';
import type { Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { PICKUP_SCORE } from '@/constants/scoring';

// Re-export for backward compatibility
export { PICKUP_SCORE } from '@/constants/scoring';
export const MIN_SCORE = 1;
export const MAX_SCORE = 12;
export const MAX_PUTTS = 6;

interface UsePlayerScoreCardLogicProps {
  handicap: number;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onStatsUpdate?: (updates: Partial<HoleScore>) => void;
  disabled?: boolean;
}

export function usePlayerScoreCardLogic({
  handicap,
  currentHole,
  currentScore,
  onScoreSelect,
  onStatsUpdate,
  disabled = false,
}: UsePlayerScoreCardLogicProps) {
  // Narrow to single-ball score for accessing strokes
  const singleBallScore = currentScore && isSingleBallScore(currentScore) ? currentScore : undefined;
  const selectedScore = singleBallScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;
  const maxScoreBeforePickup = currentHole.par + 2;

  // Calculate strokes received on this hole
  const strokesOnHole = useMemo(
    () => getStrokesOnHole(handicap, currentHole),
    [handicap, currentHole]
  );

  // Calculate Stableford points for current score
  const stablefordPoints = useMemo(() => {
    if (!selectedScore || isPickedUp) return 0;
    return calculateStablefordPointsNet(selectedScore, currentHole.par, strokesOnHole);
  }, [selectedScore, currentHole.par, strokesOnHole, isPickedUp]);

  // Score handlers
  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(PICKUP_SCORE);
    }
  }, [disabled, onScoreSelect]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      // If currently picked up, go to max score (par + 2)
      if (isPickedUp) {
        onScoreSelect(maxScoreBeforePickup);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : currentHole.par;
        onScoreSelect(newScore);
      }
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp, maxScoreBeforePickup]);

  const handleIncrement = useCallback(() => {
    // Don't allow increment if picked up
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : currentHole.par;
      onScoreSelect(newScore);
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handleParSelect = useCallback(() => {
    if (!disabled) {
      onScoreSelect(currentHole.par);
    }
  }, [disabled, currentHole.par, onScoreSelect]);

  // Stats handlers
  const handleFairwayToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = singleBallScore?.fairwayHit === true ? false : true;
      // Auto-clear miss direction when toggling to "hit"
      if (newValue === true) {
        onStatsUpdate({ fairwayHit: true, fairwayMissDirection: undefined });
      } else {
        onStatsUpdate({ fairwayHit: false });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.fairwayHit]);

  const handleGIRToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = singleBallScore?.greenInRegulation === true ? false : true;
      // Auto-clear miss direction when toggling to "hit"
      if (newValue === true) {
        onStatsUpdate({ greenInRegulation: true, greenMissDirection: undefined });
      } else {
        onStatsUpdate({ greenInRegulation: false });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.greenInRegulation]);

  const handlePuttsDecrement = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const currentPutts = singleBallScore?.putts ?? 0;
      if (currentPutts > 0) {
        onStatsUpdate({ putts: currentPutts - 1 });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.putts]);

  const handlePuttsIncrement = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const currentPutts = singleBallScore?.putts ?? 0;
      if (currentPutts < MAX_PUTTS) {
        onStatsUpdate({ putts: currentPutts + 1 });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.putts]);

  const handleDetailedStatsUpdate = useCallback((updates: Partial<HoleScore>) => {
    if (!disabled && onStatsUpdate) {
      onStatsUpdate(updates);
    }
  }, [disabled, onStatsUpdate]);

  return {
    // Computed values
    selectedScore,
    isPickedUp,
    strokesOnHole,
    stablefordPoints,
    // Score handlers
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    // Stats handlers
    handleFairwayToggle,
    handleGIRToggle,
    handlePuttsDecrement,
    handlePuttsIncrement,
    handleDetailedStatsUpdate,
  };
}

export default usePlayerScoreCardLogic;
