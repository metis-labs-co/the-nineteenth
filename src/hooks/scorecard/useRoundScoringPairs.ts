/**
 * useRoundScoringPairs Hook
 *
 * Fetches scoring pair assignments for competitive rounds.
 * Determines which players the current user can score.
 */

import { useCallback, useState, useEffect } from 'react';
import { getPlayersToScore, hasScoringPairs } from '@/services/scoringPairs';
import { roundDataLogger } from '@/utils/debugLogger';
import type { Player } from '@/types';

interface UseRoundScoringPairsResult {
  playersToScore: Player[];
  scoringPairsEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching scoring pair assignments
 */
export function useRoundScoringPairs(
  roundId: string | undefined,
  currentUserId: string | undefined,
  scoringPairsRequired: boolean = false,
  isTeamRound: boolean = false,
  allPlayers: Player[] = []
): UseRoundScoringPairsResult {
  const [playersToScore, setPlayersToScore] = useState<Player[]>([]);
  const [scoringPairsEnabled, setScoringPairsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScoringPairs = useCallback(async () => {
    if (!roundId || !scoringPairsRequired) {
      setPlayersToScore([]);
      setScoringPairsEnabled(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      roundDataLogger.debug('Checking scoring pairs', {
        roundId: roundId.substring(0, 8),
        currentUserId: currentUserId?.substring(0, 8),
      });

      // Check if scoring pairs exist for this round
      const pairsExist = await hasScoringPairs(roundId);

      if (!pairsExist) {
        // Scoring pairs required but not configured
        roundDataLogger.warn('Scoring pairs required but not configured');
        setError(
          'Scoring pairs have not been configured for this round yet. ' +
          'Please ask the competition organiser to set up scoring pairs before you can enter scores.'
        );
        setScoringPairsEnabled(true);
        setPlayersToScore([]);
        setIsLoading(false);
        return;
      }

      setScoringPairsEnabled(true);

      // If we have a current user, fetch the players they can score
      if (currentUserId) {
        try {
          let playersToScoreList = await getPlayersToScore(roundId, currentUserId);

          // For team rounds, also include the current user (you can always score yourself)
          // This allows Best Ball to work properly - you see all scores but edit your own + assigned
          if (isTeamRound) {
            const currentUserPlayer = allPlayers.find((p) => p.id === currentUserId);
            if (currentUserPlayer && !playersToScoreList.some((p) => p.id === currentUserId)) {
              playersToScoreList = [currentUserPlayer, ...playersToScoreList];
            }
          }

          roundDataLogger.info('Scoring pairs - user can score', {
            userCanScoreCount: playersToScoreList.length,
            players: playersToScoreList.map((p) => p.name),
            isTeamRound,
            includedSelf: playersToScoreList.some((p) => p.id === currentUserId),
          });

          setPlayersToScore(playersToScoreList);
        } catch (scoringPairsError) {
          roundDataLogger.error('Failed to fetch scoring pairs', scoringPairsError);
          // Continue with empty players list
          setPlayersToScore([]);
        }
      } else {
        setPlayersToScore([]);
      }

      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error checking scoring pairs', err);
      setError(err instanceof Error ? err.message : 'Failed to check scoring pairs');
      setIsLoading(false);
    }
  }, [roundId, currentUserId, scoringPairsRequired, isTeamRound, allPlayers]);

  useEffect(() => {
    fetchScoringPairs();
  }, [fetchScoringPairs]);

  return {
    playersToScore,
    scoringPairsEnabled,
    isLoading,
    error,
    refetch: fetchScoringPairs,
  };
}
