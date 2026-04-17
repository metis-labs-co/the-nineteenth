/**
 * Leagues API Queries
 *
 * Read-only operations for leagues, leaderboards, rounds, and scorecards.
 */

import { supabase } from '@/services/supabase/client';
import type {
  League,
  LeaguePlayer,
  LeagueRound,
  LeagueLeaderboardEntry,
  LeagueSortMode,
  LeagueRoundDetail,
  LeagueWithPlayerCount,
  EclecticBestScore,
  EclecticLeaderboardEntry,
} from '@/types/database';
import type { EligibleScorecard } from './types';

// Helper to bypass Supabase generated types for new tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

/**
 * Fetch leagues where the user is creator or accepted member
 */
export async function getLeagues(): Promise<League[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_my_leagues');

  if (error) {
    console.error('[Leagues] Error fetching leagues:', error);
    throw new Error(`Failed to fetch leagues: ${error.message}`);
  }

  return (data ?? []) as League[];
}

/**
 * Fetch public active leagues with optional search and player count
 */
export async function getPublicLeagues(search?: string): Promise<LeagueWithPlayerCount[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_public_leagues', {
    p_search: search || null,
  });

  if (error) {
    console.error('[Leagues] Error fetching public leagues:', error);
    throw new Error(`Failed to fetch public leagues: ${error.message}`);
  }

  return (data ?? []) as LeagueWithPlayerCount[];
}

/**
 * Fetch a single league by ID
 */
export async function getLeague(id: string): Promise<League | null> {
  const { data, error } = await from('leagues')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[Leagues] Error fetching league:', error);
    throw new Error(`Failed to fetch league: ${error.message}`);
  }

  return data as League;
}

/**
 * Fetch league players with player details
 */
export async function getLeaguePlayers(leagueId: string): Promise<(LeaguePlayer & {
  player: { id: string; name: string; photo_url: string | null; handicap: number | null; handicap_index: number | null; gender: string | null };
})[]> {
  const { data, error } = await from('league_players')
    .select(`
      *,
      player:players!league_players_player_id_fkey (
        id, name, photo_url, handicap, handicap_index, gender
      )
    `)
    .eq('league_id', leagueId)
    .eq('status', 'accepted');

  if (error) {
    console.error('[Leagues] Error fetching league players:', error);
    throw new Error(`Failed to fetch league players: ${error.message}`);
  }

  return (data ?? []) as unknown as (LeaguePlayer & {
    player: { id: string; name: string; photo_url: string | null; handicap: number | null; handicap_index: number | null; gender: string | null };
  })[];
}

/**
 * Fetch league leaderboard using the DB function
 */
export async function getLeagueLeaderboard(
  leagueId: string,
  sortMode: LeagueSortMode = 'gross'
): Promise<LeagueLeaderboardEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_league_leaderboard_v2', { p_league_id: leagueId, p_sort_mode: sortMode });

  if (error) {
    console.error('[Leagues] Error fetching leaderboard:', error);
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  return (data ?? []) as LeagueLeaderboardEntry[];
}

/**
 * Fetch eclectic leaderboard using the DB function
 */
export async function getEclecticLeaderboard(leagueId: string): Promise<EclecticLeaderboardEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_eclectic_leaderboard', { p_league_id: leagueId });

  if (error) {
    console.error('[Leagues] Error fetching eclectic leaderboard:', error);
    throw new Error(`Failed to fetch eclectic leaderboard: ${error.message}`);
  }

  return (data ?? []) as EclecticLeaderboardEntry[];
}

/**
 * Fetch a player's eclectic best scores for the "My Card" tab
 */
export async function getEclecticBestScores(
  leagueId: string,
  playerId?: string
): Promise<EclecticBestScore[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data, error } = await from('eclectic_best_scores')
    .select('*')
    .eq('league_id', leagueId)
    .eq('player_id', playerId ?? user.id)
    .order('hole_number', { ascending: true });

  if (error) {
    console.error('[Leagues] Error fetching eclectic best scores:', error);
    throw new Error(`Failed to fetch eclectic best scores: ${error.message}`);
  }

  return (data ?? []) as EclecticBestScore[];
}

/**
 * Fetch rounds tagged to a league for the current user
 */
export async function getMyLeagueRounds(leagueId: string): Promise<LeagueRound[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data, error } = await from('league_rounds')
    .select('*')
    .eq('league_id', leagueId)
    .eq('player_id', user.id)
    .order('tagged_at', { ascending: false });

  if (error) {
    console.error('[Leagues] Error fetching league rounds:', error);
    throw new Error(`Failed to fetch league rounds: ${error.message}`);
  }

  return (data ?? []) as LeagueRound[];
}

/**
 * Fetch a player's league rounds with full scorecard and round details
 */
export async function getPlayerLeagueRounds(
  leagueId: string,
  playerId: string
): Promise<LeagueRoundDetail[]> {
  // Query 1: league_rounds with scorecard data (avoids deep nested join
  // through rounds table which fails due to RLS on standalone rounds)
  const { data: leagueRoundsData, error: error1 } = await from('league_rounds')
    .select(`
      id,
      scorecard_id,
      handicap_differential,
      tagged_at,
      scorecards!league_rounds_scorecard_id_fkey (
        round_id,
        total_gross,
        course_rating_used,
        slope_rating_used,
        daily_handicap_used
      )
    `)
    .eq('league_id', leagueId)
    .eq('player_id', playerId)
    .order('tagged_at', { ascending: false });

  if (error1) {
    console.error('[Leagues] Error fetching player league rounds:', error1);
    throw new Error(`Failed to fetch player league rounds: ${error1.message}`);
  }

  interface LeagueRoundRow {
    id: string;
    scorecard_id: string;
    handicap_differential: number;
    tagged_at: string;
    scorecards?: {
      round_id?: string;
      total_gross?: number;
      course_rating_used?: number | null;
      slope_rating_used?: number | null;
      daily_handicap_used?: number | null;
    };
  }

  const rows = (leagueRoundsData ?? []) as unknown as LeagueRoundRow[];
  const roundIds = rows
    .map((r) => r.scorecards?.round_id)
    .filter((id): id is string => !!id);

  // Query 2: fetch round date + course name separately (direct query
  // bypasses the nested RLS issue on standalone rounds)
  interface RoundWithCourse {
    id: string;
    date: string | null;
    courses?: { name?: string };
  }
  let roundsMap = new Map<string, RoundWithCourse>();

  if (roundIds.length > 0) {
    const { data: roundsData } = await from('rounds')
      .select(`
        id,
        date,
        courses!course_id (
          name
        )
      `)
      .in('id', roundIds);

    if (roundsData) {
      roundsMap = new Map(
        (roundsData as unknown as RoundWithCourse[]).map((r) => [r.id, r])
      );
    }
  }

  return rows.map((row) => {
    const sc = row.scorecards;
    const round = sc?.round_id ? roundsMap.get(sc.round_id) : undefined;

    return {
      id: row.id,
      scorecard_id: row.scorecard_id,
      round_id: sc?.round_id ?? '',
      handicap_differential: row.handicap_differential,
      tagged_at: row.tagged_at,
      total_gross: sc?.total_gross ?? 0,
      course_rating_used: sc?.course_rating_used ?? null,
      slope_rating_used: sc?.slope_rating_used ?? null,
      daily_handicap_used: sc?.daily_handicap_used ?? null,
      course_name: round?.courses?.name ?? 'Unknown Course',
      date_played: round?.date ?? null,
    } satisfies LeagueRoundDetail;
  });
}

/**
 * Fetch completed 18-hole scorecards eligible for tagging
 */
export async function getEligibleScorecards(
  leagueId: string,
  league?: League | null
): Promise<EligibleScorecard[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data: tagged } = await from('league_rounds')
    .select('scorecard_id')
    .eq('league_id', leagueId)
    .eq('player_id', user.id);

  const taggedIds = (tagged ?? []).map((r: { scorecard_id: string }) => r.scorecard_id);

  let query = supabase
    .from('scorecards')
    .select(`
      id,
      round_id,
      player_id,
      handicap_differential,
      status,
      created_at,
      total_gross,
      rounds!inner (
        date,
        course_id,
        courses (
          name
        )
      )
    `)
    .eq('player_id', user.id)
    .in('status', ['completed', 'confirmed'])
    .order('created_at', { ascending: false });

  if (taggedIds.length > 0) {
    query = query.not('id', 'in', `(${taggedIds.join(',')})`);
  }

  if (league?.league_type === 'eclectic' && league.course_id) {
    query = query.eq('rounds.course_id', league.course_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Leagues] Error fetching eligible scorecards:', error);
    throw new Error(`Failed to fetch eligible scorecards: ${error.message}`);
  }

  interface ScorecardWithRound {
    id: string;
    round_id: string | null;
    player_id: string;
    handicap_differential: number | null;
    status: string;
    created_at: string;
    total_gross: number | null;
    rounds?: { date?: string; course_id?: string; courses?: { name?: string } };
  }
  return ((data ?? []) as unknown as ScorecardWithRound[]).map((sc) => ({
    id: sc.id,
    round_id: sc.round_id,
    player_id: sc.player_id,
    handicap_differential: sc.handicap_differential,
    status: sc.status,
    created_at: sc.created_at,
    total_gross: sc.total_gross,
    course_name: sc.rounds?.courses?.name ?? null,
    club_name: null,
    course_id: sc.rounds?.course_id ?? null,
    needs_recalculation: sc.handicap_differential == null,
  }));
}

/**
 * Fetch which leagues a scorecard is already tagged to
 */
export async function getLeagueTagsForScorecard(scorecardId: string): Promise<{
  leagueRoundId: string;
  leagueId: string;
  taggedAt: string;
}[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data, error } = await from('league_rounds')
    .select('id, league_id, tagged_at')
    .eq('scorecard_id', scorecardId)
    .eq('player_id', user.id);

  if (error) {
    console.error('[Leagues] Error fetching scorecard tags:', error);
    throw new Error(`Failed to fetch scorecard tags: ${error.message}`);
  }

  return ((data ?? []) as unknown as { id: string; league_id: string; tagged_at: string }[]).map((row) => ({
    leagueRoundId: row.id,
    leagueId: row.league_id,
    taggedAt: row.tagged_at,
  }));
}

/**
 * Count the number of rounds a player has tagged to a league
 */
export async function getPlayerTagCount(leagueId: string): Promise<number> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { count, error } = await from('league_rounds')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('player_id', user.id);

  if (error) {
    console.error('[Leagues] Error fetching tag count:', error);
    return 0;
  }

  return count ?? 0;
}
