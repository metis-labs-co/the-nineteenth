/**
 * Ladder Challenges API Service
 *
 * Handles ladder challenge CRUD operations for ladder-type leagues.
 */

import { supabase } from '@/services/supabase/client';
import type {
  LadderChallenge,
  LadderStandingsEntry,
  LadderChallengeWithPlayers,
} from '@/types/database';

// Helper to bypass Supabase generated types for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

// =====================================================
// QUERIES
// =====================================================

/**
 * Fetch ladder standings using the DB function
 */
export async function getLadderStandings(leagueId: string): Promise<LadderStandingsEntry[]> {
  const { data, error } = await (supabase as any)
    .rpc('get_ladder_standings', { p_league_id: leagueId });

  if (error) {
    console.error('[Ladder] Error fetching standings:', error);
    throw new Error(`Failed to fetch ladder standings: ${error.message}`);
  }

  return (data ?? []) as LadderStandingsEntry[];
}

/**
 * Fetch challenges for a league (with player names)
 */
export async function getLeagueChallenges(
  leagueId: string,
  status?: string[]
): Promise<LadderChallengeWithPlayers[]> {
  let query = from('ladder_challenges')
    .select(`
      *,
      challenger:players!ladder_challenges_challenger_id_fkey (
        id, name, photo_url
      ),
      challenged:players!ladder_challenges_challenged_id_fkey (
        id, name, photo_url
      )
    `)
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Ladder] Error fetching challenges:', error);
    throw new Error(`Failed to fetch challenges: ${error.message}`);
  }

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    challenger_name: row.challenger?.name ?? 'Unknown',
    challenged_name: row.challenged?.name ?? 'Unknown',
    challenger_photo_url: row.challenger?.photo_url ?? null,
    challenged_photo_url: row.challenged?.photo_url ?? null,
  }));
}

/**
 * Fetch the current user's active challenges in a league
 */
export async function getMyActiveChallenges(leagueId: string): Promise<LadderChallengeWithPlayers[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data, error } = await from('ladder_challenges')
    .select(`
      *,
      challenger:players!ladder_challenges_challenger_id_fkey (
        id, name, photo_url
      ),
      challenged:players!ladder_challenges_challenged_id_fkey (
        id, name, photo_url
      )
    `)
    .eq('league_id', leagueId)
    .in('status', ['pending', 'accepted'])
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Ladder] Error fetching my challenges:', error);
    throw new Error(`Failed to fetch challenges: ${error.message}`);
  }

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    challenger_name: row.challenger?.name ?? 'Unknown',
    challenged_name: row.challenged?.name ?? 'Unknown',
    challenger_photo_url: row.challenger?.photo_url ?? null,
    challenged_photo_url: row.challenged?.photo_url ?? null,
  }));
}

/**
 * Fetch a single challenge by ID
 */
export async function getChallenge(challengeId: string): Promise<LadderChallengeWithPlayers | null> {
  const { data, error } = await from('ladder_challenges')
    .select(`
      *,
      challenger:players!ladder_challenges_challenger_id_fkey (
        id, name, photo_url
      ),
      challenged:players!ladder_challenges_challenged_id_fkey (
        id, name, photo_url
      )
    `)
    .eq('id', challengeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[Ladder] Error fetching challenge:', error);
    throw new Error(`Failed to fetch challenge: ${error.message}`);
  }

  const row = data as any;
  return {
    ...row,
    challenger_name: row.challenger?.name ?? 'Unknown',
    challenged_name: row.challenged?.name ?? 'Unknown',
    challenger_photo_url: row.challenger?.photo_url ?? null,
    challenged_photo_url: row.challenged?.photo_url ?? null,
  };
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new ladder challenge
 */
export async function createChallenge(
  leagueId: string,
  challengedPlayerId: string
): Promise<LadderChallenge> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Get league config
  const { data: league } = await from('leagues')
    .select('challenge_range, league_type')
    .eq('id', leagueId)
    .single();

  if (!league || league.league_type !== 'ladder') {
    throw new Error('This is not a ladder league');
  }

  // Get both players' positions
  const { data: players } = await from('league_players')
    .select('player_id, ladder_position')
    .eq('league_id', leagueId)
    .in('player_id', [user.id, challengedPlayerId]);

  const challenger = (players as any[])?.find((p: any) => p.player_id === user.id);
  const challenged = (players as any[])?.find((p: any) => p.player_id === challengedPlayerId);

  if (!challenger?.ladder_position || !challenged?.ladder_position) {
    throw new Error('Both players must have ladder positions');
  }

  // Validate: challenger must be below challenged (higher position number)
  if (challenger.ladder_position <= challenged.ladder_position) {
    throw new Error('You can only challenge players ranked above you');
  }

  // Validate: within challenge range
  const range = league.challenge_range ?? 3;
  if (challenger.ladder_position - challenged.ladder_position > range) {
    throw new Error(`You can only challenge players within ${range} positions above you`);
  }

  // Check for active challenges
  const { data: activeChallenges } = await from('ladder_challenges')
    .select('id')
    .eq('league_id', leagueId)
    .in('status', ['pending', 'accepted'])
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`);

  if (activeChallenges && activeChallenges.length > 0) {
    throw new Error('You already have an active challenge. Complete or cancel it first.');
  }

  // Check if the challenged player also has an active challenge
  const { data: theirChallenges } = await from('ladder_challenges')
    .select('id')
    .eq('league_id', leagueId)
    .in('status', ['pending', 'accepted'])
    .or(`challenger_id.eq.${challengedPlayerId},challenged_id.eq.${challengedPlayerId}`);

  if (theirChallenges && theirChallenges.length > 0) {
    throw new Error('This player already has an active challenge');
  }

  // Create the challenge with 48h accept deadline
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + 48);

  const { data, error } = await from('ladder_challenges')
    .insert({
      league_id: leagueId,
      challenger_id: user.id,
      challenged_id: challengedPlayerId,
      challenger_position: challenger.ladder_position,
      challenged_position: challenged.ladder_position,
      deadline: deadline.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Ladder] Error creating challenge:', error);
    throw new Error(`Failed to create challenge: ${error.message}`);
  }

  return data as LadderChallenge;
}

/**
 * Respond to a challenge (accept or decline)
 */
export async function respondToChallenge(
  challengeId: string,
  accept: boolean
): Promise<LadderChallenge> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Verify the user is the challenged player
  const { data: challenge } = await from('ladder_challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (!challenge) throw new Error('Challenge not found');
  if (challenge.challenged_id !== user.id) {
    throw new Error('Only the challenged player can respond');
  }
  if (challenge.status !== 'pending') {
    throw new Error('This challenge is no longer pending');
  }

  const updatePayload: Record<string, unknown> = {
    status: accept ? 'accepted' : 'declined',
  };

  if (accept) {
    updatePayload.accepted_at = new Date().toISOString();
    // Set 7-day completion deadline from acceptance
    const completionDeadline = new Date();
    completionDeadline.setDate(completionDeadline.getDate() + 7);
    updatePayload.deadline = completionDeadline.toISOString();
  }

  const { data, error } = await from('ladder_challenges')
    .update(updatePayload)
    .eq('id', challengeId)
    .select()
    .single();

  if (error) {
    console.error('[Ladder] Error responding to challenge:', error);
    throw new Error(`Failed to respond to challenge: ${error.message}`);
  }

  return data as LadderChallenge;
}

/**
 * Submit a round to an accepted challenge
 * Validates the scorecard, records the differential, and auto-completes if both submitted
 */
export async function submitChallengeRound(
  challengeId: string,
  scorecardId: string
): Promise<LadderChallenge> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  // Get the challenge
  const { data: challenge } = await from('ladder_challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (!challenge) throw new Error('Challenge not found');
  if (challenge.status !== 'accepted') {
    throw new Error('This challenge must be accepted before submitting rounds');
  }

  const isChallenger = challenge.challenger_id === user.id;
  const isChallenged = challenge.challenged_id === user.id;
  if (!isChallenger && !isChallenged) {
    throw new Error('You are not part of this challenge');
  }

  // Validate the scorecard
  const { data: scorecard } = await supabase
    .from('scorecards')
    .select('id, player_id, handicap_differential, status')
    .eq('id', scorecardId)
    .single();

  if (!scorecard) throw new Error('Scorecard not found');
  const sc = scorecard as any;

  if (sc.player_id !== user.id) throw new Error('You can only submit your own scorecards');
  if (sc.status !== 'completed' && sc.status !== 'confirmed') {
    throw new Error('Only completed scorecards can be submitted');
  }
  if (sc.handicap_differential == null) {
    throw new Error('Scorecard must have a handicap differential');
  }

  // Update the challenge with this player's round
  const updatePayload: Record<string, unknown> = {};
  if (isChallenger) {
    if (challenge.challenger_scorecard_id) {
      throw new Error('You have already submitted a round for this challenge');
    }
    updatePayload.challenger_scorecard_id = scorecardId;
    updatePayload.challenger_differential = sc.handicap_differential;
  } else {
    if (challenge.challenged_scorecard_id) {
      throw new Error('You have already submitted a round for this challenge');
    }
    updatePayload.challenged_scorecard_id = scorecardId;
    updatePayload.challenged_differential = sc.handicap_differential;
  }

  // Check if both players have now submitted
  const bothSubmitted = isChallenger
    ? challenge.challenged_scorecard_id != null
    : challenge.challenger_scorecard_id != null;

  if (bothSubmitted) {
    // Determine winner (lower differential wins, ties go to defender)
    const challengerDiff = isChallenger
      ? sc.handicap_differential
      : challenge.challenger_differential;
    const challengedDiff = isChallenged
      ? sc.handicap_differential
      : challenge.challenged_differential;

    const winnerId = challengerDiff < challengedDiff
      ? challenge.challenger_id
      : challenge.challenged_id; // Ties go to defender

    updatePayload.status = 'completed';
    updatePayload.winner_id = winnerId;
    updatePayload.completed_at = new Date().toISOString();

    // If challenger won, swap positions
    if (winnerId === challenge.challenger_id) {
      await swapLadderPositions(
        challenge.league_id,
        challenge.challenger_id,
        challenge.challenged_id,
        challenge.challenged_position, // Challenger gets the higher position
        challenge.challenger_position  // Challenged drops to challenger's old position
      );
    }
  }

  const { data, error } = await from('ladder_challenges')
    .update(updatePayload)
    .eq('id', challengeId)
    .select()
    .single();

  if (error) {
    console.error('[Ladder] Error submitting challenge round:', error);
    throw new Error(`Failed to submit challenge round: ${error.message}`);
  }

  return data as LadderChallenge;
}

/**
 * Cancel a pending challenge (challenger only)
 */
export async function cancelChallenge(challengeId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data: challenge } = await from('ladder_challenges')
    .select('challenger_id, status')
    .eq('id', challengeId)
    .single();

  if (!challenge) throw new Error('Challenge not found');
  if (challenge.challenger_id !== user.id) {
    throw new Error('Only the challenger can cancel');
  }
  if (challenge.status !== 'pending') {
    throw new Error('Only pending challenges can be cancelled');
  }

  const { error } = await from('ladder_challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId);

  if (error) {
    console.error('[Ladder] Error cancelling challenge:', error);
    throw new Error(`Failed to cancel challenge: ${error.message}`);
  }
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Swap two players' ladder positions
 */
async function swapLadderPositions(
  leagueId: string,
  player1Id: string,
  player2Id: string,
  newPosition1: number,
  newPosition2: number
): Promise<void> {
  // Update player 1's position
  await from('league_players')
    .update({ ladder_position: newPosition1 })
    .eq('league_id', leagueId)
    .eq('player_id', player1Id);

  // Update player 2's position
  await from('league_players')
    .update({ ladder_position: newPosition2 })
    .eq('league_id', leagueId)
    .eq('player_id', player2Id);
}
