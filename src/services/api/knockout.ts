/**
 * Knockout Tournament API Service
 *
 * Handles all knockout bracket CRUD operations against Supabase.
 *
 * Note: knockout_matches table is not yet in the auto-generated Supabase types.
 * We use `as any` on .from() calls and cast results to our TypeScript types.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from '@/services/supabase/client';
import type {
  KnockoutMatch,
  KnockoutMatchWithPlayers,
  KnockoutConfig,
  ValidPlayerCount,
  SeedingMethod,
  BracketSeedingStyle,
  QualifyingMetric,
} from '@/types/database';
import {
  generateSeedings,
  buildBracketStructure,
  type SeededPlayer,
} from '@/utils/bracketGeneration';
import { aggregateQualifyingStandings } from '@/utils/knockoutSeeding';

// Helper to bypass Supabase generated types for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

// =====================================================
// TYPES
// =====================================================

export interface GenerateBracketInput {
  competitionId: string;
  seedingMethod: SeedingMethod;
  /**
   * Bracket pairing style for the first round.
   * - 'standard' (default): (1,N), (2,N-1), … — classic, top seed rewarded.
   * - 'adjacent': (1,2), (3,4), … — closely-matched, social-friendly.
   * Only honored when the feature is unlocked (the UI gates selection).
   */
  bracketSeedingStyle?: BracketSeedingStyle;
  /**
   * Required when `seedingMethod === 'qualifying'`. Rounds whose aggregated
   * individual results determine initial seeding (seed 1 = top qualifier).
   */
  qualifyingRoundIds?: string[];
  /**
   * Which column aggregated across qualifying rounds drives the ordering.
   * Defaults to 'competition_points'.
   */
  qualifyingMetric?: QualifyingMetric;
}

export interface CompleteMatchInput {
  matchId: string;
  winnerId: string;
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Fetch all knockout matches for a competition with player details
 */
export async function getKnockoutBracket(
  competitionId: string
): Promise<KnockoutMatchWithPlayers[]> {
  const { data, error } = await from('knockout_matches')
    .select(`
      *,
      player1:players!knockout_matches_player1_id_fkey (id, name, photo_url),
      player2:players!knockout_matches_player2_id_fkey (id, name, photo_url),
      winner:players!knockout_matches_winner_id_fkey (id, name)
    `)
    .eq('competition_id', competitionId)
    .order('stage', { ascending: true })
    .order('bracket_position', { ascending: true });

  if (error) {
    console.error('[Knockout] Error fetching bracket:', error);
    throw new Error(`Failed to fetch bracket: ${error.message}`);
  }

  return (data ?? []) as KnockoutMatchWithPlayers[];
}

/**
 * Fetch qualifying standings across a set of rounds.
 *
 * Returns the competition's accepted players in seed order — seed 1 is the
 * top qualifier per `metric`. Players who didn't post a result in any
 * qualifying round fall to the bottom in handicap order so the bracket is
 * always fully seeded.
 *
 * This uses the round_results table, which already reflects per-round
 * rules_override behaviour (see finalization in roundResultsService.ts), so
 * e.g. a scramble round flagged `contributes_to_individual_leaderboard=false`
 * contributes 0 to each player's qualifying total.
 */
export async function getQualifyingStandings(
  competitionId: string,
  qualifyingRoundIds: string[],
  metric: QualifyingMetric
): Promise<{ id: string; name: string; handicap: number | null }[]> {
  if (qualifyingRoundIds.length === 0) return [];

  const { data: resultsData, error: resultsError } = await from('round_results')
    .select(`
      round_id,
      player_id,
      is_team_result,
      raw_score,
      raw_result_data,
      competition_points,
      player:players!round_results_player_id_fkey (id, name, handicap)
    `)
    .in('round_id', qualifyingRoundIds);

  if (resultsError) {
    console.error('[Knockout] Error fetching qualifying results:', resultsError);
    throw new Error(`Failed to fetch qualifying results: ${resultsError.message}`);
  }

  const qualifying = aggregateQualifyingStandings(
    (resultsData ?? []) as any[],
    qualifyingRoundIds,
    metric
  );

  // Include accepted players who didn't post in any qualifying round so the
  // bracket is always full. They sort to the bottom, tied at 0, then by
  // handicap ascending.
  const { data: allPlayers } = await from('competition_players')
    .select('player_id, players (id, name, handicap)')
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  const qualifyingIds = new Set(qualifying.map((q) => q.id));
  const missingPlayers: { id: string; name: string; handicap: number | null }[] = [];
  for (const row of (allPlayers ?? []) as any[]) {
    const p = row.players;
    if (!p || qualifyingIds.has(p.id)) continue;
    missingPlayers.push({ id: p.id, name: p.name, handicap: p.handicap ?? null });
  }
  missingPlayers.sort((a, b) => {
    if (a.handicap == null && b.handicap == null) return 0;
    if (a.handicap == null) return 1;
    if (b.handicap == null) return -1;
    return a.handicap - b.handicap;
  });

  return [
    ...qualifying.map((q) => ({ id: q.id, name: q.name, handicap: q.handicap })),
    ...missingPlayers,
  ];
}

/**
 * Fetch the current competition standings as a seeded player list.
 *
 * Used by 1v1 match-play presets that opt into `pairing_source='current_standings'`:
 * the round being created reads the cumulative individual leaderboard of every
 * completed prior round (round_number < `beforeRoundNumber`) and the resulting
 * order drives `pairFromStandings` / `pairCrossTeamFromStandings`.
 *
 * Reuses `getQualifyingStandings` semantics — same metric extraction, same
 * fallback to handicap-sorted accepted players for non-qualifiers — so the
 * pairing surface stays consistent with the existing knockout-bracket flow.
 *
 * Returns `[]` only when there are no completed prior rounds. Callers must
 * handle that case (the wizard blocks submit).
 */
export async function getCurrentCompetitionStandings(
  competitionId: string,
  beforeRoundNumber: number,
  metric: QualifyingMetric
): Promise<{ id: string; name: string; handicap: number | null }[]> {
  const { data: priorRoundsData, error: priorRoundsError } = await from('rounds')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('status', 'completed')
    .lt('round_number', beforeRoundNumber);

  if (priorRoundsError) {
    console.error('[Knockout] Error fetching prior rounds for standings:', priorRoundsError);
    throw new Error(`Failed to fetch prior rounds: ${priorRoundsError.message}`);
  }

  const priorRoundIds = ((priorRoundsData ?? []) as { id: string }[]).map((r) => r.id);
  if (priorRoundIds.length === 0) return [];

  return getQualifyingStandings(competitionId, priorRoundIds, metric);
}

/**
 * Fetch a single knockout match with player details
 */
export async function getKnockoutMatch(
  matchId: string
): Promise<KnockoutMatchWithPlayers | null> {
  const { data, error } = await from('knockout_matches')
    .select(`
      *,
      player1:players!knockout_matches_player1_id_fkey (id, name, photo_url),
      player2:players!knockout_matches_player2_id_fkey (id, name, photo_url),
      winner:players!knockout_matches_winner_id_fkey (id, name)
    `)
    .eq('id', matchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[Knockout] Error fetching match:', error);
    throw new Error(`Failed to fetch match: ${error.message}`);
  }

  return data as KnockoutMatchWithPlayers;
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Generate the full knockout bracket for a competition.
 *
 * 1. Seeds players
 * 2. Creates all rounds
 * 3. Creates all match slots (main + consolation)
 * 4. Populates first round with seeded players
 * 5. Updates competition knockout_config
 */
export async function generateBracket(
  input: GenerateBracketInput
): Promise<void> {
  const {
    competitionId,
    seedingMethod,
    bracketSeedingStyle = 'standard',
    qualifyingRoundIds,
    qualifyingMetric = 'competition_points',
  } = input;

  if (seedingMethod === 'qualifying' && (!qualifyingRoundIds || qualifyingRoundIds.length === 0)) {
    throw new Error(
      'Qualifying seeding requires at least one qualifying round. Pick the prior rounds that should determine seeding, or choose a different method.'
    );
  }

  // Fetch competition and players
  const { data: competition, error: compError } = await from('competitions')
    .select('id, organizer_id, competition_type')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) {
    throw new Error('Competition not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((competition as any).competition_type !== 'knockout') {
    throw new Error('Can only generate brackets for knockout competitions');
  }

  // Fetch accepted players
  const { data: compPlayers, error: playersError } = await from('competition_players')
    .select(`
      player_id,
      players (id, name, handicap, photo_url)
    `)
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  const players = (compPlayers ?? []).map((cp: any) => ({
    id: cp.players.id,
    name: cp.players.name,
    handicap: cp.players.handicap,
  }));

  const playerCount = players.length as ValidPlayerCount;
  if (![4, 8, 16, 32].includes(playerCount)) {
    throw new Error(`Player count must be 4, 8, 16, or 32. Currently ${players.length} players.`);
  }

  // Seed players. For 'qualifying', we pre-sort by the aggregated metric and
  // hand the pre-ordered list to generateSeedings — that way seed 1 is the
  // top qualifier regardless of handicap.
  let preOrdered: { id: string; name: string; handicap: number | null }[] | undefined;
  if (seedingMethod === 'qualifying' && qualifyingRoundIds) {
    preOrdered = await getQualifyingStandings(
      competitionId,
      qualifyingRoundIds,
      qualifyingMetric
    );
  }

  const seededPlayers = generateSeedings(players, seedingMethod, preOrdered);
  const seedMap = new Map<number, SeededPlayer>();
  seededPlayers.forEach(p => seedMap.set(p.seed, p));

  // Build bracket structure (pairing style controls first-round matchups only).
  const bracketSlots = buildBracketStructure(playerCount, bracketSeedingStyle);
  const totalMainStages = Math.log2(playerCount);

  // Create rounds for each stage
  // Main bracket: stages 0 to totalMainStages-1
  // Consolation: stages 1 to totalMainStages
  const stageSet = new Set<string>(); // "main:0", "consolation:1", etc.
  bracketSlots.forEach(slot => {
    stageSet.add(`${slot.bracketType}:${slot.stage}`);
  });

  const roundMap = new Map<string, string>(); // "main:0" → round_id

  // Fetch existing rounds or create new ones
  const { data: existingRounds } = await from('rounds')
    .select('id, round_number')
    .eq('competition_id', competitionId)
    .order('round_number', { ascending: true });

  // Delete existing rounds (bracket regeneration)
  if (existingRounds && existingRounds.length > 0) {
    await from('knockout_matches')
      .delete()
      .eq('competition_id', competitionId);

    for (const r of existingRounds as any[]) {
      await from('rounds').delete().eq('id', r.id);
    }
  }

  // Create rounds for each stage
  const sortedStages = Array.from(stageSet).sort((a, b) => {
    const [aType, aStage] = a.split(':');
    const [bType, bStage] = b.split(':');
    // Main first, then consolation, sorted by stage
    if (aType !== bType) return aType === 'main' ? -1 : 1;
    return parseInt(aStage) - parseInt(bStage);
  });

  let roundNumber = 1;
  for (const stageKey of sortedStages) {
    const [bracketType, stageStr] = stageKey.split(':');
    const stage = parseInt(stageStr);

    // Create a round for this stage
    const stageName = bracketType === 'main'
      ? (stage === totalMainStages - 1
          ? 'Final'
          : stage === totalMainStages - 2
            ? 'Semi Finals'
            : stage === totalMainStages - 3
              ? 'Quarter Finals'
              : `Round ${stage + 1}`)
      : (stage === totalMainStages
          ? 'Consolation Final'
          : `Consolation Round ${stage}`);

    const { data: round, error: roundError } = await from('rounds')
      .insert({
        competition_id: competitionId,
        round_number: roundNumber++,
        status: 'upcoming',
        notes: stageName,
      })
      .select('id')
      .single();

    if (roundError) {
      throw new Error(`Failed to create round: ${roundError.message}`);
    }

    roundMap.set(stageKey, (round as any).id);
  }

  // Insert all matches (first pass: without next_match_id links)
  const matchInserts = bracketSlots.map(slot => {
    const roundId = roundMap.get(`${slot.bracketType}:${slot.stage}`);
    const p1 = slot.player1Seed ? seedMap.get(slot.player1Seed) : null;
    const p2 = slot.player2Seed ? seedMap.get(slot.player2Seed) : null;

    return {
      competition_id: competitionId,
      round_id: roundId!,
      bracket_type: slot.bracketType,
      bracket_position: slot.bracketPosition,
      stage: slot.stage,
      player1_id: p1?.playerId ?? null,
      player2_id: p2?.playerId ?? null,
      seed1: slot.player1Seed,
      seed2: slot.player2Seed,
      status: slot.status,
    };
  });

  const { data: insertedMatches, error: matchError } = await from('knockout_matches')
    .insert(matchInserts)
    .select('id, bracket_type, stage, bracket_position');

  if (matchError) {
    throw new Error(`Failed to create matches: ${matchError.message}`);
  }

  // Build a lookup: "type:stage:position" → match_id
  const matchLookup = new Map<string, string>();
  (insertedMatches as any[]).forEach((m: any) => {
    matchLookup.set(`${m.bracket_type}:${m.stage}:${m.bracket_position}`, m.id);
  });

  // Second pass: update next_match_id and consolation_match_id links
  for (const slot of bracketSlots) {
    const matchId = matchLookup.get(
      `${slot.bracketType}:${slot.stage}:${slot.bracketPosition}`
    );
    if (!matchId) continue;

    const updates: Record<string, any> = {};

    // Link to next match (winner advances)
    if (slot.nextMatchPosition != null) {
      const nextStage = slot.stage + 1;
      const nextKey = `${slot.bracketType}:${nextStage}:${slot.nextMatchPosition}`;
      const nextId = matchLookup.get(nextKey);
      if (nextId) {
        updates.next_match_id = nextId;
        updates.next_match_slot = slot.nextMatchSlot;
      }
    }

    // Link to consolation match (loser routed)
    if (slot.consolationMatchPosition != null && slot.bracketType === 'main') {
      const conStage = slot.stage + 1;
      const conKey = `consolation:${conStage}:${slot.consolationMatchPosition}`;
      const conId = matchLookup.get(conKey);
      if (conId) {
        updates.consolation_match_id = conId;
        updates.consolation_match_slot = slot.consolationMatchSlot;
      }
    }

    if (Object.keys(updates).length > 0) {
      await from('knockout_matches')
        .update(updates)
        .eq('id', matchId);
    }
  }

  // Update competition knockout_config. We persist the full config so the
  // bracket can be rendered / re-edited later with the same settings.
  const config: KnockoutConfig = {
    playerCount,
    seedingMethod,
    bracketGenerated: true,
    bracketSeedingStyle,
    ...(seedingMethod === 'qualifying'
      ? {
          qualifyingRoundIds,
          qualifyingMetric,
        }
      : {}),
  };

  await from('competitions')
    .update({ knockout_config: config })
    .eq('id', competitionId);
}

/**
 * Complete a match and advance the winner / route the loser.
 */
export async function completeMatch(input: CompleteMatchInput): Promise<void> {
  const { matchId, winnerId } = input;

  // Fetch the match
  const { data: match, error: matchError } = await from('knockout_matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error('Match not found');
  }

  const m = match as KnockoutMatch;

  if (m.status === 'completed') {
    throw new Error('Match is already completed');
  }

  if (winnerId !== m.player1_id && winnerId !== m.player2_id) {
    throw new Error('Winner must be one of the match players');
  }

  const loserId = winnerId === m.player1_id ? m.player2_id : m.player1_id;

  // Update match as completed
  await from('knockout_matches')
    .update({
      winner_id: winnerId,
      loser_id: loserId,
      status: 'completed',
    })
    .eq('id', matchId);

  // Advance winner to next match
  if (m.next_match_id && m.next_match_slot) {
    const playerField = m.next_match_slot === 1 ? 'player1_id' : 'player2_id';
    const seedField = m.next_match_slot === 1 ? 'seed1' : 'seed2';
    const winnerSeed = winnerId === m.player1_id ? m.seed1 : m.seed2;

    await from('knockout_matches')
      .update({ [playerField]: winnerId, [seedField]: winnerSeed })
      .eq('id', m.next_match_id);

    // Check if next match now has both players → set to 'ready'
    const { data: nextMatch } = await from('knockout_matches')
      .select('player1_id, player2_id, status')
      .eq('id', m.next_match_id)
      .single();

    if (nextMatch && nextMatch.player1_id && nextMatch.player2_id && nextMatch.status === 'pending') {
      await from('knockout_matches')
        .update({ status: 'ready' })
        .eq('id', m.next_match_id);
    }
  }

  // Route loser to consolation match
  if (m.consolation_match_id && m.consolation_match_slot && loserId) {
    const playerField = m.consolation_match_slot === 1 ? 'player1_id' : 'player2_id';
    const seedField = m.consolation_match_slot === 1 ? 'seed1' : 'seed2';
    const loserSeed = loserId === m.player1_id ? m.seed1 : m.seed2;

    await from('knockout_matches')
      .update({ [playerField]: loserId, [seedField]: loserSeed })
      .eq('id', m.consolation_match_id);

    // Check if consolation match now has both players → set to 'ready'
    const { data: conMatch } = await from('knockout_matches')
      .select('player1_id, player2_id, status')
      .eq('id', m.consolation_match_id)
      .single();

    if (conMatch && conMatch.player1_id && conMatch.player2_id && conMatch.status === 'pending') {
      await from('knockout_matches')
        .update({ status: 'ready' })
        .eq('id', m.consolation_match_id);
    }
  }
}

/**
 * Reset a bracket (delete all matches and rounds, clear config)
 */
export async function resetBracket(competitionId: string): Promise<void> {
  // Delete matches first (depends on rounds)
  await from('knockout_matches')
    .delete()
    .eq('competition_id', competitionId);

  // Delete rounds
  await from('rounds')
    .delete()
    .eq('competition_id', competitionId);

  // Clear knockout config
  await from('competitions')
    .update({
      knockout_config: { playerCount: null, seedingMethod: null, bracketGenerated: false },
    })
    .eq('id', competitionId);
}
