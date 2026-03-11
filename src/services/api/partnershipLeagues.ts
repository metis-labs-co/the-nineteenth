/**
 * Partnership Leagues API Service
 *
 * Handles partnership CRUD, round tagging, and leaderboard queries.
 */

import { supabase } from '@/services/supabase/client';
import type {
  LeaguePartnership,
  PartnershipRound,
  PartnershipLeaderboardEntry,
  PartnershipCourseBest,
  DifficultyLevel,
} from '@/types/database';

// Helper to bypass Supabase generated types for new tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

// =====================================================
// TYPES
// =====================================================

export interface TagPartnershipRoundInput {
  leagueId: string;
  partnershipId: string;
  scorecard1Id: string;
  scorecard2Id?: string; // null for scramble
  player1Id: string;
  player2Id: string;
  courseId?: string;
  courseName: string;
  courseRating?: number;
  slopeRating?: number;
  par?: number;
  combinedGross: number;
  targetScore: number;
  difficultyLevel: DifficultyLevel;
  targetDifferential: number;
  player1Handicap?: number;
  player2Handicap?: number;
  playedAt?: string;
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Fetch all partnerships in a league
 */
export async function getPartnerships(leagueId: string): Promise<(LeaguePartnership & {
  player_1: { id: string; name: string; photo_url: string | null };
  player_2: { id: string; name: string; photo_url: string | null };
})[]> {
  const { data, error } = await from('league_partnerships')
    .select(`
      *,
      player_1:players!league_partnerships_player_1_id_fkey (
        id, name, photo_url
      ),
      player_2:players!league_partnerships_player_2_id_fkey (
        id, name, photo_url
      )
    `)
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[PartnershipLeagues] Error fetching partnerships:', error);
    throw new Error(`Failed to fetch partnerships: ${error.message}`);
  }

  return (data ?? []) as unknown as (LeaguePartnership & {
    player_1: { id: string; name: string; photo_url: string | null };
    player_2: { id: string; name: string; photo_url: string | null };
  })[];
}

/**
 * Fetch the current user's active partnership in a league
 */
export async function getMyPartnership(leagueId: string): Promise<(LeaguePartnership & {
  player_1: { id: string; name: string; photo_url: string | null };
  player_2: { id: string; name: string; photo_url: string | null };
}) | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data, error } = await from('league_partnerships')
    .select(`
      *,
      player_1:players!league_partnerships_player_1_id_fkey (
        id, name, photo_url
      ),
      player_2:players!league_partnerships_player_2_id_fkey (
        id, name, photo_url
      )
    `)
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .or(`player_1_id.eq.${user.id},player_2_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    console.error('[PartnershipLeagues] Error fetching my partnership:', error);
    throw new Error(`Failed to fetch partnership: ${error.message}`);
  }

  return data as unknown as (LeaguePartnership & {
    player_1: { id: string; name: string; photo_url: string | null };
    player_2: { id: string; name: string; photo_url: string | null };
  }) | null;
}

/**
 * Fetch partnership leaderboard via RPC
 */
export async function getPartnershipLeaderboard(leagueId: string): Promise<PartnershipLeaderboardEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_partnership_leaderboard', { p_league_id: leagueId });

  if (error) {
    console.error('[PartnershipLeagues] Error fetching leaderboard:', error);
    throw new Error(`Failed to fetch partnership leaderboard: ${error.message}`);
  }

  return (data ?? []) as PartnershipLeaderboardEntry[];
}

/**
 * Fetch partnership course bests via RPC
 */
export async function getPartnershipCourseBests(leagueId: string): Promise<PartnershipCourseBest[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_partnership_course_bests', { p_league_id: leagueId });

  if (error) {
    console.error('[PartnershipLeagues] Error fetching course bests:', error);
    throw new Error(`Failed to fetch course bests: ${error.message}`);
  }

  return (data ?? []) as PartnershipCourseBest[];
}

/**
 * Fetch tagged rounds for a partnership
 */
export async function getPartnershipRounds(partnershipId: string): Promise<PartnershipRound[]> {
  const { data, error } = await from('partnership_rounds')
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('tagged_at', { ascending: false });

  if (error) {
    console.error('[PartnershipLeagues] Error fetching rounds:', error);
    throw new Error(`Failed to fetch partnership rounds: ${error.message}`);
  }

  return (data ?? []) as PartnershipRound[];
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a partnership between the current user and another league member
 */
export async function createPartnership(
  leagueId: string,
  partnerId: string
): Promise<LeaguePartnership> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  if (user.id === partnerId) {
    throw new Error('You cannot partner with yourself');
  }

  // Enforce ordered player IDs
  const [player1Id, player2Id] = user.id < partnerId
    ? [user.id, partnerId]
    : [partnerId, user.id];

  // Get both player names for auto-generated partnership name
  const { data: playerData } = await from('players')
    .select('id, name')
    .in('id', [player1Id, player2Id]);

  const playersList = (playerData ?? []) as { id: string; name: string }[];
  const p1Name = playersList.find((p) => p.id === player1Id)?.name ?? 'Player 1';
  const p2Name = playersList.find((p) => p.id === player2Id)?.name ?? 'Player 2';
  const autoName = `${p1Name.split(' ')[0]} & ${p2Name.split(' ')[0]}`;

  const { data, error } = await from('league_partnerships')
    .insert({
      league_id: leagueId,
      player_1_id: player1Id,
      player_2_id: player2Id,
      name: autoName,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('One of you already has an active partnership in this league');
    }
    console.error('[PartnershipLeagues] Error creating partnership:', error);
    throw new Error(`Failed to create partnership: ${error.message}`);
  }

  return data as LeaguePartnership;
}

/**
 * Dissolve (deactivate) a partnership
 */
export async function dissolvePartnership(partnershipId: string): Promise<void> {
  const { error } = await from('league_partnerships')
    .update({ status: 'dissolved', updated_at: new Date().toISOString() })
    .eq('id', partnershipId);

  if (error) {
    console.error('[PartnershipLeagues] Error dissolving partnership:', error);
    throw new Error(`Failed to dissolve partnership: ${error.message}`);
  }
}

/**
 * Tag a round to a partnership league
 */
export async function tagPartnershipRound(input: TagPartnershipRoundInput): Promise<PartnershipRound> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data, error } = await from('partnership_rounds')
    .insert({
      league_id: input.leagueId,
      partnership_id: input.partnershipId,
      scorecard_1_id: input.scorecard1Id,
      scorecard_2_id: input.scorecard2Id || null,
      player_1_id: input.player1Id,
      player_2_id: input.player2Id,
      course_id: input.courseId || null,
      course_name: input.courseName,
      course_rating: input.courseRating || null,
      slope_rating: input.slopeRating || null,
      par: input.par || null,
      combined_gross: input.combinedGross,
      target_score: input.targetScore,
      difficulty_level: input.difficultyLevel,
      target_differential: input.targetDifferential,
      player_1_handicap: input.player1Handicap || null,
      player_2_handicap: input.player2Handicap || null,
      played_at: input.playedAt || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This scorecard is already tagged to this league');
    }
    console.error('[PartnershipLeagues] Error tagging round:', error);
    throw new Error(`Failed to tag round: ${error.message}`);
  }

  return data as PartnershipRound;
}

/**
 * Remove a tagged partnership round
 */
export async function untagPartnershipRound(roundId: string): Promise<void> {
  const { error } = await from('partnership_rounds')
    .delete()
    .eq('id', roundId);

  if (error) {
    console.error('[PartnershipLeagues] Error untagging round:', error);
    throw new Error(`Failed to untag round: ${error.message}`);
  }
}
