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
} from '@/types/database';
import {
  generateSeedings,
  buildBracketStructure,
  type SeededPlayer,
} from '@/utils/bracketGeneration';

// Helper to bypass Supabase generated types for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

// =====================================================
// TYPES
// =====================================================

export interface GenerateBracketInput {
  competitionId: string;
  seedingMethod: SeedingMethod;
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
  const { competitionId, seedingMethod } = input;

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

  // Seed players
  const seededPlayers = generateSeedings(players, seedingMethod);
  const seedMap = new Map<number, SeededPlayer>();
  seededPlayers.forEach(p => seedMap.set(p.seed, p));

  // Build bracket structure
  const bracketSlots = buildBracketStructure(playerCount);
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

  // Update competition knockout_config
  const config: KnockoutConfig = {
    playerCount,
    seedingMethod,
    bracketGenerated: true,
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
