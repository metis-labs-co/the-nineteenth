import {
  getHoles,
  getScorecardsByRound,
  getPendingSyncs,
  getFailedSyncs,
  persistAuthoritativeRoundShape,
} from '@/services/offline/database';
import {
  captureRoundPersistenceSource,
  isRoundPersistenceSourceCurrent,
  withRoundPersistenceTransition,
} from '@/services/offline/roundPersistenceBarrier';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore, type RoundScoringSession } from '@/store/scorecardStore';
import { transformHolesIfNeeded } from '@/utils/holeTransformers';
import type { GameType, Scorecard } from '@/types';
import { createRoundScoringContext, type RoundRepairEvidence } from './roundScoringContext';
import { RoundScoringWriteError } from './roundScoringErrors';
import { ROUND_SCORING_READ_TIMEOUT_MS } from './roundScoringShape';
import { withRoundScoringWrite } from './roundScoringCoordinator';
import {
  shapeHoleNumbers,
  type AcceptedScorecardWrite,
  type RoundScoringShape,
} from './roundScoringWrite';

type AdoptionOptions = { ownerId: string; acceptedWrite?: AcceptedScorecardWrite };
type PreparedAdoptionOptions = AdoptionOptions & {
  /** Loading has its own private generation guard and must never borrow live profiles. */
  isCurrent?: () => boolean;
  evidence?: RoundRepairEvidence;
  /** Already-held remote callers preserve the original session, including explicit absence. */
  originalSession?: RoundScoringSession | null;
};

async function readRepairMetadata(roundId: string): Promise<RoundRepairEvidence> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new RoundScoringWriteError('unavailable', roundId, 'Scoring metadata read timed out')
        );
        abort.abort(); // Best effort only; the caller deadline does not certify cancellation.
      }, ROUND_SCORING_READ_TIMEOUT_MS);
    });
    const request = supabase
      .from('rounds')
      .select('game_type, courses!course_id(holes)')
      .eq('id', roundId)
      .is('deleted_at', null)
      .abortSignal(abort.signal)
      .maybeSingle();
    const { data, error } = (await Promise.race([
      Promise.resolve(request),
      timeout,
    ])) as unknown as {
      data: { game_type?: GameType; courses?: { holes?: unknown[] } | null } | null;
      error: { message: string; code?: string; hint?: string } | null;
    };
    if (error || !data)
      throw new RoundScoringWriteError(
        'unavailable',
        roundId,
        error?.message ?? 'Scoring metadata unavailable',
        { sqlCode: error?.code, sqlHint: error?.hint }
      );
    return {
      gameType: data.game_type,
      holes: data.courses?.holes ? transformHolesIfNeeded(data.courses.holes) : undefined,
    };
  } catch (error) {
    if (error instanceof RoundScoringWriteError) throw error;
    throw new RoundScoringWriteError(
      'unavailable',
      roundId,
      error instanceof Error ? error.message : 'Scoring metadata unavailable'
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Captures proof before any read or coordinator await. No prepared score maps cross the gate. */
function captureRepair(roundId: string, options: PreparedAdoptionOptions) {
  const ownerId = options.ownerId;
  const source = captureRoundPersistenceSource(roundId);
  const session: RoundScoringSession | null =
    options.originalSession !== undefined
      ? options.originalSession
      : options.isCurrent
        ? null
        : useScorecardStore.getState().captureRoundScoringSession(roundId);
  const assertCurrent = () => {
    if (!ownerId?.trim() || getSyncAuthUserId() !== ownerId)
      throw new RoundScoringWriteError('unavailable', roundId, 'Captured scoring owner changed');
    if ((options.isCurrent && !options.isCurrent()) || (session && !session.isCurrent()))
      throw new RoundScoringWriteError('context_changed', roundId, 'Scoring session changed');
  };
  assertCurrent();
  return { ownerId, source, session, assertCurrent };
}

async function repairWithinBoundary(
  roundId: string,
  shape: RoundScoringShape,
  options: PreparedAdoptionOptions,
  proof: ReturnType<typeof captureRepair>
) {
  proof.assertCurrent();
  if (!isRoundPersistenceSourceCurrent(proof.source))
    throw new RoundScoringWriteError('context_changed', roundId, 'Prepared scoring source changed');
  const [cards, pending, failed, holes] = await Promise.all([
    getScorecardsByRound(roundId),
    getPendingSyncs(),
    getFailedSyncs(),
    getHoles(roundId),
  ]);
  proof.assertCurrent();
  const sources = [
    ...cards,
    ...[...pending, ...failed]
      .filter((item) => item.type === 'scorecard' && item.action !== 'delete')
      .map((item) => item.data as Scorecard)
      .filter((card) => card?.roundId === roundId),
    ...(options.evidence?.sources ?? []),
  ];
  if (
    shape.holes_played === null &&
    (proof.session?.hasLocalEnd() ||
      [...sources, ...(proof.session?.getCards() ?? [])].some((card) => card.holesPlayed != null))
  )
    throw new RoundScoringWriteError('local_end_pending', roundId, 'A final local end is pending');
  let evidence: RoundRepairEvidence = {
    holes: holes.length ? holes : undefined,
    ...options.evidence,
    sources,
    getLiveContext: options.evidence?.getLiveContext ?? proof.session?.getLiveContext,
  };
  // Generic authorized metadata supplies course/game only. Historical HI/tee never come from today's profile.
  if (
    sources.some((card) => {
      // This guarded context belongs only to this original source. Do not turn
      // it into generic evidence for historical cached/queued sources.
      const live = evidence.getLiveContext?.(card);
      return (
        !(card.syncHoles?.length || evidence.holes?.length || live?.holes.length) ||
        !(card.syncGameType || evidence.gameType || live?.gameType)
      );
    })
  ) {
    const remote = await readRepairMetadata(roundId);
    proof.assertCurrent();
    evidence = {
      ...remote,
      ...evidence,
      holes: evidence.holes ?? remote.holes,
      gameType: evidence.gameType ?? remote.gameType,
    };
  }
  const rebuild = createRoundScoringContext(roundId, evidence);
  for (const card of sources) rebuild(card, shapeHoleNumbers(shape), shape);
  proof.assertCurrent();
  if (!isRoundPersistenceSourceCurrent(proof.source))
    throw new RoundScoringWriteError('context_changed', roundId, 'Prepared scoring source changed');
  return withRoundPersistenceTransition(
    roundId,
    shape,
    () => {
      proof.assertCurrent();
      if (shape.holes_played === null && proof.session?.hasLocalEnd())
        throw new RoundScoringWriteError(
          'local_end_pending',
          roundId,
          'A final current-session local end is pending'
        );
      return persistAuthoritativeRoundShape(roundId, shape, {
        ownerId: proof.ownerId,
        acceptedWrite: options.acceptedWrite,
        rebuild,
      });
    },
    (result) => {
      // Barrier invalidates epoch before this callback, even if guarded application fails.
      proof.assertCurrent();
      proof.session?.applyShape(shape, result.priorLocalShapes, options.acceptedWrite, rebuild);
    }
  );
}

export async function adoptAuthoritativeRoundShape(
  roundId: string,
  shape: RoundScoringShape,
  options: AdoptionOptions
): Promise<void> {
  const proof = captureRepair(roundId, options);
  await withRoundScoringWrite(roundId, () => repairWithinBoundary(roundId, shape, options, proof));
}

/** Internal entry for upload/end callers that already own the server coordinator. */
export async function adoptRoundShapeWithinScoringWrite(
  roundId: string,
  shape: RoundScoringShape,
  options: AdoptionOptions & Pick<PreparedAdoptionOptions, 'originalSession' | 'isCurrent'>
): Promise<void> {
  const proof = captureRepair(roundId, options);
  await repairWithinBoundary(roundId, shape, options, proof);
}

/** Loading shares the exact core/transaction but installs only through its captured loading generation. */
export async function repairRoundShapeForInitialization(
  roundId: string,
  shape: RoundScoringShape,
  options: PreparedAdoptionOptions
) {
  const proof = captureRepair(roundId, options);
  return withRoundScoringWrite(roundId, () => repairWithinBoundary(roundId, shape, options, proof));
}
