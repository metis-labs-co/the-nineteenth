/**
 * Leagues API Service
 *
 * Handles all league CRUD operations against Supabase.
 *
 * Note: League tables (leagues, league_players, league_rounds) are not yet
 * in the auto-generated Supabase types. We use `as any` on .from() calls
 * and cast results to our TypeScript types. Once `supabase gen types` is run
 * after deploying the migration, these casts can be removed.
 */

import { supabase } from '@/services/supabase/client';
import type {
  League,
  LeaguePlayer,
  LeagueRound,
  LeagueType,
  LeagueLeaderboardEntry,
  LeagueRoundDetail,
  LeagueWithPlayerCount,
  EclecticBestScore,
  EclecticLeaderboardEntry,
  EclecticScoring,
  LadderSeeding,
  PartnershipFormat,
} from '@/types/database';

// =====================================================
// TYPES
// =====================================================

export interface CreateLeagueInput {
  name: string;
  description?: string;
  league_type?: LeagueType;
  // Season fields
  start_date?: string;
  end_date?: string;
  // Round Limit fields
  max_rounds?: number;
  counting_rounds?: number;
  // Ladder fields
  challenge_range?: number;
  ladder_seeding?: LadderSeeding;
  // Eclectic fields
  course_id?: string;
  tee_id?: string;
  eclectic_scoring?: EclecticScoring;
  // Partnership fields
  partnership_format?: PartnershipFormat;
  // Visibility
  is_public?: boolean;
}

export interface EligibleScorecard {
  id: string;
  round_id: string | null;
  player_id: string;
  handicap_differential: number;
  status: string;
  created_at: string;
  course_name: string | null;
  club_name: string | null;
  total_gross: number | null;
  course_id?: string | null;
}

// Helper to bypass Supabase generated types for new tables.
// These tables exist in the DB but haven't been added to generated types yet.
// Once `supabase gen types` is run after deploying migrations, this can be removed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

// =====================================================
// QUERIES
// =====================================================

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
  player: { id: string; name: string; photo_url: string | null };
})[]> {
  const { data, error } = await from('league_players')
    .select(`
      *,
      player:players!league_players_player_id_fkey (
        id, name, photo_url
      )
    `)
    .eq('league_id', leagueId)
    .eq('status', 'accepted');

  if (error) {
    console.error('[Leagues] Error fetching league players:', error);
    throw new Error(`Failed to fetch league players: ${error.message}`);
  }

  return (data ?? []) as unknown as (LeaguePlayer & {
    player: { id: string; name: string; photo_url: string | null };
  })[];
}

/**
 * Fetch league leaderboard using the DB function
 */
export async function getLeagueLeaderboard(leagueId: string): Promise<LeagueLeaderboardEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('get_league_leaderboard', { p_league_id: leagueId });

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
  const { data, error } = await from('league_rounds')
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
        daily_handicap_used,
        rounds (
          date,
          courses (
            name
          )
        )
      )
    `)
    .eq('league_id', leagueId)
    .eq('player_id', playerId)
    .order('tagged_at', { ascending: false });

  if (error) {
    console.error('[Leagues] Error fetching player league rounds:', error);
    throw new Error(`Failed to fetch player league rounds: ${error.message}`);
  }

  // Flatten the nested Supabase response
  interface NestedLeagueRoundRow {
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
      rounds?: { date?: string; courses?: { name?: string } };
    };
  }
  return ((data ?? []) as unknown as NestedLeagueRoundRow[]).map((row) => {
    const sc = row.scorecards;
    const round = sc?.rounds;
    const course = round?.courses;

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
      course_name: course?.name ?? 'Unknown Course',
      date_played: round?.date ?? null,
    } satisfies LeagueRoundDetail;
  });
}

/**
 * Fetch completed 18-hole scorecards eligible for tagging
 * For eclectic leagues, filters to scorecards from the league's course only
 */
export async function getEligibleScorecards(
  leagueId: string,
  league?: League | null
): Promise<EligibleScorecard[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Get already-tagged scorecard IDs for this league
  const { data: tagged } = await from('league_rounds')
    .select('scorecard_id')
    .eq('league_id', leagueId)
    .eq('player_id', user.id);

  const taggedIds = (tagged ?? []).map((r: { scorecard_id: string }) => r.scorecard_id);

  // Get eligible scorecards - include round's course_id for eclectic filtering
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
    .not('handicap_differential', 'is', null)
    .order('created_at', { ascending: false });

  if (taggedIds.length > 0) {
    query = query.not('id', 'in', `(${taggedIds.join(',')})`);
  }

  // For eclectic leagues, filter to correct course
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
    handicap_differential: number;
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
  }));
}

/**
 * Fetch which leagues a scorecard is already tagged to (for the current user)
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

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new league. Creator is auto-added as first player.
 */
export async function createLeague(input: CreateLeagueInput): Promise<League> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Build insert payload with type-specific fields
  const insertPayload: Record<string, unknown> = {
    name: input.name,
    description: input.description || null,
    created_by: user.id,
    league_type: input.league_type || 'ongoing',
    is_public: input.is_public ?? false,
  };

  // Season fields
  if (input.league_type === 'season') {
    insertPayload.start_date = input.start_date;
    insertPayload.end_date = input.end_date;
  }

  // Round Limit fields
  if (input.league_type === 'round_limit') {
    insertPayload.max_rounds = input.max_rounds;
    insertPayload.counting_rounds = input.counting_rounds || null;
  }

  // Ladder fields
  if (input.league_type === 'ladder') {
    insertPayload.challenge_range = input.challenge_range ?? 3;
    insertPayload.ladder_seeding = input.ladder_seeding ?? 'join_order';
  }

  // Eclectic fields
  if (input.league_type === 'eclectic') {
    insertPayload.course_id = input.course_id;
    insertPayload.tee_id = input.tee_id || null;
    insertPayload.eclectic_scoring = input.eclectic_scoring ?? 'gross';
  }

  // Partnership fields
  if (input.league_type === 'partnership') {
    insertPayload.partnership_format = input.partnership_format;
  }

  // Create the league (invite code auto-generated by trigger)
  const { data: league, error: leagueError } = await from('leagues')
    .insert(insertPayload)
    .select()
    .single();

  if (leagueError) {
    console.error('[Leagues] Error creating league:', leagueError);
    throw new Error(`Failed to create league: ${leagueError.message}`);
  }

  // Add creator as first player
  const { error: playerError } = await from('league_players')
    .insert({
      league_id: league.id,
      player_id: user.id,
      status: 'accepted',
    });

  if (playerError) {
    console.error('[Leagues] Error adding creator as player:', playerError);
    // Don't throw — league was created, player join is best-effort
  }

  return league as League;
}

/**
 * Join a league via invite code
 */
export async function joinLeague(inviteCode: string): Promise<League> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Find the league by invite code (uses SECURITY DEFINER to bypass RLS for private leagues)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leagues, error: findError } = await (supabase as any)
    .rpc('lookup_league_by_invite_code', { p_invite_code: inviteCode.trim() });

  const league = leagues?.[0];
  if (findError || !league) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  // Check if already a member
  const { data: existing } = await from('league_players')
    .select('status')
    .eq('league_id', league.id)
    .eq('player_id', user.id)
    .single();

  if (existing && existing.status === 'accepted') {
    throw new Error('You are already a member of this league.');
  }

  // Join (upsert in case of previous declined/removed status)
  const { error: joinError } = await from('league_players')
    .upsert({
      league_id: league.id,
      player_id: user.id,
      status: 'accepted',
      joined_at: new Date().toISOString(),
    }, {
      onConflict: 'league_id,player_id',
    });

  if (joinError) {
    console.error('[Leagues] Error joining league:', joinError);
    throw new Error(`Failed to join league: ${joinError.message}`);
  }

  return league as League;
}

/**
 * Join a public league directly (no invite code needed)
 */
export async function joinPublicLeague(leagueId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Check if already a member
  const { data: existing } = await from('league_players')
    .select('status')
    .eq('league_id', leagueId)
    .eq('player_id', user.id)
    .single();

  if (existing && existing.status === 'accepted') {
    throw new Error('You are already a member of this league.');
  }

  const { error: joinError } = await from('league_players')
    .upsert({
      league_id: leagueId,
      player_id: user.id,
      status: 'accepted',
      joined_at: new Date().toISOString(),
    }, {
      onConflict: 'league_id,player_id',
    });

  if (joinError) {
    console.error('[Leagues] Error joining public league:', joinError);
    throw new Error(`Failed to join league: ${joinError.message}`);
  }
}

/**
 * Tag a scorecard to a league with type-specific validation
 */
export async function tagRoundToLeague(
  leagueId: string,
  scorecardId: string
): Promise<LeagueRound> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Fetch the scorecard to validate and get differential
  const { data: scorecard, error: scError } = await supabase
    .from('scorecards')
    .select('id, player_id, handicap_differential, status, scores, round_id')
    .eq('id', scorecardId)
    .single();

  if (scError || !scorecard) {
    throw new Error('Scorecard not found');
  }

  interface ScorecardForTag {
    id: string;
    player_id: string;
    handicap_differential: number | null;
    status: string;
    scores: Record<string, { strokes?: number; net_score?: number }> | null;
    round_id: string | null;
  }
  const sc = scorecard as unknown as ScorecardForTag;

  if (sc.player_id !== user.id) {
    throw new Error('You can only tag your own scorecards');
  }

  if (sc.status !== 'completed' && sc.status !== 'confirmed') {
    throw new Error('Only completed scorecards can be tagged');
  }

  if (sc.handicap_differential == null) {
    throw new Error('This scorecard does not have a handicap differential');
  }

  // Validate 18 holes - scores is a Record<string, HoleScore> keyed by hole number
  const scores = sc.scores;
  if (!scores || typeof scores !== 'object') {
    throw new Error('Invalid scorecard data');
  }

  const holesWithStrokes = Object.values(scores).filter(
    (s) => s && s.strokes != null && s.strokes > 0
  );
  if (holesWithStrokes.length < 18) {
    throw new Error('Only 18-hole rounds can be tagged to leagues');
  }

  // Check league is active and get type-specific config
  const { data: league } = await from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (!league || league.status !== 'active') {
    throw new Error('This league is archived and no longer accepts rounds');
  }

  // Type-specific validations
  await validateTagForLeagueType(league as League, sc, user.id);

  // Insert the league round
  const { data, error } = await from('league_rounds')
    .insert({
      league_id: leagueId,
      scorecard_id: scorecardId,
      player_id: user.id,
      handicap_differential: sc.handicap_differential,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This scorecard is already tagged to this league');
    }
    console.error('[Leagues] Error tagging round:', error);
    throw new Error(`Failed to tag round: ${error.message}`);
  }

  // For eclectic leagues, update best scores
  if (league.league_type === 'eclectic') {
    await updateEclecticBestScores(leagueId, user.id, scorecardId, scores, league as League);
  }

  return data as LeagueRound;
}

/**
 * Validate a tag operation based on league type
 */
async function validateTagForLeagueType(
  league: League,
  scorecard: { round_id: string | null; handicap_differential: number | null },
  _userId: string
): Promise<void> {
  switch (league.league_type) {
    case 'season': {
      // Get the round date to validate it's within the season window
      if (scorecard.round_id) {
        const { data: roundData } = await from('rounds')
          .select('date')
          .eq('id', scorecard.round_id)
          .single();

        const round = roundData as { date: string } | null;
        if (round?.date && league.start_date && league.end_date) {
          const roundDate = round.date; // Already DATE format (YYYY-MM-DD)
          if (roundDate < league.start_date) {
            throw new Error('This round was played before the season started');
          }
          if (roundDate > league.end_date) {
            throw new Error('This round was played after the season ended');
          }
        }
      }

      // Check if season has ended
      if (league.end_date) {
        const today = new Date().toISOString().split('T')[0];
        if (today > league.end_date) {
          throw new Error('This season has ended. No more rounds can be tagged.');
        }
      }
      break;
    }

    case 'round_limit': {
      // Check if player has reached their max rounds
      if (league.max_rounds) {
        const tagCount = await getPlayerTagCount(league.id);
        if (tagCount >= league.max_rounds) {
          throw new Error(
            `You have reached the maximum of ${league.max_rounds} rounds. Untag a round first to add a new one.`
          );
        }
      }
      break;
    }

    case 'eclectic': {
      // Validate the round was played at the league's course
      if (scorecard.round_id && league.course_id) {
        const { data: roundData } = await from('rounds')
          .select('course_id')
          .eq('id', scorecard.round_id)
          .single();

        const round = roundData as { course_id: string } | null;
        if (round?.course_id !== league.course_id) {
          throw new Error('Only rounds played at this league\'s course can be tagged');
        }
      }
      break;
    }

    case 'ladder':
      // Ladder tagging is done through challenges, not direct tagging
      // This allows standalone round tagging for position record
      break;
  }
}

/**
 * Update eclectic best scores after tagging a round
 * For each hole, only update if the new score is better (lower)
 */
async function updateEclecticBestScores(
  leagueId: string,
  playerId: string,
  scorecardId: string,
  scores: Record<string, { strokes?: number; net_score?: number }>,
  league: League
): Promise<void> {
  for (const [holeKey, score] of Object.entries(scores)) {
    if (!score || score.strokes == null || score.strokes <= 0) continue;

    const holeNumber = parseInt(holeKey, 10);
    if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) continue;

    // Calculate net score if applicable
    let bestNet: number | null = null;
    if (league.eclectic_scoring === 'net' && score.net_score != null) {
      bestNet = score.net_score;
    }

    // Check if there's an existing best score for this hole
    const { data: existing } = await from('eclectic_best_scores')
      .select('id, best_gross')
      .eq('league_id', leagueId)
      .eq('player_id', playerId)
      .eq('hole_number', holeNumber)
      .single();

    if (existing) {
      // Only update if the new score is better
      if (score.strokes < existing.best_gross) {
        await from('eclectic_best_scores')
          .update({
            best_gross: score.strokes,
            best_net: bestNet,
            source_scorecard_id: scorecardId,
            achieved_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } else {
      // Insert new best score
      await from('eclectic_best_scores')
        .insert({
          league_id: leagueId,
          player_id: playerId,
          hole_number: holeNumber,
          best_gross: score.strokes,
          best_net: bestNet,
          source_scorecard_id: scorecardId,
        });
    }
  }
}

/**
 * Untag a round from a league
 */
export async function untagRound(leagueRoundId: string, leagueId?: string): Promise<void> {
  // Check if this is an eclectic league (prevent untagging)
  if (leagueId) {
    const { data: league } = await from('leagues')
      .select('league_type')
      .eq('id', leagueId)
      .single();

    if (league?.league_type === 'eclectic') {
      throw new Error('Rounds cannot be untagged from eclectic leagues. Best scores are permanently recorded.');
    }
  }

  const { error } = await from('league_rounds')
    .delete()
    .eq('id', leagueRoundId);

  if (error) {
    console.error('[Leagues] Error untagging round:', error);
    throw new Error(`Failed to untag round: ${error.message}`);
  }
}

/**
 * Leave a league. Removes player's tagged rounds too.
 */
export async function leaveLeague(leagueId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Delete player's league rounds first (no CASCADE path)
  await from('league_rounds')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', user.id);

  // Update player status to 'removed' with removed_by = self (voluntary leave)
  const { error } = await from('league_players')
    .update({ status: 'removed', removed_by: user.id })
    .eq('league_id', leagueId)
    .eq('player_id', user.id);

  if (error) {
    console.error('[Leagues] Error leaving league:', error);
    throw new Error(`Failed to leave league: ${error.message}`);
  }
}

/**
 * Admin: Remove a player from a league
 */
export async function removePlayer(leagueId: string, playerId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Delete player's league rounds first
  await from('league_rounds')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', playerId);

  // Set removed_by to current user (admin removal)
  const { error } = await from('league_players')
    .update({ status: 'removed', removed_by: user.id })
    .eq('league_id', leagueId)
    .eq('player_id', playerId);

  if (error) {
    console.error('[Leagues] Error removing player:', error);
    throw new Error(`Failed to remove player: ${error.message}`);
  }
}

/**
 * Admin: Archive a league (read-only mode)
 */
export async function archiveLeague(leagueId: string): Promise<void> {
  const { error } = await from('leagues')
    .update({ status: 'archived' })
    .eq('id', leagueId);

  if (error) {
    console.error('[Leagues] Error archiving league:', error);
    throw new Error(`Failed to archive league: ${error.message}`);
  }
}

/**
 * Admin: Delete a league and all associated data
 */
export async function deleteLeague(leagueId: string): Promise<void> {
  // Delete league rounds first
  await from('league_rounds')
    .delete()
    .eq('league_id', leagueId);

  // Delete league players
  await from('league_players')
    .delete()
    .eq('league_id', leagueId);

  // Delete the league itself
  const { error } = await from('leagues')
    .delete()
    .eq('id', leagueId);

  if (error) {
    console.error('[Leagues] Error deleting league:', error);
    throw new Error(`Failed to delete league: ${error.message}`);
  }
}

/**
 * Admin: Add players to a league (by player IDs)
 */
export async function addPlayersToLeague(
  leagueId: string,
  playerIds: string[]
): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  if (playerIds.length === 0) return;

  const inserts = playerIds.map((playerId) => ({
    league_id: leagueId,
    player_id: playerId,
    status: 'accepted' as const,
    joined_at: new Date().toISOString(),
  }));

  const { error } = await from('league_players')
    .upsert(inserts, { onConflict: 'league_id,player_id' });

  if (error) {
    console.error('[Leagues] Error adding players:', error);
    throw new Error(`Failed to add players: ${error.message}`);
  }
}

/**
 * Admin: Update league name/description
 */
export async function updateLeague(
  leagueId: string,
  input: { name?: string; description?: string; is_public?: boolean }
): Promise<League> {
  const { data, error } = await from('leagues')
    .update(input)
    .eq('id', leagueId)
    .select()
    .single();

  if (error) {
    console.error('[Leagues] Error updating league:', error);
    throw new Error(`Failed to update league: ${error.message}`);
  }

  return data as League;
}
