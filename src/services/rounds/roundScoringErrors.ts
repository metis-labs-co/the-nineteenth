import type { AcceptedScorecardWrite } from './roundScoringWrite';

export type RoundScoringWriteErrorKind =
  | 'shape_changed'
  | 'out_of_play'
  | 'busy'
  | 'invalid_shape'
  | 'unavailable'
  | 'context_missing'
  | 'context_changed'
  | 'local_end_pending';

/** Shared server/local failure contract; importing it never loads a writer or store. */
export class RoundScoringWriteError extends Error {
  readonly acceptedWrite?: AcceptedScorecardWrite;
  readonly sqlCode?: string;
  readonly sqlHint?: string;

  constructor(
    readonly kind: RoundScoringWriteErrorKind,
    readonly roundId: string,
    message: string,
    options: { acceptedWrite?: AcceptedScorecardWrite; sqlCode?: string; sqlHint?: string } = {}
  ) {
    super(message);
    this.name = 'RoundScoringWriteError';
    this.acceptedWrite = options.acceptedWrite;
    this.sqlCode = options.sqlCode;
    this.sqlHint = options.sqlHint;
  }
}

/** Only explicit scoring guards are new blocking entry failures. */
export function roundScoringErrorFromSql(
  roundId: string,
  error: unknown
): RoundScoringWriteError | null {
  if (error instanceof RoundScoringWriteError) return error;
  if (!error || typeof error !== 'object') return null;
  const sql = error as { code?: string; hint?: string; message?: string };
  const kinds: Record<string, RoundScoringWriteErrorKind> = {
    round_shape_changed: 'shape_changed',
    round_score_out_of_play: 'out_of_play',
    round_scoring_busy: 'busy',
    round_scorecards_busy: 'busy',
    invalid_round_shape: 'invalid_shape',
  };
  const kind = sql.hint && kinds[sql.hint];
  return kind
    ? new RoundScoringWriteError(kind, roundId, sql.message ?? 'Round scoring write rejected', {
        sqlCode: sql.code,
        sqlHint: sql.hint,
      })
    : null;
}
