/**
 * useRoundMetadata Hook
 *
 * Fetches round metadata including game type, team settings, and course info.
 * This is a focused hook extracted from the larger useRoundData.
 *
 * Tee data is fetched from the normalized tees table.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { roundDataLogger } from '@/utils/debugLogger';
import type { TeeBox, TeamFormat, GameType, Tee } from '@/types/database.types';
import type { HandicapSource, NineType, RoundFormat, RoundStatus } from '@/types/database/enums';
import type { BallCount } from '@/types/multiball.types';
import {
  ROUND_METADATA_SELECT,
  type SupabaseRoundData,
  type StandaloneTeamConfig,
} from '@/types/supabase/roundQueries';
import { scheduleFetchTimeout } from './fetchTimeout';

export interface RoundMetadata {
  id: string;
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  /** 'combined' = single team match across all members; 'split' = independent
   *  sub-matches aggregated Ryder-Cup style. Drives sub-match scoping in the
   *  scorecard and scoring-pair generators. */
  roundFormat: RoundFormat;
  scoringPairsRequired: boolean;
  ballCount: BallCount;
  selectedTee: string | null;
  selectedTeeData: TeeBox | null; // Full tee object with ratings for daily handicap
  courseId: string | null;
  courseName: string | null;
  courseTees: TeeBox[];
  roundStatus: RoundStatus;
  /** Team configuration for standalone scramble rounds (split into teams) */
  teamConfig: StandaloneTeamConfig | null;
  /** Handicap source for daily HC calculation ('profile' = GA, 'calculated' = Social, 'none') */
  handicapSource: HandicapSource;
  /** Whether this is a 9-hole or full round, controls which holes are scored. */
  nineType: NineType;
  /** Per-player tee overrides: playerId -> TeeBox. Round overrides take precedence over competition defaults. */
  playerTeeMap: Map<string, TeeBox>;
}

interface UseRoundMetadataResult {
  data: RoundMetadata | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Row shape returned when querying player_id + selected_tee columns */
type PlayerTeeRow = { player_id: string; selected_tee: TeeBox | null };

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

    const cancelTimeout = scheduleFetchTimeout('round metadata', (msg) => {
      setError(msg);
      setIsLoading(false);
    });

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

      // Fetch tees from the normalized tees table
      let courseTees: TeeBox[] = [];
      const courseId = roundData.courses?.id;
      if (courseId) {
        roundDataLogger.debug('Fetching tees from normalized tees table', {
          courseId: courseId.substring(0, 8),
        });

        const { data: normalizedTees, error: teesError } = await supabase
          .from('tees')
          .select('*')
          .eq('course_id', courseId)
          .order('slope', { ascending: false, nullsFirst: false }) as {
            data: Tee[] | null;
            error: { message: string } | null;
          };

        if (teesError) {
          roundDataLogger.warn('Failed to fetch tees from normalized table', teesError);
        } else if (normalizedTees && normalizedTees.length > 0) {
          roundDataLogger.debug('Found tees in normalized table', {
            count: normalizedTees.length,
            teeNames: normalizedTees.map(t => t.name),
          });

          // Convert Tee to TeeBox format for compatibility
          courseTees = normalizedTees.map((tee): TeeBox => ({
            name: tee.name,
            color: tee.color || tee.name,
            slopeRating: tee.slope || undefined,
            courseRating: tee.course_rating || undefined,
          }));
        }
      }

      // Build per-player tee map
      const playerTeeMap = new Map<string, TeeBox>();
      const competitionId = roundData.competition_id;

      if (competitionId) {
        // Competition round: layer competition defaults then round overrides
        const { data: compDefaults } = await supabase
          .from('competition_players')
          .select('player_id, selected_tee')
          .eq('competition_id', competitionId)
          .not('selected_tee', 'is', null) as unknown as { data: PlayerTeeRow[] | null };

        const { data: roundOverrides } = await supabase
          .from('competition_round_player_tees')
          .select('player_id, selected_tee')
          .eq('round_id', roundId) as unknown as { data: PlayerTeeRow[] | null };

        // Layer 1: competition defaults (lowest priority)
        if (compDefaults) {
          for (const row of compDefaults) {
            if (row.selected_tee) playerTeeMap.set(row.player_id, row.selected_tee);
          }
        }
        // Layer 2: round-specific overrides (highest priority)
        if (roundOverrides) {
          for (const row of roundOverrides) {
            if (row.selected_tee) playerTeeMap.set(row.player_id, row.selected_tee);
          }
        }
      } else {
        // Standalone round: fetch round_players per-player tees
        const { data: roundPlayers } = await supabase
          .from('round_players')
          .select('player_id, selected_tee')
          .eq('round_id', roundId)
          .not('selected_tee', 'is', null) as unknown as { data: PlayerTeeRow[] | null };

        if (roundPlayers) {
          for (const row of roundPlayers) {
            if (row.selected_tee) playerTeeMap.set(row.player_id, row.selected_tee);
          }
        }
      }

      const metadata: RoundMetadata = {
        id: roundData.id,
        gameType: (roundData.game_type || 'stableford') as GameType,
        isTeamRound: roundData.is_team_round ?? false,
        teamFormat: roundData.team_format,
        roundFormat: (roundData.round_format ?? 'combined') as RoundFormat,
        scoringPairsRequired: roundData.scoring_pairs_required ?? false,
        ballCount: (roundData.ball_count ?? 1) as BallCount,
        selectedTee: selectedTeeColor,
        selectedTeeData: selectedTeeData, // Full TeeBox with slopeRating/courseRating
        courseId: courseId || null,
        courseName: roundData.courses?.name || null,
        courseTees,
        roundStatus: (roundData.status || 'upcoming') as RoundStatus,
        teamConfig: roundData.team_config ?? null,
        handicapSource: (roundData.handicap_source as HandicapSource) ?? 'profile',
        nineType: (roundData.nine_type as NineType) ?? 'full',
        playerTeeMap,
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
    } finally {
      cancelTimeout();
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
