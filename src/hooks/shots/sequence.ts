import type { ShotLogEntry } from '@/types/database/shotLog.types';

/** Next sequence number for an in-memory shot list. */
export function nextSequence(shots: ShotLogEntry[] | undefined): number {
  if (!shots || shots.length === 0) return 1;
  return Math.max(...shots.map((s) => s.sequence)) + 1;
}

/** Insert + sort optimistically. */
export function applyOptimisticInsert(
  shots: ShotLogEntry[],
  shot: ShotLogEntry
): ShotLogEntry[] {
  return [...shots, shot].sort((a, b) => a.sequence - b.sequence);
}

/** Update by id optimistically. */
export function applyOptimisticUpdate(
  shots: ShotLogEntry[],
  shotId: string,
  patch: Partial<ShotLogEntry>
): ShotLogEntry[] {
  return shots.map((s) => (s.id === shotId ? { ...s, ...patch } : s));
}

/** Delete by id and renumber remaining (mirrors the DB compaction trigger). */
export function applyOptimisticDelete(
  shots: ShotLogEntry[],
  shotId: string
): ShotLogEntry[] {
  return shots
    .filter((s) => s.id !== shotId)
    .sort((a, b) => a.sequence - b.sequence)
    .map((s, idx) => ({ ...s, sequence: idx + 1 }));
}
