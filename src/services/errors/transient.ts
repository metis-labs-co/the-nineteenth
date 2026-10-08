/**
 * isTransientError — is this failure worth retrying automatically?
 *
 * True only for failures a later attempt can fix: no connection, a timeout,
 * a dropped connection, a 5xx / gateway error, a lock or serialisation clash.
 * Everything else is permanent — an RLS refusal (42501), validation, a
 * missing row, or anything unrecognised — and retrying it only burns the sync
 * queue's retries into a retained failure.
 *
 * Reads the shapes this app produces:
 *  - AppError from createError(`Failed to …: ${pgError.message}`, 'DATABASE'):
 *    the Postgres code is lost, the PostgREST message is kept in the text;
 *  - AppError.fromSupabaseError: AppError.code (NETWORK / TIMEOUT / RATE_LIMIT
 *    are transient) plus context.supabaseCode;
 *  - raw PostgREST errors { code, message }: postgrest-js turns a failed fetch
 *    into code '' and message '<Name>: <message>' ("TypeError: Network request
 *    failed"), and a non-JSON gateway body into { message: body };
 *  - a thrown Error / TypeError.
 */
import { AppError } from '@/services/errors';

const TRANSIENT_APP_CODES = new Set<string>(['NETWORK', 'TIMEOUT', 'RATE_LIMIT']);

/** Postgres / PostgREST codes worth retrying (plus the whole 08 class). */
const TRANSIENT_DB_CODES = new Set<string>([
  '57014', // statement timeout
  '57P01', // admin shutdown (failover)
  '53300', // too many connections
  '40001', // serialization failure
  '40P01', // deadlock
  'PGRST504', // gateway timeout
]);

const PERMANENT_MESSAGE = /row-level security|permission denied/i;

const TRANSIENT_MESSAGE =
  /network request failed|failed to fetch|fetch failed|networkerror|aborterror|timed? ?out|econnreset|econnrefused|etimedout|enotfound|socket hang up|bad gateway|service unavailable|gateway time-?out|upstream|too many connections|deadlock|\b50[0234]\b/i;

function codeOf(error: unknown): string {
  if (error instanceof AppError) {
    const supabaseCode = error.context?.supabaseCode;
    return typeof supabaseCode === 'string' ? supabaseCode : '';
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return typeof error === 'string' ? error : '';
}

export function isTransientError(error: unknown): boolean {
  if (error == null) return false;

  const code = codeOf(error);
  const message = messageOf(error);

  // A refusal never turns into a success on retry, whatever else it says.
  if (code === '42501' || PERMANENT_MESSAGE.test(message)) return false;
  if (error instanceof AppError && error.code === 'PERMISSION') return false;

  if (error instanceof AppError && TRANSIENT_APP_CODES.has(error.code)) return true;
  if (code.startsWith('08') || TRANSIENT_DB_CODES.has(code)) return true;

  return TRANSIENT_MESSAGE.test(message);
}
