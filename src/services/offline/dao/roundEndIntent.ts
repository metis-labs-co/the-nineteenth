/** Narrow raw helper shared by the two exclusive end-intent transactions. */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { OwnedRoundEndIntent } from '@/services/rounds/roundScoringWrite';
import type { PendingSyncRow } from '../types';
import { TABLE_NAMES } from '../schema/tables';
export type EndTransaction = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;

export function assertIntentOwner(intent: OwnedRoundEndIntent): void {
  if (!intent.userId?.trim())
    throw new Error('A captured authenticated owner is required for end intent');
}

export function assertCompatibleEndIntent(
  row: PendingSyncRow,
  roundId: string,
  intent: OwnedRoundEndIntent,
  holesPlayed?: number
): void {
  const data = JSON.parse(row.data);
  if (
    row.type !== 'round' ||
    row.action !== 'update' ||
    data?.id !== roundId ||
    data?.action !== 'end_early' ||
    data?.userId !== intent.userId ||
    !Number.isInteger(data.holesPlayed) ||
    data.holesPlayed < 1 ||
    (holesPlayed !== undefined && data.holesPlayed !== holesPlayed)
  ) {
    throw new Error(`Incompatible end intent collision for round ${roundId}`);
  }
}

export async function ensureRoundEndIntent(
  txn: EndTransaction,
  roundId: string,
  holesPlayed: number,
  intent: OwnedRoundEndIntent
): Promise<void> {
  assertIntentOwner(intent);
  const key = `round:${roundId}:end_early`;
  const row = await txn.getFirstAsync<PendingSyncRow>(
    `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE entity_key = ?`,
    [key]
  );
  if (row) {
    assertCompatibleEndIntent(row, roundId, intent, holesPlayed);
    return; // Includes retained failures: only explicit Retry may revive them.
  }
  await txn.runAsync(
    `INSERT INTO ${TABLE_NAMES.PENDING_SYNCS}
    (type, action, data, timestamp, retry_count, entity_key, revision, status, last_error, last_attempt_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'round',
      'update',
      JSON.stringify({ id: roundId, action: 'end_early', holesPlayed, userId: intent.userId }),
      new Date().toISOString(),
      0,
      key,
      1,
      'pending',
      null,
      null,
    ]
  );
}
