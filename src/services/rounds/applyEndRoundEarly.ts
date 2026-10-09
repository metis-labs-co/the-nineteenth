/**
 * End a social round early on the server (spec R14).
 *
 * The `end_round_early` RPC (SECURITY DEFINER — skins results can only be
 * deleted by the skins game's creator under RLS) sets `rounds.holes_played =
 * N`, deletes the round's skins results, wolf decisions, score entries, score
 * mismatches and shot log after the last played hole, and nulls the round's
 * handicap differentials. It is idempotent for the same N.
 *
 * - Online, the confirm flow (useEndRoundEarly, B6c) calls applyEndRoundEarly
 *   straight away.
 * - Offline, or when that call fails with 'network', it queues a `round` sync
 *   item (queueRoundEndEarly) that the sync queue runs before any 'finalize'
 *   item for the round.
 *
 * Error codes (EndRoundEarlyError.code) — the server's Postgres codes are kept:
 * - 'conflict'  (22023, HINT 'round_already_ended') the round already ended
 *               at another N. serverHolesPlayed carries the server's N (from
 *               DETAIL; else read back — null: none; undefined: couldn't read).
 * - 'not_found' (P0002) the round doesn't exist or was deleted.
 * - 'forbidden' (42501) not authenticated, a competition round, or not the
 *               owner / an accepted participant.
 * - 'busy'      (22023, HINT 'round_scorecards_busy') defer without treating
 *               the request as invalid.
 * - 'invalid'   bad arguments (checked before calling); any other 22023
 *               (HINT 'invalid_holes_played' / 'round_completed' /
 *               'round_not_in_progress'); 22P02; 23514.
 * - 'network'   anything else — no answer within END_ROUND_EARLY_TIMEOUT_MS,
 *               a statement timeout, a 5xx, a missing RPC. Transient: safe to
 *               retry (the RPC is idempotent for the same N).
 */

import { supabase } from '@/services/supabase/client';
import { queueRoundEarlyEndIntent, getQueuedEntityKeys } from '@/services/offline/database';
import { requestSyncDrain } from '@/services/offline/sync/drain';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { createError } from '@/services/errors';
import { submitLogger } from '@/utils/debugLogger';
import type { Database } from '@/types/database';

/** B1b's typed entry; it documents the shape (the rpc call itself is cast). */
type EndRoundEarlyArgs = Database['public']['Functions']['end_round_early']['Args'];

export type EndRoundEarlyErrorCode =
  | 'conflict'
  | 'not_found'
  | 'forbidden'
  | 'invalid'
  | 'network'
  | 'busy';

export class EndRoundEarlyError extends Error {
  readonly code: EndRoundEarlyErrorCode;
  /** 'conflict' only: the server's holes_played (null: none; undefined: unknown). */
  readonly serverHolesPlayed?: number | null;

  constructor(
    code: EndRoundEarlyErrorCode,
    message: string,
    options: { serverHolesPlayed?: number | null } = {}
  ) {
    super(message);
    this.name = 'EndRoundEarlyError';
    this.code = code;
    this.serverHolesPlayed = options.serverHolesPlayed;
  }
}

/**
 * How long the confirm flow (and a queued retry) waits for end_round_early.
 * On-course connections can hang rather than fail; past this the call counts
 * as 'network', so the scorer ends locally and the end is queued.
 */
export const END_ROUND_EARLY_TIMEOUT_MS = 8000;

interface RpcError {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

const PG_INVALID_PARAMETER_VALUE = '22023';
/** B1a-1: the 22023 HINT for "already ended at a different N" (DETAIL = that N). */
const HINT_ROUND_ALREADY_ENDED = 'round_already_ended';
const PG_NO_DATA_FOUND = 'P0002';
const PG_INSUFFICIENT_PRIVILEGE = '42501';
/** invalid_text_representation (bad uuid), check_violation */
const PG_INVALID_INPUT_CODES = new Set(['22P02', '23514']);

const shortId = (roundId: string): string => roundId.substring(0, 8) + '...';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertValidEndRequest(roundId: string, holesPlayed: number): void {
  if (!roundId) {
    throw new EndRoundEarlyError('invalid', 'A round id is required to end a round early');
  }
  if (!Number.isInteger(holesPlayed) || holesPlayed <= 0) {
    throw new EndRoundEarlyError('invalid', `Cannot end a round after ${holesPlayed} holes`);
  }
}

/** The queue entity key of a round's end-early item (A6a's per-action scheme
 *  `round:<id>:<action>`; the finalize item is `round:<id>:finalize`). */
export function roundEndEarlyEntityKey(roundId: string): string {
  return `round:${roundId}:end_early`;
}

/** The round's `holes_played` on the server (null when it was played as planned). */
export function fetchRoundHolesPlayed(roundId: string): Promise<number | null> {
  return readRoundHolesPlayed(roundId);
}

async function readRoundHolesPlayed(roundId: string, signal?: AbortSignal): Promise<number | null> {
  const query = supabase.from('rounds').select('holes_played').eq('id', roundId);
  const request = signal ? query.abortSignal(signal) : query;
  const { data, error } = (await request.maybeSingle()) as unknown as {
    data: { holes_played?: number | null } | null;
    error: { message: string } | null;
  };

  if (error) {
    throw createError(`Failed to read the round's holes played: ${error.message}`, 'DATABASE');
  }
  return data?.holes_played ?? null;
}

/**
 * A conflict is already known. Bound its best-effort read separately and leave
 * N unknown on failure/expiry; neither outcome makes the end safe to discard.
 * Abort requests HTTP cancellation only. The race releases the caller even if
 * the read ignores abort or finishes later.
 */
async function readConflictHolesPlayed(roundId: string): Promise<number | null | undefined> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => {
      resolve(undefined);
      controller.abort();
    }, END_ROUND_EARLY_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      readRoundHolesPlayed(roundId, controller.signal).catch(() => undefined),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The raw RPC call, bounded by END_ROUND_EARLY_TIMEOUT_MS. The abort signal
 * requests HTTP cancellation without proving remote cancellation. The race
 * guarantees a local rejection even if the request ignores the abort or the
 * remote transaction finishes later.
 */
async function callEndRoundEarlyRpc(
  roundId: string,
  holesPlayed: number
): Promise<{ error: RpcError | null }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new EndRoundEarlyError(
          'network',
          `The server did not answer within ${END_ROUND_EARLY_TIMEOUT_MS / 1000}s`
        )
      );
    }, END_ROUND_EARLY_TIMEOUT_MS);
  });

  try {
    const args: EndRoundEarlyArgs = { p_round_id: roundId, p_holes_played: holesPlayed };
    // createClient<Database> resolves rpc() to never (hand-written schema); the
    // args stay typed above. Called inline so `this` is kept — never assign
    // supabase.rpc to a variable first.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request: PromiseLike<{ error: RpcError | null }> = (supabase.rpc as any)(
      'end_round_early',
      args
    ).abortSignal(controller.signal);
    return await Promise.race([Promise.resolve(request), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Call end_round_early. Resolves on success (or a same-N retry); otherwise
 *  rejects with an EndRoundEarlyError carrying the mapped code. */
export async function applyEndRoundEarly(roundId: string, holesPlayed: number): Promise<void> {
  assertValidEndRequest(roundId, holesPlayed);
  const ownerId = getSyncAuthUserId();
  if (!ownerId)
    throw new EndRoundEarlyError(
      'forbidden',
      'An authenticated owner is required to end a round early'
    );

  let result: { error: RpcError | null };
  try {
    result = await callEndRoundEarlyRpc(roundId, holesPlayed);
  } catch (thrown) {
    if (thrown instanceof EndRoundEarlyError) throw thrown; // the timeout
    throw new EndRoundEarlyError(
      'network',
      `Could not reach the server to end the round early: ${messageOf(thrown)}`
    );
  }

  const { error } = result;
  if (!error) {
    submitLogger.info('Round ended early on the server', {
      roundId: shortId(roundId),
      holesPlayed,
    });
    return;
  }

  const code = error.code ?? '';
  if (code === PG_INVALID_PARAMETER_VALUE) {
    if (error.hint === 'round_scorecards_busy') throw new EndRoundEarlyError('busy', error.message);
    if (error.hint === HINT_ROUND_ALREADY_ENDED) {
      const fromDetail = Number(error.details);
      const serverHolesPlayed =
        error.details != null && Number.isInteger(fromDetail) && fromDetail > 0
          ? fromDetail
          : await readConflictHolesPlayed(roundId);
      throw new EndRoundEarlyError(
        'conflict',
        `Could not end the round after ${holesPlayed} holes: ${error.message}`,
        { serverHolesPlayed }
      );
    }
    // HINT 'invalid_holes_played' / 'round_completed' / 'round_not_in_progress'
    // (or none): not retryable.
    throw new EndRoundEarlyError('invalid', `Invalid end-round-early request: ${error.message}`);
  }
  if (code === PG_NO_DATA_FOUND) {
    throw new EndRoundEarlyError('not_found', `Round not found: ${error.message}`);
  }
  if (code === PG_INSUFFICIENT_PRIVILEGE) {
    throw new EndRoundEarlyError(
      'forbidden',
      `Not allowed to end this round early: ${error.message}`
    );
  }
  if (PG_INVALID_INPUT_CODES.has(code)) {
    throw new EndRoundEarlyError('invalid', `Invalid end-round-early request: ${error.message}`);
  }
  throw new EndRoundEarlyError(
    'network',
    `Failed to end round early${code ? ` (${code})` : ''}: ${error.message}`
  );
}

/**
 * Queue the early end as a durable `round` sync item, under its own entity key,
 * then ask for a drain (a no-op while offline). Rejects when queueing fails.
 */
export async function queueRoundEndEarly(roundId: string, holesPlayed: number): Promise<void> {
  assertValidEndRequest(roundId, holesPlayed);

  const userId = getSyncAuthUserId();
  if (!userId)
    throw new EndRoundEarlyError(
      'forbidden',
      'An authenticated owner is required to queue an early end'
    );
  await queueRoundEarlyEndIntent(roundId, holesPlayed, { userId });
  submitLogger.info('Round end-early queued for sync', { roundId: shortId(roundId), holesPlayed });
  requestSyncDrain('round-end-early');
}

/** True while the round's end_early item is still in the queue (pending or retained). */
export async function hasQueuedRoundEndEarly(roundId: string): Promise<boolean> {
  const keys = await getQueuedEntityKeys();
  return keys.has(roundEndEarlyEntityKey(roundId));
}
