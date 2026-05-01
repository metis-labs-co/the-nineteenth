/**
 * useRoundScoringPairs Hook
 *
 * Fetches scoring pair assignments for competitive rounds.
 * Determines which players the current user can score.
 *
 * With mismatch detection enabled:
 * - playersToScore includes [self, ...partners] (self first)
 * - myScorer returns who is assigned to score the current user
 * - isOwnScore helper checks if a playerId is the current user
 */

import { useCallback, useState, useEffect } from 'react';
import { getPlayersToScore, getScoringPartner, hasScoringPairs } from '@/services/scoringPairs';
import { roundDataLogger } from '@/utils/debugLogger';
import type { Player } from '@/types';
import { scheduleFetchTimeout } from './fetchTimeout';

interface UseRoundScoringPairsResult {
  /** Players the current user can score: [self, ...partners] */
  playersToScore: Player[];
  /** Whether scoring pairs are enabled for this round */
  scoringPairsEnabled: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch scoring pairs data */
  refetch: () => Promise<void>;
  /** The player who is assigned to score the current user (for mismatch detection) */
  myScorer: Player | null;
  /** Helper to check if a player ID is the current user's own score */
  isOwnScore: (playerId: string) => boolean;
}

/**
 * Hook for fetching scoring pair assignments
 *
 * @param roundId - Round UUID
 * @param currentUserId - Current user's player UUID
 * @param scoringPairsRequired - Whether scoring pairs are required for this round
 * @param isTeamRound - Whether this is a team format round (kept for backward compatibility)
 * @param _allPlayers - All players in the round (kept for backward compatibility)
 */
export function useRoundScoringPairs(
  roundId: string | undefined,
  currentUserId: string | undefined,
  scoringPairsRequired: boolean = false,
  isTeamRound: boolean = false,
  _allPlayers: Player[] = []
): UseRoundScoringPairsResult {
  const [playersToScore, setPlayersToScore] = useState<Player[]>([]);
  const [myScorer, setMyScorer] = useState<Player | null>(null);
  const [scoringPairsEnabled, setScoringPairsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if a playerId is the current user's own score
  const isOwnScore = useCallback(
    (playerId: string): boolean => {
      return playerId === currentUserId;
    },
    [currentUserId]
  );

  const fetchScoringPairs = useCallback(async () => {
    if (!roundId || !scoringPairsRequired) {
      setPlayersToScore([]);
      setMyScorer(null);
      setScoringPairsEnabled(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cancelTimeout = scheduleFetchTimeout('scoring pairs', (msg) => {
      setError(msg);
      setIsLoading(false);
    });

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
        setMyScorer(null);
        setIsLoading(false);
        return;
      }

      setScoringPairsEnabled(true);

      // If we have a current user, fetch the players they can score and who scores them
      if (currentUserId) {
        try {
          // getPlayersToScore now returns [self, ...partners]
          const playersToScoreList = await getPlayersToScore(roundId, currentUserId);

          roundDataLogger.info('Scoring pairs - user can score', {
            userCanScoreCount: playersToScoreList.length,
            players: playersToScoreList.map((p) => p.name),
            isTeamRound,
            includedSelf: playersToScoreList.some((p) => p.id === currentUserId),
          });

          setPlayersToScore(playersToScoreList);

          // Also fetch who is scoring the current user (for mismatch detection)
          const scorer = await getScoringPartner(roundId, currentUserId);
          setMyScorer(scorer);

          if (scorer) {
            roundDataLogger.debug('My scorer (partner)', { scorerName: scorer.name });
          }
        } catch (scoringPairsError) {
          roundDataLogger.error('Failed to fetch scoring pairs', scoringPairsError);
          // Continue with empty players list
          setPlayersToScore([]);
          setMyScorer(null);
        }
      } else {
        setPlayersToScore([]);
        setMyScorer(null);
      }

      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error checking scoring pairs', err);
      setError(err instanceof Error ? err.message : 'Failed to check scoring pairs');
      setIsLoading(false);
    } finally {
      cancelTimeout();
    }
  }, [roundId, currentUserId, scoringPairsRequired, isTeamRound]);

  useEffect(() => {
    fetchScoringPairs();
  }, [fetchScoringPairs]);

  return {
    playersToScore,
    scoringPairsEnabled,
    isLoading,
    error,
    refetch: fetchScoringPairs,
    myScorer,
    isOwnScore,
  };
}
