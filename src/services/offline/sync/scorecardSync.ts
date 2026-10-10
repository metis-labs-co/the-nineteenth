/**
 * Scorecard Sync Module
 *
 * Handles synchronization of scorecard data to Supabase.
 * Includes handicap calculation and score entry sync.
 */

import { resolveScorecardConflict } from './scorecardConflictResolver';
import { supabase } from '@/services/supabase/client';
import { Platform } from 'react-native';
import { pendingSyncRecoveryVersion } from '../dao/pendingSyncRecovery';
import {
  getPendingSyncByEntityKey,
  getScorecardsByRound,
  recordAcceptedScorecardWrite,
  markScorecardAsSynced,
  removePendingSync,
} from '../database';
import {
  captureRoundPersistenceSource,
  captureRoundPersistenceRead,
  isRoundPersistenceSourceCurrent,
  withRoundPersistence,
  type RoundPersistenceSource,
} from '../roundPersistenceBarrier';
import { getSyncAuthUserId } from './networkState';
import {
  withRoundScoringWrite,
  getRoundEndPrerequisite,
} from '@/services/rounds/roundScoringCoordinator';
import {
  RoundScoringWriteError,
  roundScoringErrorFromSql,
} from '@/services/rounds/roundScoringErrors';
import { useScorecardStore, type RoundScoringSession } from '@/store/scorecardStore';
import { fetchRoundScoringShape } from '@/services/rounds/roundScoringShape';
import { adoptRoundShapeWithinScoringWrite } from '@/services/rounds/roundScoringAdoption';
import { createRoundScoringContext } from '@/services/rounds/roundScoringContext';
import {
  shapeHoleNumbers,
  scorecardScoringVersion,
  type ScoringUploadCard,
  type AcceptedRemoteSnapshot,
  type RoundScoringShape,
} from '@/services/rounds/roundScoringWrite';
import { invalidateHandicapCache } from '@/services/queryClient';
import { saveScoreEntries } from '@/services/scoreMismatch';
import type { Scorecard, PendingSync, HoleScore } from '@/types';
import type { Database, ScorecardSnapshotWrite } from '@/types/database/schema';
import { isSingleBallScore } from '@/types/database/base';
import { syncLogger, logScorecardSummary } from '@/utils/debugLogger';
import { calculateScoreDifferential, getRatingsForGender } from '@/utils/handicapDifferential';
import { calculateAdjustedGrossScore, type AdjustedGrossParams } from '@/utils/adjustedGross';
import { calculateNineAwareDailyHandicap } from '@/utils/dailyHandicap';
import { calculateNetOverHolesPlayed } from '@/utils/scorecardCalculations';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { isEndedEarly } from '@/utils/roundShape';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  calculateParScore,
  getEffectiveGrossStrokes,
} from '@/utils/scoring';
import { teeBoxToRatings } from '@/utils/teeTransformers';
import { getEffectiveTeeRatings } from '@/utils/teeResolution';
import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';
import { isSharedBallRound } from '@/utils/roundFormat';
import { isCompleteForHandicap } from '@/utils/handicapEligibility';

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Process scorecard sync action
 */
export async function processScorecardSync(
  sync: PendingSync,
  options: ScorecardUploadOptions = {}
): Promise<ScorecardSyncResult | void> {
  const { action, data } = sync;

  syncLogger.debug('Processing scorecard sync', { action, dataId: data?.id });

  switch (action) {
    case 'create':
    case 'update':
      return syncScorecard(data as Scorecard, { ...options, queued: sync });
    case 'delete':
      await deleteRemoteScorecard(data as Scorecard);
      break;
    default:
      syncLogger.warn('Unknown action', { action });
  }
}

async function deleteRemoteScorecard(scorecard: Scorecard): Promise<void> {
  if (!isValidUUID(scorecard.roundId) || !isValidUUID(scorecard.playerId)) {
    throw new Error('Cannot delete scorecard with invalid round or player identifier');
  }

  const { error } = await supabase
    .from('scorecards')
    .delete()
    .eq('round_id', scorecard.roundId)
    .eq('player_id', scorecard.playerId);

  if (error) {
    throw new Error(`Failed to delete scorecard: ${error.code ?? ''} ${error.message}`.trim());
  }
}

/**
 * Sync a scorecard to Supabase
 */
export interface ScorecardSyncResult {
  serverRevision: number;
  serverScorecardId?: string;
}

export class ScorecardConflictError extends Error {
  readonly serverRevision: number;
  readonly serverStatus: string | null;
  readonly serverScores: Record<string, unknown>;

  constructor(row: ScorecardWriteResult) {
    super(
      'This scorecard changed on another device. Your local scores were kept and were not uploaded.'
    );
    this.name = 'ScorecardConflictError';
    this.serverRevision = Number(row.server_revision);
    this.serverStatus = row.server_status;
    this.serverScores = row.server_scores ?? {};
  }
}

type SnapshotRpc = Database['public']['Functions']['write_scorecard_snapshot'];
type ScorecardWriteResult = SnapshotRpc['Returns'][number];

export interface ScorecardUploadCapture {
  readonly ownerId: string | null;
  readonly source: RoundPersistenceSource;
  readonly session: RoundScoringSession | null;
}
/** Call before a caller's first source read, including device-wide/round-wide DAO reads. */
export function captureScorecardUpload(roundId: string): ScorecardUploadCapture {
  return {
    ownerId: getSyncAuthUserId(),
    source: captureRoundPersistenceSource(roundId),
    session: useScorecardStore.getState().captureRoundScoringSession(roundId),
  };
}
/** Remote work retains private session absence as well as the original upload proof. */
export function captureRemoteScorecardUpload(roundId: string): RemoteScorecardUploadOptions['capture'] {
  return { ...captureScorecardUpload(roundId),
    isSessionCurrent: useScorecardStore.getState().captureRoundScoringOperation(roundId) };
}
/** Capture device-wide read provenance before its round IDs become known. */
export function captureScorecardUploadRead(): (roundId: string) => ScorecardUploadCapture {
  const ownerId = getSyncAuthUserId();
  const source = captureRoundPersistenceRead();
  const state = useScorecardStore.getState();
  const activeRoundId = state.currentRoundId;
  const session = activeRoundId ? state.captureRoundScoringSession(activeRoundId) : null;
  return (roundId) => ({
    ownerId,
    source: source(roundId),
    session: activeRoundId === roundId ? session : null,
  });
}
export interface ScorecardUploadOptions {
  capture?: ScorecardUploadCapture;
  queued?: PendingSync;
  /** A guarded synchronous CURRENT submit source preserves its completion intent. */
  readCurrent?: () => Scorecard;
  adoptServerRevisionOnConflict?: boolean;
  markSynced?: boolean;
  onSynced?: (scorecard: Scorecard, serverRevision: number) => void;
  onSelected?: (selection: ScorecardUploadSelection) => void;
  /** Background work must not reactivate a failure awaiting explicit recovery. */
  automatic?: boolean;
}
export interface RemoteScorecardUploadOptions {
  kind: 'remote';
  capture: ScorecardUploadCapture & { isSessionCurrent: () => boolean };
  assertOperationCurrent: () => void;
  expectedRoundShape?: RoundScoringShape;
  /** Existing caller completion work, guarded within this same coordinator. */
  afterAccepted?: (assertCurrent: () => Promise<void>) => Promise<void>;
  /** Select and prove a CURRENT immutable draft only after coordinator admission. */
  prepareCurrent: () => Promise<{
    card: ScoringUploadCard;
    assertDraftCurrent: () => void;
    serverScorecardId?: string;
  }>;
}
export interface ScorecardUploadSelection {
  scorecard: Scorecard;
  queued: PendingSync | null;
  isCurrent: () => boolean;
  assertCurrent: () => Promise<void>;
  isOwnerCurrent: () => boolean;
}
export function syncScorecard(
  scorecard: Scorecard,
  options?: ScorecardUploadOptions
): Promise<ScorecardSyncResult>;
export function syncScorecard(
  identity: { roundId: string; playerId: string },
  options: RemoteScorecardUploadOptions
): Promise<ScorecardSyncResult>;
export async function syncScorecard(
  input: Scorecard | { roundId: string; playerId: string },
  options: ScorecardUploadOptions | RemoteScorecardUploadOptions = {}
): Promise<ScorecardSyncResult> {
  if ('kind' in options && options.kind === 'remote') return syncRemoteScorecard(input, options);
  return syncLocalScorecard(input as Scorecard, options as ScorecardUploadOptions);
}

async function syncRemoteScorecard(
  identity: { roundId: string; playerId: string },
  options: RemoteScorecardUploadOptions
): Promise<ScorecardSyncResult> {
  const { ownerId, source, session, isSessionCurrent } = options.capture;
  const assertOperationCurrent = () => {
    options.assertOperationCurrent();
    if (
      !ownerId ||
      getSyncAuthUserId() !== ownerId ||
      source.roundId !== identity.roundId ||
      !isSessionCurrent() ||
      (session && !session.isCurrent())
    )
      throw new RoundScoringWriteError(
        'context_changed',
        identity.roundId,
        'Remote scoring source changed; refresh and review scores before retrying.'
      );
  };
  const assertCurrent = () => {
    assertOperationCurrent();
    if (!isRoundPersistenceSourceCurrent(source))
      throw new RoundScoringWriteError(
        'context_changed',
        identity.roundId,
        'Remote scoring preparation changed; refresh and review scores before retrying.'
      );
  };
  assertCurrent();
  return withRoundScoringWrite(identity.roundId, async () => {
    assertCurrent();
    if (Platform.OS !== 'web') {
      try {
        if (await getRoundEndPrerequisite(identity.roundId))
          throw new RoundScoringWriteError(
            'local_end_pending',
            identity.roundId,
            'Round end must settle before uploading scores'
          );
      } catch (error) {
        if (error instanceof RoundScoringWriteError) throw error;
        throw new RoundScoringWriteError(
          'local_end_pending',
          identity.roundId,
          'Round end prerequisite could not be read'
        );
      }
    }
    assertCurrent();
    let selected: Awaited<ReturnType<RemoteScorecardUploadOptions['prepareCurrent']>> | undefined;
    let shape = options.expectedRoundShape;
    let acceptedRemoteSnapshot: AcceptedRemoteSnapshot | undefined;
    try {
      selected = await options.prepareCurrent();
      const selection = selected;
      const assertDraftCurrent = async () => {
        assertCurrent();
        selection.assertDraftCurrent();
      };
      await assertDraftCurrent();
      if (
        selected.card.roundId !== identity.roundId ||
        selected.card.playerId !== identity.playerId
      )
        throw new RoundScoringWriteError(
          'context_changed',
          identity.roundId,
          'Remote scoring identity changed'
        );
      const preparedShape = {
        nine_type: selected.card.syncNineType ?? 'full',
        holes_played: selected.card.holesPlayed ?? null,
      };
      if (
        shape &&
        (shape.nine_type !== preparedShape.nine_type ||
          shape.holes_played !== preparedShape.holes_played)
      )
        throw new RoundScoringWriteError(
          'context_changed',
          identity.roundId,
          'Displayed round shape changed; review before retrying.'
        );
      shape = preparedShape;
      const authoritative = await fetchRoundScoringShape(identity.roundId);
      await assertDraftCurrent();
      if (
        authoritative.nine_type !== shape.nine_type ||
        authoritative.holes_played !== shape.holes_played
      )
        throw new RoundScoringWriteError(
          'shape_changed',
          identity.roundId,
          'Round changed; refresh and review scores before retrying.'
        );
      const prepared = createRoundScoringContext(identity.roundId, {})(
        selected.card,
        shapeHoleNumbers(shape),
        shape
      );
      const result = await uploadScorecardWithinBoundary(
        prepared,
        ownerId!,
        assertDraftCurrent,
        async () => {},
        (serverRevision) => ({
          acceptedRemoteSnapshot: {
            roundId: identity.roundId,
            playerId: identity.playerId,
            serverRevision,
            ...(selection.serverScorecardId && { serverScorecardId: selection.serverScorecardId }),
          },
        })
      );
      acceptedRemoteSnapshot = {
        roundId: identity.roundId,
        playerId: identity.playerId,
        serverRevision: result.serverRevision,
        ...(selected.serverScorecardId && { serverScorecardId: selected.serverScorecardId }),
      };
      await options.afterAccepted?.(assertDraftCurrent);
      try {
        await assertDraftCurrent();
      } catch (error) {
        const scoringError = error instanceof RoundScoringWriteError ? error : null;
        throw new RoundScoringWriteError(
          scoringError?.kind ?? 'unavailable',
          identity.roundId,
          error instanceof Error ? error.message : 'Remote acknowledgment failed',
          {
            acceptedRemoteSnapshot: {
              roundId: identity.roundId,
              playerId: identity.playerId,
              serverRevision: result.serverRevision,
              ...(selected.serverScorecardId && { serverScorecardId: selected.serverScorecardId }),
            },
            sqlCode: scoringError?.sqlCode,
            sqlHint: scoringError?.sqlHint,
          }
        );
      }
      return {
        ...result,
        ...(selected.serverScorecardId && { serverScorecardId: selected.serverScorecardId }),
      };
    } catch (error) {
      const original = error instanceof RoundScoringWriteError ? error : null;
      acceptedRemoteSnapshot = original?.acceptedRemoteSnapshot ?? acceptedRemoteSnapshot;
      let failure = error;
      if (
        shape &&
        (original?.kind === 'shape_changed' ||
          original?.kind === 'out_of_play' ||
          error instanceof ScorecardConflictError)
      ) {
        try {
          assertCurrent();
          selected?.assertDraftCurrent();
          const authoritative = await fetchRoundScoringShape(identity.roundId);
          assertCurrent();
          selected?.assertDraftCurrent();
          if (
            shape.nine_type !== authoritative.nine_type ||
            shape.holes_played !== authoritative.holes_played
          ) {
            await adoptRoundShapeWithinScoringWrite(identity.roundId, authoritative, {
              ownerId: ownerId!,
              originalSession: session,
              isCurrent: () => {
                assertOperationCurrent();
                selected?.assertDraftCurrent();
                return true;
              },
            });
            // The service's own successful epoch advance invalidates the old source by design.
            assertOperationCurrent();
            selected?.assertDraftCurrent();
            failure = new RoundScoringWriteError(
              'shape_changed',
              identity.roundId,
              'Round changed. Refresh and review scores before retrying.',
              { sqlCode: original?.sqlCode, sqlHint: original?.sqlHint }
            );
          }
        } catch (recoveryError) {
          failure =
            recoveryError instanceof RoundScoringWriteError
              ? recoveryError
              : new RoundScoringWriteError(
                  'unavailable',
                  identity.roundId,
                  recoveryError instanceof Error
                    ? recoveryError.message
                    : 'Remote shape recovery unavailable',
                  { sqlCode: original?.sqlCode, sqlHint: original?.sqlHint }
                );
        }
      }
      if (acceptedRemoteSnapshot || !(failure instanceof Error)) {
        const scoring = failure instanceof RoundScoringWriteError ? failure : null;
        throw new RoundScoringWriteError(
          scoring?.kind ?? 'unavailable',
          identity.roundId,
          failure instanceof Error ? failure.message : 'Remote scoring recovery failed',
          {
            acceptedRemoteSnapshot,
            sqlCode: scoring?.sqlCode ?? original?.sqlCode,
            sqlHint: scoring?.sqlHint ?? original?.sqlHint,
          }
        );
      }
      throw failure;
    }
  });
}

async function syncLocalScorecard(
  scorecard: Scorecard,
  options: ScorecardUploadOptions = {}
): Promise<ScorecardSyncResult> {
  let mergedConflictCard: Scorecard | undefined;
  const proof = options.capture ?? captureScorecardUpload(scorecard.roundId);
  const { ownerId, source, session } = proof;
  const assertCurrent = () => {
    if (
      source.roundId !== scorecard.roundId ||
      !ownerId ||
      getSyncAuthUserId() !== ownerId ||
      (session && !session.isCurrent())
    )
      throw new RoundScoringWriteError(
        'context_changed',
        scorecard.roundId,
        'Scoring owner or session changed'
      );
  };
  if (scorecard.isStandalone) return { serverRevision: scorecard.serverRevision ?? 0 };
  assertCurrent();
  return withRoundScoringWrite(scorecard.roundId, async () => {
    let revisionOverride: number | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      assertCurrent();
      try {
        if (await getRoundEndPrerequisite(scorecard.roundId))
          throw new RoundScoringWriteError(
            'local_end_pending',
            scorecard.roundId,
            'Round end must settle before uploading scores'
          );
      } catch (error) {
        if (error instanceof RoundScoringWriteError) throw error;
        throw new RoundScoringWriteError(
          'local_end_pending',
          scorecard.roundId,
          'Round end prerequisite could not be read'
        );
      }
      assertCurrent();
      const currentSource = captureRoundPersistenceSource(scorecard.roundId);
      const key = `scorecard:${scorecard.roundId}:${scorecard.playerId}`;
      let queued: PendingSync | null;
      try {
        queued = Platform.OS === 'web' ? null : await getPendingSyncByEntityKey(key);
      } catch (error) {
        throw new RoundScoringWriteError(
          'context_missing',
          scorecard.roundId,
          error instanceof Error ? error.message : 'Queued scoring context is invalid'
        );
      }
      assertCurrent();
      if (options.automatic && queued?.status === 'failed')
        throw new RoundScoringWriteError(
          'context_changed',
          scorecard.roundId,
          'Queued failure requires explicit recovery'
        );
      const live = session
        ?.getCards()
        .find(
          (card) =>
            card.id === scorecard.id &&
            card.playerId === scorecard.playerId &&
            card.roundId === scorecard.roundId
        );
      const disk =
        Platform.OS === 'web'
          ? undefined
          : (await getScorecardsByRound(scorecard.roundId)).find(
              (card) =>
                card.id === scorecard.id &&
                card.playerId === scorecard.playerId &&
                card.roundId === scorecard.roundId
            );
      assertCurrent();
      if (!isRoundPersistenceSourceCurrent(currentSource))
        throw new RoundScoringWriteError(
          'context_changed',
          scorecard.roundId,
          'Current scoring source changed'
        );
      const current =
        options.readCurrent?.() ?? (mergedConflictCard ? live ?? mergedConflictCard : (queued?.data as Scorecard | undefined) ?? live ?? disk);
      if (!current && !isRoundPersistenceSourceCurrent(source))
        throw new RoundScoringWriteError(
          'context_changed',
          scorecard.roundId,
          'Captured scoring source changed'
        );
      if (options.queued && !queued)
        throw new RoundScoringWriteError(
          'context_changed',
          scorecard.roundId,
          'Queued upload was replaced or removed'
        );
      if (options.queued && queued) {
        Object.assign(options.queued, {
          ...queued,
          entityKey: queued.entityKey,
          revision: queued.revision,
          status: queued.status,
          lastError: queued.lastError,
          lastAttemptAt: queued.lastAttemptAt,
        });
      }
      const selected = current ?? scorecard;
      const selectedOperation = options.queued ?? (queued && { ...queued });
      if (queued && (queued.type !== 'scorecard' || queued.action === 'delete'))
        throw new RoundScoringWriteError(
          'context_changed',
          scorecard.roundId,
          'Queued scoring work is no longer an upload'
        );
      if (
        selected.id !== scorecard.id ||
        selected.roundId !== scorecard.roundId ||
        selected.playerId !== scorecard.playerId ||
        !selected.scores
      )
        throw new RoundScoringWriteError(
          'context_missing',
          scorecard.roundId,
          'Current upload identity or scores are invalid'
        );
      const diskVersion = disk && scorecardScoringVersion(disk);
      const liveVersion = live && scorecardScoringVersion(live);
      const selectedVersion = scorecardScoringVersion(selected);
      const queueIdentity = queued && {
        id: queued.id,
        revision: queued.revision ?? 1,
        version: scorecardScoringVersion(queued.data as Scorecard),
        serverRevision: (queued.data as Scorecard).serverRevision ?? 0,
        metadata: pendingSyncRecoveryVersion(queued),
      };
      const assertCurrentContent = () => {
        assertCurrent();
        const currentLive = session
          ?.getCards()
          .find(
            (card) =>
              card.id === scorecard.id &&
              card.playerId === scorecard.playerId &&
              card.roundId === scorecard.roundId
          );
        if (
          !isRoundPersistenceSourceCurrent(currentSource) ||
          scorecardScoringVersion(selected) !== selectedVersion ||
          (currentLive && scorecardScoringVersion(currentLive)) !== liveVersion
        )
          throw new RoundScoringWriteError(
            'context_changed',
            scorecard.roundId,
            'Live scores changed during upload'
          );
        return true;
      };
      const assertUploadedCurrent = async () => {
        assertCurrentContent();
        if (Platform.OS !== 'web') {
          const currentQueue = await getPendingSyncByEntityKey(key);
          assertCurrent();
          const currentDisk = (await getScorecardsByRound(scorecard.roundId)).find(
            (card) =>
              card.id === scorecard.id &&
              card.playerId === scorecard.playerId &&
              card.roundId === scorecard.roundId
          );
          assertCurrent();
          if (
            currentQueue?.id !== queueIdentity?.id ||
            (currentQueue && (currentQueue.revision ?? 1)) !==
              (queueIdentity && queueIdentity.revision) ||
            (currentQueue && scorecardScoringVersion(currentQueue.data as Scorecard)) !==
              (queueIdentity && queueIdentity.version) ||
            (currentQueue && pendingSyncRecoveryVersion(currentQueue)) !==
              (queueIdentity && queueIdentity.metadata) ||
            (currentDisk && scorecardScoringVersion(currentDisk)) !== diskVersion ||
            !isRoundPersistenceSourceCurrent(currentSource)
          )
            throw new RoundScoringWriteError(
              'context_changed',
              scorecard.roundId,
              'Durable scores changed during upload'
            );
        }
      };
      options.onSelected?.({
        scorecard: selected,
        queued: selectedOperation,
        isCurrent: assertCurrentContent,
        assertCurrent: assertUploadedCurrent,
        isOwnerCurrent: () => {
          assertCurrent();
          return true;
        },
      });
      const shape = {
        nine_type: selected.syncNineType ?? 'full',
        holes_played: selected.holesPlayed ?? null,
      };
      let keep: ReadonlySet<number>;
      try {
        keep = shapeHoleNumbers(shape);
      } catch {
        throw new RoundScoringWriteError(
          'invalid_shape',
          scorecard.roundId,
          'Invalid scoring preparation shape'
        );
      }
      let prepared =
        shape.holes_played != null
          ? createRoundScoringContext(scorecard.roundId, {
              getLiveContext: session?.getLiveContext,
            })(selected, keep, shape)
          : selected;
      if (revisionOverride != null)
        prepared = {
          ...prepared,
          serverRevision: Math.max(prepared.serverRevision ?? 0, revisionOverride),
        };
      const preserveAccepted = async (serverRevision: number) => {
        const acceptedWrite = { scorecardId: selected.id, serverRevision };
        try {
          await recordAcceptedScorecardWrite(selected.roundId, selected.playerId, acceptedWrite);
          // Only the accepted metadata write may advance this failure CAS proof.
          // Never bless a newer scoring payload or reset its queue recovery state.
          if (
            selectedOperation &&
            queueIdentity &&
            getSyncAuthUserId() === ownerId &&
            (!session || session.isCurrent()) &&
            isRoundPersistenceSourceCurrent(currentSource)
          ) {
            const currentQueue = await getPendingSyncByEntityKey(key);
            if (
              getSyncAuthUserId() === ownerId &&
              (!session || session.isCurrent()) &&
              isRoundPersistenceSourceCurrent(currentSource) &&
              currentQueue &&
              currentQueue.id === queueIdentity.id &&
              currentQueue.revision === queueIdentity.revision + 1 &&
              queueIdentity.serverRevision < serverRevision &&
              currentQueue.data?.serverRevision === serverRevision &&
              scorecardScoringVersion(currentQueue.data as Scorecard) === queueIdentity.version &&
              pendingSyncRecoveryVersion(currentQueue) === queueIdentity.metadata
            ) {
              selectedOperation.revision = currentQueue.revision;
              queueIdentity.revision = currentQueue.revision;
            }
          }
        } catch (error) {
          throw new RoundScoringWriteError(
            'unavailable',
            selected.roundId,
            error instanceof Error
              ? error.message
              : 'Accepted scoring revision could not be recorded',
            { acceptedWrite }
          );
        }
        if (getSyncAuthUserId() === ownerId && (!session || session.isCurrent()))
          options.onSynced?.(selected, serverRevision);
      };
      let result: ScorecardSyncResult;
      try {
        result = await uploadScorecardWithinBoundary(
          prepared,
          ownerId!,
          assertUploadedCurrent,
          preserveAccepted
        );
      } catch (error) {
        const shapeRejected =
          error instanceof RoundScoringWriteError &&
          (error.kind === 'out_of_play' ||
            (error.kind === 'shape_changed' && !error.acceptedWrite));
        if (!shapeRejected && !(error instanceof ScorecardConflictError)) throw error;
        if (attempt > 0) throw error;
        try {
          assertCurrent();
          const authoritative = await fetchRoundScoringShape(scorecard.roundId);
          assertCurrent();
          const changed =
            authoritative.nine_type !== shape.nine_type ||
            authoritative.holes_played !== shape.holes_played;
          if (changed) {
            await adoptRoundShapeWithinScoringWrite(scorecard.roundId, authoritative, {
              ownerId: ownerId!,
              ...(error instanceof RoundScoringWriteError && {
                acceptedWrite: error.acceptedWrite,
              }),
            });
            assertCurrent();
            if (error instanceof ScorecardConflictError) revisionOverride = error.serverRevision;
            else if (error instanceof RoundScoringWriteError && error.acceptedWrite)
              revisionOverride = error.acceptedWrite.serverRevision;
          }
          if (error instanceof ScorecardConflictError) {
            const resolution = await resolveScorecardConflict(prepared, error);
            assertCurrent();
            if (resolution?.kind === 'final') {
              // The resolver durably adopted the final card. Remove only the
              // captured queue generation; a later edit keeps its own work.
              if (queued) await removePendingSync(queued.id!, queued.revision ?? 1,
                () => { assertCurrent(); return isRoundPersistenceSourceCurrent(currentSource); },
                { scorecardId: selected.id, roundId: selected.roundId,
                  playerId: selected.playerId, expectedRecovery: selectedOperation! });
              return { serverRevision: error.serverRevision };
            }
            if (resolution?.kind === 'retry') {
              mergedConflictCard = resolution.scorecard;
              continue;
            }
          }
          // A shape repair must not skip the social per-hole conflict merge.
          if (changed) continue; // Reread repaired CURRENT queue/disk/store.
          if (error instanceof ScorecardConflictError && options.adoptServerRevisionOnConflict) {
            assertCurrent();
            revisionOverride = error.serverRevision;
            continue;
          }
          throw error;
        } catch (recoveryError) {
          if (
            error instanceof RoundScoringWriteError &&
            error.acceptedWrite &&
            recoveryError !== error
          ) {
            const scoringError =
              recoveryError instanceof RoundScoringWriteError ? recoveryError : null;
            throw new RoundScoringWriteError(
              scoringError?.kind ?? 'unavailable',
              scorecard.roundId,
              recoveryError instanceof Error
                ? recoveryError.message
                : 'Accepted scoring recovery failed',
              {
                acceptedWrite: error.acceptedWrite,
                sqlCode: scoringError?.sqlCode ?? error.sqlCode,
                sqlHint: scoringError?.sqlHint ?? error.sqlHint,
              }
            );
          }
          throw recoveryError;
        }
      }
      const acceptedWrite = { scorecardId: selected.id, serverRevision: result.serverRevision };
      try {
        await assertUploadedCurrent();
        if (options.markSynced)
          await withRoundPersistence(currentSource, async (lease) => {
            await assertUploadedCurrent();
            if (
              disk &&
              !(await markScorecardAsSynced(selected.id, result.serverRevision, {
                lease,
                expected: disk,
                expectedVersion: diskVersion,
                ...(queueIdentity && {
                  queued: {
                    id: queueIdentity.id!,
                    revision: queueIdentity.revision,
                    expectedRecovery: selectedOperation!,
                  },
                }),
                isCurrent: assertCurrentContent,
              }))
            )
              throw new RoundScoringWriteError(
                'context_changed',
                scorecard.roundId,
                'Current disk card refused acknowledgment'
              );
            if (
              Platform.OS === 'web' &&
              !(await markScorecardAsSynced(selected.id, result.serverRevision, {
                roundId: selected.roundId,
                playerId: selected.playerId,
                isCurrent: assertCurrentContent,
              }))
            )
              throw new RoundScoringWriteError(
                'context_changed',
                scorecard.roundId,
                'Current web card refused acknowledgment'
              );
            assertCurrentContent();
            if (queued && !disk) {
              if (
                !(await removePendingSync(
                  queued.id!,
                  queued.revision ?? 1,
                  () => {
                    return assertCurrentContent();
                  },
                  {
                    scorecardId: selected.id,
                    roundId: selected.roundId,
                    playerId: selected.playerId,
                    expectedRecovery: selectedOperation!,
                  }
                ))
              )
                throw new RoundScoringWriteError(
                  'context_changed',
                  scorecard.roundId,
                  'Newer queued scores kept pending'
                );
            }
            assertCurrentContent();
            options.onSynced?.(selected, result.serverRevision);
          });
        return result;
      } catch (error) {
        await preserveAccepted(result.serverRevision);
        throw new RoundScoringWriteError(
          'context_changed',
          selected.roundId,
          error instanceof Error ? error.message : 'Upload acknowledgment refused',
          { acceptedWrite }
        );
      }
    }
    throw new RoundScoringWriteError(
      'shape_changed',
      scorecard.roundId,
      'Round shape changed repeatedly'
    );
  });
}

async function uploadScorecardWithinBoundary(scorecard: ScoringUploadCard, ownerId: string, assertCurrent: () => Promise<void>, preserveAccepted: (serverRevision: number) => Promise<void>, acceptance?: (serverRevision: number) => { acceptedRemoteSnapshot: AcceptedRemoteSnapshot }): Promise<ScorecardSyncResult> {
  syncLogger.info('Syncing scorecard to Supabase', scorecard.id ? logScorecardSummary({ ...scorecard, id: scorecard.id }) : { roundId: scorecard.roundId, playerId: scorecard.playerId });

  // Skip standalone rounds - they are local-only and don't sync to server
  if (scorecard.isStandalone) {
    syncLogger.info('Skipping standalone scorecard (local-only)', {
      id: scorecard.id?.substring(0, 20),
    });
    return { serverRevision: scorecard.serverRevision ?? 0 };
  }

  // Validate that round_id and player_id are valid UUIDs
  if (!isValidUUID(scorecard.roundId)) {
    syncLogger.error('Invalid round_id (not a UUID)', undefined, {
      roundId: scorecard.roundId,
      playerId: scorecard.playerId,
    });
    throw new Error(
      `Invalid round_id: ${scorecard.roundId} is not a valid UUID. Make sure you're using real competition data, not mock data.`
    );
  }

  if (!isValidUUID(scorecard.playerId)) {
    syncLogger.error('Invalid player_id (not a UUID)', undefined, {
      roundId: scorecard.roundId,
      playerId: scorecard.playerId,
    });
    throw new Error(
      `Invalid player_id: ${scorecard.playerId} is not a valid UUID. Make sure you're using real competition data, not mock data.`
    );
  }

  // Resolve handicap from the original PLANNED context before filtering scores.
  const handicapData = calculateHandicapData(scorecard);
  const snapshotCard = prepareEndedSnapshot(scorecard, handicapData.dailyHandicapUsed);

  // Transform scores object to ensure string keys (Supabase JSONB compatibility)
  // Include all tracked stats: putts, FIR, GIR, penalties, shotContributions
  const scoresForDb: Record<string, HoleScore> = {};
  let holesWithScores = 0;
  for (const [holeNum, score] of Object.entries(snapshotCard.scores)) {
    if (score && isSingleBallScore(score) && score.strokes !== undefined) {
      scoresForDb[String(holeNum)] = {
        strokes: score.strokes,
        putts: score.putts,
        fairwayHit: score.fairwayHit,
        greenInRegulation: score.greenInRegulation,
        penalties: score.penalties || 0,
        ...(score.editedAt && { editedAt: score.editedAt }),
        ...(score.scoredBy && { scoredBy: score.scoredBy }),
        ...(score.pickedUp && { pickedUp: true }),
        ...(score.didNotAttempt && { didNotAttempt: true }),
        // Include shot contributions if present (scramble/shamble formats)
        ...(score.shotContributions && { shotContributions: score.shotContributions }),
        // Include detailed stats if present
        ...(score.fairwayMissDirection && { fairwayMissDirection: score.fairwayMissDirection }),
        ...(score.greenMissDirection && { greenMissDirection: score.greenMissDirection }),
        ...(score.bunkerShots !== undefined && score.bunkerShots > 0 && { bunkerShots: score.bunkerShots }),
        ...(score.hazards && score.hazards.length > 0 && { hazards: score.hazards }),
      };
      holesWithScores++;
    }
  }

  // Warn if a completed scorecard has suspiciously few holes
  if (scorecard.status === 'completed' && holesWithScores < 9) {
    syncLogger.warn('Syncing completed scorecard with very few holes - possible data integrity issue', {
      holesWithScores,
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
    });
  }

  syncLogger.debug('Prepared scores for Supabase', {
    holesWithScores,
    totalGross: scorecard.totalGross,
    totalNet: scorecard.totalNet,
    status: scorecard.status,
  });

  // Helper to safely convert date to ISO string (handles both Date objects and strings)
  const toISOString = (date: Date | string | undefined | null): string | null => {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    // Already a string (from JSON.parse of stored data)
    return typeof date === 'string' ? date : null;
  };

  // Log if syncHoles count doesn't match scored holes
  const syncHolesCount = scorecard.syncHoles?.length ?? 0;
  if (syncHolesCount > 0 && syncHolesCount !== holesWithScores) {
    syncLogger.warn('Hole count mismatch between syncHoles and scored holes', {
      syncHolesCount,
      holesWithScores,
      roundId: scorecard.roundId.substring(0, 8) + '...',
    });
  }

  // Calculate correct Stableford points using daily handicap and hole data
  const totalPoints = calculateTotalPoints(snapshotCard, handicapData.dailyHandicapUsed);

  // Calculate Par-game score (+1/0/-1 per hole) using the same DHC + hole
  // data. Without this, Par-format rounds would sync with total_par_score
  // null/0 and the round-results pipeline (which reads total_par_score
  // for the rawScore on Par rounds) would treat every player as a 0.
  const totalParScore = calculateTotalParScore(snapshotCard, handicapData.dailyHandicapUsed);

  // total_net mirrors calculatePlayerStats (the scorecard view): gross −
  // daily_handicap_used, or — for a round ended early — the per-hole net over
  // the holes played. See calculateSnapshotTotalNet.
  const totalNet = calculateSnapshotTotalNet(snapshotCard, handicapData.dailyHandicapUsed);

  // Prepare data for Supabase upsert
  // Don't send 'id' - let Supabase generate it or use the unique constraint (round_id, player_id)
  const scorecardData: ScorecardSnapshotWrite = {
    expected_round_shape: { nine_type: scorecard.syncNineType ?? 'full', holes_played: scorecard.holesPlayed ?? null },
    scores: scoresForDb,
    total_gross: snapshotCard.totalGross || 0,
    total_net: totalNet,
    total_points: totalPoints,
    total_par_score: totalParScore,
    status: scorecard.status === 'in-progress' ? 'in-progress' : scorecard.status,
    submitted_at: toISOString(scorecard.submittedAt),
    submitted_by: scorecard.submittedBy || null,
    synced_at: new Date().toISOString(),
    // Handicap tracking fields
    ga_handicap_used: handicapData.gaHandicapUsed,
    daily_handicap_used: handicapData.dailyHandicapUsed,
    handicap_differential: handicapData.handicapDifferential,
    course_rating_used: handicapData.courseRatingUsed,
    slope_rating_used: handicapData.slopeRatingUsed,
  };

  syncLogger.debug('Writing scorecard with optimistic concurrency', {
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    status: scorecardData.status,
    hasSubmittedAt: !!scorecardData.submitted_at,
    hasHandicapDifferential: handicapData.handicapDifferential !== null,
  });

  // The installed client's generic schema resolves rpc to never. Keep the cast
  // narrow to the reviewed snapshot contract rather than bypassing its payload.
  const writeSnapshot = supabase.rpc as unknown as (name: 'write_scorecard_snapshot', args: SnapshotRpc['Args']) => PromiseLike<{
    data: SnapshotRpc['Returns'] | null;
    error: { code?: string; hint?: string; message: string; details?: string } | null;
  }>;
  const { error, data } = await writeSnapshot.call(supabase, 'write_scorecard_snapshot', {
    p_round_id: scorecard.roundId,
    p_player_id: scorecard.playerId,
    p_expected_revision: scorecard.serverRevision ?? 0,
    p_snapshot: scorecardData,
  });

  if (error) {
    syncLogger.error('Supabase scorecard write error', error, {
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
    });
    throw roundScoringErrorFromSql(scorecard.roundId, error) ?? new Error(`Failed to sync scorecard: ${error.code ?? ''} ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data as ScorecardWriteResult | null;
  if (!result || typeof result.applied !== 'boolean' || typeof result.conflict !== 'boolean' ||
    typeof result.server_revision !== 'number' || !Number.isInteger(result.server_revision) || result.server_revision < 0) {
    throw new Error('Failed to sync scorecard: server returned an invalid concurrency response');
  }
  if (!result.applied || result.conflict) {
    throw new ScorecardConflictError(result);
  }

  syncLogger.info('Scorecard synced successfully', {
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    holesScored: holesWithScores,
    handicapDifferential: scorecardData.handicap_differential,
  });

  // Sync score entries for mismatch detection
  try {
    await assertCurrent();
    await syncScoreEntries(snapshotCard, ownerId);
    await assertCurrent();
  } catch (error) {
    const accepted = acceptance?.(result.server_revision) ?? { acceptedWrite: { scorecardId: scorecard.id!, serverRevision: result.server_revision } };
    await preserveAccepted(result.server_revision);
    if (error instanceof RoundScoringWriteError)
      throw new RoundScoringWriteError(error.kind, error.roundId, error.message, { ...accepted, sqlCode: error.sqlCode, sqlHint: error.sqlHint });
    if (acceptance) throw new RoundScoringWriteError('unavailable', scorecard.roundId,
      error instanceof Error ? error.message : 'Remote snapshot accepted but continuation failed', accepted);
    throw error;
  }
  // Start background work only after the guarded snapshot/entries continuation.
  if (scorecardData.handicap_differential != null) {
    invalidateHandicapCache(scorecard.playerId);
    updatePlayerHandicapIndex(scorecard.playerId).catch(error => {
      syncLogger.warn('Failed to update player handicap index', {
        error: error instanceof Error ? error.message : 'Unknown error',
        playerId: scorecard.playerId.substring(0, 8) + '...',
      });
    });
  }
  return { serverRevision: result.server_revision };
}

/**
 * Calculate handicap data for a scorecard.
 *
 * Exported for characterization tests: the WHS differential branch is
 * high-blast-radius (it feeds `players.handicap_index` and handicap history)
 * and must never emit a differential for a scoreless / zero-gross card.
 */
export function calculateHandicapData(scorecard: ScoringUploadCard): {
  gaHandicapUsed: number | null;
  dailyHandicapUsed: number | null;
  handicapDifferential: number | null;
  courseRatingUsed: number | null;
  slopeRatingUsed: number | null;
} {
  let gaHandicapUsed: number | null = null;
  let dailyHandicapUsed: number | null = scorecard.syncHandicapSource === 'none' ? 0 : null;
  let handicapDifferential: number | null = null;
  let courseRatingUsed: number | null = null;
  let slopeRatingUsed: number | null = null;

  // Check if we have the metadata needed for handicap calculation
  const teeData = scorecard.teeData;
  const playerGender = scorecard.playerGender;
  const playerHandicap = scorecard.playerHandicap;
  const coursePar = scorecard.coursePar;

  if (teeData && coursePar) {
    // Get ratings based on player gender
    // Convert TeeBox (camelCase) to TeeWithRatings (snake_case) for getRatingsForGender
    const ratings = getRatingsForGender(teeBoxToRatings(teeData), playerGender);

    if (ratings) {
      // Apply 9-hole rating selection if this is a 9-hole round
      const nineType = scorecard.syncNineType ?? 'full';
      let finalCourseRating = ratings.courseRating;
      let finalSlopeRating = ratings.slopeRating;

      if (nineType !== 'full' && teeData) {
        const { slope, cr } = getEffectiveTeeRatings(
          {
            name: teeData.name,
            color: teeData.color,
            slopeRating: ratings.slopeRating,
            courseRating: ratings.courseRating,
            slopeRatingFront9: teeData.slopeRatingFront9,
            courseRatingFront9: teeData.courseRatingFront9,
            slopeRatingBack9: teeData.slopeRatingBack9,
            courseRatingBack9: teeData.courseRatingBack9,
          },
          nineType
        );
        if (slope != null) finalSlopeRating = slope;
        if (cr != null) finalCourseRating = cr;
      }

      courseRatingUsed = finalCourseRating;
      slopeRatingUsed = finalSlopeRating;

      // Calculate daily handicap if player has a WHS handicap index.
      // Shared with the on-course scoring display via calculateNineAwareDailyHandicap
      // so the value shown while scoring can never diverge from what is persisted.
      if (playerHandicap != null) {
        // Capture the WHS handicap index used for this round (historical snapshot)
        gaHandicapUsed = playerHandicap;

        // coursePar is already 9-hole filtered for 9-hole rounds, matching the
        // helper's expectation that `par` is the par of the holes being played.
        const dailyResult =
          scorecard.syncHandicapSource === 'none'
            ? null
            : calculateNineAwareDailyHandicap({
                gaHandicap: playerHandicap,
                nineType,
                par: coursePar,
                slopeRating: ratings.slopeRating,
                courseRating: ratings.courseRating,
                slopeRatingFront9: teeData.slopeRatingFront9,
                courseRatingFront9: teeData.courseRatingFront9,
                slopeRatingBack9: teeData.slopeRatingBack9,
                courseRatingBack9: teeData.courseRatingBack9,
                gender: playerGender,
              });
        if (dailyResult) dailyHandicapUsed = dailyResult.dailyHandicap;
      }

      // Calculate score differential from the WHS ADJUSTED gross score — every
      // hole capped at net double bogey (par + 2 + strokes received) via
      // calculateAdjustedGrossScore. Cards synced without hole data fall back
      // to the raw total_gross, which is what this call site used throughout.
      //
      // Skip for shared-ball team formats (scramble, alt-shot): the stored
      // total_gross is the TEAM's single-ball score, not the player's own
      // play, so it must never become a handicap-eligible differential.
      // Also skip when the gross is not a positive number: an empty / abandoned
      // scorecard (total_gross = 0) would otherwise produce a huge negative
      // differential of (113 / slope) × (0 − courseRating) and poison the WHS
      // index. This mirrors the guard in recalculateScorecardDifferential.ts
      // and the other differential call sites.
      // Leaving handicapDifferential null excludes the round from both the
      // handicap history and the WHS index (both filter on a non-null value).
      const grossIsPositive = typeof scorecard.totalGross === 'number' && scorecard.totalGross > 0;
      // Handicap completeness gate (I12): only a card that scores every planned
      // hole — judged from the nine type, never from syncHoles — earns a
      // differential. An early-ended, part-filled or still in-progress card
      // gets null (ratings and daily handicap above are still recorded). Cards
      // with no per-hole data keep the legacy gross-only rule. The server
      // trigger scorecards_full_card_differential enforces the same rule.
      const isCompleteCard = isCompleteForHandicap(scorecard.scores, nineType);
      if (
        !isSharedBallRound({ game_type: scorecard.syncGameType }) &&
        grossIsPositive &&
        isCompleteCard
      ) {
        const holes = scorecard.syncHoles;
        const adjustedGross =
          holes && holes.length > 0
            ? calculateAdjustedGrossScore({
                holes,
                scores: scorecard.scores as AdjustedGrossParams['scores'],
                dailyHandicap: dailyHandicapUsed ?? 0,
              }).adjustedGross
            : scorecard.totalGross;

        const differential = calculateScoreDifferential({
          adjustedGrossScore: adjustedGross > 0 ? adjustedGross : scorecard.totalGross,
          courseRating: finalCourseRating,
          slopeRating: finalSlopeRating,
        });
        handicapDifferential = differential;
      }

      syncLogger.debug('Calculated handicap data for scorecard', {
        dailyHandicapUsed,
        handicapDifferential,
        courseRatingUsed,
        slopeRatingUsed,
        nineType,
        isCompleteCard,
        totalGross: scorecard.totalGross,
        playerGender,
      });
    } else {
      syncLogger.warn('Could not get ratings for handicap calculation - missing valid ratings', {
        hasTeeData: !!teeData,
        playerGender,
      });
    }
  } else {
    syncLogger.debug('Skipping handicap calculation - missing metadata', {
      hasTeeData: !!teeData,
      hasCoursePar: !!coursePar,
    });
  }

  // Belt alongside the per-card completeness gate (A3): a card stamped as
  // ended early never gets a differential, whatever its hole data looks like
  // (e.g. a legacy card synced without per-hole scores). The server trigger
  // enforces the same rule (B1a).
  if (isEndedEarly({ holes_played: scorecard.holesPlayed })) {
    handicapDifferential = null;
  }

  return {
    gaHandicapUsed,
    dailyHandicapUsed,
    handicapDifferential,
    courseRatingUsed,
    slopeRatingUsed,
  };
}

/**
 * Calculate total Stableford points using daily handicap and hole data.
 * Falls back to scorecard.totalNet if hole data is not available.
 */
function calculateTotalPoints(
  scorecard: ScoringUploadCard,
  dailyHandicap: number | null
): number {
  const holes = scorecard.syncHoles;
  const gameType = scorecard.syncGameType;

  // Only recalculate for Stableford when we have hole data and daily handicap
  if (gameType === 'stableford' && Array.isArray(holes) && holes.length > 0 && dailyHandicap != null) {
    let totalPoints = 0;

    for (const hole of holes) {
      const rawStrokes = readSnapshotStrokes(scorecard, hole.number);
      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
      const strokes = isEndedEarly({ holes_played: scorecard.holesPlayed })
        ? getEffectiveGrossStrokes(rawStrokes, hole.par, strokesReceived)
        : rawStrokes;
      if (strokes == null || strokes <= 0) continue;

      totalPoints += calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
    }

    syncLogger.debug('Calculated Stableford points with daily handicap', {
      totalPoints,
      dailyHandicap,
      fallbackValue: scorecard.totalNet || 0,
    });

    return totalPoints;
  }

  // Fallback: use totalNet (which for non-stableford games is the net score)
  return scorecard.totalNet || 0;
}

/**
 * Calculate Par-game total score (+1/0/-1 per hole, summed) from per-hole
 * scores using the captured daily handicap and hole stroke indexes.
 *
 * Mirrors `calculateTotalPoints` but for the Par game type. Returns null
 * when the game type isn't Par or hole data isn't present, leaving the
 * server column unset (rather than overwriting a potentially-correct
 * value with 0). Falls back to the locally-computed `totalParScore` on
 * the scorecard when DHC is missing — preserves the value the store
 * already wrote via calculatePlayerTotals.
 */
function calculateTotalParScore(
  scorecard: ScoringUploadCard,
  dailyHandicap: number | null
): number | null {
  const holes = scorecard.syncHoles;
  const gameType = scorecard.syncGameType;

  if (gameType !== 'par') return null;

  if (Array.isArray(holes) && holes.length > 0 && dailyHandicap != null) {
    let totalParScore = 0;
    for (const hole of holes) {
      const rawStrokes = readSnapshotStrokes(scorecard, hole.number);
      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
      const strokes = isEndedEarly({ holes_played: scorecard.holesPlayed })
        ? getEffectiveGrossStrokes(rawStrokes, hole.par, strokesReceived)
        : rawStrokes;
      if (strokes == null || strokes <= 0) continue;
      totalParScore += calculateParScore(strokes, hole.par, strokesReceived);
    }
    return totalParScore;
  }

  // Fallback to whatever the store wrote (which used DHC if context was
  // available at score entry time).
  return scorecard.total_par_score ?? 0;
}

/**
 * Queued cards may have a durable end marker and trimmed scores but stale
 * cached totals after a failed metadata save. Prepare one played-score view
 * for both snapshot and score-entry writes, without mutating the local card.
 * Keep planned syncHoles/coursePar for handicap context. With no hole data or
 * no daily handicap, preserve cached totals rather than inventing pars/strokes.
 */
function prepareEndedSnapshot(scorecard: ScoringUploadCard, dailyHandicap: number | null): ScoringUploadCard {
  const holes = scorecard.syncHoles;
  if (
    !isEndedEarly({ holes_played: scorecard.holesPlayed }) ||
    !Array.isArray(holes) ||
    holes.length === 0
  ) {
    return scorecard;
  }

  const playedHoles = filterPlayableHoles(
    holes,
    scorecard.syncNineType ?? 'full',
    scorecard.holesPlayed
  );
  const playedNumbers = new Set<number>(playedHoles.map((hole) => hole.number));
  const scores = Object.fromEntries(
    Object.entries(scorecard.scores).filter(([number]) => playedNumbers.has(Number(number)))
  );
  const snapshotCard = { ...scorecard, scores };
  if (dailyHandicap == null) return snapshotCard;

  let gross = 0;
  for (const hole of playedHoles) {
    const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
    gross += getEffectiveGrossStrokes(
      readSnapshotStrokes(snapshotCard, hole.number),
      hole.par,
      strokesReceived
    ) ?? 0;
  }
  return { ...snapshotCard, totalGross: gross };
}

/** Normal cards retain their single-ball points/Par behavior; ended cards use ball 1 like gross/net. */
function readSnapshotStrokes(scorecard: ScoringUploadCard, holeNumber: number): number | undefined {
  const score = scorecard.scores[holeNumber];
  if (!score) return undefined;
  if (isSingleBallScore(score)) return score.strokes;
  return isEndedEarly({ holes_played: scorecard.holesPlayed }) ? score.balls?.[0]?.strokes : undefined;
}

/**
 * total_net for the scorecard snapshot.
 *
 * - With a daily handicap: gross − daily_handicap_used, matching
 *   calculatePlayerStats. Derived here rather than trusting the store's live
 *   total, which can drift if tee/handicap context was missing during score
 *   entry — and for Stableford the store overloads totalNet = points.
 * - Ended early (`holesPlayed`, stamped by the store's endRoundEarly): Σ(gross −
 *   strokes received) over the holes played, from the per-hole scores and the
 *   planned holes stamped at submit; daily_handicap_used stays the planned
 *   round's value.
 * - No daily handicap: the store's totalNet, as before.
 */
function calculateSnapshotTotalNet(scorecard: ScoringUploadCard, dailyHandicap: number | null): number {
  if (dailyHandicap == null) {
    return scorecard.totalNet || 0;
  }

  const holesPlayed = scorecard.holesPlayed;
  const holes = scorecard.syncHoles;
  if (isEndedEarly({ holes_played: holesPlayed }) && Array.isArray(holes) && holes.length > 0) {
    const playedHoles = filterPlayableHoles(holes, scorecard.syncNineType ?? 'full', holesPlayed);
    return calculateNetOverHolesPlayed(scorecard.scores, playedHoles, dailyHandicap);
  }

  return (scorecard.totalGross || 0) - dailyHandicap;
}

/**
 * Sync score entries for mismatch detection
 */
async function syncScoreEntries(scorecard: ScoringUploadCard, currentUserId: string): Promise<void> {
  // Populate score_entries for mismatch detection (if scores have scoredBy attribution).
  // This ensures offline scores are available for mismatch detection after reconnect.
  // NOTE: Only sync entries where the current user is the scorer (RLS policy requires
  // scorer_id = auth.uid()); entries scored by others sync from those users' own devices.
  //
  // All of this scorecard's entries are pushed in a SINGLE batched upsert rather than
  // one network call per hole. The per-hole loop previously fired up to 18 concurrent
  // single-row upserts that contended for the same rows and hit the 8s statement
  // timeout; batching collapses them into one short transaction. This is now the sole
  // writer of score_entries — the per-keystroke write in scoreUpdateSlice was removed
  // to eliminate the foreground/background race on these rows.

  const entries: {
    roundId: string;
    playerId: string;
    holeNumber: number;
    scorerId: string;
    score: HoleScore;
  }[] = [];
  let entriesSkipped = 0;

  for (const [holeNum, score] of Object.entries(scorecard.scores)) {
    if (score && isSingleBallScore(score) && score.strokes !== undefined && score.scoredBy) {
      // Only sync entries where current user was the scorer (RLS policy requires scorer_id = auth.uid())
      if (currentUserId && score.scoredBy !== currentUserId) {
        entriesSkipped++;
        continue;
      }

      entries.push({
        roundId: scorecard.roundId,
        playerId: scorecard.playerId,
        holeNumber: parseInt(holeNum),
        scorerId: score.scoredBy,
        score,
      });
    }
  }

  if (entries.length === 0) {
    if (entriesSkipped > 0) {
      syncLogger.debug('Score entries synced for mismatch detection', {
        roundId: scorecard.roundId.substring(0, 8) + '...',
        playerId: scorecard.playerId.substring(0, 8) + '...',
        entriesCount: 0,
        entriesSkipped, // Skipped because scorer was another user
      });
    }
    return;
  }

  try {
    await saveScoreEntries(entries);
    syncLogger.debug('Score entries synced for mismatch detection', {
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
      entriesCount: entries.length,
      entriesSkipped, // Skipped because scorer was another user
    });
  } catch (entryError) {
    const scoringError = roundScoringErrorFromSql(scorecard.roundId, entryError);
    if (scoringError) throw scoringError;
    // Non-critical - log but don't fail the scorecard sync
    syncLogger.warn('Failed to save score entries during sync', {
      error: entryError instanceof Error ? entryError.message : 'Unknown error',
      entriesCount: entries.length,
    });
  }
}
