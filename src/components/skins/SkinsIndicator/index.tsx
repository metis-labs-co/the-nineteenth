/**
 * SkinsIndicator - Small indicator for scorecard header showing skins is active
 *
 * Displays a dice icon with badge showing carryover holes when skins game is active.
 * On press, shows a tooltip/alert with quick summary of the skins game status.
 *
 * @example
 * ```tsx
 * // In scorecard header
 * <View style={styles.headerRight}>
 *   <SkinsIndicator roundId={roundId} onPress={handleSkinsPress} />
 *   <SyncIndicator />
 * </View>
 *
 * // Basic usage - just indicator
 * <SkinsIndicator roundId={roundId} />
 * ```
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveSkinsGameForRound, useSkinsSummary } from '@/hooks/useSkins';
import { supabase } from '@/services/supabase/client';
import type {
  SkinsParticipant,
  SkinsTeamParticipant,
  SkinsResult,
} from '@/types/database/skins.types';
import { SkinsIndicatorBadge } from './SkinsIndicatorBadge';
import { SkinsSummaryModal } from './SkinsSummaryModal';
import { calculatePlayerTotals, calculateTeamTotals } from './utils';
import type { LastWinnerInfo } from './utils';
import { TEAM_ONLY_GAME_TYPES } from '@/services/rounds/resultsEngine';

const TEAM_GAME_TYPES: string[] = TEAM_ONLY_GAME_TYPES;

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsIndicatorProps {
  /** Round UUID to check for active skins game */
  roundId: string;
  /** Optional callback when indicator is pressed */
  onPress?: () => void;
  /** Size of the icon */
  size?: 'sm' | 'md';
  /** Variant - 'default' has background, 'minimal' has no background (for header use) */
  variant?: 'default' | 'minimal';
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsIndicator = React.memo(function SkinsIndicator({
  roundId,
  onPress,
  size = 'md',
  variant = 'default',
  testID,
}: SkinsIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false);

  // Check if skins game is active for this round
  const { data: skinsGame, isLoading: isGameLoading } = useActiveSkinsGameForRound(roundId);

  // Get summary data for the popover
  // Refetch every 3 seconds while popover is open to keep running totals updated
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useSkinsSummary(skinsGame?.id);

  // Fetch round data to check team format (fallback when is_team_skins not set)
  const { data: roundData } = useQuery({
    queryKey: ['round-team-format', roundId],
    queryFn: async (): Promise<{ is_team_round: boolean | null; team_format: string | null; team_config: unknown } | null> => {
      const { data } = await supabase
        .from('rounds')
        .select('is_team_round, team_format, team_config')
        .eq('id', roundId)
        .single();
      return data as { is_team_round: boolean | null; team_format: string | null; team_config: unknown } | null;
    },
    enabled: !!roundId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Calculate carryover holes count
  const carryoverHoles = useMemo(() => {
    if (!summary?.results) return 0;
    // Count consecutive carryover holes from the end
    let count = 0;
    for (let i = summary.results.length - 1; i >= 0; i--) {
      if (summary.results[i].is_carryover) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [summary?.results]);

  // Detect if this is a team skins game
  // Check multiple sources: skins game flag, round's team format, team_config, or team_winner_id in results
  const isTeamSkins = useMemo(() => {
    // First check the skins game flag
    if (summary?.game?.is_team_skins) return true;
    // Check if results have team_winner_id (indicates team skins regardless of flag)
    if (summary?.results?.some((r) => (r as SkinsResult).team_winner_id)) return true;
    // Fallback: check if round is a team format (scramble, best-ball, shamble)
    if (roundData?.team_format && TEAM_GAME_TYPES.includes(roundData.team_format)) return true;
    // Also check team_config for standalone rounds
    const teamConfig = roundData?.team_config as { teams?: unknown[] } | null;
    if (teamConfig?.teams?.length) return true;
    return false;
  }, [summary?.game?.is_team_skins, summary?.results, roundData?.team_format, roundData?.team_config]);

  // Get last winner info (works for both individual and team skins)
  const lastWinner = useMemo((): LastWinnerInfo | null => {
    if (!summary?.results) return null;
    // Find the last non-carryover result (last actual winner)
    for (let i = summary.results.length - 1; i >= 0; i--) {
      const result = summary.results[i] as SkinsResult & { winner?: { name: string } | null; team_winner?: { name: string } | null };
      if (!result.is_carryover) {
        // Check for team winner first (team skins) - from the team_winner object
        if (result.team_winner) {
          return {
            name: result.team_winner.name,
            hole: result.hole_number,
            amount: result.payout_amount,
            isTeam: true,
          };
        }
        // Also check team_winner_id as fallback and lookup from game.teams
        if (result.team_winner_id && (summary.game as { teams?: SkinsTeamParticipant[] })?.teams) {
          const winningTeam = (summary.game as { teams?: SkinsTeamParticipant[] }).teams?.find(
            (t: SkinsTeamParticipant) => t.id === result.team_winner_id
          );
          if (winningTeam) {
            return {
              name: winningTeam.name,
              hole: result.hole_number,
              amount: result.payout_amount,
              isTeam: true,
            };
          }
        }
        // Individual winner
        if (result.winner) {
          return {
            name: result.winner.name,
            hole: result.hole_number,
            amount: result.payout_amount,
            isTeam: false,
          };
        }
      }
    }
    return null;
  }, [summary?.results, summary?.game]);

  // Calculate participant totals for display (handles both individual and team skins)
  const participantTotals = useMemo(() => {
    if (!summary?.results) return [];

    // Team skins - calculate team totals
    if (isTeamSkins) {
      // Try to get teams from the skins game
      let teams = (summary.game as { teams?: SkinsTeamParticipant[] })?.teams;

      // Fallback: build teams from round's team_config
      if (!teams || teams.length === 0) {
        const teamConfig = roundData?.team_config as { teams?: { id: string; name: string; memberIds: string[] }[] } | null;
        if (teamConfig?.teams) {
          teams = teamConfig.teams.map(team => ({
            id: team.id,
            name: team.name,
            members: team.memberIds.map(memberId => ({
              id: memberId,
              name: 'Player', // We don't have player names here, but member count is what matters for split
              handicap: null,
            })),
          }));
        }
      }

      if (teams && teams.length > 0) {
        return calculateTeamTotals(
          summary.results as SkinsResult[],
          teams
        );
      }
    }

    // Individual skins - calculate player totals
    if (summary.game?.participants) {
      return calculatePlayerTotals(summary.results, summary.game.participants as SkinsParticipant[]);
    }

    return [];
  }, [summary?.results, summary?.game, isTeamSkins, roundData?.team_config]);

  // Handle press
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      setShowPopover(true);
    }
  }, [onPress]);

  // Close popover
  const handleClosePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  // Refetch summary when popover opens and poll while open
  // This ensures running totals stay up-to-date as scores are entered
  useEffect(() => {
    if (!showPopover || !skinsGame?.id) return;

    // Refetch immediately when popover opens
    refetchSummary();

    // Poll every 3 seconds while popover is open
    const intervalId = setInterval(() => {
      refetchSummary();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [showPopover, skinsGame?.id, refetchSummary]);

  // Don't render if no active skins game
  if (!skinsGame && !isGameLoading) {
    return null;
  }

  return (
    <>
      <SkinsIndicatorBadge
        isLoading={isGameLoading}
        carryoverHoles={carryoverHoles}
        size={size}
        variant={variant}
        onPress={handlePress}
        testID={testID}
      />

      <SkinsSummaryModal
        visible={showPopover}
        onClose={handleClosePopover}
        isLoading={isSummaryLoading}
        summary={summary}
        carryoverHoles={carryoverHoles}
        lastWinner={lastWinner}
        participantTotals={participantTotals}
        isTeamSkins={isTeamSkins}
      />
    </>
  );
});

export default SkinsIndicator;
