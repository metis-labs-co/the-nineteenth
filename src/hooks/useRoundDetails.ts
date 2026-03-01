/**
 * useRoundDetails - Hook for fetching round details and scorecards
 *
 * @description
 * Provides data fetching logic for round details screens.
 * Includes round metadata with course info and player scorecards.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import { teeToTeeBox } from '@/utils/teeTransformers';
import type { Round, Course, Scorecard, Player, Club, Pairing, Competition, Tee, TeeBox } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface CourseWithClub extends Course {
  club: Pick<Club, 'id' | 'name' | 'city' | 'state' | 'address'> | null;
}

/**
 * @deprecated Use CourseWithClub instead - Venue was renamed to Club
 */
export type CourseWithVenue = CourseWithClub;

export type CompetitionSummary = Pick<Competition, 'id' | 'name' | 'competition_type' | 'status' | 'start_date' | 'end_date'>;

export interface RoundWithCourse extends Round {
  course: CourseWithClub | null;
  competition: CompetitionSummary | null;
}

export interface ScorecardWithPlayer extends Scorecard {
  player: Player | null;
}

// =====================================================
// DATA FETCHING
// =====================================================

async function fetchRoundDetails(roundId: string): Promise<RoundWithCourse> {
  const { data, error } = await supabase
    .from('rounds')
    .select(`
      *,
      courses (
        *,
        clubs (id, name, city, state, address),
        tees_from_table:tees (*)
      ),
      competitions (id, name, competition_type, status, start_date, end_date)
    `)
    .eq('id', roundId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch round: ${error.message}`);
  }

  // Handle Supabase join types
  const roundData = data as Record<string, unknown>;
  const courseData = roundData.courses as Record<string, unknown> | null;
  const competitionData = roundData.competitions as CompetitionSummary | null;

  // Merge tees from table into course.tees for backward compatibility
  let mergedCourse: CourseWithClub | null = null;
  if (courseData) {
    const teesFromTable = (courseData.tees_from_table as Tee[] | null) ?? [];
    const legacyTees = (courseData.tees as TeeBox[] | null) ?? [];

    // Prefer tees from table, fallback to legacy JSONB
    const mergedTees = teesFromTable.length > 0 ? teesFromTable.map(teeToTeeBox) : legacyTees;

    // Build merged course without temporary fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tees_from_table, clubs, ...courseWithoutTemp } = courseData as Record<string, unknown>;
    mergedCourse = {
      ...courseWithoutTemp,
      tees: mergedTees,
      club: (clubs as CourseWithClub['club']) || null,
    } as CourseWithClub;
  }

  return {
    ...roundData,
    course: mergedCourse,
    competition: competitionData,
  } as RoundWithCourse;
}

async function fetchRoundScorecards(roundId: string): Promise<ScorecardWithPlayer[]> {
  const { data, error } = await supabase
    .from('scorecards')
    .select(`
      *,
      players!player_id (*)
    `)
    .eq('round_id', roundId)
    .order('total_points', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch scorecards: ${error.message}`);
  }

  return (data || []).map((scorecard: Record<string, unknown>) => ({
    ...scorecard,
    player: (scorecard.players as Player) || null,
  })) as ScorecardWithPlayer[];
}

// =====================================================
// HOOKS
// =====================================================

export function useRoundDetails(roundId: string) {
  return useQuery({
    queryKey: roundKeys.detail(roundId),
    queryFn: () => fetchRoundDetails(roundId),
    enabled: !!roundId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useRoundScorecards(roundId: string) {
  return useQuery({
    queryKey: scorecardKeys.list({ roundId }),
    queryFn: () => fetchRoundScorecards(roundId),
    enabled: !!roundId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// =====================================================
// ROUND PLAYERS (from pairings OR round_players)
// =====================================================

export interface RoundPlayer extends Player {
  has_scorecard: boolean;
}

async function fetchRoundPlayers(roundId: string): Promise<RoundPlayer[]> {
  const playerIds = new Set<string>();

  // First, get the round to check if it belongs to a competition
  const { data: roundData } = await supabase
    .from('rounds')
    .select('competition_id')
    .eq('id', roundId)
    .single() as { data: { competition_id: string | null } | null };

  // 1. Try to get players from pairings (competition rounds)
  const { data: pairingsData, error: pairingsError } = await supabase
    .from('pairings')
    .select('player_ids')
    .eq('round_id', roundId);

  if (pairingsError) {
    console.error('Error fetching pairings:', pairingsError);
  }

  // Type assertion for pairings data
  const pairings = (pairingsData || []) as Pick<Pairing, 'player_ids'>[];

  // Collect player IDs from pairings
  pairings.forEach((pairing) => {
    (pairing.player_ids || []).forEach((id) => playerIds.add(id));
  });

  // 2. For competition rounds, get players from competition_players
  if (roundData?.competition_id) {
    const { data: compPlayersData, error: compPlayersError } = await supabase
      .from('competition_players')
      .select('player_id')
      .eq('competition_id', roundData.competition_id)
      .eq('status', 'accepted') as unknown as { data: { player_id: string }[] | null; error: any };

    if (compPlayersError) {
      console.error('Error fetching competition_players:', compPlayersError);
    } else if (compPlayersData) {
      compPlayersData.forEach((cp) => {
        playerIds.add(cp.player_id);
      });
    }
  }

  // 3. Also try to get players from round_players (standalone/social rounds)
  try {
    const { data: roundPlayersData, error: roundPlayersError } = await supabase
      .from('round_players')
      .select('player_id')
      .eq('round_id', roundId) as { data: { player_id: string }[] | null; error: { code?: string; message: string } | null };

    if (roundPlayersError) {
      // Table might not exist - not a critical error
      if (roundPlayersError.code !== 'PGRST205') {
        console.error('Error fetching round_players:', roundPlayersError);
      }
    } else if (roundPlayersData) {
      // Add player IDs from round_players
      roundPlayersData.forEach((rp) => {
        playerIds.add(rp.player_id);
      });
    }
  } catch (err) {
    // Silently ignore if round_players table doesn't exist
    console.log('round_players fetch skipped');
  }

  if (playerIds.size === 0) {
    return [];
  }

  // 3. Fetch player details
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('*')
    .in('id', Array.from(playerIds));

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  // Type assertion for players data
  const players = (playersData || []) as Player[];

  // 4. Check which players have scorecards
  const { data: scorecardsData } = await supabase
    .from('scorecards')
    .select('player_id')
    .eq('round_id', roundId);

  // Type assertion for scorecards data
  const scorecards = (scorecardsData || []) as Pick<Scorecard, 'player_id'>[];

  const playersWithScorecards = new Set(
    scorecards.map((sc) => sc.player_id)
  );

  return players.map((player) => ({
    ...player,
    has_scorecard: playersWithScorecards.has(player.id),
  }));
}

export function useRoundPlayers(roundId: string) {
  return useQuery({
    queryKey: [...roundKeys.detail(roundId), 'players'],
    queryFn: () => fetchRoundPlayers(roundId),
    enabled: !!roundId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
