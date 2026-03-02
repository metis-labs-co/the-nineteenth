/**
 * Skins Hooks - useProcessSkinsIfNeeded
 *
 * Hook to process skins results when a hole is completed.
 * Handles both individual and team skins, detecting the format
 * from the round configuration.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import {
  prepareHoleScores,
  validateHoleScores,
} from '@/utils/skinsCalculations';
import { useProcessSkinsHole, useProcessTeamSkinsHole } from './mutations';
import { processTeamSkins } from './teamSkinsProcessor';
import type { ProcessSkinsResult } from './types';
import type { SkinsGame } from '@/types/database/skins.types';
import type { TeamFormat } from '@/types/database/enums';

// =====================================================
// LOCAL DB ROW TYPES
// =====================================================

/** Row shape returned from skins_games table queries */
type SkinsGameRow = SkinsGame;

/** Row shape for rounds with team fields */
interface RoundTeamRow {
  is_team_round?: boolean;
  team_format?: TeamFormat | null;
  team_config?: {
    teams?: { id: string; name: string; memberIds: string[] }[];
  } | null;
}

/** Row shape for player queries */
interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
}

// =====================================================
// INPUT TYPE
// =====================================================

/**
 * Input for processing skins after score entry
 */
interface ProcessSkinsInput {
  roundId: string;
  holeNumber: number;
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>;
  hole: { par: number; strokeIndex: number };
}

/**
 * Hook to process skins results when a hole is completed
 */
export function useProcessSkinsIfNeeded() {
  const processSkinsHoleMutation = useProcessSkinsHole();
  const processTeamSkinsHoleMutation = useProcessTeamSkinsHole();
  const [isProcessing, setIsProcessing] = useState(false);

  const processSkinsHole = useCallback(
    async (input: ProcessSkinsInput): Promise<ProcessSkinsResult> => {
      const { roundId, holeNumber, scorecards, hole } = input;

      try {
        setIsProcessing(true);

        // 1. Fetch active skins game for this round
        const { data: rawSkinsGame, error: gameError } = await supabase
          .from('skins_games')
          .select('*')
          .eq('round_id', roundId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const skinsGame = rawSkinsGame as unknown as SkinsGameRow | null;

        if (gameError || !skinsGame) {
          return { processed: false };
        }

        // 2. Determine if this should be treated as team skins
        let shouldProcessAsTeamSkins = skinsGame.is_team_skins;

        if (!shouldProcessAsTeamSkins) {
          const { data: rawRound } = await supabase
            .from('rounds')
            .select('is_team_round, team_format, team_config')
            .eq('id', roundId)
            .single();

          const round = rawRound as unknown as RoundTeamRow | null;

          const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];
          const hasTeamFormat = round?.team_format && TEAM_GAME_TYPES.includes(round.team_format);
          const hasTeamConfig = round?.team_config && typeof round.team_config === 'object' &&
            round.team_config?.teams?.length;
          const isTeamRound = round?.is_team_round || hasTeamFormat || hasTeamConfig;

          if (isTeamRound && hasTeamFormat) {
            shouldProcessAsTeamSkins = true;

            await supabase
              .from('skins_games')
              .update({ is_team_skins: true } as never)
              .eq('id', skinsGame.id);

            skinsGame.is_team_skins = true;
          }
        }

        // 3. Process as team skins if applicable
        if (shouldProcessAsTeamSkins) {
          const teamResult = await processTeamSkins(
            skinsGame,
            roundId,
            holeNumber,
            scorecards,
            hole,
            processTeamSkinsHoleMutation
          );
          return teamResult;
        }

        // INDIVIDUAL SKINS PROCESSING
        const { data: rawPlayers } = await supabase
          .from('players')
          .select('id, name, handicap')
          .in('id', skinsGame.participant_ids);

        const players = (rawPlayers ?? []) as unknown as PlayerRow[];

        if (players.length === 0) {
          console.warn('[useProcessSkinsIfNeeded] No participants found');
          return { processed: false, error: 'No participants found' };
        }

        const participants = players.map((p) => ({
          id: p.id,
          name: p.name,
          handicap: p.handicap,
        }));

        const holeScores = prepareHoleScores(
          participants.map((p) => ({ id: p.id, handicap: p.handicap })),
          scorecards,
          hole as { par: 3 | 4 | 5; strokeIndex: number },
          holeNumber
        );

        const { isValid, missingPlayerIds: _missingPlayerIds } = validateHoleScores(
          holeScores,
          skinsGame.participant_ids
        );

        if (!isValid) {
          return { processed: false };
        }

        const result = await processSkinsHoleMutation.mutateAsync({
          skinsGameId: skinsGame.id,
          holeNumber,
          holeScores,
        });

        if (result.is_carryover) {
          return {
            processed: true,
            hasWinner: false,
            carryoverAmount: result.carryover_to_next,
          };
        } else if (result.winner_id) {
          const winner = participants.find((p) => p.id === result.winner_id);
          return {
            processed: true,
            hasWinner: true,
            winnerName: winner?.name ?? 'Unknown',
            winningsAmount: result.payout_amount,
          };
        }

        return { processed: true };
      } catch (error) {
        console.error('[useProcessSkinsIfNeeded] Error processing skins:', error);
        return {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [processSkinsHoleMutation, processTeamSkinsHoleMutation]
  );

  return {
    processSkinsHole,
    isProcessing,
  };
}
