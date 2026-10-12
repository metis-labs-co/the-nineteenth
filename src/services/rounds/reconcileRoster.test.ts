import { reconcileRoster } from './reconcileRoster';
import type { Player } from '@/types';

const p = (id: string, name = id): Player => ({ id, name, email: '', handicap: 0, createdAt: new Date(), updatedAt: new Date() } as Player);
const round = { id: 'r', userId: 'owner', deletedAt: null };
const store = [{ id: 'owner', name: 'Owner' }, { id: 'me', name: 'Me' }, { id: 'b', name: 'Ben' }];

describe('reconcileRoster', () => {
  it('ignores an empty list or one without the owner for the owner (Review Focus #4)', () => {
    expect(reconcileRoster({ round, players: [] }, store, 'owner')).toEqual({ kind: 'ignore' });
    expect(reconcileRoster({ round, players: [p('me'), p('b')] }, store, 'owner')).toEqual({ kind: 'ignore' });
  });
  it('ignores an owner-missing list for a non-owner who is still listed', () => {
    expect(reconcileRoster({ round, players: [p('me'), p('b')] }, store, 'me')).toEqual({ kind: 'ignore' });
  });
  it('exits a removed non-owner who sees an empty list under RLS', () => {
    expect(reconcileRoster({ round, players: [] }, store, 'me')).toEqual({ kind: 'exit_removed' });
  });
  it('exits when the round is not visible (Review Focus #1)', () => {
    expect(reconcileRoster({ round: null, players: [] }, store, 'me')).toEqual({ kind: 'exit_unavailable' });
  });
  it('exits when the round is deleted', () => {
    expect(reconcileRoster({ round: { ...round, deletedAt: '2026-10-12' }, players: [p('owner'), p('me')] }, store, 'me'))
      .toEqual({ kind: 'exit_deleted' });
  });
  it('exits when the current user was removed', () => {
    expect(reconcileRoster({ round, players: [p('owner'), p('b')] }, store, 'me')).toEqual({ kind: 'exit_removed' });
  });
  it('applies adds and removes', () => {
    expect(reconcileRoster({ round, players: [p('owner'), p('me'), p('c', 'Cat')] }, store, 'me')).toEqual({
      kind: 'apply',
      added: [expect.objectContaining({ id: 'c' })],
      removed: [{ id: 'b', name: 'Ben' }],
    });
  });
  it('is a no-op apply when nothing changed', () => {
    expect(reconcileRoster({ round, players: [p('owner'), p('me'), p('b')] }, store, 'me'))
      .toEqual({ kind: 'apply', added: [], removed: [] });
  });
});
