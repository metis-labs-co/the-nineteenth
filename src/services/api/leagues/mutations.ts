/**
 * Leagues API Mutations
 *
 * Write operations: create, join, tag rounds, untag, leave, admin operations.
 */

import { supabase } from '@/services/supabase/client';
import type { League, LeagueRound } from '@/types/database';
import type { CreateLeagueInput } from './types';
import { getPlayerTagCount } from './queries';
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';

// Helper to bypass Supabase generated types for new tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

/**
 * Create a new league. Creator is auto-added as first player.
 */
export async function createLeague(input: CreateLeagueInput): Promise<League> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const insertPayload: Record<string, unknown> = {
    name: input.name,
    description: input.description || null,
    created_by: user.id,
    league_type: input.league_type || 'ongoing',
    is_public: input.is_public ?? false,
  };

  if (input.league_type === 'season') {
    insertPayload.start_date = input.start_date;
    insertPayload.end_date = input.end_date;
  }

  if (input.league_type === 'round_limit') {
    insertPayload.max_rounds = input.max_rounds;
    insertPayload.counting_rounds = input.counting_rounds || null;
  }

  if (input.league_type === 'ladder') {
    insertPayload.challenge_range = input.challenge_range ?? 3;
    insertPayload.ladder_seeding = input.ladder_seeding ?? 'join_order';
  }

  if (input.league_type === 'eclectic') {
    insertPayload.course_id = input.course_id;
    insertPayload.tee_id = input.tee_id || null;
    insertPayload.eclectic_scoring = input.eclectic_scoring ?? 'gross';
  }

  if (input.league_type === 'partnership') {
    insertPayload.partnership_format = input.partnership_format;
  }

  const { data: league, error: leagueError } = await from('leagues')
    .insert(insertPayload)
    .select()
    .single();

  if (leagueError) {
    console.error('[Leagues] Error creating league:', leagueError);
    throw new Error(`Failed to create league: ${leagueError.message}`);
  }

  const { error: playerError } = await from('league_players')
    .insert({
      league_id: league.id,
      player_id: user.id,
      status: 'accepted',
    });

  if (playerError) {
    console.error('[Leagues] Error adding creator as player:', playerError);
  }

  return league as League;
}

/**
 * Join a league via invite code
 */
export async function joinLeague(inviteCode: string): Promise<League> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leagues, error: findError } = await (supabase as any)
    .rpc('lookup_league_by_invite_code', { p_invite_code: inviteCode.trim() });

  const league = leagues?.[0];
  if (findError || !league) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  const { data: existing } = await from('league_players')
    .select('status')
    .eq('league_id', league.id)
    .eq('player_id', user.id)
    .single();

  if (existing && existing.status === 'accepted') {
    throw new Error('You are already a member of this league.');
  }

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
    // Attempt retroactive recalculation — tee data may have been updated since round was scored
    try {
      const result = await recalculateScorecardDifferential(scorecardId);
      sc.handicap_differential = result.handicapDifferential;
    } catch (recalcError) {
      const msg = recalcError instanceof Error ? recalcError.message : 'Unknown error';
      throw new Error(
        `This scorecard does not have a handicap differential and recalculation failed: ${msg}`
      );
    }
  }

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

  const { data: league } = await from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (!league || league.status !== 'active') {
    throw new Error('This league is archived and no longer accepts rounds');
  }

  await validateTagForLeagueType(league as League, sc, user.id);

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
      if (scorecard.round_id) {
        const { data: roundData } = await from('rounds')
          .select('date')
          .eq('id', scorecard.round_id)
          .single();

        const round = roundData as { date: string } | null;
        if (round?.date && league.start_date && league.end_date) {
          const roundDate = round.date;
          if (roundDate < league.start_date) {
            throw new Error('This round was played before the season started');
          }
          if (roundDate > league.end_date) {
            throw new Error('This round was played after the season ended');
          }
        }
      }

      if (league.end_date) {
        const today = new Date().toISOString().split('T')[0];
        if (today > league.end_date) {
          throw new Error('This season has ended. No more rounds can be tagged.');
        }
      }
      break;
    }

    case 'round_limit': {
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
      break;
  }
}

/**
 * Update eclectic best scores after tagging a round
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

    let bestNet: number | null = null;
    if (league.eclectic_scoring === 'net' && score.net_score != null) {
      bestNet = score.net_score;
    }

    const { data: existing } = await from('eclectic_best_scores')
      .select('id, best_gross')
      .eq('league_id', leagueId)
      .eq('player_id', playerId)
      .eq('hole_number', holeNumber)
      .single();

    if (existing) {
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

  await from('league_rounds')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', user.id);

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

  await from('league_rounds')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', playerId);

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
  await from('league_rounds')
    .delete()
    .eq('league_id', leagueId);

  await from('league_players')
    .delete()
    .eq('league_id', leagueId);

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
