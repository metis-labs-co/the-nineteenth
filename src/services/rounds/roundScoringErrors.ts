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
