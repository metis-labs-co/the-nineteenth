/**
 * Skins Hooks - useProcessSkinsIfNeeded
 *
 * Process skins results when a hole is completed.
 *
 * A round may have multiple active skins games at once: a round-wide game
 * (`sub_match_id IS NULL`) and any number of per-sub-match games. For each
 * active game we narrow the supplied scorecards to that game's participants
 * (or, for team games, that game's team members) and process the hole.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { fetchPlayerListByIds } from '@/services/api/players';
import {
  prepareHoleScores,
  validateHoleScores,
} from '@/utils/skins';
import { useProcessSkinsHole, useProcessTeamSkinsHole } from './mutations';
import { processTeamSkins } from './teamSkinsProcessor';
import type { ProcessSkinsResult } from './types';
import type { SkinsGame } from '@/types/database/skins.types';
import type { TeamFormat } from '@/types/database/enums';
import { TEAM_ONLY_GAME_TYPES } from '@/services/rounds/resultsEngine';

type SkinsGameRow = SkinsGame;

interface RoundTeamRow {
  is_team_round?: boolean;
  team_format?: TeamFormat | null;
  team_config?: {
    teams?: { id: string; name: string; memberIds: string[] }[];
  } | null;
}

interface ProcessSkinsInput {
  roundId: string;
  holeNumber: number;
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>;
  hole: { par: number; strokeIndex: number };
}

/**
 * Process a single individual-skins game for one hole.
 *
 * Returns a `ProcessSkinsResult` describing the outcome for this game, or
 * `null` when there's nothing to report (e.g. not enough participants have
 * scores yet for this hole).
 */
async function processIndividualGame(
  skinsGame: SkinsGameRow,
  holeNumber: number,
  scorecards: ProcessSkinsInput['scorecards'],
  hole: ProcessSkinsInput['hole'],
  processSkinsHoleMutation: ReturnType<typeof useProcessSkinsHole>
): Promise<ProcessSkinsResult | null> {
  const participants = await fetchPlayerListByIds(skinsGame.participant_ids);
  if (participants.length === 0) {
    return { processed: false, error: 'No participants found' };
  }

  const holeScores = prepareHoleScores(
    participants.map((p) => ({ id: p.id, handicap: p.handicap })),
    scorecards,
    hole as { par: 3 | 4 | 5; strokeIndex: number },
    holeNumber
  );

  const { isValid } = validateHoleScores(holeScores, skinsGame.participant_ids);

  if (!isValid) {
    return null;
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
  }

  if (result.winner_id) {
    const winner = participants.find((p) => p.id === result.winner_id);
    return {
      processed: true,
      hasWinner: true,
      winnerName: winner?.name ?? 'Unknown',
      winningsAmount: result.payout_amount,
    };
  }

  return { processed: true };
}

/**
 * Hook to process skins results when a hole is completed.
 *
 * The returned `processSkinsHole` resolves a single combined result. When
 * multiple active games exist on the round, the hook processes each in turn
 * and prefers the most "interesting" outcome to surface (winner > carryover
 * > processed). UI consumers that need per-game detail should subscribe to
 * the underlying queries directly.
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

        const { data: rawGames, error: gamesError } = await supabase
          .from('skins_games')
          .select('*')
          .eq('round_id', roundId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (gamesError) {
          return { processed: false, error: gamesError.message };
        }

        const games = (rawGames ?? []) as unknown as SkinsGameRow[];
        if (games.length === 0) {
          return { processed: false };
        }

        // Round-level team-format detection is only relevant to round-wide
        // games that don't already have is_team_skins set. Sub-match games
        // declare their team intent at creation, so we never auto-flip them.
        let cachedRound: RoundTeamRow | null | undefined;
        const fetchRound = async (): Promise<RoundTeamRow | null> => {
          if (cachedRound !== undefined) return cachedRound;
          const { data } = await supabase
            .from('rounds')
            .select('is_team_round, team_format, team_config')
            .eq('id', roundId)
            .single();
          cachedRound = (data as unknown as RoundTeamRow | null) ?? null;
          return cachedRound;
        };

        const outcomes: ProcessSkinsResult[] = [];

        for (const game of games) {
          let treatAsTeam = game.is_team_skins;

          if (!treatAsTeam && game.sub_match_id === null) {
            const round = await fetchRound();
            const hasTeamFormat =
              round?.team_format &&
              (TEAM_ONLY_GAME_TYPES as string[]).includes(round.team_format);
            const hasTeamConfig =
              round?.team_config &&
              typeof round.team_config === 'object' &&
              round.team_config?.teams?.length;
            const isTeamRound = round?.is_team_round || hasTeamFormat || hasTeamConfig;

            if (isTeamRound && hasTeamFormat) {
              treatAsTeam = true;
              await supabase
                .from('skins_games')
                .update({ is_team_skins: true } as never)
                .eq('id', game.id);
              game.is_team_skins = true;
            }
          }

          if (treatAsTeam) {
            const teamOutcome = await processTeamSkins(
              game,
              roundId,
              holeNumber,
              scorecards,
              hole,
              processTeamSkinsHoleMutation
            );
            outcomes.push(teamOutcome);
          } else {
            const indivOutcome = await processIndividualGame(
              game,
              holeNumber,
              scorecards,
              hole,
              processSkinsHoleMutation
            );
            if (indivOutcome) outcomes.push(indivOutcome);
          }
        }

        if (outcomes.length === 0) {
          return { processed: false };
        }

        // Prefer a winner > carryover > plain processed for the surfaced result.
        const winner = outcomes.find((o) => o.hasWinner);
        if (winner) return winner;
        const carryover = outcomes.find((o) => o.processed && !o.hasWinner && o.carryoverAmount);
        if (carryover) return carryover;
        return outcomes.find((o) => o.processed) ?? outcomes[0];
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
