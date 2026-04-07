/**
 * useWolfIntegration - Wolf game state and handlers for scorecard entry
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useWolfGameByRound,
  useWolfCurrentHoleDecision,
  useSubmitWolfDecision,
  useRecordWolfHoleResult,
} from '@/hooks/wolf';
import { determineWolfForHole } from '@/utils/wolf';
import { scoringLogger } from '@/utils/debugLogger';

interface UseWolfIntegrationParams {
  roundId: string;
  currentHole: number;
  currentPlayers: { id: string }[];
  getPlayerScore: (playerId: string, holeNumber: number) => unknown;
}

export interface UseWolfIntegrationReturn {
  wolfGame: ReturnType<typeof useWolfGameByRound>['data'];
  wolfDecision: ReturnType<typeof useWolfCurrentHoleDecision>['data'];
  currentWolfId: string | null;
  currentWolfPlayer: { id: string; name: string } | undefined;
  otherWolfPlayers: { id: string; name: string }[];
  canSelectBlindWolf: boolean;
  showWolfDecisionModal: boolean;
  setShowWolfDecisionModal: (v: boolean) => void;
  handleWolfSelectPartner: (partnerId: string | null, isBlindWolf: boolean) => Promise<void>;
  isWolfProcessing: boolean;
}

export function useWolfIntegration({
  roundId,
  currentHole,
  currentPlayers,
  getPlayerScore,
}: UseWolfIntegrationParams): UseWolfIntegrationReturn {
  const [showWolfDecisionModal, setShowWolfDecisionModal] = useState(false);
  const { data: wolfGame } = useWolfGameByRound(roundId);
  const { data: wolfDecision, refetch: refetchWolfDecision } = useWolfCurrentHoleDecision(
    wolfGame?.id,
    currentHole
  );
  const submitWolfDecision = useSubmitWolfDecision();
  const recordWolfHoleResult = useRecordWolfHoleResult();

  const currentWolfId = wolfGame?.wolf_order
    ? determineWolfForHole(wolfGame.wolf_order, currentHole)
    : null;
  const currentWolfPlayer = wolfGame?.participants.find((p) => p.id === currentWolfId);
  const otherWolfPlayers = wolfGame?.participants.filter((p) => p.id !== currentWolfId) ?? [];

  const canSelectBlindWolf = useMemo(() => {
    if (!wolfGame || !currentPlayers.length) return true;
    for (const player of currentPlayers) {
      const score = getPlayerScore(player.id, currentHole);
      if (score && typeof score === 'object' && 'strokes' in score && (score as { strokes: number }).strokes > 0) {
        return false;
      }
    }
    return true;
  }, [wolfGame, currentPlayers, currentHole, getPlayerScore]);

  const handleWolfSelectPartner = useCallback(
    async (partnerId: string | null, isBlindWolf: boolean) => {
      if (!wolfGame) return;

      try {
        await submitWolfDecision.mutateAsync({
          wolf_game_id: wolfGame.id,
          hole_number: currentHole,
          is_blind_wolf: isBlindWolf,
          partner_id: partnerId,
        });
        setShowWolfDecisionModal(false);
        refetchWolfDecision();
        scoringLogger.info('WOLF: Decision submitted', {
          hole: currentHole,
          isBlindWolf,
          partnerId: partnerId?.substring(0, 8) ?? 'lone',
        });
      } catch (error) {
        scoringLogger.error('WOLF: Failed to submit decision', { error });
      }
    },
    [wolfGame, currentHole, submitWolfDecision, refetchWolfDecision]
  );

  // Wolf result processing - called after scores are complete
  const processWolfHoleResult = useCallback(async () => {
    if (!wolfGame || !wolfDecision?.decided_at || wolfDecision.calculated_at) return;

    const allHaveScores = wolfGame.participant_ids.every((playerId) => {
      const score = getPlayerScore(playerId, currentHole);
      return score && typeof score === 'object' && 'strokes' in score && (score as { strokes: number }).strokes > 0;
    });

    if (!allHaveScores) return;

    const holeScores: Record<string, number> = {};
    for (const playerId of wolfGame.participant_ids) {
      const score = getPlayerScore(playerId, currentHole);
      if (score && typeof score === 'object' && 'strokes' in score) {
        holeScores[playerId] = (score as { strokes: number }).strokes;
      }
    }

    try {
      await recordWolfHoleResult.mutateAsync({
        wolf_game_id: wolfGame.id,
        hole_number: currentHole,
        hole_scores: holeScores,
      });
      refetchWolfDecision();
      scoringLogger.info('WOLF: Hole result calculated', {
        hole: currentHole,
        scores: holeScores,
      });
    } catch (error) {
      scoringLogger.error('WOLF: Failed to calculate result', { error });
    }
  }, [wolfGame, wolfDecision, currentHole, getPlayerScore, recordWolfHoleResult, refetchWolfDecision]);

  // Process Wolf result when scores are complete
  useEffect(() => {
    if (wolfGame && wolfDecision?.decided_at && !wolfDecision.calculated_at) {
      processWolfHoleResult();
    }
  }, [wolfGame, wolfDecision, processWolfHoleResult]);

  return {
    wolfGame,
    wolfDecision,
    currentWolfId,
    currentWolfPlayer,
    otherWolfPlayers,
    canSelectBlindWolf,
    showWolfDecisionModal,
    setShowWolfDecisionModal,
    handleWolfSelectPartner,
    isWolfProcessing: submitWolfDecision.isPending || recordWolfHoleResult.isPending,
  };
}
