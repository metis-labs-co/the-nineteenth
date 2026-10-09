/**
 * useQuickScoreSubmit - Direct Supabase scorecard upsert for admin quick entry
 *
 * Bypasses offline/SQLite layer. Designed for admin backfill scenarios
 * where the user is expected to be online.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { calculateAdjustedGrossScore } from '@/utils/adjustedGross';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import type { TeeBox, Hole } from '@/types/database.types';
import type { HandicapSource, NineType } from '@/types/database/enums';
import { isCompleteForHandicap } from '@/utils/handicapEligibility';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';
import type { RoundScoringShape } from '@/services/rounds/roundScoringWrite';
import type { GameType } from '@/types';
import {
  captureRemoteScorecardUpload,
  syncScorecard,
  ScorecardConflictError,
} from '@/services/offline/sync/scorecardSync';
import {
  RoundScoringWriteError,
  roundScoringErrorFromSql,
} from '@/services/rounds/roundScoringErrors';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { isRoundPersistenceSourceCurrent } from '@/services/offline/roundPersistenceBarrier';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import {
  fetchRoundScoringShape,
  ROUND_SCORING_READ_TIMEOUT_MS,
} from '@/services/rounds/roundScoringShape';
import {
  getRoundEndPrerequisite,
  withRoundScoringWrite,
} from '@/services/rounds/roundScoringCoordinator';
import { adoptRoundShapeWithinScoringWrite } from '@/services/rounds/roundScoringAdoption';

export interface QuickScoreSubmitInput {
  roundId: string;
  playerId: string;
  scores: Record<string, { strokes: number }>;
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  /**
   * Par-game total (+1/0/-1 per hole, summed). Required when the round is
   * Par game type so the round-results pipeline can rank correctly. Pass
   * 0 / null for non-Par rounds.
   */
  totalParScore?: number | null;
  player: ScorecardPlayerInfo;
  selectedTee: TeeBox | null;
  holes: Hole[];
  /**
   * The round's planned nine. The handicap completeness gate (I12) judges the
   * card against getHoleRange(nineType) — never against `holes`.
   */
  nineType: NineType;
  handicapSource: HandicapSource;
  /** Shape displayed and used for this draft's scores and totals. */
  expectedRoundShape?: RoundScoringShape;
  gameType?: GameType;
  /** CURRENT screen draft; select once after coordinator admission. */
  readCurrent?: () => QuickScoreSubmitInput;
  assertOperationCurrent?: () => void;
}

interface QuickScoreSubmitResult {
  success: boolean;
  scorecardId?: string;
  isCurrent?: () => boolean;
}

/** Ratings, shape and strokes belong to one draft version; remote revision is read separately. */
function draftVersion(input: QuickScoreSubmitInput): string {
  const {
    roundId,
    playerId,
    scores,
    player,
    selectedTee,
    holes,
    nineType,
    handicapSource,
    expectedRoundShape,
    gameType,
    totalGross,
    totalNet,
    totalPoints,
    totalParScore,
  } = input;
  return JSON.stringify({
    roundId,
    playerId,
    scores,
    player,
    selectedTee,
    holes,
    nineType,
    handicapSource,
    expectedRoundShape,
    gameType,
    totalGross,
    totalNet,
    totalPoints,
    totalParScore,
  });
}

async function readRemoteCard(roundId: string, playerId: string) {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new RoundScoringWriteError('unavailable', roundId, 'Scorecard revision read timed out')
        );
        abort.abort();
      }, ROUND_SCORING_READ_TIMEOUT_MS);
    });
    const request = supabase
      .from('scorecards')
      .select('id, round_id, player_id, revision, status')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .abortSignal(abort.signal)
      .maybeSingle();
    const { data, error } = (await Promise.race([
      Promise.resolve(request),
      timeout,
    ])) as unknown as {
      data: {
        id: string;
        round_id: string;
        player_id: string;
        revision: number;
        status: string;
      } | null;
      error: { message: string; code?: string; hint?: string } | null;
    };
    if (error)
      throw (
        roundScoringErrorFromSql(roundId, error) ??
        new RoundScoringWriteError('unavailable', roundId, error.message, {
          sqlCode: error.code,
          sqlHint: error.hint,
        })
      );
    if (
      data &&
      (typeof data.id !== 'string' ||
        !data.id ||
        data.round_id !== roundId ||
        data.player_id !== playerId ||
        !Number.isInteger(data.revision) ||
        data.revision < 0)
    )
      throw new RoundScoringWriteError(
        'unavailable',
        roundId,
        'Scorecard revision is missing or invalid'
      );
    if (data?.status === 'confirmed')
      throw new RoundScoringWriteError(
        'unavailable',
        roundId,
        'This scorecard has been confirmed and cannot be submitted.'
      );
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Preserve Quick Score's social completion check after a guarded snapshot. */
async function completeEndedSocialRound(roundId: string, assertCurrent: () => Promise<void>) {
  const fail = (message: string) => new RoundScoringWriteError('unavailable', roundId, message);
  await assertCurrent();
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('status, competition_id')
    .eq('id', roundId)
    .single();
  await assertCurrent();
  if (roundError || !round) throw fail(roundError?.message ?? 'Round completion state unavailable');
  const state = round as { status: string; competition_id: string | null };
  if (state.competition_id) return;
  if (state.status === 'upcoming') {
    await assertCurrent();
    const { error } = await supabase
      .from('rounds')
      .update({ status: 'in-progress' } as never)
      .eq('id', roundId);
    await assertCurrent();
    if (error) throw fail(error.message);
  }
  await assertCurrent();
  const { count: playerCount, error: playersError } = await supabase
    .from('round_players')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId);
  await assertCurrent();
  if (playersError || playerCount == null)
    throw fail(playersError?.message ?? 'Round player count unavailable');
  if (!playerCount) return;
  await assertCurrent();
  const { count: completedCount, error: cardsError } = await supabase
    .from('scorecards')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId)
    .eq('status', 'completed');
  await assertCurrent();
  if (cardsError || completedCount == null)
    throw fail(cardsError?.message ?? 'Completed scorecard count unavailable');
  if (completedCount >= playerCount) {
    await assertCurrent();
    const { error } = await supabase
      .from('rounds')
      .update({ status: 'completed' } as never)
      .eq('id', roundId);
    await assertCurrent();
    if (error) throw fail(error.message);
  }
}

export function useQuickScoreSubmit() {
  const queryClient = useQueryClient();

  return useMutation<QuickScoreSubmitResult, Error, QuickScoreSubmitInput>({
    mutationFn: async (input) => {
      const capture = captureRemoteScorecardUpload(input.roundId);
      const assertOwnerAndOperation = () => {
        input.assertOperationCurrent?.();
        if (
          !capture.ownerId ||
          getSyncAuthUserId() !== capture.ownerId ||
          !capture.isSessionCurrent() ||
          (capture.session && !capture.session.isCurrent())
        )
          throw new RoundScoringWriteError(
            'context_changed',
            input.roundId,
            'Scoring owner, session or preparation changed'
          );
      };
      const assertCurrent = () => {
        assertOwnerAndOperation();
        if (!isRoundPersistenceSourceCurrent(capture.source))
          throw new RoundScoringWriteError(
            'context_changed',
            input.roundId,
            'Scoring preparation changed'
          );
      };
      assertCurrent();
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');
      assertCurrent();
      if (currentUser.id !== capture.ownerId)
        throw new RoundScoringWriteError('context_changed', input.roundId, 'Scoring owner changed');

      if (input.expectedRoundShape?.holes_played != null) {
        const assertOperationCurrent = () => {
          input.assertOperationCurrent?.();
          if (
            currentUser.id !== capture.ownerId ||
            getSyncAuthUserId() !== capture.ownerId ||
            !capture.isSessionCurrent() ||
            (capture.session && !capture.session.isCurrent())
          )
            throw new RoundScoringWriteError(
              'context_changed',
              input.roundId,
              'Scoring owner or session changed'
            );
        };
        const assertOriginalCurrent = () => {
          assertOperationCurrent();
          if (!isRoundPersistenceSourceCurrent(capture.source))
            throw new RoundScoringWriteError(
              'context_changed',
              input.roundId,
              'Scoring preparation changed; refresh and review before retrying.'
            );
        };
        let assertDraftCurrent: () => void = assertOriginalCurrent;
        const result = await syncScorecard(
          { roundId: input.roundId, playerId: input.playerId },
          {
            kind: 'remote',
            capture,
            assertOperationCurrent,
            expectedRoundShape: input.expectedRoundShape,
            afterAccepted: (guard) => completeEndedSocialRound(input.roundId, guard),
            prepareCurrent: async () => {
              const draft = input.readCurrent?.() ?? input;
              const version = draftVersion(draft);
              assertDraftCurrent = () => {
                assertOperationCurrent();
                if (draftVersion(input.readCurrent?.() ?? input) !== version)
                  throw new RoundScoringWriteError(
                    'context_changed',
                    input.roundId,
                    'Quick Score draft changed; review before retrying.'
                  );
              };
              assertDraftCurrent();
              assertOriginalCurrent();
              const row = await readRemoteCard(input.roundId, input.playerId);
              assertOriginalCurrent();
              assertDraftCurrent();
              const shape = draft.expectedRoundShape;
              if (!shape || shape.holes_played == null || shape.nine_type !== draft.nineType)
                throw new RoundScoringWriteError(
                  'context_changed',
                  input.roundId,
                  'Quick Score shape changed; refresh and review before retrying.'
                );
              const planned = filterPlayableHoles(draft.holes, shape.nine_type);
              const now = new Date();
              return {
                assertDraftCurrent,
                serverScorecardId: row?.id,
                card: {
                  roundId: draft.roundId,
                  playerId: draft.playerId,
                  scores: draft.scores,
                  totalGross: draft.totalGross,
                  totalNet: draft.totalNet,
                  status: 'completed',
                  createdAt: now,
                  updatedAt: now,
                  submittedAt: now,
                  submittedBy: currentUser.id,
                  holesPlayed: shape.holes_played,
                  syncNineType: shape.nine_type,
                  syncHoles: planned,
                  coursePar: planned.reduce((sum, hole) => sum + hole.par, 0),
                  syncGameType: draft.gameType,
                  teeData: draft.selectedTee,
                  syncHandicapSource: draft.handicapSource,
                  playerGender: draft.player.gender ?? null,
                  playerHandicap:
                    draft.handicapSource === 'none'
                      ? (draft.player.handicap ?? undefined)
                      : getBaseHandicap(draft.player, draft.handicapSource),
                  serverRevision: row?.revision ?? 0,
                },
              };
            },
          }
        );
        return {
          success: true,
          ...(result.serverScorecardId && { scorecardId: result.serverScorecardId }),
          isCurrent: () => {
            try {
              assertOriginalCurrent();
              assertDraftCurrent();
              return true;
            } catch {
              return false;
            }
          },
        };
      }

      const persistUnended = async (draft: QuickScoreSubmitInput, assertSelected: () => void) => {
        const {
          roundId,
          playerId,
          scores,
          totalGross,
          totalNet,
          totalPoints,
          totalParScore,
          player,
          selectedTee,
          holes,
          nineType,
          handicapSource,
        } = draft;

        // Calculate handicap snapshot
        const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
        const baseHandicap = getBaseHandicap(player, handicapSource);

        let dailyHandicap = baseHandicap;
        let courseRatingUsed: number | null = null;
        let slopeRatingUsed: number | null = null;

        if (
          handicapSource !== 'none' &&
          selectedTee?.slopeRating &&
          selectedTee?.courseRating &&
          coursePar > 0
        ) {
          const result = calculateGADailyHandicap({
            gaHandicap: baseHandicap,
            slopeRating: selectedTee.slopeRating,
            courseRating: selectedTee.courseRating,
            par: coursePar,
            gender: player.gender,
          });
          dailyHandicap = result.dailyHandicap;
          courseRatingUsed = selectedTee.courseRating;
          slopeRatingUsed = selectedTee.slopeRating;
        }

        // Calculate handicap differential from the WHS ADJUSTED gross score —
        // every hole capped at net double bogey (par + 2 + strokes received).
        // Falls back to the raw gross if the card carries no hole data.
        // Only a full scorecard earns one (I12): a part-filled Quick Score card
        // keeps its ratings / daily handicap snapshot but no differential.
        let handicapDifferential: number | null = null;
        if (
          courseRatingUsed &&
          slopeRatingUsed &&
          totalGross > 0 &&
          isCompleteForHandicap(scores, nineType)
        ) {
          const { adjustedGross } = calculateAdjustedGrossScore({
            holes,
            scores,
            dailyHandicap,
          });
          handicapDifferential = calculateScoreDifferential({
            adjustedGrossScore: adjustedGross > 0 ? adjustedGross : totalGross,
            courseRating: courseRatingUsed,
            slopeRating: slopeRatingUsed,
          });
        }

        const scorecardData = {
          round_id: roundId,
          player_id: playerId,
          scores,
          total_gross: totalGross,
          total_net: totalNet,
          total_points: totalPoints,
          total_par_score: totalParScore ?? null,
          status: 'completed',
          submitted_at: new Date().toISOString(),
          submitted_by: currentUser.id,
          synced_at: new Date().toISOString(),
          ga_handicap_used: baseHandicap || null,
          daily_handicap_used: dailyHandicap != null ? Math.round(dailyHandicap) : null,
          handicap_differential: handicapDifferential,
          course_rating_used: courseRatingUsed,
          slope_rating_used: slopeRatingUsed,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
        const { error, data } = await (supabase.from('scorecards') as any)
          .upsert(scorecardData, { onConflict: 'round_id,player_id' })
          .select('id')
          .single();

        if (error) {
          throw (
            roundScoringErrorFromSql(roundId, error) ??
            new Error(`Failed to save scorecard: ${error.message}`)
          );
        }
        assertSelected();

        // Update round status based on scorecard completion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
        const { data: roundRow } = await (supabase.from('rounds') as any)
          .select('status, competition_id')
          .eq('id', roundId)
          .single();
        assertSelected();

        if (roundRow) {
          // If round is still upcoming, move to in-progress
          if (roundRow.status === 'upcoming') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('rounds') as any)
              .update({ status: 'in-progress' })
              .eq('id', roundId);
            assertSelected();
          }

          // Check if all players now have completed scorecards
          let playerCount: number | null = null;

          if (roundRow.competition_id) {
            const { count } = await supabase
              .from('competition_players')
              .select('*', { count: 'exact', head: true })
              .eq('competition_id', roundRow.competition_id)
              .eq('status', 'accepted');
            assertSelected();
            playerCount = count;
          } else {
            // Standalone round: count players from round_players
            const { count } = await supabase
              .from('round_players')
              .select('*', { count: 'exact', head: true })
              .eq('round_id', roundId);
            assertSelected();
            playerCount = count;
          }

          if (playerCount) {
            const { count: completedCount } = await supabase
              .from('scorecards')
              .select('*', { count: 'exact', head: true })
              .eq('round_id', roundId)
              .eq('status', 'completed');
            assertSelected();

            if (completedCount && completedCount >= playerCount) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('rounds') as any)
                .update({ status: 'completed' })
                .eq('id', roundId);
              assertSelected();
            }
          }
        }

        // Finalize round results so the leaderboard picks up the scores.
        // Goes through refinalizeRoundResults so team-only formats (Scramble,
        // Best Ball, Shamble) take the team-rows path. Quick-entry would
        // otherwise miss that branch and write stale individual rows.
        if (roundRow?.competition_id) {
          try {
            await refinalizeRoundResults(roundId);
          } catch {
            // Non-critical: scorecard is already saved, finalization can be retried
          }
          assertSelected();
        }

        return { success: true, scorecardId: data?.id };
      };
      return withRoundScoringWrite(input.roundId, async () => {
        assertCurrent();
        if (Platform.OS !== 'web')
          try {
            if (await getRoundEndPrerequisite(input.roundId))
              throw new RoundScoringWriteError(
                'local_end_pending',
                input.roundId,
                'Round end must settle before uploading scores'
              );
          } catch (error) {
            if (error instanceof RoundScoringWriteError) throw error;
            throw new RoundScoringWriteError(
              'local_end_pending',
              input.roundId,
              'Round end prerequisite could not be read'
            );
          }
        assertCurrent();
        const draft = input.readCurrent?.() ?? input;
        const version = draftVersion(draft);
        const assertDraft = () => {
          assertOwnerAndOperation();
          if (draftVersion(input.readCurrent?.() ?? input) !== version)
            throw new RoundScoringWriteError(
              'context_changed',
              input.roundId,
              'Quick Score draft changed'
            );
        };
        const assertSelected = () => {
          assertCurrent();
          assertDraft();
        };
        const expected = input.expectedRoundShape ?? {
          nine_type: input.nineType,
          holes_played: null,
        };
        try {
          assertSelected();
          if (
            draft.expectedRoundShape?.holes_played != null ||
            draft.nineType !== expected.nine_type
          )
            throw new RoundScoringWriteError(
              'shape_changed',
              input.roundId,
              'Round changed; review before retrying.'
            );
          const saved = await persistUnended(draft, assertSelected);
          assertSelected();
          return {
            ...saved,
            ...(input.readCurrent && {
              isCurrent: () => {
                try {
                  assertSelected();
                  return true;
                } catch {
                  return false;
                }
              },
            }),
          };
        } catch (error) {
          if (
            error instanceof RoundScoringWriteError &&
            (error.kind === 'shape_changed' || error.kind === 'out_of_play')
          ) {
            assertSelected();
            const authoritative = await fetchRoundScoringShape(input.roundId);
            assertSelected();
            if (
              authoritative.nine_type !== expected.nine_type ||
              authoritative.holes_played !== expected.holes_played
            ) {
              try {
                await adoptRoundShapeWithinScoringWrite(input.roundId, authoritative, {
                  ownerId: capture.ownerId!,
                  originalSession: capture.session,
                  isCurrent: () => {
                    assertDraft();
                    return true;
                  },
                });
              } catch (failure) {
                if (failure instanceof RoundScoringWriteError) throw failure;
                throw new RoundScoringWriteError(
                  'unavailable',
                  input.roundId,
                  failure instanceof Error ? failure.message : 'Shape recovery unavailable',
                  { sqlCode: error.sqlCode, sqlHint: error.sqlHint }
                );
              }
              assertDraft();
              throw new RoundScoringWriteError(
                'shape_changed',
                input.roundId,
                'Round changed. Refresh and review scores before retrying.',
                { sqlCode: error.sqlCode, sqlHint: error.sqlHint }
              );
            }
          }
          throw error;
        }
      });
    },
    onError: async (error, input) => {
      if (error instanceof RoundScoringWriteError || error instanceof ScorecardConflictError) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: roundKeys.detail(input.roundId) }),
          queryClient.invalidateQueries({
            queryKey: scorecardKeys.list({ roundId: input.roundId }),
          }),
        ]);
      }
    },
    onSuccess: (_result, input) => {
      // Invalidate relevant caches using correct query key formats
      queryClient.invalidateQueries({ queryKey: ['round', input.roundId] });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(input.roundId) });
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: input.roundId }) });
      queryClient.invalidateQueries({ queryKey: ['roundDetails'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}
