/**
 * Regression tests for the RevenueCat webhook handlers.
 *
 * Focus: lifecycle events (cancel / uncancel / renewal) must NOT wipe the user's
 * tier, product, external id, or original start date (they use partial .update(),
 * not a full upsert), and enterprise products map to the enterprise tier.
 *
 * Run: deno test supabase/functions/revenuecat-webhook/index.test.ts
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  handleWebhook,
  type RevenueCatWebhookEvent,
} from './index.ts';
import { mapProductToTier } from '../_shared/subscriptions.ts';

// ---------------------------------------------------------------------------
// Mock Supabase client — records upsert() rows and update() patches.
// ---------------------------------------------------------------------------

interface UpsertCall {
  table: string;
  row: Record<string, unknown>;
}
interface UpdateCall {
  table: string;
  patch: Record<string, unknown>;
  eq?: { col: string; val: unknown };
}

function makeMockSupabase(opts: { rowExists?: boolean } = {}) {
  const rowExists = opts.rowExists ?? true;
  const calls = { upserts: [] as UpsertCall[], updates: [] as UpdateCall[] };

  const client = {
    from(table: string) {
      return {
        upsert(row: Record<string, unknown>) {
          calls.upserts.push({ table, row });
          return Promise.resolve({ error: null });
        },
        update(patch: Record<string, unknown>) {
          const rec: UpdateCall = { table, patch };
          calls.updates.push(rec);
          const builder = {
            eq(col: string, val: unknown) {
              rec.eq = { col, val };
              return builder;
            },
            select(_cols: string) {
              return Promise.resolve({
                data: rowExists ? [{ user_id: rec.eq?.val }] : [],
                error: null,
              });
            },
          };
          return builder;
        },
      };
    },
  };

  // deno-lint-ignore no-explicit-any
  return { supabase: client as any, calls };
}

// ---------------------------------------------------------------------------
// Event factory
// ---------------------------------------------------------------------------

function makeEvent(
  overrides: Partial<RevenueCatWebhookEvent['event']> = {}
): RevenueCatWebhookEvent {
  return {
    api_version: '1.0',
    event: {
      id: 'evt_123',
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user_abc',
      original_app_user_id: 'user_abc',
      aliases: [],
      product_id: 'the.nineteenth.social.monthly',
      period_type: 'NORMAL',
      purchased_at_ms: 1_700_000_000_000,
      expiration_at_ms: 1_700_100_000_000,
      environment: 'PRODUCTION',
      entitlement_id: 'social_access',
      entitlement_ids: ['social_access'],
      presented_offering_id: null,
      transaction_id: 'txn_1',
      original_transaction_id: 'orig_txn_1',
      is_family_share: false,
      store: 'APP_STORE',
      takehome_percentage: 0.7,
      price: 4.99,
      currency: 'AUD',
      ...overrides,
    },
  };
}

const WIPE_COLUMNS = ['tier', 'product_id', 'external_id', 'started_at'];

// ---------------------------------------------------------------------------
// Bug 3 — partial lifecycle events must not wipe tier/product/external/start
// ---------------------------------------------------------------------------

Deno.test('CANCELLATION (auto-renew) patches only status/cancelled_at/expires_at', async () => {
  const { supabase, calls } = makeMockSupabase();
  const result = await handleWebhook(supabase, makeEvent({ type: 'CANCELLATION' }));

  assert(result.success);
  assertEquals(calls.upserts.length, 0, 'must not upsert a full row');
  assertEquals(calls.updates.length, 1, 'must patch existing row');

  const patch = calls.updates[0].patch;
  assertEquals(patch.status, 'cancelled');
  assert('cancelled_at' in patch && patch.cancelled_at !== null);
  assert('expires_at' in patch);
  for (const col of WIPE_COLUMNS) {
    assert(!(col in patch), `patch must NOT touch "${col}" (would wipe access) — got ${JSON.stringify(patch)}`);
  }
  assertEquals(calls.updates[0].eq, { col: 'user_id', val: 'user_abc' });
});

Deno.test('UNCANCELLATION patches only status/cancelled_at', async () => {
  const { supabase, calls } = makeMockSupabase();
  const result = await handleWebhook(supabase, makeEvent({ type: 'UNCANCELLATION' }));

  assert(result.success);
  assertEquals(calls.upserts.length, 0);
  assertEquals(calls.updates.length, 1);

  const patch = calls.updates[0].patch;
  assertEquals(patch.status, 'active');
  assertEquals(patch.cancelled_at, null);
  for (const col of WIPE_COLUMNS) {
    assert(!(col in patch), `patch must NOT touch "${col}" — got ${JSON.stringify(patch)}`);
  }
});

Deno.test('RENEWAL patches tier/status/product/expiry but not external_id or started_at', async () => {
  const { supabase, calls } = makeMockSupabase();
  const result = await handleWebhook(supabase, makeEvent({ type: 'RENEWAL' }));

  assert(result.success);
  assertEquals(calls.upserts.length, 0);
  assertEquals(calls.updates.length, 1);

  const patch = calls.updates[0].patch;
  assertEquals(patch.tier, 'social');
  assertEquals(patch.status, 'active');
  assertEquals(patch.product_id, 'the.nineteenth.social.monthly');
  assertEquals(patch.cancelled_at, null);
  assert(!('external_id' in patch), 'renewal must not null external_id');
  assert(!('started_at' in patch), 'renewal must not reset started_at');
});

Deno.test('CANCELLATION of a lifetime product revokes access immediately', async () => {
  const { supabase, calls } = makeMockSupabase();
  const result = await handleWebhook(
    supabase,
    makeEvent({ type: 'CANCELLATION', product_id: 'the.nineteenth.premium.lifetime' })
  );

  assert(result.success);
  assertEquals(calls.upserts.length, 0);
  const patch = calls.updates[0].patch;
  assertEquals(patch.tier, 'free');
  assertEquals(patch.status, 'expired');
  assertEquals(patch.product_id, null);
  assertEquals(patch.external_id, null);
});

// ---------------------------------------------------------------------------
// Purchase events still establish the full row
// ---------------------------------------------------------------------------

Deno.test('INITIAL_PURCHASE upserts a full row with external_id and real started_at', async () => {
  const { supabase, calls } = makeMockSupabase();
  const result = await handleWebhook(supabase, makeEvent({ type: 'INITIAL_PURCHASE' }));

  assert(result.success);
  assertEquals(calls.updates.length, 0, 'purchase must use upsert, not patch');
  assertEquals(calls.upserts.length, 1);

  const row = calls.upserts[0].row;
  assertEquals(row.tier, 'social');
  assertEquals(row.external_id, 'orig_txn_1');
  assertEquals(row.source, 'revenuecat');
  // started_at derives from purchased_at_ms, not "now".
  assertEquals(row.started_at, new Date(1_700_000_000_000).toISOString());
});

// ---------------------------------------------------------------------------
// Bug 4 — enterprise mapping + unknown-event handling
// ---------------------------------------------------------------------------

Deno.test('enterprise products map to the enterprise tier (not free)', () => {
  assertEquals(mapProductToTier('the.nineteenth.enterprise.monthly'), 'enterprise');
  assertEquals(mapProductToTier('the.nineteenth.enterprise.yearly'), 'enterprise');
});

Deno.test('PRODUCT_CHANGE to an enterprise product sets tier=enterprise', async () => {
  const { supabase, calls } = makeMockSupabase();
  const result = await handleWebhook(
    supabase,
    makeEvent({ type: 'PRODUCT_CHANGE', product_id: 'the.nineteenth.enterprise.yearly' })
  );

  assert(result.success);
  assertEquals(calls.updates[0].patch.tier, 'enterprise');
});

Deno.test('unknown event types are acknowledged (success) to avoid retry storms', async () => {
  const { supabase, calls } = makeMockSupabase();
  // deno-lint-ignore no-explicit-any
  const result = await handleWebhook(supabase, makeEvent({ type: 'SOME_FUTURE_EVENT' as any }));

  assert(result.success, 'unknown events must return success so RevenueCat stops retrying');
  assertEquals(calls.upserts.length, 0);
  assertEquals(calls.updates.length, 0);
});

Deno.test('lifecycle event with no existing subscription is acknowledged, not failed', async () => {
  const { supabase } = makeMockSupabase({ rowExists: false });
  const result = await handleWebhook(supabase, makeEvent({ type: 'UNCANCELLATION' }));

  assert(result.success, 'out-of-order lifecycle event must not trigger a retry storm');
});
