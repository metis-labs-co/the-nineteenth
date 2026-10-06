/**
 * Unit tests for assertNoDbError — the shared Supabase-error guard.
 */

import { assertNoDbError, isAppError } from '@/services/errors';

describe('assertNoDbError', () => {
  it('does nothing when there is no error', () => {
    expect(() => assertNoDbError(null, 'fetch prize pool')).not.toThrow();
    expect(() => assertNoDbError(undefined, 'fetch prize pool')).not.toThrow();
  });

  it('throws a DATABASE AppError with a "Failed to <action>" message', () => {
    let caught: unknown;
    try {
      assertNoDbError({ message: 'connection reset' }, 'fetch prize pool');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('DATABASE');
      expect(caught.message).toBe('Failed to fetch prize pool: connection reset');
    }
  });

  it('interpolates the action verb phrase', () => {
    expect(() =>
      assertNoDbError({ message: 'boom' }, 'settle team prize pool')
    ).toThrow('Failed to settle team prize pool: boom');
  });
});
