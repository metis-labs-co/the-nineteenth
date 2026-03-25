/**
 * useRoundFinalization - Async functions for updating round status and finalizing results
 */

import { useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import { finalizeRound } from '@/services/rounds/roundResultsService';
import { submitLogger } from '@/utils/debugLogger';
import type { Scorecard, GameType, PointSystemConfig } from '@/types/database.types';

export function useRoundFinalization() {
  const updateRoundStatus = useCallback(async (roundId: string): Promise<void> => {
    try {
      submitLogger.info('Updating round status to completed', { roundId: roundId.substring(0, 8) + '...' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', roundId);

      if (error) {
        submitLogger.error('Failed to update round status', error, { roundId: roundId.substring(0, 8) + '...' });
        throw error;
      }

      submitLogger.info('Round status updated successfully', { roundId: roundId.substring(0, 8) + '...' });
    } catch (error) {
      submitLogger.error('Error updating round status', error);
    }
  }, []);

  const finalizeRoundResults = useCallback(async (roundId: string): Promise<void> => {
    try {
      submitLogger.info('Finalizing round results', { roundId: roundId.substring(0, 8) + '...' });

      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .select('game_type, competition_id')
        .eq('id', roundId)
        .single() as unknown as { data: { game_type: string; competition_id: string | null } | null; error: PostgrestError | null };

      if (roundError || !round) {
        submitLogger.error('Failed to fetch round data for finalization', roundError, { roundId: roundId.substring(0, 8) + '...' });
        return;
      }

      if (!round.competition_id) {
        submitLogger.warn('Round has no competition_id, skipping finalization');
        return;
      }

      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('point_system')
        .eq('id', round.competition_id)
        .single() as unknown as { data: { point_system: PointSystemConfig | null } | null; error: PostgrestError | null };

      if (compError || !competition) {
        submitLogger.error('Failed to fetch competition for finalization', compError, { competitionId: round.competition_id?.substring(0, 8) + '...' });
        return;
      }

      const { data: scorecards, error: scError } = await supabase
        .from('scorecards')
        .select('*')
        .eq('round_id', roundId)
        .eq('status', 'completed') as unknown as { data: Scorecard[] | null; error: PostgrestError | null };

      if (scError || !scorecards || scorecards.length === 0) {
        submitLogger.warn('No completed scorecards found for finalization', { roundId: roundId.substring(0, 8) + '...' });
        return;
      }

      const pointSystem: PointSystemConfig = competition.point_system || {
        type: 'position',
        rules: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1, 'default': 1 },
      };

      const gameType = round.game_type as GameType;

      submitLogger.info('Calling finalizeRound', {
        roundId: roundId.substring(0, 8) + '...',
        gameType,
        scorecardCount: scorecards.length,
        pointSystemType: pointSystem.type,
      });

      await finalizeRound(roundId, scorecards, gameType, pointSystem);

      submitLogger.info('Round results finalized successfully', { roundId: roundId.substring(0, 8) + '...' });
    } catch (error) {
      submitLogger.error('Error finalizing round results', error, { roundId: roundId.substring(0, 8) + '...' });
    }
  }, []);

  return { updateRoundStatus, finalizeRoundResults };
}
