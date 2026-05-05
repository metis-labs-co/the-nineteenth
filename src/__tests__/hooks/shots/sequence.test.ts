import {
  nextSequence,
  applyOptimisticInsert,
  applyOptimisticUpdate,
  applyOptimisticDelete,
} from '@/hooks/shots/sequence';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

const make = (id: string, sequence: number, lat = 0, lng = 0): ShotLogEntry => ({
  id,
  round_id: 'r1',
  hole_number: 7,
  player_id: 'p1',
  sequence,
  latitude: lat,
  longitude: lng,
  club_used: null,
  shot_type: null,
  from_bunker: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('nextSequence', () => {
  it('returns 1 for empty', () => {
    expect(nextSequence([])).toBe(1);
  });

  it('returns 1 for undefined', () => {
    expect(nextSequence(undefined)).toBe(1);
  });

  it('returns max + 1', () => {
    expect(nextSequence([make('a', 1), make('b', 2), make('c', 5)])).toBe(6);
  });
});

describe('applyOptimisticInsert', () => {
  it('appends and sorts', () => {
    const before = [make('a', 1), make('b', 3)];
    const result = applyOptimisticInsert(before, make('c', 2));
    expect(result.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('applyOptimisticUpdate', () => {
  it('patches the matching id', () => {
    const before = [make('a', 1, 0, 0), make('b', 2, 0, 0)];
    const result = applyOptimisticUpdate(before, 'a', {
      latitude: 1.5,
      longitude: 2.5,
    });
    expect(result[0]).toMatchObject({ id: 'a', latitude: 1.5, longitude: 2.5 });
    expect(result[1]).toEqual(before[1]);
  });

  it('no-op when id not found', () => {
    const before = [make('a', 1)];
    const result = applyOptimisticUpdate(before, 'missing', { latitude: 99 });
    expect(result).toEqual(before);
  });
});

describe('applyOptimisticDelete', () => {
  it('removes the matching id and renumbers', () => {
    const before = [make('a', 1), make('b', 2), make('c', 3)];
    const result = applyOptimisticDelete(before, 'b');
    expect(result.map((s) => ({ id: s.id, seq: s.sequence }))).toEqual([
      { id: 'a', seq: 1 },
      { id: 'c', seq: 2 },
    ]);
  });

  it('preserves order if first shot deleted', () => {
    const before = [make('a', 1), make('b', 2), make('c', 3)];
    const result = applyOptimisticDelete(before, 'a');
    expect(result.map((s) => ({ id: s.id, seq: s.sequence }))).toEqual([
      { id: 'b', seq: 1 },
      { id: 'c', seq: 2 },
    ]);
  });

  it('no-op when id not found', () => {
    const before = [make('a', 1), make('b', 2)];
    const result = applyOptimisticDelete(before, 'missing');
    expect(result).toEqual(before);
  });
});
