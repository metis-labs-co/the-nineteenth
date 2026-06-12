import { resolveKeepDrop } from '../resolveKeepDrop';
import type { KeepDropRow } from '../resolveKeepDrop';

const row = (id: string, status: KeepDropRow['invitation_status']): KeepDropRow => ({
  player_id: id,
  invitation_status: status,
});

describe('resolveKeepDrop', () => {
  describe('owner = true', () => {
    it('keeps accepted players unconditionally', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'accepted')],
        new Set<string>(),
        true
      );
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a', 'b']);
      expect(result.toDrop).toEqual([]);
      expect(result.toKeepPending).toEqual([]);
    });

    it('drops pending rows not in keptPendingIds', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending'), row('c', 'pending')],
        new Set(['c']),
        true
      );
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a', 'c']);
      expect(result.toDrop).toEqual(['b']);
      expect(result.toKeepPending).toEqual(['c']);
    });

    it('drops all pending when keptPendingIds is empty', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending')],
        new Set<string>(),
        true
      );
      expect(result.toDrop).toEqual(['b']);
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a']);
    });

    it('excludes declined rows always', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'declined'), row('c', 'pending')],
        new Set(['c']),
        true
      );
      expect(result.activeRows.map((r) => r.player_id)).not.toContain('b');
    });
  });

  describe('owner = false (non-owner starter)', () => {
    it('forces keep-all on pending rows, toDrop is empty', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending'), row('c', 'pending')],
        new Set<string>(), // even with empty keptPendingIds, non-owner keeps all
        false
      );
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a', 'b', 'c']);
      expect(result.toDrop).toEqual([]);
      expect(result.toKeepPending).toEqual(['b', 'c']);
    });

    it('still excludes declined rows', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'declined')],
        new Set<string>(),
        false
      );
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a']);
    });
  });

  describe('startBlockReason re-check integration', () => {
    it('active rows from resolveKeepDrop can be re-fed into startBlockReason', () => {
      // This is an integration sanity check — the resolved rows should satisfy
      // the startBlockReason contract (needs player_id + invitation_status).
      const { activeRows } = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending'), row('c', 'declined')],
        new Set(['b']),
        true
      );
      // Both accepted and pending are 'active', declined is excluded
      expect(activeRows).toHaveLength(2);
      expect(activeRows.every((r) => r.invitation_status !== 'declined')).toBe(true);
    });
  });
});
