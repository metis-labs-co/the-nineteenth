/**
 * isTransientError — which failures the sync queue retries automatically.
 *
 * @see src/services/errors/transient.ts
 */
import { isTransientError } from '@/services/errors/transient';
import { AppError, createError } from '@/services/errors';

describe('isTransientError', () => {
  it.each([
    ['a failed fetch wrapped by createError', createError('Failed to insert payouts: TypeError: Network request failed', 'DATABASE')],
    ['a raw PostgREST fetch failure (empty code)', { code: '', message: 'TypeError: Network request failed' }],
    ['a statement timeout', { code: '57014', message: 'canceling statement due to statement timeout' }],
    ['a dropped connection (class 08)', AppError.fromSupabaseError({ code: '08006', message: 'connection failure' })],
    ['a gateway page as the body', { message: '<html><head><title>502 Bad Gateway</title></head></html>' }],
    ['an upstream timeout wrapped by createError', createError('Failed to update game status: upstream request timeout', 'DATABASE')],
    ['an AppError with code NETWORK', new AppError('offline', 'NETWORK')],
    ['an AppError with code TIMEOUT (PGRST504)', AppError.fromSupabaseError({ code: 'PGRST504', message: 'gateway' })],
    ['a deadlock', { code: '40P01', message: 'deadlock detected' }],
    ['a thrown TypeError', new TypeError('Network request failed')],
  ])('is transient for %s', (_label, error) => {
    expect(isTransientError(error)).toBe(true);
  });

  it.each([
    [
      'an RLS refusal on the payouts insert (non-creator)',
      createError('Failed to insert payouts: new row violates row-level security policy for table "skins_payouts"', 'DATABASE'),
    ],
    ['a raw 42501', { code: '42501', message: 'permission denied for table skins_payouts' }],
    ['an AppError PERMISSION', AppError.fromSupabaseError({ code: '42501', message: 'denied' })],
    ['a missing game', createError('Skins game not found', 'NOT_FOUND')],
    ['a validation error', createError('Invalid input', 'VALIDATION')],
    ['a not-null violation', { code: '23502', message: 'null value in column "buy_in" violates not-null constraint' }],
    ['an unrecognised error', new Error('payouts insert failed')],
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
  ])('is permanent for %s', (_label, error) => {
    expect(isTransientError(error)).toBe(false);
  });

  it('treats an RLS refusal as permanent even when the message also mentions a timeout', () => {
    expect(
      isTransientError({ code: '42501', message: 'new row violates row-level security policy (after timeout)' })
    ).toBe(false);
  });
});
