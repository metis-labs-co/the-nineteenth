/**
 * useScoreReview - Hook for managing review state, data transformation, and validation
 */

import { useMemo, useCallback, useState } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { generateDefaultHoles } from '@/utils/scorecardCalculations';
import { isSingleBallScore } from '@/types/database/base';
import type { ScorecardTablePlayer } from '@/components/scorecard';
import type { Hole, Player, Scorecard, GameType, HoleScore, MultiBallHoleScore } from '@/types/index';

export interface IncompleteHole {
  holeNumber: number;
  missingPlayers: { id: string; name: string }[];
}

interface UseScoreReviewParams {
  routeHoles?: Hole[];
}

interface UseScoreReviewReturn {
  // Data
  holes: Hole[];
  tablePlayerData: ScorecardTablePlayer[];
  currentPlayers: Player[];
  groupScorecards: Map<string, Scorecard>;
  currentRoundId: string | null;
  gameType: GameType;
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;

  // Validation
  incompleteHoles: IncompleteHole[];
  showIncompleteModal: boolean;
  setShowIncompleteModal: (show: boolean) => void;
  validateScores: () => IncompleteHole[];

  // Actions
  setCurrentHole: (hole: number) => void;
  resetRound: () => void;
  submitScorecards: () => Promise<void>;
}

export function useScoreReview({ routeHoles }: UseScoreReviewParams): UseScoreReviewReturn {
  const {
    currentRoundId,
    currentPlayers,
    groupScorecards,
    holes: storeHoles,
    gameType,
    getPlayerScore,
    submitScorecards,
    resetRound,
    setCurrentHole,
  } = useScorecardStore();

  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteHoles, setIncompleteHoles] = useState<IncompleteHole[]>([]);

  // Get course holes from store, route params, or use defaults
  const holes: Hole[] = useMemo(() => {
    if (storeHoles && storeHoles.length > 0) {
      return storeHoles;
    }
    if (routeHoles) {
      return routeHoles;
    }
    return generateDefaultHoles();
  }, [storeHoles, routeHoles]);

  // Convert store data to ScorecardTablePlayer format
  const tablePlayerData: ScorecardTablePlayer[] = useMemo(() => {
    return currentPlayers.map((player) => {
      const scorecard = groupScorecards.get(player.id);
      return {
        id: player.id,
        playerId: player.id,
        player: player,
        scores: scorecard?.scores || null,
        hasScorecard: !!scorecard,
      };
    });
  }, [currentPlayers, groupScorecards]);

  // Validate that all scores are entered for all players on all holes
  const validateScores = useCallback((): IncompleteHole[] => {
    const incomplete: IncompleteHole[] = [];

    for (const hole of holes) {
      const missingPlayers: { id: string; name: string }[] = [];

      for (const player of currentPlayers) {
        const scorecard = groupScorecards.get(player.id);
        const rawScore = scorecard?.scores[hole.number];
        // Get strokes from single-ball or first ball of multi-ball
        const strokes = rawScore && isSingleBallScore(rawScore)
          ? rawScore.strokes
          : rawScore?.balls?.[0]?.strokes;

        if (!strokes || strokes === 0) {
          missingPlayers.push({ id: player.id, name: player.name });
        }
      }

      if (missingPlayers.length > 0) {
        incomplete.push({
          holeNumber: hole.number,
          missingPlayers,
        });
      }
    }

    setIncompleteHoles(incomplete);
    return incomplete;
  }, [holes, currentPlayers, groupScorecards]);

  return {
    // Data
    holes,
    tablePlayerData,
    currentPlayers,
    groupScorecards,
    currentRoundId,
    gameType,
    getPlayerScore,

    // Validation
    incompleteHoles,
    showIncompleteModal,
    setShowIncompleteModal,
    validateScores,

    // Actions
    setCurrentHole,
    resetRound,
    submitScorecards,
  };
}
