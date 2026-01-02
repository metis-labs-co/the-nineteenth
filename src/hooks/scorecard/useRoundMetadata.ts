/**
 * useRoundMetadata Hook
 *
 * Fetches round metadata including game type, team settings, and course info.
 * This is a focused hook extracted from the larger useRoundData.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { roundDataLogger } from '@/utils/debugLogger';
import type { TeeBox, TeamFormat, GameType } from '@/types/database.types';
import type { BallCount } from '@/types/multiball.types';
import {
  ROUND_METADATA_SELECT,
  type SupabaseRoundData,
} from '@/types/supabase/roundQueries';

export interface RoundMetadata {
  id: string;
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  scoringPairsRequired: boolean;
  ballCount: BallCount;
  selectedTee: string | null;
  courseId: string | null;
  courseName: string | null;
  courseTees: TeeBox[];
}

interface UseRoundMetadataResult {
  data: RoundMetadata | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching round metadata (game type, team settings, course info)
 */
export function useRoundMetadata(roundId: string | undefined): UseRoundMetadataResult {
  const [data, setData] = useState<RoundMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!roundId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      roundDataLogger.debug('Fetching round metadata', { roundId: roundId.substring(0, 8) });

      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select(ROUND_METADATA_SELECT)
        .eq('id', roundId)
        .single() as { data: SupabaseRoundData | null; error: { message: string } | null };

      if (roundError) {
        roundDataLogger.error('Failed to fetch round metadata', roundError);
        setError(`Failed to load round: ${roundError.message}`);
        setIsLoading(false);
        return;
      }

      if (!roundData) {
        setError('Round not found');
        setIsLoading(false);
        return;
      }

      // Extract tee color from selected_tee object
      const selectedTeeData = roundData.selected_tee as TeeBox | null;
      const selectedTeeColor = selectedTeeData?.color?.toLowerCase() || null;

      const metadata: RoundMetadata = {
        id: roundData.id,
        gameType: (roundData.game_type || 'stableford') as GameType,
        isTeamRound: roundData.is_team_round ?? false,
        teamFormat: roundData.team_format,
        scoringPairsRequired: roundData.scoring_pairs_required ?? false,
        ballCount: (roundData.ball_count ?? 1) as BallCount,
        selectedTee: selectedTeeColor,
        courseId: roundData.courses?.id || null,
        courseName: roundData.courses?.name || null,
        courseTees: (roundData.courses?.tees as TeeBox[]) || [],
      };

      roundDataLogger.debug('Round metadata loaded', {
        gameType: metadata.gameType,
        isTeamRound: metadata.isTeamRound,
        teamFormat: metadata.teamFormat,
        scoringPairsRequired: metadata.scoringPairsRequired,
      });

      setData(metadata);
      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error fetching round metadata', err);
      setError(err instanceof Error ? err.message : 'Failed to load round metadata');
      setIsLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMetadata,
  };
}
