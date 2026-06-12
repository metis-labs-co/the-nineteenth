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

    it('drops pending rows in droppedPendingIds', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending'), row('c', 'pending')],
        new Set(['b']),
        true
      );
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a', 'c']);
      expect(result.toDrop).toEqual(['b']);
      expect(result.toKeepPending).toEqual(['c']);
    });

    it('keeps all pending when droppedPendingIds is empty', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending')],
        new Set<string>(),
        true
      );
      expect(result.toDrop).toEqual([]);
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a', 'b']);
      expect(result.toKeepPending).toEqual(['b']);
    });

    it('drops all pending when all are in droppedPendingIds', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending'), row('c', 'pending')],
        new Set(['b', 'c']),
        true
      );
      expect(result.toDrop).toEqual(['b', 'c']);
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['a']);
    });

    it('excludes declined rows always', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'declined'), row('c', 'pending')],
        new Set<string>(),
        true
      );
      expect(result.activeRows.map((r) => r.player_id)).not.toContain('b');
    });
  });

  describe('owner = false (non-owner starter)', () => {
    it('forces keep-all on pending rows, toDrop is empty', () => {
      const result = resolveKeepDrop(
        [row('a', 'accepted'), row('b', 'pending'), row('c', 'pending')],
        new Set<string>(), // even with empty droppedPendingIds, non-owner keeps all
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
        new Set<string>(), // drop nothing: owner keeps b, c is declined so excluded
        true
      );
      // Accepted + kept pending are active, declined is excluded
      expect(activeRows).toHaveLength(2);
      expect(activeRows.every((r) => r.invitation_status !== 'declined')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Regression tests mirroring the two production call-chain semantics exactly
  // ---------------------------------------------------------------------------

  describe('production call-chain regression', () => {
    it('[organizer] drops exactly B from [A:accepted(owner), B:pending, C:pending]', () => {
      // Mirrors: resolveKeepDrop(round.players, droppedPendingIds, isOwner=true)
      // where the organizer tapped "Remove" on B only.
      const result = resolveKeepDrop(
        [row('A', 'accepted'), row('B', 'pending'), row('C', 'pending')],
        new Set(['B']),  // droppedPendingIds = the set of IDs user chose to DROP
        true             // isOwner = true
      );
      expect(result.toDrop).toEqual(['B']);
      expect(result.activeRows.map((r) => r.player_id)).toEqual(['A', 'C']);
      expect(result.toKeepPending).toEqual(['C']);
    });

    it('[non-owner] with droppedIds={B} forces empty toDrop, active includes B and C', () => {
      // Mirrors: resolveKeepDrop(round.players, droppedPendingIds, isOwner=false)
      // Non-owner cannot delete pending rows — RLS blocks it — so drop is forced empty.
      const result = resolveKeepDrop(
        [row('A', 'accepted'), row('B', 'pending'), row('C', 'pending')],
        new Set(['B']),  // UI passed droppedIds={B} but non-owner cannot honor it
        false            // isOwner = false
      );
      expect(result.toDrop).toEqual([]);
      expect(result.activeRows.map((r) => r.player_id)).toContain('B');
      expect(result.activeRows.map((r) => r.player_id)).toContain('C');
      expect(result.toKeepPending).toEqual(['B', 'C']);
    });
  });
});
