import type { Scorecard } from '@/types';
import type { HandicapSource } from '@/types/database';

export function readSyncHandicapSource(value: unknown): HandicapSource | undefined {
  if (value == null) return undefined;
  if (value === 'none' || value === 'profile' || value === 'calculated') return value;
  throw new Error('Invalid sync handicap source');
}

export function hasFrozenScoringContext(card: Scorecard): boolean {
  return (
    card.status === 'completed' ||
    card.status === 'confirmed' ||
    card.submittedAt != null ||
    card.submittedBy != null ||
    card.holesPlayed != null
  );
}

/** Only compatible historical local evidence can supply a local-only remote stamp. */
export function hydratedSyncHandicapSource(
  card: Scorecard,
  remoteRevision?: number
): HandicapSource | undefined {
  const recordedSubmission =
    card.status === 'completed' || card.status === 'confirmed' || card.submittedAt != null;
  return recordedSubmission && remoteRevision != null && card.serverRevision === remoteRevision
    ? readSyncHandicapSource(card.syncHandicapSource)
    : undefined;
}
