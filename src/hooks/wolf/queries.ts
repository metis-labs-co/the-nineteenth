/**
 * Wolf Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching Wolf game data.
 *
 * Hooks:
 * - useWolfGame: Fetch a single Wolf game with participants
 * - useWolfGameByRound: Fetch Wolf game for a specific round
 * - useWolfHoleDecisions: Fetch all hole decisions for a game
 * - useWolfCurrentHoleDecision: Fetch decision for a specific hole
 * - useWolfStandings: Calculate and return current standings
 * - useWolfPayouts: Fetch final payouts for a completed game
 * - useCanUseWolf: Check if user has Premium tier access
 *
 * Note: Type assertions are used for wolf_games, wolf_hole_decisions, and wolf_payouts
 * tables until the Supabase types are regenerated after running the migration.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { wolfKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import {
  calculateWolfStandings,
  getSortedStandings,
  calculateWolfPayouts,
} from '@/utils/wolf';
import { createError } from './helpers';
import type {
  WolfGame,
  WolfGameWithParticipants,
  WolfParticipant,
  WolfDecisionWithDetails,
  WolfPayoutWithPlayer,
  WolfPayoutPlayer,
  WolfStandingEntry,
  WolfGameSummary,
} from '@/types/database/wolf.types';

// =====================================================
// TYPE HELPERS
// =====================================================

/**
 * Raw Wolf game record from database
 * Used for type assertions until Supabase types are regenerated
 * Note: Database column is 'pot_value', TypeScript type uses 'pot_value_per_point'
 */
interface RawWolfGame {
  id: string;
  round_id: string;
  participant_ids: string[];
  wolf_order: string[];
  scoring_type: 'gross' | 'net';
  blind_wolf_enabled: boolean;
  pot_enabled: boolean;
  pot_value: number | null; // Database column name
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  disclaimer_accepted_at: string | null;
  disclaimer_accepted_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Transform raw database game to TypeScript type
 * Maps pot_value (database) to pot_value_per_point (TypeScript)
 */
function transformRawGame(raw: RawWolfGame): WolfGame {
  return {
    id: raw.id,
    round_id: raw.round_id,
    participant_ids: raw.participant_ids,
    wolf_order: raw.wolf_order,
    scoring_type: raw.scoring_type,
    blind_wolf_enabled: raw.blind_wolf_enabled,
    pot_enabled: raw.pot_enabled,
    pot_value_per_point: raw.pot_value, // Map database column to TypeScript property
    currency: raw.currency,
    status: raw.status,
    disclaimer_accepted_at: raw.disclaimer_accepted_at,
    disclaimer_accepted_by: raw.disclaimer_accepted_by,
    created_by: raw.created_by,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    completed_at: raw.completed_at,
  };
}

/**
 * Raw Wolf hole decision record from database
 */
interface RawWolfHoleDecision {
  id: string;
  wolf_game_id: string;
  hole_number: number;
  wolf_id: string;
  is_blind_wolf: boolean;
  partner_id: string | null;
  hole_scores: Record<string, number> | null;
  is_tie: boolean;
  wolf_team_won: boolean | null;
  points_awarded: Record<string, number> | null;
  decided_at: string | null;
  calculated_at: string | null;
}

/**
 * Raw Wolf payout record from database
 */
interface RawWolfPayout {
  id: string;
  wolf_game_id: string;
  player_id: string;
  total_points: number;
  total_winnings: number;
  net_result: number;
  calculated_at: string;
}

/**
 * Raw player record from database
 */
interface RawPlayer {
  id: string;
  name: string;
  handicap: number | null;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch a single Wolf game with participant details
 *
 * @param gameId - Wolf game UUID
 * @returns Query result with WolfGameWithParticipants
 */
export function useWolfGame(gameId: string | undefined) {
  return useQuery({
    queryKey: wolfKeys.game(gameId ?? ''),
    queryFn: async (): Promise<WolfGameWithParticipants | null> => {
      if (!gameId) return null;

      // Type assertion needed until Supabase types are regenerated
      const { data: game, error } = await supabase
        .from('wolf_games' as 'players') // Type hack - 'players' is known table
        .select('*')
        .eq('id', gameId)
        .single() as unknown as { data: RawWolfGame | null; error: { code?: string; message: string } | null };

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw createError(`Failed to fetch Wolf game: ${error.message}`, 'DATABASE');
      }

      if (!game) return null;

      // Transform raw database record to TypeScript type
      const transformedGame = transformRawGame(game);

      // Fetch player participants
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      if (playersError) {
        console.error('[useWolfGame] Failed to fetch participants:', playersError);
      }

      const participants: WolfParticipant[] = ((players ?? []) as RawPlayer[]).map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      return {
        ...transformedGame,
        participants,
      } as WolfGameWithParticipants;
    },
    enabled: !!gameId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch Wolf game for a specific round
 *
 * @param roundId - Round UUID
 * @returns Query result with WolfGameWithParticipants or null if no Wolf game exists
 */
export function useWolfGameByRound(roundId: string | undefined) {
  return useQuery({
    queryKey: wolfKeys.gameByRound(roundId ?? ''),
    queryFn: async (): Promise<WolfGameWithParticipants | null> => {
      if (!roundId) return null;

      // Wolf games are one-per-round, so we fetch single
      // Type assertion needed until Supabase types are regenerated
      const { data: game, error } = await supabase
        .from('wolf_games' as 'players')
        .select('*')
        .eq('round_id', roundId)
        .maybeSingle() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (error) {
        throw createError(`Failed to fetch Wolf game: ${error.message}`, 'DATABASE');
      }

      if (!game) return null;

      // Transform raw database record to TypeScript type
      const transformedGame = transformRawGame(game);

      // Fetch player participants
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      if (playersError) {
        console.error('[useWolfGameByRound] Failed to fetch participants:', playersError);
      }

      const participants: WolfParticipant[] = ((players ?? []) as RawPlayer[]).map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      return {
        ...transformedGame,
        participants,
      } as WolfGameWithParticipants;
    },
    enabled: !!roundId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch all hole decisions for a Wolf game
 *
 * Returns hole-by-hole decisions with wolf and partner details.
 *
 * @param gameId - Wolf game UUID
 * @returns Query result with array of WolfDecisionWithDetails
 */
export function useWolfHoleDecisions(gameId: string | undefined) {
  return useQuery({
    queryKey: wolfKeys.decisions(gameId ?? ''),
    queryFn: async (): Promise<WolfDecisionWithDetails[]> => {
      if (!gameId) return [];

      // Type assertion needed until Supabase types are regenerated
      const { data: decisions, error } = await supabase
        .from('wolf_hole_decisions' as 'players')
        .select('*')
        .eq('wolf_game_id', gameId)
        .order('hole_number', { ascending: true }) as unknown as { data: RawWolfHoleDecision[] | null; error: { message: string } | null };

      if (error) {
        throw createError(`Failed to fetch Wolf decisions: ${error.message}`, 'DATABASE');
      }

      if (!decisions || decisions.length === 0) return [];

      // Collect all unique player IDs (wolves and partners)
      const wolfIds = [...new Set(decisions.map((d) => d.wolf_id))];
      const partnerIds = decisions
        .map((d) => d.partner_id)
        .filter((id): id is string => id !== null);
      const allPlayerIds = [...new Set([...wolfIds, ...partnerIds])];

      // Fetch player details
      let playerMap = new Map<string, WolfParticipant>();
      if (allPlayerIds.length > 0) {
        const { data: players } = await supabase
          .from('players')
          .select('id, name, handicap')
          .in('id', allPlayerIds);

        if (players) {
          playerMap = new Map(
            (players as RawPlayer[]).map((p) => [p.id, { id: p.id, name: p.name, handicap: p.handicap }])
          );
        }
      }

      return decisions.map((decision) => ({
        ...decision,
        wolf: playerMap.get(decision.wolf_id) ?? {
          id: decision.wolf_id,
          name: 'Unknown',
          handicap: null,
        },
        partner: decision.partner_id
          ? playerMap.get(decision.partner_id) ?? {
              id: decision.partner_id,
              name: 'Unknown',
              handicap: null,
            }
          : null,
      })) as WolfDecisionWithDetails[];
    },
    enabled: !!gameId,
    staleTime: 0, // Always refetch to ensure fresh data during play
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch decision for a specific hole
 *
 * @param gameId - Wolf game UUID
 * @param holeNumber - Hole number (1-18)
 * @returns Query result with WolfDecisionWithDetails or null if not yet made
 */
export function useWolfCurrentHoleDecision(
  gameId: string | undefined,
  holeNumber: number | undefined
) {
  return useQuery({
    queryKey: wolfKeys.decision(gameId ?? '', holeNumber ?? 0),
    queryFn: async (): Promise<WolfDecisionWithDetails | null> => {
      if (!gameId || !holeNumber) return null;

      // Type assertion needed until Supabase types are regenerated
      const { data: decision, error } = await supabase
        .from('wolf_hole_decisions' as 'players')
        .select('*')
        .eq('wolf_game_id', gameId)
        .eq('hole_number', holeNumber)
        .maybeSingle() as unknown as { data: RawWolfHoleDecision | null; error: { message: string } | null };

      if (error) {
        throw createError(`Failed to fetch Wolf decision: ${error.message}`, 'DATABASE');
      }

      if (!decision) return null;

      // Fetch wolf player details
      const { data: wolfPlayer } = await supabase
        .from('players')
        .select('id, name, handicap')
        .eq('id', decision.wolf_id)
        .single();

      // Fetch partner player details if applicable
      let partner: WolfParticipant | null = null;
      if (decision.partner_id) {
        const { data: partnerPlayer } = await supabase
          .from('players')
          .select('id, name, handicap')
          .eq('id', decision.partner_id)
          .single();

        if (partnerPlayer) {
          const p = partnerPlayer as RawPlayer;
          partner = {
            id: p.id,
            name: p.name,
            handicap: p.handicap,
          };
        }
      }

      const wp = wolfPlayer as RawPlayer | null;
      return {
        ...decision,
        wolf: wp
          ? { id: wp.id, name: wp.name, handicap: wp.handicap }
          : { id: decision.wolf_id, name: 'Unknown', handicap: null },
        partner,
      } as WolfDecisionWithDetails;
    },
    enabled: !!gameId && !!holeNumber && holeNumber >= 1 && holeNumber <= 18,
    staleTime: 0, // Always refetch during play
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch and calculate Wolf standings
 *
 * Fetches all decisions and calculates current standings by summing points.
 *
 * @param gameId - Wolf game UUID
 * @returns Query result with sorted standings array
 */
export function useWolfStandings(gameId: string | undefined) {
  const gameQuery = useWolfGame(gameId);
  const decisionsQuery = useWolfHoleDecisions(gameId);

  const game = gameQuery.data;

  // Calculate standings using useMemo
  const standings = useMemo((): WolfStandingEntry[] | null => {
    if (!game) return null;
    const decisions = decisionsQuery.data ?? [];

    // Create player name map from participants
    const playerNames: Record<string, string> = {};
    for (const participant of game.participants) {
      playerNames[participant.id] = participant.name;
    }

    // Calculate standings from decisions
    const standingsMap = calculateWolfStandings(decisions, game.participant_ids);

    // Convert to sorted array with ranks
    const sorted = getSortedStandings(standingsMap, playerNames);

    // Calculate net_result for each standing entry when pot is enabled
    if (game.pot_enabled && game.pot_value_per_point) {
      const payoutCalcs = calculateWolfPayouts(standingsMap, game.pot_value_per_point);
      for (const entry of sorted) {
        entry.net_result = payoutCalcs[entry.player_id]?.netResult ?? 0;
      }
    }

    return sorted;
  }, [game, decisionsQuery.data]);

  return {
    data: standings,
    isLoading: gameQuery.isLoading || decisionsQuery.isLoading,
    isError: gameQuery.isError || decisionsQuery.isError,
    error: gameQuery.error || decisionsQuery.error,
    refetch: async () => {
      await Promise.all([gameQuery.refetch(), decisionsQuery.refetch()]);
    },
  };
}

/**
 * Query hook to fetch Wolf payouts for a completed game
 *
 * Returns final settlement amounts for each player.
 *
 * @param gameId - Wolf game UUID
 * @returns Query result with array of WolfPayoutWithPlayer
 */
export function useWolfPayouts(gameId: string | undefined) {
  return useQuery({
    queryKey: wolfKeys.payouts(gameId ?? ''),
    queryFn: async (): Promise<WolfPayoutWithPlayer[]> => {
      if (!gameId) return [];

      // Type assertion needed until Supabase types are regenerated
      const { data: payouts, error } = await supabase
        .from('wolf_payouts' as 'players')
        .select('*')
        .eq('wolf_game_id', gameId)
        .order('net_result', { ascending: false }) as unknown as { data: RawWolfPayout[] | null; error: { message: string } | null };

      if (error) {
        throw createError(`Failed to fetch Wolf payouts: ${error.message}`, 'DATABASE');
      }

      if (!payouts || payouts.length === 0) return [];

      // Get player details
      const playerIds = payouts.map((p) => p.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds);

      const playerMap = new Map<string, WolfPayoutPlayer>(
        ((players ?? []) as RawPlayer[]).map((p) => [p.id, { id: p.id, name: p.name }])
      );

      return payouts.map((payout) => ({
        ...payout,
        player: playerMap.get(payout.player_id) ?? { id: payout.player_id, name: 'Unknown' },
      })) as WolfPayoutWithPlayer[];
    },
    enabled: !!gameId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to check if user has Premium tier (can use Wolf)
 *
 * Wolf is a Premium-only feature.
 *
 * @param userId - User ID to check (optional, uses current user if not provided)
 * @returns Query result with boolean indicating Wolf access
 */
export function useCanUseWolf(userId?: string) {
  return useQuery({
    queryKey: wolfKeys.canUseWolf(userId ?? 'current'),
    queryFn: async (): Promise<boolean> => {
      // Get current user if userId not provided
      let targetUserId = userId;
      if (!targetUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        targetUserId = user?.id;
      }

      if (!targetUserId) return false;

      // Check user_has_feature function (which checks tier limits)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('user_has_feature', {
        p_user_id: targetUserId,
        p_feature: 'wolf',
      });

      if (error) {
        console.error('[useCanUseWolf] Failed to check feature access:', error);
        return false;
      }

      return data === true;
    },
    staleTime: CACHE_TIMES.STANDARD, // tier doesn't change often
    gcTime: GC_TIMES.STANDARD,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch complete Wolf game summary
 *
 * Combines game, decisions, and payouts with calculated standings.
 *
 * @param gameId - Wolf game UUID
 * @returns Query result with WolfGameSummary
 */
export function useWolfSummary(gameId: string | undefined) {
  const gameQuery = useWolfGame(gameId);
  const decisionsQuery = useWolfHoleDecisions(gameId);
  const payoutsQuery = useWolfPayouts(gameId);

  const game = gameQuery.data;

  // Compute summary using useMemo
  const summary = useMemo((): WolfGameSummary | null => {
    if (!game) return null;
    const decisions = decisionsQuery.data ?? [];
    const payouts = payoutsQuery.data ?? [];

    // Create player name map
    const playerNames: Record<string, string> = {};
    for (const participant of game.participants) {
      playerNames[participant.id] = participant.name;
    }

    // Calculate standings
    const standingsMap = calculateWolfStandings(decisions, game.participant_ids);
    const standings = getSortedStandings(standingsMap, playerNames);

    // Calculate net_result for each standing entry when pot is enabled
    if (game.pot_enabled && game.pot_value_per_point) {
      const payoutCalcs = calculateWolfPayouts(standingsMap, game.pot_value_per_point);
      for (const entry of standings) {
        entry.net_result = payoutCalcs[entry.player_id]?.netResult ?? 0;
      }
    }

    // Count completed holes (have calculated_at) and decided holes
    const holesCompleted = decisions.filter((d) => d.calculated_at !== null).length;
    const holesDecided = decisions.filter((d) => d.decided_at !== null).length;

    return {
      game,
      decisions,
      payouts,
      standings,
      holes_completed: holesCompleted,
      holes_decided: holesDecided,
    };
  }, [game, decisionsQuery.data, payoutsQuery.data]);

  return {
    data: summary,
    isLoading: gameQuery.isLoading || decisionsQuery.isLoading || payoutsQuery.isLoading,
    isError: gameQuery.isError || decisionsQuery.isError || payoutsQuery.isError,
    error: gameQuery.error || decisionsQuery.error || payoutsQuery.error,
    refetch: async () => {
      await Promise.all([
        gameQuery.refetch(),
        decisionsQuery.refetch(),
        payoutsQuery.refetch(),
      ]);
    },
  };
}
