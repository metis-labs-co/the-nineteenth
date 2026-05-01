/**
 * Skins Hooks - Backfill
 *
 * Run skins processing for every hole that already has scores at the moment a
 * skins game is created. Without this, a game created mid-round only ever
 * scores subsequent holes — prior holes silently produce no result.
 *
 * Used by `useCreateSkinsGame.onSuccess` as a fire-and-forget step.
 */

import { supabase } from '@/services/supabase/client';
import { prepareHoleScores, validateHoleScores } from '@/utils/skins';
import { transformHolesIfNeeded } from '@/utils/holeTransformers';
import { scoringLogger } from '@/utils/debugLogger';
import { processTeamSkins } from './teamSkinsProcessor';
import type { useProcessSkinsHole, useProcessTeamSkinsHole } from './mutations';
import type { SkinsGame } from '@/types/database/skins.types';
import type { Hole } from '@/types/database.types';

interface ScorecardRow {
  player_id: string;
  scores: Record<string, { strokes?: number } | number> | null;
}

interface PlayerRow {
  id: string;
  handicap: number | null;
}

type ScorecardsRecord = Record<
  string,
  { [holeNumber: string]: { strokes: number } | number }
>;

/**
 * Walk player scorecards and return the set of holes that have at least one
 * non-empty stroke entry.
 */
function collectScoredHoles(scorecards: ScorecardsRecord): number[] {
  const scored = new Set<number>();
  for (const playerScores of Object.values(scorecards)) {
    for (const [holeKey, value] of Object.entries(playerScores)) {
      const holeNumber = parseInt(holeKey, 10);
      if (Number.isNaN(holeNumber)) continue;
      const strokes = typeof value === 'number' ? value : value?.strokes;
      if (strokes != null && strokes > 0) {
        scored.add(holeNumber);
      }
    }
  }
  return Array.from(scored).sort((a, b) => a - b);
}

/**
 * Process the supplied hole for an individual-scope skins game by reusing the
 * existing mutation. Mirrors the inline logic in `useProcessSkinsIfNeeded`.
 */
async function backfillIndividualHole(
  game: SkinsGame,
  holeNumber: number,
  scorecards: ScorecardsRecord,
  hole: { par: number; strokeIndex: number },
  participants: PlayerRow[],
  processSkinsHoleMutation: ReturnType<typeof useProcessSkinsHole>
): Promise<void> {
  const holeScores = prepareHoleScores(
    participants.map((p) => ({ id: p.id, handicap: p.handicap })),
    scorecards,
    hole as { par: 3 | 4 | 5; strokeIndex: number },
    holeNumber
  );

  const { isValid } = validateHoleScores(holeScores, game.participant_ids);
  if (!isValid) return;

  await processSkinsHoleMutation.mutateAsync({
    skinsGameId: game.id,
    holeNumber,
    holeScores,
  });
}

/**
 * Backfill skins results for every hole already scored at the time the game
 * was created. Errors on individual holes are logged and swallowed so the
 * caller (a successful create) never appears to have failed.
 */
export async function backfillSkinsResults(
  game: SkinsGame,
  processSkinsHoleMutation: ReturnType<typeof useProcessSkinsHole>,
  processTeamSkinsHoleMutation: ReturnType<typeof useProcessTeamSkinsHole>
): Promise<void> {
  // 1. Pull every scorecard for the round.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
  const { data: scorecardRows, error: scorecardError } = await (supabase.from('scorecards') as any)
    .select('player_id, scores')
    .eq('round_id', game.round_id) as {
      data: ScorecardRow[] | null;
      error: { message: string } | null;
    };

  if (scorecardError) {
    scoringLogger.warn('SKINS backfill: failed to load scorecards', {
      gameId: game.id,
      error: scorecardError.message,
    });
    return;
  }

  if (!scorecardRows || scorecardRows.length === 0) return;

  const scorecards: ScorecardsRecord = {};
  for (const row of scorecardRows) {
    if (!row.scores) continue;
    scorecards[row.player_id] = row.scores as ScorecardsRecord[string];
  }

  const scoredHoles = collectScoredHoles(scorecards);
  if (scoredHoles.length === 0) return;

  // 2. Pull the round's course holes for par + strokeIndex.
  const { data: roundData, error: roundError } = await supabase
    .from('rounds')
    .select(`
      courses!course_id (
        holes
      )
    `)
    .eq('id', game.round_id)
    .single() as {
      data: { courses: { holes: Hole[] | null } | null } | null;
      error: { message: string } | null;
    };

  if (roundError || !roundData?.courses?.holes) {
    scoringLogger.warn('SKINS backfill: failed to load course holes', {
      gameId: game.id,
      error: roundError?.message,
    });
    return;
  }

  const holes = transformHolesIfNeeded(roundData.courses.holes);

  // 3. For individual games, fetch participants once.
  let participants: PlayerRow[] = [];
  if (!game.is_team_skins) {
    const { data: rawPlayers } = await supabase
      .from('players')
      .select('id, handicap')
      .in('id', game.participant_ids);
    participants = (rawPlayers ?? []) as unknown as PlayerRow[];
    if (participants.length === 0) {
      scoringLogger.warn('SKINS backfill: no participants resolved', { gameId: game.id });
      return;
    }
  }

  // 4. Process each scored hole sequentially so carryover state stays correct.
  scoringLogger.info('SKINS backfill: starting', {
    gameId: game.id,
    holeCount: scoredHoles.length,
    isTeam: game.is_team_skins,
  });

  for (const holeNumber of scoredHoles) {
    const holeData = holes.find((h) => h.number === holeNumber);
    if (!holeData) continue;

    const hole = { par: holeData.par, strokeIndex: holeData.strokeIndex };

    try {
      if (game.is_team_skins) {
        await processTeamSkins(
          game,
          game.round_id,
          holeNumber,
          scorecards,
          hole,
          processTeamSkinsHoleMutation
        );
      } else {
        await backfillIndividualHole(
          game,
          holeNumber,
          scorecards,
          hole,
          participants,
          processSkinsHoleMutation
        );
      }
    } catch (error) {
      scoringLogger.warn('SKINS backfill: hole processing failed (continuing)', {
        gameId: game.id,
        holeNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  scoringLogger.info('SKINS backfill: complete', { gameId: game.id });
}
