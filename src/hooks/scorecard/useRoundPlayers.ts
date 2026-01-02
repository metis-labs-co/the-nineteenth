/**
 * useRoundPlayers Hook
 *
 * Fetches players for a round from either competition_players or round_players table.
 * Handles standalone rounds vs competition rounds.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { roundDataLogger } from '@/utils/debugLogger';
import type { Player } from '@/types';
import {
  COMPETITION_PLAYERS_SELECT,
  type SupabaseCompetitionPlayerData,
} from '@/types/supabase/roundQueries';

interface UseRoundPlayersResult {
  players: Player[];
  getPlayer: (playerId: string) => Player | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching players in a round
 */
export function useRoundPlayers(
  roundId: string | undefined,
  competitionId: string | undefined
): UseRoundPlayersResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStandaloneRound = competitionId === 'standalone' || !competitionId;

  const fetchPlayers = useCallback(async () => {
    if (!roundId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let competitionPlayers: SupabaseCompetitionPlayerData[] = [];

      if (isStandaloneRound) {
        // For standalone rounds, fetch from round_players table
        roundDataLogger.info('Fetching players for standalone round');
        try {
          const { data: roundPlayersData, error: roundPlayersError } = await supabase
            .from('round_players')
            .select(COMPETITION_PLAYERS_SELECT)
            .eq('round_id', roundId) as {
              data: SupabaseCompetitionPlayerData[] | null;
              error: { message: string; code?: string } | null;
            };

          if (roundPlayersError) {
            roundDataLogger.error('Failed to fetch round_players', roundPlayersError);
            setError(`Failed to load players: ${roundPlayersError.message}`);
            setIsLoading(false);
            return;
          }

          competitionPlayers = roundPlayersData || [];
          roundDataLogger.debug('Fetched standalone round players', {
            count: competitionPlayers.length,
          });
        } catch (err) {
          roundDataLogger.warn('round_players fetch failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // For competition rounds, fetch from competition_players table
        const { data: compPlayers, error: playersError } = await supabase
          .from('competition_players')
          .select(COMPETITION_PLAYERS_SELECT)
          .eq('competition_id', competitionId)
          .eq('status', 'accepted') as {
            data: SupabaseCompetitionPlayerData[] | null;
            error: { message: string } | null;
          };

        if (playersError) {
          roundDataLogger.error('Failed to fetch players', playersError);
          setError(`Failed to load players: ${playersError.message}`);
          setIsLoading(false);
          return;
        }

        competitionPlayers = compPlayers || [];
      }

      roundDataLogger.debug('Fetched players', {
        count: competitionPlayers.length,
        isStandalone: isStandaloneRound,
      });

      // Transform players to our Player type
      const transformedPlayers: Player[] = competitionPlayers
        .filter((cp) => cp.players)
        .map((cp) => ({
          id: cp.players!.id,
          name: cp.players!.name || 'Unknown',
          email: cp.players!.email || '',
          phone: cp.players!.phone,
          handicap: cp.players!.handicap || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      roundDataLogger.info('Transformed players', {
        count: transformedPlayers.length,
        players: transformedPlayers.map((p) => ({ name: p.name, handicap: p.handicap })),
      });

      setPlayers(transformedPlayers);
      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error fetching players', err);
      setError(err instanceof Error ? err.message : 'Failed to load players');
      setIsLoading(false);
    }
  }, [roundId, competitionId, isStandaloneRound]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const getPlayer = useCallback(
    (playerId: string): Player | undefined => {
      return players.find((p) => p.id === playerId);
    },
    [players]
  );

  return {
    players,
    getPlayer,
    isLoading,
    error,
    refetch: fetchPlayers,
  };
}
